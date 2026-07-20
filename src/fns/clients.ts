import { createServerFn } from "@tanstack/react-start";

import { mockInvoiceExcludeOr } from "@/lib/mock-invoice-exclude";

export type ClientListItem = {
  id: string;
  legalName: string;
  siren: string | null;
  siret: string | null;
  vatNumber: string | null;
  email: string | null;
  phone: string | null;
  billingLine1: string | null;
  billingPostal: string | null;
  city: string | null;
  billingCountry: string;
  type: string;
  directoryPaName: string | null;
  invoiceCount: number;
  analyzedCount: number;
  passedCount: number;
  blockedCount: number;
  updatedAt: string;
};

export type CreateClientInput = {
  legalName: string;
  clientKind?: "B2B" | "B2C" | "EXPORT" | "INTRA_EU";
  siren?: string;
  siret?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  billingLine1?: string;
  billingPostal?: string;
  billingCity?: string;
  billingCountry?: string;
};

export type UpdateClientInput = CreateClientInput & { id: string };

/** Verdict post-Analyse IA / remédiation — pipeline vers Émission PA */
export type ClientInvoiceVerdict = "PASSE" | "BLOQUE" | "A_VALIDER";

/** File d’attente Analyse IA (toutes ventes) */
export type AnalysisQueueVerdict = ClientInvoiceVerdict | "A_ANALYSER";

export type ClientPipelineInvoice = {
  id: string;
  number: string;
  clientId: string | null;
  clientName: string;
  clientSiren: string | null;
  amount: number;
  status: string;
  verdict: ClientInvoiceVerdict;
  score: number | null;
  blockingCount: number;
  analyzedAt: string | null;
  issueDate: string | null;
};

export type AnalysisQueueInvoice = Omit<ClientPipelineInvoice, "verdict"> & {
  verdict: AnalysisQueueVerdict;
  analyzed: boolean;
  transactionType: string;
};

function invoiceVerdict(input: { status: string; blockingCount: number }): ClientInvoiceVerdict {
  if (
    ["VALIDATED", "TRANSMITTING", "TRANSMITTED", "APPROVED", "PAID", "ARCHIVED"].includes(
      input.status,
    ) &&
    input.blockingCount === 0
  ) {
    return "PASSE";
  }
  if (input.status === "BLOCKED" || input.blockingCount > 0) {
    return "BLOQUE";
  }
  return "A_VALIDER";
}

