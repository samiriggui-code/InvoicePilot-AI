import { createServerFn } from "@tanstack/react-start";

import type { CreateInvoiceInput } from "@/lib/invoice-validation";
import { mockInvoiceExcludeOr } from "@/lib/mock-invoice-exclude";
import {
  clientMatchesTransactionType,
  inferTransactionType,
  isEReportingTransaction,
  type TransactionType,
} from "@/lib/transaction-type";

export type InvoiceListItem = {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: string;
  paStatus: string | null;
  paStatusMessage: string | null;
  issueDate: string | null;
  format: string | null;
};

/** Émission = prêtes / en cours / déjà envoyées PA (pas brouillon ni bloqué). */
const EMISSION_STATUSES = [
  "VALIDATED",
  "TRANSMITTING",
  "TRANSMITTED",
  "REJECTED",
  "APPROVED",
  "PAID",
] as const;

function mapInvoiceRow(inv: {
  id: string;
  number: string | null;
  totalTtc: { toString(): string } | number;
  status: string;
  paStatus?: string | null;
  paStatusMessage?: string | null;
  issueDate: Date | null;
  format: string | null;
  counterparty: { legalName: string } | null;
}): InvoiceListItem {
  return {
    id: inv.id,
    number: inv.number ?? "Brouillon",
    client: inv.counterparty?.legalName ?? "—",
    amount: Number(inv.totalTtc),
    status: inv.status,
    paStatus: inv.paStatus ?? null,
    paStatusMessage: inv.paStatusMessage ?? null,
    issueDate: inv.issueDate?.toISOString().slice(0, 10) ?? null,
    format: inv.format,
  };
}

/** Liste générique (hors Émission) — ventes non seed. */
export const listInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<InvoiceListItem[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: workspace.organization.id,
        direction: "SALE",
        NOT: {
          OR: mockInvoiceExcludeOr(),
        },
      },
      include: { counterparty: { select: { legalName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return invoices.map(mapInvoiceRow);
  },
);

/**
 * Registre Émission — uniquement factures prêtes / en cours PA.
 * Exclut seed Dupont + imports boutique sandbox non passés par Analyse IA.
 */
export const listEmissionInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<InvoiceListItem[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: workspace.organization.id,
        direction: "SALE",
        transactionType: "B2B_DOMESTIC",
        status: { in: [...EMISSION_STATUSES] },
        NOT: {
          OR: mockInvoiceExcludeOr(),
        },
        OR: [
          // Passées par Analyse IA / correction humaine
          {
            lifecycleEvents: {
              some: { source: { in: ["ai-analyze", "ai-extract", "remediation"] } },
            },
          },
          // Créées manuellement dans l’app (pas un import boutique)
          {
            AND: [
              { OR: [{ sourceSystem: null }, { sourceSystem: "" }] },
              {
                status: {
                  in: [
                    "VALIDATED",
                    "TRANSMITTING",
                    "TRANSMITTED",
                    "REJECTED",
                    "APPROVED",
                    "PAID",
                    "ARCHIVED",
                  ],
                },
              },
            ],
          },
        ],
      },
      include: { counterparty: { select: { legalName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return invoices.map(mapInvoiceRow);
  },
);

export const getInvoiceFormOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { loadWorkspace } = await import("@/lib/workspace.server");
  const { db } = await import("@/lib/db");

  const workspace = await loadWorkspace();
  if (!workspace) return null;

  const clients = await db.counterparty.findMany({
    where: {
      organizationId: workspace.organization.id,
      type: { in: ["CLIENT", "BOTH"] },
    },
    orderBy: { legalName: "asc" },
    select: {
      id: true,
      legalName: true,
      siren: true,
      billingCity: true,
      billingCountry: true,
      isConsumer: true,
      defaultTransactionType: true,
    },
  });

  return {
    clients,
    organization: {
      legalName: workspace.organization.legalName,
      siren: workspace.organization.siren,
      vatRegime: workspace.organization.vatRegime,
    },
  };
});

