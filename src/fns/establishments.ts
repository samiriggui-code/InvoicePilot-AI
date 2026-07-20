import { createServerFn } from "@tanstack/react-start";

export type EstablishmentListItem = {
  id: string;
  siret: string;
  label: string | null;
  isHeadOffice: boolean;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  invoiceCount: number;
  updatedAt: string;
};

export type UpsertEstablishmentInput = {
  id?: string;
  siret: string;
  label?: string;
  isHeadOffice?: boolean;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
  email?: string;
};

function toSiren(siret: string) {
  return siret.replace(/\D/g, "").slice(0, 9);
}

export const listEstablishments = createServerFn({ method: "GET" }).handler(
  async (): Promise<EstablishmentListItem[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const orgId = workspace.organization.id;
    const rows = await db.organizationEstablishment.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { invoicesAsSeller: true } } },
      orderBy: [{ isHeadOffice: "desc" }, { label: "asc" }, { siret: "asc" }],
    });

    // Bootstrap : si org a un SIRET et aucun établissement → créer le siège
    if (rows.length === 0) {
      const org = await db.organization.findUnique({ where: { id: orgId } });
      const siret = org?.siret?.replace(/\D/g, "").slice(0, 14) ?? "";
      if (org && siret.length === 14 && toSiren(siret) === org.siren) {
        const created = await db.organizationEstablishment.create({
          data: {
            organizationId: orgId,
            siret,
            label: "Siège",
            isHeadOffice: true,
            addressLine1: org.addressLine1,
            postalCode: org.postalCode,
            city: org.city,
            countryCode: org.countryCode ?? "FR",
            email: org.email,
            phone: org.phone,
          },
          include: { _count: { select: { invoicesAsSeller: true } } },
        });
        return [
          {
            id: created.id,
            siret: created.siret,
            label: created.label,
            isHeadOffice: created.isHeadOffice,
            addressLine1: created.addressLine1,
            postalCode: created.postalCode,
            city: created.city,
            countryCode: created.countryCode,
            phone: created.phone,
            email: created.email,
            invoiceCount: 0,
            updatedAt: created.updatedAt.toISOString(),
          },
        ];
      }
    }

    return rows.map((r) => ({
      id: r.id,
      siret: r.siret,
      label: r.label,
      isHeadOffice: r.isHeadOffice,
      addressLine1: r.addressLine1,
      postalCode: r.postalCode,
      city: r.city,
      countryCode: r.countryCode,
      phone: r.phone,
      email: r.email,
      invoiceCount: r._count.invoicesAsSeller,
      updatedAt: r.updatedAt.toISOString(),
    }));
  },
);

export const upsertEstablishment = createServerFn({ method: "POST" })
  .validator((data: UpsertEstablishmentInput) => data)
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return { error: "Session expirée." };

    const orgId = workspace.organization.id;
    const orgSiren = workspace.organization.siren;
    const siret = data.siret.replace(/\D/g, "").slice(0, 14);
    if (siret.length !== 14) return { error: "SIRET invalide (14 chiffres)." };
    if (toSiren(siret) !== orgSiren) {
      return {
        error: `Le SIRET doit commencer par le SIREN de votre organisation (${orgSiren}).`,
      };
    }

    if (data.isHeadOffice) {
      await db.organizationEstablishment.updateMany({
        where: { organizationId: orgId, isHeadOffice: true },
        data: { isHeadOffice: false },
      });
    }

    const payload = {
      siret,
      label: data.label?.trim() || null,
      isHeadOffice: Boolean(data.isHeadOffice),
      addressLine1: data.addressLine1?.trim() || null,
      postalCode: data.postalCode?.trim() || null,
      city: data.city?.trim() || null,
      countryCode: (data.countryCode?.trim() || "FR").slice(0, 2).toUpperCase(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
    };

    try {
      if (data.id) {
        const existing = await db.organizationEstablishment.findFirst({
          where: { id: data.id, organizationId: orgId },
        });
        if (!existing) return { error: "Établissement introuvable." };
        await db.organizationEstablishment.update({
          where: { id: data.id },
          data: payload,
        });
      } else {
        await db.organizationEstablishment.create({
          data: { organizationId: orgId, ...payload },
        });
      }
    } catch {
      return { error: "Ce SIRET existe déjà pour votre organisation." };
    }

    // Garder Organization.siret aligné sur le siège
    if (payload.isHeadOffice) {
      await db.organization.update({
        where: { id: orgId },
        data: {
          siret,
          addressLine1: payload.addressLine1 ?? undefined,
          postalCode: payload.postalCode ?? undefined,
          city: payload.city ?? undefined,
        },
      });
    }

    return { ok: true };
  });

export const deleteEstablishment = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return { error: "Session expirée." };

    const row = await db.organizationEstablishment.findFirst({
      where: { id: data.id, organizationId: workspace.organization.id },
      include: { _count: { select: { invoicesAsSeller: true } } },
    });
    if (!row) return { error: "Établissement introuvable." };
    if (row.isHeadOffice) {
      return { error: "Impossible de supprimer le siège. Désignez d’abord un autre siège." };
    }
    if (row._count.invoicesAsSeller > 0) {
      return {
        error: `${row._count.invoicesAsSeller} facture(s) liées — détachez-les avant suppression.`,
      };
    }

    await db.organizationEstablishment.delete({ where: { id: row.id } });
    return { ok: true };
  });
