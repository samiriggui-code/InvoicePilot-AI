import { createServerFn } from "@tanstack/react-start";

import type { ValidationIssue } from "@/lib/invoice-validation";

export type InvoiceDetail = {
  id: string;
  number: string | null;
  status: string;
  direction: "SALE" | "PURCHASE";
  format: string | null;
  transactionType: string;
  issueDate: string | null;
  serviceDate: string | null;
  dueDate: string | null;
  buyerSiren: string | null;
  operationCategory: "GOODS" | "SERVICES" | "MIXED" | null;
  vatOnDebitsOption: boolean;
  deliveryDiffers: boolean;
  deliveryLine1: string | null;
  deliveryPostal: string | null;
  deliveryCity: string | null;
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  complianceScore: number | null;
  facturxReady: boolean;
  archived: boolean;
  archiveCount: number;
  paReference: string | null;
  paStatus: string | null;
  paStatusCode: string | null;
  paStatusMessage: string | null;
  lastPaStatusAt: string | null;
  transmittedAt: string | null;
  platformName: string | null;
  hasActivePa: boolean;
  rejectionReason: string | null;
  client: {
    id: string;
    legalName: string;
    siren: string | null;
  } | null;
  seller: {
    legalName: string;
    siren: string;
  };
  lines: {
    id: string;
    lineNumber: number;
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
    lineTotalHt: number;
    lineVat: number;
  }[];
  validations: {
    id: string;
    code: string;
    message: string;
    field: string | null;
    blocking: boolean;
    severity: string;
  }[];
  lifecycle: {
    id: string;
    status: string;
    source: string;
    message: string | null;
    occurredAt: string;
  }[];
};

export type RemediateInput = {
  invoiceId: string;
  buyerSiren?: string;
  operationCategory?: "GOODS" | "SERVICES" | "MIXED";
  issueDate?: string;
  serviceDate?: string;
  deliveryDiffers?: boolean;
  deliveryLine1?: string;
  deliveryPostal?: string;
  deliveryCity?: string;
  /** Remplace les lignes si fourni */
  lines?: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
  }[];
  /** Si true et plus aucun blocage → statut VALIDATED (prête PA) + format FACTUR_X */
  markReady?: boolean;
};

export const getInvoiceDetail = createServerFn({ method: "GET" })
  .validator((data: { invoiceId: string }) => data)
  .handler(async ({ data }): Promise<InvoiceDetail | null> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return null;

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
      },
      include: {
        counterparty: true,
        lines: { orderBy: { lineNumber: "asc" } },
        validations: { orderBy: { createdAt: "asc" } },
        platformConnection: { include: { platform: true } },
        lifecycleEvents: { orderBy: { occurredAt: "asc" } },
      },
    });

    if (!invoice) return null;

    let archiveCount = 0;
    try {
      const rows = await db.$queryRaw<[{ c: bigint | number }]>`
        SELECT COUNT(*)::int AS c
        FROM invoice_archive_artifacts
        WHERE invoice_id = ${invoice.id}
      `;
      archiveCount = Number(rows[0]?.c ?? 0);
    } catch {
      archiveCount = 0;
    }

    const hasActivePa = Boolean(
      await db.organizationPlatformConnection.findFirst({
        where: {
          organizationId: workspace.organization.id,
          isActive: true,
          purpose: { in: ["EMISSION", "BOTH"] },
        },
        select: { id: true },
      }),
    );

    const lastReject = [...invoice.lifecycleEvents].reverse().find((e) => e.status === "REJECTED");

    return {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      direction: invoice.direction,
      format: invoice.format,
      transactionType: invoice.transactionType ?? "B2B_DOMESTIC",
      issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
      serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
      dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? null,
      buyerSiren: invoice.buyerSiren ?? invoice.counterparty?.siren ?? null,
      operationCategory: invoice.operationCategory,
      vatOnDebitsOption: invoice.vatOnDebitsOption,
      deliveryDiffers: invoice.deliveryDiffers,
      deliveryLine1: invoice.counterparty?.deliveryLine1 ?? null,
      deliveryPostal: invoice.counterparty?.deliveryPostal ?? null,
      deliveryCity: invoice.counterparty?.deliveryCity ?? null,
      subtotalHt: Number(invoice.subtotalHt),
      totalVat: Number(invoice.totalVat),
      totalTtc: Number(invoice.totalTtc),
      complianceScore: invoice.complianceScore != null ? Number(invoice.complianceScore) : null,
      facturxReady: Boolean(invoice.facturxStorageKey) || invoice.status === "VALIDATED",
      archived: invoice.status === "ARCHIVED",
      archiveCount,
      paReference: invoice.paReference,
      paStatus: invoice.paStatus,
      paStatusCode: invoice.paStatusCode,
      paStatusMessage: invoice.paStatusMessage,
      lastPaStatusAt: invoice.lastPaStatusAt?.toISOString() ?? null,
      transmittedAt: invoice.transmittedAt?.toISOString() ?? null,
      platformName: invoice.platformConnection?.platform.name ?? null,
      hasActivePa,
      rejectionReason: lastReject?.message ?? null,
      client: invoice.counterparty
        ? {
            id: invoice.counterparty.id,
            legalName: invoice.counterparty.legalName,
            siren: invoice.counterparty.siren,
          }
        : null,
      seller: {
        legalName: workspace.organization.legalName,
        siren: workspace.organization.siren,
      },
      lines: invoice.lines.map((l) => ({
        id: l.id,
        lineNumber: l.lineNumber,
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceHt: Number(l.unitPriceHt),
        vatRate: Number(l.vatRate),
        lineTotalHt: Number(l.lineTotalHt),
        lineVat: Number(l.lineVat),
      })),
      validations: invoice.validations.map((v) => ({
        id: v.id,
        code: v.code,
        message: v.message,
        field: v.field,
        blocking: v.blocking,
        severity: v.severity,
      })),
      lifecycle: invoice.lifecycleEvents.map((e) => ({
        id: e.id,
        status: e.status,
        source: e.source,
        message: e.message,
        occurredAt: e.occurredAt.toISOString(),
      })),
    };
  });

