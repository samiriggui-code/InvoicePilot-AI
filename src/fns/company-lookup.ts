import { createServerFn } from "@tanstack/react-start";

import type { CompanyLookupHit } from "@/lib/company-lookup";

export type { CompanyLookupHit };

export const searchCompanies = createServerFn({ method: "GET" })
  .validator((data: { query: string }) => data)
  .handler(async ({ data }): Promise<{ hits: CompanyLookupHit[]; error: string | null }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { searchFrenchCompanies } = await import("@/lib/company-lookup");

    const workspace = await loadWorkspace();
    if (!workspace) return { hits: [], error: "Session expirée." };

    const q = data.query?.trim() ?? "";
    if (q.length < 2) return { hits: [], error: null };

    try {
      const hits = await searchFrenchCompanies(q, 6);
      return { hits, error: null };
    } catch (e) {
      return {
        hits: [],
        error: e instanceof Error ? e.message : "Recherche entreprise impossible.",
      };
    }
  });

export type ApplyCompanyInput = {
  counterpartyId?: string;
  invoiceId?: string;
  company: CompanyLookupHit;
};

/**
 * Applique une fiche entreprise officielle sur le client (+ facture liée).
 * Persistance DB : SIREN, SIRET, TVA, adresse facturation.
 */
export const applyCompanyToClient = createServerFn({ method: "POST" })
  .validator((data: ApplyCompanyInput) => data)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      error: string | null;
      counterpartyId: string | null;
    }> => {
      const { loadWorkspace } = await import("@/lib/workspace.server");
      const { db } = await import("@/lib/db");

      const workspace = await loadWorkspace();
      if (!workspace) {
        return { success: false, error: "Session expirée.", counterpartyId: null };
      }

      if (!data.company.active) {
        return {
          success: false,
          error: "Cette entreprise n’est plus en activité — choisissez une autre fiche.",
          counterpartyId: null,
        };
      }

      if (!/^\d{9}$/.test(data.company.siren)) {
        return { success: false, error: "SIREN invalide.", counterpartyId: null };
      }

      let counterpartyId = data.counterpartyId ?? null;

      if (!counterpartyId && data.invoiceId) {
        const inv = await db.invoice.findFirst({
          where: {
            id: data.invoiceId,
            organizationId: workspace.organization.id,
          },
          select: { counterpartyId: true },
        });
        counterpartyId = inv?.counterpartyId ?? null;
      }

      if (!counterpartyId) {
        return { success: false, error: "Client introuvable.", counterpartyId: null };
      }

      const cp = await db.counterparty.findFirst({
        where: {
          id: counterpartyId,
          organizationId: workspace.organization.id,
        },
      });
      if (!cp) {
        return { success: false, error: "Client introuvable.", counterpartyId: null };
      }

      await db.counterparty.update({
        where: { id: cp.id },
        data: {
          legalName: data.company.legalName || cp.legalName,
          siren: data.company.siren,
          siret: data.company.siret,
          vatNumber: data.company.vatNumber,
          billingLine1: data.company.billingLine1 ?? cp.billingLine1,
          billingPostal: data.company.billingPostal ?? cp.billingPostal,
          billingCity: data.company.billingCity ?? cp.billingCity,
          billingCountry: data.company.billingCountry || "FR",
          directorySyncedAt: new Date(),
        },
      });

      if (data.invoiceId) {
        await db.invoice.updateMany({
          where: {
            id: data.invoiceId,
            organizationId: workspace.organization.id,
          },
          data: { buyerSiren: data.company.siren },
        });
      }

      await db.auditLog.create({
        data: {
          organizationId: workspace.organization.id,
          action: "counterparty.enriched",
          entityType: "Counterparty",
          entityId: cp.id,
          metadata: {
            siren: data.company.siren,
            source: "recherche-entreprises",
            invoiceId: data.invoiceId ?? null,
          },
        },
      });

      return { success: true, error: null, counterpartyId: cp.id };
    },
  );