export const createInvoice = createServerFn({ method: "POST" })
  .validator((data: CreateInvoiceInput) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { computeLineTotals, validateInvoiceDraft } = await import("@/lib/invoice-validation");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false as const, error: "Session expirée.", id: null, issues: [] };
    }

    if (!data.counterpartyId) {
      return {
        success: false as const,
        error: "Sélectionnez un client.",
        id: null,
        issues: [],
      };
    }

    const client = await db.counterparty.findFirst({
      where: {
        id: data.counterpartyId,
        organizationId: workspace.organization.id,
      },
    });

    if (!client) {
      return { success: false as const, error: "Client introuvable.", id: null, issues: [] };
    }

    const lines = (data.lines ?? []).filter((l) => l.description.trim() || l.quantity > 0);
    const transactionType: TransactionType =
      data.transactionType ??
      inferTransactionType({
        isConsumer: client.isConsumer,
        billingCountry: client.billingCountry,
        buyerSiren: client.siren,
        explicit: client.defaultTransactionType,
      });

    if (!clientMatchesTransactionType(client, transactionType)) {
      return {
        success: false as const,
        error: "Le client sélectionné ne correspond pas au type de flux choisi.",
        id: null,
        issues: [],
      };
    }

    const buyerSiren = transactionType === "B2B_DOMESTIC" ? client.siren : null;

    const issues = validateInvoiceDraft({
      buyerSiren,
      transactionType,
      operationCategory: data.operationCategory,
      deliveryDiffers: data.deliveryDiffers,
      deliveryLine1: data.deliveryLine1,
      deliveryCity: data.deliveryCity,
      issueDate: data.issueDate,
      serviceDate: data.serviceDate,
      lines,
      sellerSiren: workspace.organization.siren,
    });

    const blocking = issues.filter((i) => i.blocking);
    // publish avec erreurs → enregistrement BLOCKED (parcours corriger)

    let subtotalHt = 0;
    let totalVat = 0;
    const lineRows = lines.map((line, index) => {
      const { lineTotalHt, lineVat } = computeLineTotals(line);
      subtotalHt += lineTotalHt;
      totalVat += lineVat;
      return {
        lineNumber: index + 1,
        description: line.description.trim(),
        quantity: line.quantity,
        unitPriceHt: line.unitPriceHt,
        vatRate: line.vatRate,
        lineTotalHt,
        lineVat,
      };
    });

    subtotalHt = Math.round(subtotalHt * 100) / 100;
    totalVat = Math.round(totalVat * 100) / 100;
    const totalTtc = Math.round((subtotalHt + totalVat) * 100) / 100;

    const orgId = workspace.organization.id;
    const publishOk = data.publish && blocking.length === 0;
    const publishBlocked = data.publish && blocking.length > 0;

    const invoice = await db.$transaction(async (tx) => {
      let number: string | null = null;
      let status: "DRAFT" | "VALIDATED" | "BLOCKED" = "DRAFT";

      if (publishOk) {
        let seq = await tx.invoiceSequence.findFirst({
          where: { organizationId: orgId, prefix: "FAC", fiscalYear: null },
        });
        if (!seq) {
          seq = await tx.invoiceSequence.create({
            data: { organizationId: orgId, prefix: "FAC", nextNumber: 1, padding: 4 },
          });
        }
        number = `${seq.prefix}-${String(seq.nextNumber).padStart(seq.padding, "0")}`;
        await tx.invoiceSequence.update({
          where: { id: seq.id },
          data: { nextNumber: seq.nextNumber + 1 },
        });
        status = "VALIDATED";
      } else if (publishBlocked) {
        status = "BLOCKED";
      }

      const created = await tx.invoice.create({
        data: {
          organizationId: orgId,
          counterpartyId: client.id,
          direction: "SALE",
          type: "INVOICE",
          status,
          format: publishOk ? "FACTUR_X" : null,
          number,
          issueDate: data.issueDate ? new Date(data.issueDate) : null,
          serviceDate: data.serviceDate ? new Date(data.serviceDate) : null,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          buyerSiren: buyerSiren ?? null,
          transactionType,
          operationCategory: data.operationCategory,
          vatOnDebitsOption: data.vatOnDebitsOption,
          deliveryDiffers: data.deliveryDiffers,
          paymentTermsDays: data.paymentTermsDays ?? 30,
          latePenaltyRate: data.latePenaltyRate ?? 10.5,
          recoveryFeeAmount: 40,
          franchiseVatMention: data.franchiseVatMention,
          subtotalHt,
          totalVat,
          totalTtc,
          complianceScore: publishOk
            ? 100 - issues.filter((i) => !i.blocking).length * 5
            : publishBlocked
              ? Math.max(0, 100 - blocking.length * 25)
              : null,
          issuedAt: publishOk ? new Date() : null,
          lines: { create: lineRows },
          validations: {
            create: issues.map((issue) => ({
              code: issue.code,
              message: issue.message,
              severity: issue.severity,
              field: issue.field ?? null,
              blocking: issue.blocking,
            })),
          },
          lifecycleEvents:
            publishOk || publishBlocked
              ? {
                  create: {
                    status: publishOk ? "VALIDATED" : "BLOCKED",
                    scope: "EMISSION",
                    source: "app",
                    message: publishOk
                      ? isEReportingTransaction(transactionType)
                        ? "Facture validée — flux e-reporting (lot périodique via PA)"
                        : "Facture validée (conformité mentions 2026) — prête PA e-invoicing"
                      : "Facture bloquée — corriger les mentions avant émission",
                  },
                }
              : undefined,
        },
      });

      if (data.deliveryDiffers && data.deliveryLine1) {
        await tx.counterparty.update({
          where: { id: client.id },
          data: {
            deliveryLine1: data.deliveryLine1.trim(),
            deliveryPostal: data.deliveryPostal?.trim() || null,
            deliveryCity: data.deliveryCity?.trim() || null,
            deliveryCountry: "FR",
          },
        });
      }

      return created;
    });

    return {
      success: true as const,
      error: publishBlocked
        ? "Facture enregistrée mais bloquée — corrigez les mentions 2026."
        : null,
      id: invoice.id,
      issues,
      number: invoice.number,
      status: invoice.status,
      blocked: publishBlocked,
    };
  });