export const listClients = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientListItem[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const clients = await db.counterparty.findMany({
      where: {
        organizationId: workspace.organization.id,
        type: { in: ["CLIENT", "BOTH"] },
        NOT: {
          OR: [
            { id: { startsWith: "seed-" } },
            { legalName: { contains: "Demo", mode: "insensitive" } },
            { legalName: { contains: "Test Rejet", mode: "insensitive" } },
          ],
        },
      },
      orderBy: { legalName: "asc" },
      take: 200,
      include: {
        invoices: {
          where: {
            direction: "SALE",
            NOT: { OR: mockInvoiceExcludeOr() },
          },
          select: {
            id: true,
            status: true,
            lifecycleEvents: {
              where: { source: { in: ["ai-analyze", "ai-extract", "remediation"] } },
              select: { id: true },
              take: 1,
            },
            validations: { where: { blocking: true }, select: { id: true } },
          },
        },
      },
    });

    return clients.map((c) => {
      let passedCount = 0;
      let blockedCount = 0;
      let analyzedCount = 0;
      for (const inv of c.invoices) {
        if (inv.lifecycleEvents.length > 0) {
          analyzedCount += 1;
          const v = invoiceVerdict({
            status: inv.status,
            blockingCount: inv.validations.length,
          });
          if (v === "PASSE") passedCount += 1;
          else if (v === "BLOQUE") blockedCount += 1;
        }
      }
      return {
        id: c.id,
        legalName: c.legalName,
        siren: c.siren,
        siret: c.siret,
        vatNumber: c.vatNumber,
        email: c.email,
        phone: c.phone,
        billingLine1: c.billingLine1,
        billingPostal: c.billingPostal,
        city: c.billingCity,
        billingCountry: c.billingCountry,
        type: c.type,
        directoryPaName: c.directoryPaName,
        invoiceCount: c.invoices.length,
        analyzedCount,
        passedCount,
        blockedCount,
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  },
);

/**
 * Factures déjà passées par Analyse IA (± correction humaine) —
 * page Acheteurs : une seule liste.
 */
export const listAnalyzedClientInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClientPipelineInvoice[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const invoices = await db.invoice.findMany({
      where: {
        organizationId: workspace.organization.id,
        direction: "SALE",
        lifecycleEvents: {
          some: { source: { in: ["ai-analyze", "ai-extract", "remediation"] } },
        },
        NOT: {
          OR: mockInvoiceExcludeOr(),
        },
      },
      include: {
        counterparty: { select: { id: true, legalName: true, siren: true } },
        validations: { where: { blocking: true }, select: { id: true } },
        lifecycleEvents: {
          where: { source: { in: ["ai-analyze", "ai-extract", "remediation"] } },
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: { occurredAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 80,
    });

    return invoices.map((inv) => {
      const blockingCount = inv.validations.length;
      return {
        id: inv.id,
        number: inv.number ?? "Brouillon",
        clientId: inv.counterparty?.id ?? null,
        clientName: inv.counterparty?.legalName ?? "Client inconnu",
        clientSiren: inv.buyerSiren ?? inv.counterparty?.siren ?? null,
        amount: Number(inv.totalTtc),
        status: inv.status,
        verdict: invoiceVerdict({ status: inv.status, blockingCount }),
        score: inv.complianceScore != null ? Number(inv.complianceScore) : null,
        blockingCount,
        analyzedAt: inv.lifecycleEvents[0]?.occurredAt.toISOString() ?? null,
        issueDate: inv.issueDate?.toISOString().slice(0, 10) ?? null,
      };
    });
  },
);

/**
 * File Analyse IA — toutes les factures de vente + statut d’analyse.
 */
export const listAnalysisQueue = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalysisQueueInvoice[]> => {
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
      include: {
        counterparty: { select: { id: true, legalName: true, siren: true } },
        validations: { where: { blocking: true }, select: { id: true } },
        lifecycleEvents: {
          where: { source: { in: ["ai-analyze", "ai-extract", "remediation"] } },
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: { occurredAt: true, source: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    return invoices.map((inv) => {
      const blockingCount = inv.validations.length;
      const analyzed = inv.lifecycleEvents.length > 0;
      return {
        id: inv.id,
        number: inv.number ?? "Brouillon",
        clientId: inv.counterparty?.id ?? null,
        clientName: inv.counterparty?.legalName ?? "Client inconnu",
        clientSiren: inv.buyerSiren ?? inv.counterparty?.siren ?? null,
        amount: Number(inv.totalTtc),
        status: inv.status,
        analyzed,
        transactionType: inv.transactionType ?? "B2B_DOMESTIC",
        verdict: analyzed ? invoiceVerdict({ status: inv.status, blockingCount }) : "A_ANALYSER",
        score: inv.complianceScore != null ? Number(inv.complianceScore) : null,
        blockingCount,
        analyzedAt: inv.lifecycleEvents[0]?.occurredAt.toISOString() ?? null,
        issueDate: inv.issueDate?.toISOString().slice(0, 10) ?? null,
      };
    });
  },
);

export const createClient = createServerFn({ method: "POST" })
  .validator((data: CreateClientInput) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée.", id: null };

    const legalName = data.legalName?.trim() ?? "";
    if (!legalName) {
      return { success: false as const, error: "Raison sociale obligatoire.", id: null };
    }

    const siren = data.siren?.replace(/\s/g, "") || null;
    const clientKind = data.clientKind ?? "B2B";
    const isConsumer = clientKind !== "B2B";

    if (clientKind === "B2B") {
      if (!siren || !/^\d{9}$/.test(siren)) {
        return {
          success: false as const,
          error: "SIREN obligatoire (9 chiffres) — client B2B.",
          id: null,
        };
      }
    } else if (siren && !/^\d{9}$/.test(siren)) {
      return { success: false as const, error: "SIREN invalide (9 chiffres).", id: null };
    }

    const billingCountry =
      clientKind === "EXPORT"
        ? data.billingCountry?.trim() || "US"
        : clientKind === "INTRA_EU"
          ? data.billingCountry?.trim() || "DE"
          : data.billingCountry?.trim() || "FR";

    const defaultTransactionType =
      clientKind === "B2B"
        ? "B2B_DOMESTIC"
        : clientKind === "B2C"
          ? "B2C"
          : clientKind === "INTRA_EU"
            ? "INTRA_EU"
            : "EXPORT";

    const siret = data.siret?.replace(/\s/g, "") || null;
    if (siret && !/^\d{14}$/.test(siret)) {
      return { success: false as const, error: "SIRET invalide (14 chiffres).", id: null };
    }

    const { findOrCreateClient } = await import("@/lib/counterparty-dedupe");
    const { client, created } = await findOrCreateClient(db, {
      organizationId: workspace.organization.id,
      legalName,
      siren,
      siret,
      vatNumber: data.vatNumber?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      billingLine1: data.billingLine1?.trim() || null,
      billingPostal: data.billingPostal?.trim() || null,
      billingCity: data.billingCity?.trim() || null,
      billingCountry,
      isConsumer,
      defaultTransactionType,
    });

    if (!created) {
      return {
        success: false as const,
        error: siren
          ? `Client déjà enregistré (SIREN ${siren}) — réutilisez la fiche existante.`
          : `Client déjà enregistré (« ${legalName} ») — réutilisez la fiche existante.`,
        id: client.id,
      };
    }

    return { success: true as const, error: null, id: client.id };
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator((data: UpdateClientInput) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const existing = await db.counterparty.findFirst({
      where: {
        id: data.id,
        organizationId: workspace.organization.id,
        type: { in: ["CLIENT", "BOTH"] },
      },
    });
    if (!existing) return { success: false as const, error: "Client introuvable." };

    const legalName = data.legalName?.trim() ?? "";
    if (!legalName) {
      return { success: false as const, error: "Raison sociale obligatoire." };
    }

    const siren = data.siren?.replace(/\s/g, "") || null;
    if (!siren || !/^\d{9}$/.test(siren)) {
      return { success: false as const, error: "SIREN obligatoire (9 chiffres)." };
    }

    const siret = data.siret?.replace(/\s/g, "") || null;
    if (siret && !/^\d{14}$/.test(siret)) {
      return { success: false as const, error: "SIRET invalide (14 chiffres)." };
    }

    await db.counterparty.update({
      where: { id: existing.id },
      data: {
        legalName,
        siren,
        siret,
        vatNumber: data.vatNumber?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        billingLine1: data.billingLine1?.trim() || null,
        billingPostal: data.billingPostal?.trim() || null,
        billingCity: data.billingCity?.trim() || null,
        billingCountry: data.billingCountry?.trim() || "FR",
      },
    });

    return { success: true as const, error: null };
  });

export const deleteClient = createServerFn({ method: "POST" })
  .validator((data: { id: string; confirmText: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    if ((data.confirmText ?? "").trim().toUpperCase() !== "SUPPRIMER") {
      return {
        success: false as const,
        error: "Confirmation invalide. Saisissez SUPPRIMER.",
      };
    }

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const existing = await db.counterparty.findFirst({
      where: {
        id: data.id,
        organizationId: workspace.organization.id,
        type: { in: ["CLIENT", "BOTH"] },
      },
      include: {
        invoices: {
          select: { id: true, status: true, number: true },
        },
      },
    });
    if (!existing) return { success: false as const, error: "Client introuvable." };

    const { PA_NETWORK_STATUSES } = await import("@/lib/invoice-lifecycle-rules");
    const LOCKED = new Set<string>(PA_NETWORK_STATUSES);

    const linked = existing.invoices;
    const locked = linked.filter((i) => LOCKED.has(i.status));
    const deletable = linked.filter((i) => !LOCKED.has(i.status));

    // Factures sources / brouillons / archivées : suppression.
    if (deletable.length > 0) {
      await db.invoice.deleteMany({
        where: {
          id: { in: deletable.map((i) => i.id) },
          organizationId: workspace.organization.id,
        },
      });
    }

    // Factures déjà en réseau PA : dissociation (le client peut partir).
    if (locked.length > 0) {
      await db.invoice.updateMany({
        where: {
          id: { in: locked.map((i) => i.id) },
          organizationId: workspace.organization.id,
        },
        data: { counterpartyId: null },
      });
    }

    await db.counterparty.delete({ where: { id: existing.id } });
    return {
      success: true as const,
      error: null,
      deletedInvoices: deletable.length,
      unlinkedInvoices: locked.length,
    };
  });