export const remediateInvoice = createServerFn({ method: "POST" })
  .validator((data: RemediateInput) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      error: string | null;
      status: string | null;
      issues: ValidationIssue[];
      detail: InvoiceDetail | null;
    }> => {
      const { loadWorkspace } = await import("@/lib/workspace.server");
      const { db } = await import("@/lib/db");
      const { validateInvoiceDraft, computeLineTotals } = await import("@/lib/invoice-validation");

      const workspace = await loadWorkspace();
      if (!workspace) {
        return {
          success: false,
          error: "Session expirée.",
          status: null,
          issues: [],
          detail: null,
        };
      }

      const invoice = await db.invoice.findFirst({
        where: {
          id: data.invoiceId,
          organizationId: workspace.organization.id,
        },
        include: { counterparty: true, lines: true },
      });

      if (!invoice) {
        return {
          success: false,
          error: "Facture introuvable.",
          status: null,
          issues: [],
          detail: null,
        };
      }

      if (["TRANSMITTING", "TRANSMITTED", "PAID", "ARCHIVED"].includes(invoice.status)) {
        return {
          success: false,
          error: "Cette facture ne peut plus être modifiée.",
          status: invoice.status,
          issues: [],
          detail: null,
        };
      }

      const siren =
        data.buyerSiren?.replace(/\s/g, "") ??
        invoice.buyerSiren ??
        invoice.counterparty?.siren ??
        null;
      const operationCategory = data.operationCategory ?? invoice.operationCategory;
      const issueDate = data.issueDate ?? invoice.issueDate?.toISOString().slice(0, 10) ?? null;
      const serviceDate =
        data.serviceDate ?? invoice.serviceDate?.toISOString().slice(0, 10) ?? null;
      const deliveryDiffers = data.deliveryDiffers ?? invoice.deliveryDiffers;
      const deliveryLine1 = data.deliveryLine1 ?? invoice.counterparty?.deliveryLine1 ?? null;
      const deliveryCity = data.deliveryCity ?? invoice.counterparty?.deliveryCity ?? null;
      const deliveryPostal = data.deliveryPostal ?? invoice.counterparty?.deliveryPostal ?? null;

      const lineInputs =
        data.lines && data.lines.length > 0
          ? data.lines.map((l) => ({
              description: l.description.trim(),
              quantity: Number(l.quantity),
              unitPriceHt: Number(l.unitPriceHt),
              vatRate: Number(l.vatRate),
            }))
          : invoice.lines.map((l) => ({
              description: l.description,
              quantity: Number(l.quantity),
              unitPriceHt: Number(l.unitPriceHt),
              vatRate: Number(l.vatRate),
            }));

      const issues = validateInvoiceDraft({
        buyerSiren: siren,
        operationCategory,
        deliveryDiffers,
        deliveryLine1,
        deliveryCity,
        issueDate,
        serviceDate,
        lines: lineInputs,
        sellerSiren: workspace.organization.siren,
      });

      const blocking = issues.filter((i) => i.blocking);
      const wantReady = data.markReady !== false;
      let nextStatus: "DRAFT" | "BLOCKED" | "VALIDATED" = invoice.status as
        "DRAFT" | "BLOCKED" | "VALIDATED";

      if (blocking.length > 0) {
        nextStatus = "BLOCKED";
      } else if (wantReady) {
        nextStatus = "VALIDATED";
      } else if (invoice.status === "BLOCKED") {
        nextStatus = "DRAFT";
      }

      let subtotalHt = 0;
      let totalVat = 0;
      const lineRows = lineInputs.map((line, index) => {
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
        if (invoice.counterpartyId) {
          await tx.counterparty.update({
            where: { id: invoice.counterpartyId },
            data: {
              siren: siren && /^\d{9}$/.test(siren) ? siren : undefined,
              ...(deliveryDiffers
                ? {
                    deliveryLine1: deliveryLine1?.trim() || null,
                    deliveryPostal: deliveryPostal?.trim() || null,
                    deliveryCity: deliveryCity?.trim() || null,
                    deliveryCountry: "FR",
                  }
                : {}),
            },
          });
        }

        let number = invoice.number;
        if (nextStatus === "VALIDATED" && !number) {
          let seq = await tx.invoiceSequence.findFirst({
            where: { organizationId: workspace.organization.id, prefix: "FAC", fiscalYear: null },
          });
          if (!seq) {
            seq = await tx.invoiceSequence.create({
              data: {
                organizationId: workspace.organization.id,
                prefix: "FAC",
                nextNumber: 1,
                padding: 4,
              },
            });
          }
          number = `${seq.prefix}-${String(seq.nextNumber).padStart(seq.padding, "0")}`;
          await tx.invoiceSequence.update({
            where: { id: seq.id },
            data: { nextNumber: seq.nextNumber + 1 },
          });
        }

        await tx.invoiceValidation.deleteMany({ where: { invoiceId: invoice.id } });

        if (data.lines && data.lines.length > 0) {
          await tx.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
        }

        const score =
          Math.round(
            ((4 - Math.min(4, blocking.length)) / 4) * 1000 -
              issues.filter((i) => !i.blocking).length * 25,
          ) / 10;

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: nextStatus,
            number,
            format: nextStatus === "VALIDATED" ? "FACTUR_X" : invoice.format,
            buyerSiren: siren,
            operationCategory: operationCategory ?? undefined,
            issueDate: issueDate ? new Date(issueDate) : null,
            serviceDate: serviceDate ? new Date(serviceDate) : null,
            deliveryDiffers,
            subtotalHt: data.lines && data.lines.length > 0 ? subtotalHt : undefined,
            totalVat: data.lines && data.lines.length > 0 ? totalVat : undefined,
            totalTtc: data.lines && data.lines.length > 0 ? totalTtc : undefined,
            complianceScore: Math.max(0, Math.min(100, score)),
            issuedAt: nextStatus === "VALIDATED" ? new Date() : invoice.issuedAt,
            ...(data.lines && data.lines.length > 0 ? { lines: { create: lineRows } } : {}),
            validations: {
              create: issues.map((issue) => ({
                code: issue.code,
                message: issue.message,
                severity: issue.severity,
                field: issue.field ?? null,
                blocking: issue.blocking,
              })),
            },
            lifecycleEvents: {
              create: {
                status: nextStatus,
                scope: "EMISSION",
                source: "remediation",
                message:
                  nextStatus === "VALIDATED"
                    ? invoice.status === "REJECTED"
                      ? "Facture prête à renvoyer après rejet PA"
                      : "Facture prête (READY) — conforme mentions 2026"
                    : nextStatus === "BLOCKED"
                      ? "Facture toujours bloquée après correction"
                      : "Facture mise à jour (correction humaine)",
              },
            },
          },
        });
      });

      const detail = await getInvoiceDetail({ data: { invoiceId: data.invoiceId } });

      return {
        success: true,
        error: null,
        status: nextStatus,
        issues,
        detail,
      };
    },
  );

