import type { InvoiceStatus, PaTransmissionStatus } from "@prisma/client";

/** Libellés UI — alignés sur le cycle DGFiP / statuts réseau PA */
export const PA_STATUS_LABELS: Record<PaTransmissionStatus, string> = {
  QUEUED: "En file d’attente",
  SUBMITTED_TO_PA: "Déposée sur la PA",
  ACCEPTED_BY_PA: "Acceptée par la PA",
  DELIVERED_TO_BUYER_PA: "Mise à disposition acheteur",
  RECEIVED: "Reçue",
  REFUSED: "Refusée",
  REJECTED: "Rejetée",
  TECHNICAL_ERROR: "Erreur technique PA",
};

/** Mapping statut PA → statut métier facture (émission) */
export function invoiceStatusForPaEmission(paStatus: PaTransmissionStatus): InvoiceStatus | null {
  switch (paStatus) {
    case "QUEUED":
      return "VALIDATED";
    case "SUBMITTED_TO_PA":
      return "TRANSMITTING";
    case "ACCEPTED_BY_PA":
    case "DELIVERED_TO_BUYER_PA":
      return "TRANSMITTED";
    case "RECEIVED":
      return "RECEIVED";
    case "REFUSED":
      return "REFUSED";
    case "REJECTED":
      return "REJECTED";
    case "TECHNICAL_ERROR":
      return "TRANSMITTING";
    default:
      return null;
  }
}

/** Codes partenaires courants → statut interne (WeInvoice, PPF, Peppol…) */
const PARTNER_CODE_MAP: Record<string, PaTransmissionStatus> = {
  // WeInvoice / DGFiP simplifiés
  DEPOSITED: "SUBMITTED_TO_PA",
  DEPOSIT: "SUBMITTED_TO_PA",
  SUBMITTED: "SUBMITTED_TO_PA",
  AVAILABLE: "DELIVERED_TO_BUYER_PA",
  MISE_A_DISPOSITION: "DELIVERED_TO_BUYER_PA",
  ACCEPTED: "ACCEPTED_BY_PA",
  RECEIVED: "RECEIVED",
  REFUSED: "REFUSED",
  REJECTED: "REJECTED",
  REJECT: "REJECTED",
  ERROR: "TECHNICAL_ERROR",
  TECHNICAL_ERROR: "TECHNICAL_ERROR",
  PA_ACCEPTED: "ACCEPTED_BY_PA",
  PA_DELIVERED: "DELIVERED_TO_BUYER_PA",
};

export function mapPartnerPaCode(code: string): PaTransmissionStatus | null {
  const key = code
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return PARTNER_CODE_MAP[key] ?? null;
}

export type PaStatusPresentation = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
};

export function paStatusPresentation(status: PaTransmissionStatus): PaStatusPresentation {
  switch (status) {
    case "ACCEPTED_BY_PA":
    case "DELIVERED_TO_BUYER_PA":
    case "RECEIVED":
      return { label: PA_STATUS_LABELS[status], variant: "default" };
    case "SUBMITTED_TO_PA":
    case "QUEUED":
      return { label: PA_STATUS_LABELS[status], variant: "secondary" };
    case "REFUSED":
    case "REJECTED":
    case "TECHNICAL_ERROR":
      return { label: PA_STATUS_LABELS[status], variant: "destructive" };
    default:
      return { label: PA_STATUS_LABELS[status], variant: "outline" };
  }
}
