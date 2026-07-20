import { createServerFn } from "@tanstack/react-start";

import type { AnalysisQueueVerdict } from "@/fns/clients";
import { isEReportingTransaction, type TransactionType } from "@/lib/transaction-type";

export type AnalysisDetailSheet = {
  id: string;
  number: string;
  status: string;
  verdict: AnalysisQueueVerdict;
  score: number | null;
  clientName: string;
  clientSiren: string | null;
  amountTtc: number;
  hasPdf: boolean;
  transactionType: string;
  analyzed: boolean;
  /** Cible de dispatch post-analyse */
  dispatch: "emission" | "e-reporting" | "blocked" | "review";
  nextAction: {
    label: string;
    hint: string;
    href: string | null;
  };
  validations: {
    id: string;
    code: string;
    message: string;
    blocking: boolean;
    severity: string;
    field: string | null;
  }[];
  timeline: {
    id: string;
    status: string;
    source: string;
    message: string | null;
    occurredAt: string;
  }[];
};

function verdictFrom(
  status: string,
  blockingCount: number,
  analyzed: boolean,
): AnalysisQueueVerdict {
  if (!analyzed) return "A_ANALYSER";
  if (
    ["VALIDATED", "TRANSMITTING", "TRANSMITTED", "APPROVED", "PAID"].includes(status) &&
    blockingCount === 0
  ) {
    return "PASSE";
  }
  if (status === "ARCHIVED" && blockingCount === 0) return "PASSE";
  if (status === "BLOCKED" || blockingCount > 0) return "BLOQUE";
  return "A_VALIDER";
}

function dispatchFor(
  verdict: AnalysisQueueVerdict,
  transactionType: string,
): AnalysisDetailSheet["dispatch"] {
  if (verdict === "BLOQUE") return "blocked";
  if (verdict === "A_ANALYSER" || verdict === "A_VALIDER") return "review";
  if (isEReportingTransaction(transactionType as TransactionType)) return "e-reporting";
  return "emission";
}

function nextActionFor(verdict: AnalysisQueueVerdict, invoiceId: string, transactionType: string) {
  const ereporting = isEReportingTransaction(transactionType as TransactionType);
  switch (verdict) {
    case "A_ANALYSER":
      return {
        label: "Lancer l’analyse IA",
        hint: "Extraction + segmentation B2B / B2C + contrôles avant dispatch.",
        href: null as string | null,
      };
    case "BLOQUE":
      return {
        label: "Rester sur Analyse IA",
        hint: "Corrigez ici (sheet) puis Relancer — pas d’émission tant que bloqué.",
        href: "/agent",
      };
    case "A_VALIDER":
      return {
        label: "Rester sur Analyse IA",
        hint: "Complétez / relancez ici — dispatch seulement après Passé.",
        href: "/agent",
      };
    case "PASSE":
      return ereporting
        ? {
            label: "Ouvrir E-reporting",
            hint: "Flux B2C / export / intra-UE — à regrouper dans un lot périodique.",
            href: "/e-reporting",
          }
        : {
            label: "Ouvrir Émission PA",
            hint: "Flux B2B — facture prête à déposer vers votre plateforme agréée.",
            href: `/invoices/${invoiceId}`,
          };
  }
}

export const getAnalysisDetail = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string }) => data)
  .handler(async ({ data }): Promise<{ detail: AnalysisDetailSheet | null; error?: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { detail: null, error: "Session expirée." };

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
        direction: "SALE",
      },
      include: {
        counterparty: { select: { legalName: true, siren: true } },
        validations: { orderBy: { createdAt: "desc" }, take: 40 },
        lifecycleEvents: { orderBy: { occurredAt: "asc" }, take: 50 },
      },
    });

    if (!invoice) return { detail: null, error: "Facture introuvable." };

    const blockingCount = invoice.validations.filter((v) => v.blocking).length;
    const analyzed = invoice.lifecycleEvents.some((e) =>
      ["ai-analyze", "ai-extract", "remediation"].includes(e.source),
    );
    const verdict = verdictFrom(invoice.status, blockingCount, analyzed);
    const transactionType = invoice.transactionType ?? "B2B_DOMESTIC";

    return {
      detail: {
        id: invoice.id,
        number: invoice.number ?? "Brouillon",
        status: invoice.status,
        verdict,
        score: invoice.complianceScore != null ? Number(invoice.complianceScore) : null,
        clientName: invoice.counterparty?.legalName ?? "Client inconnu",
        clientSiren: invoice.buyerSiren ?? invoice.counterparty?.siren ?? null,
        amountTtc: Number(invoice.totalTtc),
        hasPdf: Boolean(invoice.pdfStorageKey),
        transactionType,
        analyzed,
        dispatch: dispatchFor(verdict, transactionType),
        nextAction: nextActionFor(verdict, invoice.id, transactionType),
        validations: invoice.validations.map((v) => ({
          id: v.id,
          code: v.code,
          message: v.message,
          blocking: v.blocking,
          severity: v.severity,
          field: v.field,
        })),
        timeline: invoice.lifecycleEvents.map((e) => ({
          id: e.id,
          status: e.status,
          source: e.source,
          message: e.message,
          occurredAt: e.occurredAt.toISOString(),
        })),
      },
    };
  });
