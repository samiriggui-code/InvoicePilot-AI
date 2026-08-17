import { createServerFn } from "@tanstack/react-start";
import type { InvoiceStatus } from "@prisma/client";

import type { ExtractedInvoiceDraft, RemediationTip } from "@/lib/invoice-extract";

export type AnalysisCheck = {
  code: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type DocumentAnalysisResult = {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  format: string;
  score: number;
  valid: boolean;
  checks: AnalysisCheck[];
  blockingErrors: string[];
  warnings: string[];
  analyzedAt: string;
  transactionType: string;
  dispatchTarget: "emission" | "e-reporting" | "blocked" | "review";
  dispatchLabel: string;
  /** Premier jet extraction PDF */
  extraction: {
    ran: boolean;
    source: "llm" | "heuristic" | "skipped" | "none";
    applied: boolean;
    pdfTextChars: number;
    draft: ExtractedInvoiceDraft | null;
    tips: RemediationTip[];
  };
};

/** Analyse conformité + extraction PDF (premier jet) → suggestions de remédiation. */
export const analyzeInvoiceDocument = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string; applyExtraction?: boolean }) => data)
  .handler(async ({ data }): Promise<DocumentAnalysisResult | { error: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { validateInvoiceDraft, computeLineTotals } = await import("@/lib/invoice-validation");
    const { extractTextFromPdfBase64 } = await import("@/lib/pdf-text");
    const { extractInvoiceFromText, buildRemediationTips } = await import("@/lib/invoice-extract");
    const { inferTransactionType, requiresBuyerSiren } = await import("@/lib/transaction-type");
    const { getStorageObject } = await import("@/api/storage/store");
    const { bestCompanyMatch } = await import("@/lib/company-lookup");
    const { validateSellerMatchesOrganization } = await import("@/lib/seller-org-match");

    const workspace = await loadWorkspace();
    if (!workspace) return { error: "Session expirée." };

    const orgId = workspace.organization.id;
    let invoice = await db.invoice.findFirst({
      where: { id: data.invoiceId, organizationId: orgId },
      include: {
        counterparty: true,
        lines: { orderBy: { lineNumber: "asc" } },
        validations: true,
      },
    });

    if (!invoice) return { error: "Facture introuvable." };

    const { canReanalyzeInvoice, invoiceImmutabilityMessage } =
      await import("@/lib/invoice-lifecycle-rules");
    if (!canReanalyzeInvoice(invoice.status)) {
      return { error: invoiceImmutabilityMessage(invoice.status) };
    }

    let extractionSource: DocumentAnalysisResult["extraction"]["source"] = "none";
    let extractionApplied = false;
    let pdfTextChars = 0;
    let draft: ExtractedInvoiceDraft | null = null;

    const needsEnrichment =
      invoice.sourceSystem === "manual_upload" ||
      invoice.validations.some((v) => v.code === "PDF_PENDING_ENRICHMENT") ||
      Number(invoice.totalTtc) === 0 ||
      invoice.lines.every((l) => Number(l.unitPriceHt) === 0);

    const applyExtraction = data.applyExtraction !== false;

    try {
      if (needsEnrichment && invoice.pdfStorageKey) {
        const obj = await getStorageObject(orgId, invoice.pdfStorageKey);
        if (obj?.content) {
          const { text } = await extractTextFromPdfBase64(obj.content);
          pdfTextChars = text.length;

          if (text.length > 20) {
            const extracted = await extractInvoiceFromText(text, {
              sellerName: workspace.organization.legalName,
            });
            draft = extracted.draft;
            extractionSource = extracted.source;

            const preSellerIssues = validateSellerMatchesOrganization({
              direction: invoice.direction === "PURCHASE" ? "PURCHASE" : "SALE",
              extractedSellerSiren: draft.sellerSiren,
              extractedSellerLegalName: draft.sellerLegalName,
              organizationSiren: workspace.organization.siren,
              organizationLegalName: workspace.organization.legalName,
              organizationTradeName: workspace.organization.tradeName ?? null,
            });
            const sellerBlocked = preSellerIssues.some(
              (i) => i.blocking && i.code === "SELLER_SIREN_MISMATCH",
            );

            if (draft && sellerBlocked) {
              // Hors tenant : audit émetteur seul — aucune donnée métier (client / lignes / établissements)
              const auditDraft: ExtractedInvoiceDraft = {
                number: null,
                issueDate: null,
                serviceDate: null,
                currency: "EUR",
                sellerLegalName: draft.sellerLegalName,
                sellerSiren: draft.sellerSiren,
                buyerLegalName: null,
                buyerSiren: null,
                buyerSiret: null,
                buyerEmail: null,
                buyerAddressLine1: null,
                buyerPostal: null,
                buyerCity: null,
                buyerEstablishments: [],
                operationCategory: null,
                transactionType: null,
                lines: [],
                subtotalHt: null,
                totalVat: null,
                totalTtc: null,
                confidence: draft.confidence,
                notes: [
                  `Émetteur SIREN ${draft.sellerSiren} ≠ organisation ${workspace.organization.siren} — données métier non enregistrées.`,
                  "Action : Réception (achat) · remplacer le PDF en Sources · vérifier SIREN org.",
                ],
              };
              draft = auditDraft;
              await db.invoiceExtraction.upsert({
                where: { invoiceId: invoice.id },
                create: {
                  invoiceId: invoice.id,
                  source: extractionSource,
                  confidence: auditDraft.confidence,
                  draftJson: auditDraft as object,
                  sellerSiren: auditDraft.sellerSiren,
                  sellerLegalName: auditDraft.sellerLegalName,
                  buyerSiren: null,
                  buyerSiret: null,
                  buyerLegalName: null,
                },
                update: {
                  source: extractionSource,
                  confidence: auditDraft.confidence,
                  draftJson: auditDraft as object,
                  sellerSiren: auditDraft.sellerSiren,
                  sellerLegalName: auditDraft.sellerLegalName,
                  buyerSiren: null,
                  buyerSiret: null,
                  buyerLegalName: null,
                  extractedAt: new Date(),
                },
              });
              await db.invoice.update({
                where: { id: invoice.id },
                data: {
                  lifecycleEvents: {
                    create: {
                      status: "BLOCKED",
                      scope: "EMISSION",
                      source: "ai-extract",
                      message: `Émetteur hors tenant (SIREN ${auditDraft.sellerSiren}) — extraction métier annulée`,
                    },
                  },
                },
              });
            } else if (draft) {
              await db.invoiceExtraction.upsert({
                where: { invoiceId: invoice.id },
                create: {
                  invoiceId: invoice.id,
                  source: extractionSource,
                  confidence: draft.confidence,
                  draftJson: draft as object,
                  sellerSiren: draft.sellerSiren,
                  sellerLegalName: draft.sellerLegalName,
                  buyerSiren: draft.buyerSiren,
                  buyerSiret: draft.buyerSiret,
                  buyerLegalName: draft.buyerLegalName,
                },
                update: {
                  source: extractionSource,
                  confidence: draft.confidence,
                  draftJson: draft as object,
                  sellerSiren: draft.sellerSiren,
                  sellerLegalName: draft.sellerLegalName,
                  buyerSiren: draft.buyerSiren,
                  buyerSiret: draft.buyerSiret,
                  buyerLegalName: draft.buyerLegalName,
                  extractedAt: new Date(),
                },
              });
            }

            // Enrichissement vente uniquement si émetteur = org
            if (applyExtraction && draft && !sellerBlocked) {
              // Matching acheteur
              let counterpartyId = invoice.counterpartyId;
              let buyerEstablishmentId: string | null = null;
              const buyerName = draft.buyerLegalName?.trim();
              const buyerSiren = draft.buyerSiren;
              const transactionType = inferTransactionType({
                explicit: draft.transactionType,
                buyerSiren,
                isConsumer: !buyerSiren,
              });

              if (buyerSiren || buyerName) {
                const { findOrCreateClient } = await import("@/lib/counterparty-dedupe");
                const { client } = await findOrCreateClient(db, {
                  organizationId: orgId,
                  legalName: buyerName || `Client SIREN ${buyerSiren}`,
                  siren: buyerSiren,
                  siret: draft.buyerSiret,
                  isConsumer: transactionType !== "B2B_DOMESTIC",
                  defaultTransactionType: transactionType,
                  email: draft.buyerEmail,
                  billingLine1: draft.buyerAddressLine1,
                  billingPostal: draft.buyerPostal,
                  billingCity: draft.buyerCity,
                  billingCountry: "FR",
                });

                // Enrichissement optionnel via annuaire si SIREN manquant
                if (!client.siren && buyerName) {
                  const match = await bestCompanyMatch(buyerName);
                  if (match?.siren) {
                    await db.counterparty.update({
                      where: { id: client.id },
                      data: {
                        siren: match.siren,
                        siret: client.siret ?? match.siret ?? null,
                        vatNumber: client.vatNumber ?? match.vatNumber ?? null,
                        billingLine1: client.billingLine1 ?? match.billingLine1 ?? null,
                        billingPostal: client.billingPostal ?? match.billingPostal ?? null,
                        billingCity: client.billingCity ?? match.billingCity ?? null,
                        directorySyncedAt: new Date(),
                      },
                    });
                  }
                }

                counterpartyId = client.id;

                const { upsertClientEstablishmentsFromAnalysis } =
                  await import("@/lib/counterparty-establishments");
                const { primaryEstablishmentId } = await upsertClientEstablishmentsFromAnalysis(
                  db,
                  {
                    counterpartyId: client.id,
                    buyerSiren: buyerSiren ?? client.siren,
                    establishments: draft.buyerEstablishments,
                    primarySiret: draft.buyerSiret ?? client.siret,
                  },
                );
                buyerEstablishmentId = primaryEstablishmentId;

                if (draft.buyerSiret && !client.siret) {
                  await db.counterparty.update({
                    where: { id: client.id },
                    data: { siret: draft.buyerSiret },
                  });
                }
              }

              const lines =
                draft.lines.length > 0
                  ? draft.lines
                  : invoice.lines.map((l) => ({
                      description: l.description,
                      quantity: Number(l.quantity),
                      unitPriceHt: Number(l.unitPriceHt),
                      vatRate: Number(l.vatRate),
                    }));

              let subtotalHt = 0;
              let totalVat = 0;
              const lineRows = lines.map((line, index) => {
                const t = computeLineTotals(line);
                subtotalHt += t.lineTotalHt;
                totalVat += t.lineVat;
                return {
                  lineNumber: index + 1,
                  description: line.description,
                  quantity: line.quantity,
                  unitPriceHt: line.unitPriceHt,
                  vatRate: line.vatRate,
                  lineTotalHt: t.lineTotalHt,
                  lineVat: t.lineVat,
                };
              });
              subtotalHt = Math.round(subtotalHt * 100) / 100;
              totalVat = Math.round(totalVat * 100) / 100;
              const totalTtc = Math.round((subtotalHt + totalVat) * 100) / 100;

              await db.$transaction(async (tx) => {
                await tx.invoiceLine.deleteMany({ where: { invoiceId: invoice!.id } });
                await tx.invoiceValidation.deleteMany({
                  where: { invoiceId: invoice!.id, code: "PDF_PENDING_ENRICHMENT" },
                });
                await tx.invoice.update({
                  where: { id: invoice!.id },
                  data: {
                    counterpartyId,
                    buyerSiren:
                      transactionType === "B2B_DOMESTIC"
                        ? (buyerSiren ?? invoice!.buyerSiren)
                        : null,
                    buyerSiret:
                      transactionType === "B2B_DOMESTIC"
                        ? (draft!.buyerSiret ?? invoice!.buyerSiret)
                        : null,
                    buyerEstablishmentId,
                    transactionType,
                    issueDate: draft!.issueDate ? new Date(draft!.issueDate) : invoice!.issueDate,
                    serviceDate: draft!.serviceDate
                      ? new Date(draft!.serviceDate)
                      : invoice!.serviceDate,
                    operationCategory:
                      draft!.operationCategory ?? invoice!.operationCategory ?? "SERVICES",
                    subtotalHt,
                    totalVat,
                    totalTtc,
                    currency: draft!.currency || invoice!.currency,
                    lines: { create: lineRows },
                    lifecycleEvents: {
                      create: {
                        status: "DRAFT",
                        scope: "EMISSION",
                        source: "ai-extract",
                        message: `Extraction ${extractionSource} · ${transactionType} (${lineRows.length} ligne(s)) — mise en forme avant dispatch`,
                      },
                    },
                  },
                });
              });

              extractionApplied = true;
              invoice = await db.invoice.findFirst({
                where: { id: data.invoiceId, organizationId: orgId },
                include: {
                  counterparty: true,
                  lines: { orderBy: { lineNumber: "asc" } },
                  validations: true,
                },
              });
              if (!invoice) return { error: "Facture introuvable après extraction." };
            }
          } else {
            extractionSource = "skipped";
            draft = {
              number: null,
              issueDate: null,
              serviceDate: null,
              currency: "EUR",
              sellerLegalName: null,
              sellerSiren: null,
              buyerLegalName: null,
              buyerSiren: null,
              buyerSiret: null,
              buyerEmail: null,
              buyerAddressLine1: null,
              buyerPostal: null,
              buyerCity: null,
              buyerEstablishments: [],
              operationCategory: null,
              transactionType: null,
              lines: [],
              subtotalHt: null,
              totalVat: null,
              totalTtc: null,
              confidence: 0,
              notes: [
                "PDF sans texte extractible (probablement scanné). OCR vision à brancher ensuite.",
              ],
            };
          }
        }
      } else if (!needsEnrichment) {
        extractionSource = "skipped";
      }
    } catch (extractErr) {
      console.error("Analyse extraction failed:", extractErr);
      extractionSource = "skipped";
      if (!invoice) return { error: "Facture introuvable après extraction." };
      if (!draft) {
        draft = {
          number: invoice.number,
          issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
          serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
          currency: invoice.currency,
          sellerLegalName: null,
          sellerSiren: null,
          buyerLegalName: invoice.counterparty?.legalName ?? null,
          buyerSiren: invoice.buyerSiren ?? invoice.counterparty?.siren ?? null,
          buyerSiret: invoice.buyerSiret ?? invoice.counterparty?.siret ?? null,
          buyerEmail: invoice.counterparty?.email ?? null,
          buyerAddressLine1: invoice.counterparty?.billingLine1 ?? null,
          buyerPostal: invoice.counterparty?.billingPostal ?? null,
          buyerCity: invoice.counterparty?.billingCity ?? null,
          buyerEstablishments: [],
          operationCategory: invoice.operationCategory,
          transactionType: invoice.transactionType,
          lines: invoice.lines.map((l) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPriceHt: Number(l.unitPriceHt),
            vatRate: Number(l.vatRate),
          })),
          subtotalHt: Number(invoice.subtotalHt),
          totalVat: Number(invoice.totalVat),
          totalTtc: Number(invoice.totalTtc),
          confidence: 0.1,
          notes: [
            `Extraction interrompue : ${extractErr instanceof Error ? extractErr.message : "erreur"} — contrôles sur la fiche seule.`,
          ],
        };
      }
    }

    if (!invoice) return { error: "Facture introuvable après extraction." };

    const buyerSiren = invoice.counterparty?.siren ?? invoice.buyerSiren ?? null;
    const transactionType = invoice.transactionType ?? "B2B_DOMESTIC";
    const formatRaw = (invoice.format ?? "FACTUR_X").toUpperCase();
    const formatOk = ["FACTUR_X", "UBL", "CII"].includes(formatRaw);

    const sellerIssues = validateSellerMatchesOrganization({
      direction: invoice.direction === "PURCHASE" ? "PURCHASE" : "SALE",
      extractedSellerSiren: draft?.sellerSiren ?? null,
      extractedSellerLegalName: draft?.sellerLegalName ?? null,
      organizationSiren: workspace.organization.siren,
      organizationLegalName: workspace.organization.legalName,
      organizationTradeName: workspace.organization.tradeName ?? null,
    });

    const issues = [
      ...validateInvoiceDraft({
        buyerSiren,
        transactionType,
        operationCategory: invoice.operationCategory,
        deliveryDiffers: invoice.deliveryDiffers,
        deliveryLine1: invoice.counterparty?.deliveryLine1,
        deliveryCity: invoice.counterparty?.deliveryCity,
        issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
        serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
        lines: invoice.lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPriceHt: Number(l.unitPriceHt),
          vatRate: Number(l.vatRate),
        })),
        sellerSiren: workspace.organization.siren,
      }),
      ...sellerIssues,
    ];

    const blocking = issues.filter((i) => i.blocking);
    const warnings = issues.filter((i) => !i.blocking);

    // Persister validations fraîches
    await db.invoiceValidation.deleteMany({ where: { invoiceId: invoice.id } });
    if (issues.length) {
      await db.invoiceValidation.createMany({
        data: issues.map((issue) => ({
          invoiceId: invoice!.id,
          code: issue.code,
          message: issue.message,
          severity: issue.severity,
          field: issue.field ?? null,
          blocking: issue.blocking,
        })),
      });
    }

    const sirenOk =
      !requiresBuyerSiren(transactionType) || Boolean(buyerSiren && /^\d{9}$/.test(buyerSiren));
    const vatOk =
      invoice.lines.length > 0 &&
      invoice.lines.every((l) => Number(l.vatRate) >= 0 && Number(l.unitPriceHt) > 0) &&
      Number(invoice.totalTtc) > 0 &&
      !blocking.some((i) => i.code.startsWith("LINE"));
    const mentionsOk = !blocking.some((i) =>
      [
        "BUYER_SIREN_2026",
        "OPERATION_CATEGORY_2026",
        "DELIVERY_ADDRESS_2026",
        "ISSUE_DATE",
        "SERVICE_DATE",
        "SELLER_SIREN_MISMATCH",
      ].includes(i.code),
    );
    const sellerOk = !blocking.some((i) => i.code === "SELLER_SIREN_MISMATCH");
    const { isEReportingTransaction } = await import("@/lib/transaction-type");
    const {
      isExtractionReliableForFlux,
      resolveDispatchTarget,
      dispatchLabel: labelDispatch,
      formatInvoiceForDispatch,
    } = await import("@/lib/invoice-dispatch");

    const ereportingFlux = isEReportingTransaction(transactionType);
    const extractConfidence =
      draft?.confidence ??
      (extractionSource === "llm" ? 0.7 : extractionSource === "heuristic" ? 0.35 : 1);
    const extractReliable = isExtractionReliableForFlux({
      transactionType,
      confidence: extractConfidence,
      source: extractionSource,
      needsEnrichment,
    });

    const readyForDispatch =
      invoice.lines.length > 0 &&
      Number(invoice.totalTtc) > 0 &&
      blocking.length === 0 &&
      extractReliable &&
      (ereportingFlux || formatOk);

    const checks: AnalysisCheck[] = [
      {
        code: "extract",
        label: "Fiabilité lecture document",
        ok: extractReliable && (pdfTextChars > 20 || !invoice.pdfStorageKey || !needsEnrichment),
        detail: invoice.pdfStorageKey
          ? extractionSource === "heuristic"
            ? `Heuristique (${Math.round(extractConfidence * 100)} %) · seuil ${
                ereportingFlux ? "e-reporting" : "B2B"
              }`
            : extractionSource === "llm"
              ? `LLM (${Math.round(extractConfidence * 100)} %, ${pdfTextChars} car.)`
              : pdfTextChars > 20
                ? `Texte lu (${pdfTextChars} car.)`
                : "PDF sans texte extractible (scan) — OCR à venir"
          : "Analyse sur données fiche uniquement",
      },
      {
        code: "siret_client",
        label: "SIREN client",
        ok: sirenOk,
        detail: sirenOk
          ? requiresBuyerSiren(transactionType)
            ? `SIREN ${buyerSiren}`
            : `Flux ${transactionType} — SIREN non requis`
          : "SIREN client manquant ou invalide (mention 2026 — B2B)",
      },
      {
        code: "seller_org",
        label: "Émetteur = votre entreprise",
        ok: sellerOk,
        detail: sellerOk
          ? draft?.sellerSiren
            ? `SIREN émetteur ${draft.sellerSiren} = org (établissements / SIRET multiples OK)`
            : `Org SIREN ${workspace.organization.siren} — non lu sur PDF`
          : (issues.find((i) => i.code === "SELLER_SIREN_MISMATCH")?.message ??
            "SIREN émetteur différent de votre organisation"),
      },
      {
        code: "vat",
        label: "Lignes / TVA / montants",
        ok: vatOk,
        detail: vatOk
          ? `${invoice.lines.length} ligne(s) · TTC ${Number(invoice.totalTtc).toFixed(2)} €`
          : "Lignes ou montants incomplets",
      },
      {
        code: "mentions",
        label: "Mentions obligatoires 2026",
        ok: mentionsOk,
        detail: mentionsOk
          ? "Dates, catégorie, SIREN OK côté règles"
          : blocking
              .filter((i) =>
                [
                  "BUYER_SIREN_2026",
                  "OPERATION_CATEGORY_2026",
                  "DELIVERY_ADDRESS_2026",
                  "ISSUE_DATE",
                  "SERVICE_DATE",
                ].includes(i.code),
              )
              .map((i) => i.message)
              .join(" · ") || "Mentions incomplètes",
      },
      {
        code: "dispatch",
        label: ereportingFlux ? "Prêt e-reporting" : "Éligible Factur-X / dépôt PA",
        ok: readyForDispatch,
        detail: readyForDispatch
          ? ereportingFlux
            ? "Mise en forme OK — dispatch vers lot e-reporting"
            : "Contrôles + fiabilité OK — dispatch vers Émission PA"
          : !extractReliable
            ? "Extraction trop incertaine — corriger ou relancer"
            : "Corriger les blocages avant dispatch",
      },
    ];

    const tips = buildRemediationTips(
      draft ?? {
        number: invoice.number,
        issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
        serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
        currency: invoice.currency,
        sellerLegalName: workspace.organization.legalName,
        sellerSiren: workspace.organization.siren,
        buyerLegalName: invoice.counterparty?.legalName ?? null,
        buyerSiren,
        buyerSiret: invoice.buyerSiret ?? invoice.counterparty?.siret ?? null,
        buyerEmail: invoice.counterparty?.email ?? null,
        buyerAddressLine1: invoice.counterparty?.billingLine1 ?? null,
        buyerPostal: invoice.counterparty?.billingPostal ?? null,
        buyerCity: invoice.counterparty?.billingCity ?? null,
        buyerEstablishments: [],
        operationCategory: invoice.operationCategory,
        transactionType: invoice.transactionType,
        lines: invoice.lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPriceHt: Number(l.unitPriceHt),
          vatRate: Number(l.vatRate),
        })),
        subtotalHt: Number(invoice.subtotalHt),
        totalVat: Number(invoice.totalVat),
        totalTtc: Number(invoice.totalTtc),
        confidence: extractConfidence,
        notes: [],
      },
      [...blocking, ...warnings].map((b) => b.code),
    );

    const okCount = checks.filter((c) => c.ok).length;
    const rulesScore = (okCount / checks.length) * 100;
    const score = Math.round(
      extractReliable
        ? rulesScore
        : Math.min(rulesScore, rulesScore * 0.7 + extractConfidence * 30),
    );

    const valid = blocking.length === 0 && readyForDispatch && extractReliable;

    const lockedStatuses = [
      "TRANSMITTING",
      "TRANSMITTED",
      "APPROVED",
      "PAID",
      "ARCHIVED",
      "REFUSED",
      "REJECTED",
    ];

    let nextStatus: InvoiceStatus;
    if (blocking.length > 0 || !extractReliable) {
      nextStatus = "BLOCKED";
    } else if (lockedStatuses.includes(invoice.status)) {
      nextStatus = invoice.status;
    } else if (valid) {
      nextStatus = "VALIDATED";
    } else {
      nextStatus = "DRAFT";
    }

    const target = resolveDispatchTarget({
      valid,
      blocked: nextStatus === "BLOCKED",
      transactionType,
    });
    const dispatchName = labelDispatch(target);
    const verdictPass = valid && nextStatus !== "BLOCKED";

    const formatted = formatInvoiceForDispatch({
      number: invoice.number,
      currency: invoice.currency,
      format: invoice.format,
      transactionType,
      subtotalHt: Number(invoice.subtotalHt),
      totalVat: Number(invoice.totalVat),
      totalTtc: Number(invoice.totalTtc),
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceHt: Number(l.unitPriceHt),
        vatRate: Number(l.vatRate),
        lineTotalHt: Number(l.lineTotalHt),
        lineVat: Number(l.lineVat),
      })),
    });

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        complianceScore: score,
        status: nextStatus,
        currency: formatted.currency,
        format: formatted.format,
        number: formatted.number ?? invoice.number,
        subtotalHt: formatted.subtotalHt,
        totalVat: formatted.totalVat,
        totalTtc: formatted.totalTtc,
        lifecycleEvents: {
          create: {
            status: nextStatus,
            scope: "EMISSION",
            source: "ai-analyze",
            message: verdictPass
              ? `Analyse IA — PASSÉ (score ${score} %) · ${transactionType} → ${dispatchName} (mise en forme)`
              : `Analyse IA — BLOQUÉ (score ${score} %)${
                  blocking.length
                    ? ` · ${blocking.map((b) => b.code).join(", ")}`
                    : !extractReliable
                      ? " · extraction peu fiable"
                      : ""
                }`,
          },
        },
      },
    });

    return {
      invoiceId: invoice.id,
      invoiceNumber: formatted.number ?? invoice.number ?? "Brouillon",
      clientName: invoice.counterparty?.legalName ?? "Client inconnu",
      format: formatted.format,
      score,
      valid,
      checks,
      blockingErrors: [
        ...blocking.map((i) => i.message),
        ...(!extractReliable ? ["Extraction peu fiable — validation humaine avant dépôt"] : []),
      ],
      warnings: warnings.map((i) => i.message),
      analyzedAt: new Date().toISOString(),
      transactionType,
      dispatchTarget: target,
      dispatchLabel: dispatchName,
      extraction: {
        ran: Boolean(needsEnrichment && invoice.pdfStorageKey),
        source: extractionSource,
        applied: extractionApplied,
        pdfTextChars,
        draft,
        tips,
      },
    };
  });