export const renderFacturX = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; xml: string; summary: string; filename: string }
      | { success: false; error: string }
    > => {
      const { loadWorkspace } = await import("@/lib/workspace.server");
      const { db } = await import("@/lib/db");
      const { buildFacturXReadableSummary, buildFacturXXml } = await import("@/lib/facturx");
      const { validateInvoiceDraft } = await import("@/lib/invoice-validation");

      const workspace = await loadWorkspace();
      if (!workspace) return { success: false, error: "Session expirée." };

      const invoice = await db.invoice.findFirst({
        where: {
          id: data.invoiceId,
          organizationId: workspace.organization.id,
        },
        include: { counterparty: true, lines: { orderBy: { lineNumber: "asc" } } },
      });

      if (!invoice) return { success: false, error: "Facture introuvable." };
      if (!invoice.counterparty) return { success: false, error: "Client manquant." };

      const buyerSiren = invoice.buyerSiren ?? invoice.counterparty.siren;
      const issues = validateInvoiceDraft({
        buyerSiren,
        operationCategory: invoice.operationCategory,
        deliveryDiffers: invoice.deliveryDiffers,
        deliveryLine1: invoice.counterparty.deliveryLine1,
        deliveryCity: invoice.counterparty.deliveryCity,
        issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
        serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
        lines: invoice.lines.map((l) => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPriceHt: Number(l.unitPriceHt),
          vatRate: Number(l.vatRate),
        })),
        sellerSiren: workspace.organization.siren,
      });

      if (issues.some((i) => i.blocking)) {
        return {
          success: false,
          error:
            "Impossible de générer le Factur-X : contrôles bloquants restants. Corrigez d’abord.",
        };
      }

      if (!invoice.operationCategory) {
        return { success: false, error: "Catégorie d’opération manquante." };
      }

      const number = invoice.number ?? `TMP-${invoice.id.slice(-6).toUpperCase()}`;
      const issueDate =
        invoice.issueDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);

      const payload = {
        number,
        issueDate,
        seller: {
          legalName: workspace.organization.legalName,
          siren: workspace.organization.siren,
        },
        buyer: {
          legalName: invoice.counterparty.legalName,
          siren: buyerSiren!,
        },
        operationCategory: invoice.operationCategory,
        lines: invoice.lines.map((l) => ({
          lineNumber: l.lineNumber,
          description: l.description,
          quantity: Number(l.quantity),
          unitPriceHt: Number(l.unitPriceHt),
          vatRate: Number(l.vatRate),
          lineTotalHt: Number(l.lineTotalHt),
          lineVat: Number(l.lineVat),
        })),
        subtotalHt: Number(invoice.subtotalHt),
        totalVat: Number(invoice.totalVat),
        totalTtc: Number(invoice.totalTtc),
      };

      const xml = buildFacturXXml(payload);
      const summary = buildFacturXReadableSummary(payload);
      const storageKey = `org/${workspace.organization.id}/invoices/${invoice.id}/factur-x.xml`;

      await db.invoice.update({
        where: { id: invoice.id },
        data: {
          format: "FACTUR_X",
          facturxStorageKey: storageKey,
          status:
            invoice.status === "DRAFT" || invoice.status === "BLOCKED"
              ? "VALIDATED"
              : invoice.status,
          number: invoice.number ?? number,
          pdfStorageKey: `org/${workspace.organization.id}/invoices/${invoice.id}/readable.txt`,
        },
      });

      const { recordRenderArtifact } = await import("@/api/pipeline/jobs");
      await recordRenderArtifact({
        organizationId: workspace.organization.id,
        invoiceId: invoice.id,
        xml,
      });

      return {
        success: true,
        xml,
        summary,
        filename: `${number}.facturx.xml`,
      };
    },
  );
