/** Validation mentions obligatoires Module B (côté serveur) */

import type { TransactionType } from "@/lib/transaction-type";
import { requiresBuyerSiren } from "@/lib/transaction-type";

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitPriceHt: number;
  vatRate: number;
};

export type CreateInvoiceInput = {
  counterpartyId: string;
  transactionType: TransactionType;
  issueDate: string;
  serviceDate: string;
  dueDate?: string;
  operationCategory: "GOODS" | "SERVICES" | "MIXED";
  vatOnDebitsOption: boolean;
  deliveryDiffers: boolean;
  deliveryLine1?: string;
  deliveryPostal?: string;
  deliveryCity?: string;
  paymentTermsDays?: number;
  latePenaltyRate?: number;
  franchiseVatMention: boolean;
  lines: InvoiceLineInput[];
  /** Si true : valide et numérote ; sinon brouillon */
  publish: boolean;
};

export type ValidationIssue = {
  code: string;
  message: string;
  field?: string;
  blocking: boolean;
  severity: "ERROR" | "WARNING" | "INFO";
};

export function validateInvoiceDraft(input: {
  buyerSiren: string | null | undefined;
  transactionType?: TransactionType;
  operationCategory: string | null | undefined;
  deliveryDiffers: boolean;
  deliveryLine1?: string | null;
  deliveryCity?: string | null;
  issueDate?: string | null;
  serviceDate?: string | null;
  lines: InvoiceLineInput[];
  sellerSiren?: string | null;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.issueDate) {
    issues.push({
      code: "ISSUE_DATE",
      message: "Date d'émission obligatoire",
      field: "issueDate",
      blocking: true,
      severity: "ERROR",
    });
  }

  if (!input.serviceDate) {
    issues.push({
      code: "SERVICE_DATE",
      message: "Date de vente / prestation obligatoire",
      field: "serviceDate",
      blocking: true,
      severity: "ERROR",
    });
  }

  if (requiresBuyerSiren(input.transactionType ?? "B2B_DOMESTIC")) {
    if (!input.buyerSiren || !/^\d{9}$/.test(input.buyerSiren)) {
      issues.push({
        code: "BUYER_SIREN_2026",
        message: "SIREN du client obligatoire (mention 2026 — flux B2B)",
        field: "buyerSiren",
        blocking: true,
        severity: "ERROR",
      });
    }
  }

  if (!input.operationCategory) {
    issues.push({
      code: "OPERATION_CATEGORY_2026",
      message: "Catégorie d'opération obligatoire (biens / services / mixte)",
      field: "operationCategory",
      blocking: true,
      severity: "ERROR",
    });
  }

  if (input.deliveryDiffers && (!input.deliveryLine1 || !input.deliveryCity)) {
    issues.push({
      code: "DELIVERY_ADDRESS_2026",
      message: "Adresse de livraison obligatoire si différente de la facturation",
      field: "delivery",
      blocking: true,
      severity: "ERROR",
    });
  }

  if (!input.lines.length) {
    issues.push({
      code: "NO_LINES",
      message: "Au moins une ligne de facture est requise",
      field: "lines",
      blocking: true,
      severity: "ERROR",
    });
  }

  input.lines.forEach((line, index) => {
    if (!line.description.trim()) {
      issues.push({
        code: "LINE_DESC",
        message: `Ligne ${index + 1} : dénomination obligatoire`,
        field: `lines.${index}.description`,
        blocking: true,
        severity: "ERROR",
      });
    }
    if (!(line.quantity > 0)) {
      issues.push({
        code: "LINE_QTY",
        message: `Ligne ${index + 1} : quantité invalide`,
        field: `lines.${index}.quantity`,
        blocking: true,
        severity: "ERROR",
      });
    }
  });

  if (input.sellerSiren === "000000000") {
    issues.push({
      code: "SELLER_SIREN_PLACEHOLDER",
      message: "Complétez le SIREN de votre entreprise dans les paramètres",
      field: "organization",
      blocking: false,
      severity: "WARNING",
    });
  }

  return issues;
}

/** Réexport pour les appels analyse / émission */
export { validateSellerMatchesOrganization } from "@/lib/seller-org-match";

export function computeLineTotals(line: InvoiceLineInput) {
  const lineTotalHt = Math.round(line.quantity * line.unitPriceHt * 100) / 100;
  const lineVat = Math.round(lineTotalHt * (line.vatRate / 100) * 100) / 100;
  return { lineTotalHt, lineVat };
}
