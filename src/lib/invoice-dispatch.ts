import {
  isEReportingTransaction,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/transaction-type";

export type DispatchTarget = "emission" | "e-reporting" | "blocked" | "review";

export function resolveDispatchTarget(input: {
  valid: boolean;
  blocked: boolean;
  transactionType: string;
}): DispatchTarget {
  if (input.blocked || !input.valid) {
    return input.blocked ? "blocked" : "review";
  }
  if (isEReportingTransaction(input.transactionType as TransactionType)) {
    return "e-reporting";
  }
  return "emission";
}

export function dispatchLabel(target: DispatchTarget): string {
  switch (target) {
    case "emission":
      return "Émission PA";
    case "e-reporting":
      return "E-reporting";
    case "blocked":
      return "Correction";
    case "review":
      return "Revue";
  }
}

export function dispatchHref(target: DispatchTarget, invoiceId: string): string | null {
  if (target === "emission") return `/invoices/${invoiceId}`;
  if (target === "e-reporting") return "/e-reporting";
  if (target === "blocked" || target === "review") return `/invoices/${invoiceId}`;
  return null;
}

export function transactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type as TransactionType] ?? type;
}

/**
 * Seuil de fiabilité extraction selon le flux :
 * - B2B (Factur-X / PA) : plus strict
 * - B2C / export / intra-UE (lot e-reporting) : heuristique ticket OK
 */
export function isExtractionReliableForFlux(input: {
  transactionType: string;
  confidence: number;
  source: "llm" | "heuristic" | "skipped" | "none";
  needsEnrichment: boolean;
}): boolean {
  if (!input.needsEnrichment) return true;
  if (input.source === "llm" || input.source === "skipped") return true;
  const ereporting = isEReportingTransaction(input.transactionType as TransactionType);
  const min = ereporting ? 0.28 : 0.55;
  return input.confidence >= min;
}

/** Mise en forme déterministe avant VALIDATED / dispatch. */
export function formatInvoiceForDispatch(input: {
  number: string | null;
  currency: string | null;
  format: string | null;
  transactionType: string;
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  lines: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    vatRate: number;
    lineTotalHt: number;
    lineVat: number;
  }[];
}) {
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const currency = (input.currency || "EUR").toUpperCase().slice(0, 3);
  const formatRaw = (input.format || "FACTUR_X").toUpperCase();
  const format: "FACTUR_X" | "UBL" | "CII" = (["FACTUR_X", "UBL", "CII"] as const).includes(
    formatRaw as "FACTUR_X" | "UBL" | "CII",
  )
    ? (formatRaw as "FACTUR_X" | "UBL" | "CII")
    : "FACTUR_X";
  const number = input.number?.trim().replace(/\s+/g, "").toUpperCase() || null;

  const lines = input.lines.map((l, i) => ({
    lineNumber: i + 1,
    description: (l.description || `Ligne ${i + 1}`).trim().slice(0, 500),
    quantity: Math.max(0.001, Number(l.quantity) || 1),
    unitPriceHt: round2(Math.max(0, Number(l.unitPriceHt) || 0)),
    vatRate: [0, 2.1, 5.5, 10, 20].includes(Number(l.vatRate)) ? Number(l.vatRate) : 20,
    lineTotalHt: round2(l.lineTotalHt),
    lineVat: round2(l.lineVat),
  }));

  return {
    number,
    currency,
    format,
    transactionType: input.transactionType,
    subtotalHt: round2(input.subtotalHt),
    totalVat: round2(input.totalVat),
    totalTtc: round2(input.totalTtc),
    lines,
  };
}
