import type { PrismaClient, TransactionType } from "@prisma/client";

type Db = PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export type FindOrCreateClientInput = {
  organizationId: string;
  legalName: string;
  siren?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  billingLine1?: string | null;
  billingPostal?: string | null;
  billingCity?: string | null;
  billingCountry?: string | null;
  isConsumer?: boolean;
  defaultTransactionType?: TransactionType;
  deliveryLine1?: string | null;
  deliveryPostal?: string | null;
  deliveryCity?: string | null;
  deliveryCountry?: string | null;
  directorySyncedAt?: Date | null;
};

/**
 * Jamais deux fiches client pour le même SIREN (ou même raison sociale normalisée).
 * Retourne l’existant ou crée une seule fois.
 */
export async function findOrCreateClient(db: Db, input: FindOrCreateClientInput) {
  const orgId = input.organizationId;
  const legalName = input.legalName.trim();
  const siren = input.siren?.replace(/\s/g, "") || null;

  if (siren && /^\d{9}$/.test(siren)) {
    const bySiren = await db.counterparty.findFirst({
      where: {
        organizationId: orgId,
        siren,
        type: { in: ["CLIENT", "BOTH"] },
      },
    });
    if (bySiren) {
      return {
        client: await mergeClientFields(db, bySiren.id, input),
        created: false as const,
      };
    }
  }

  if (legalName) {
    const byName = await db.counterparty.findFirst({
      where: {
        organizationId: orgId,
        legalName: { equals: legalName, mode: "insensitive" },
        type: { in: ["CLIENT", "BOTH"] },
      },
    });
    if (byName) {
      return {
        client: await mergeClientFields(db, byName.id, input),
        created: false as const,
      };
    }
  }

  const client = await db.counterparty.create({
    data: {
      organizationId: orgId,
      type: "CLIENT",
      legalName: legalName || "Client à identifier",
      isConsumer: input.isConsumer ?? !siren,
      defaultTransactionType: input.defaultTransactionType ?? "B2B_DOMESTIC",
      siren,
      siret: input.siret?.replace(/\s/g, "") || null,
      vatNumber: input.vatNumber?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      billingLine1: input.billingLine1?.trim() || null,
      billingPostal: input.billingPostal?.trim() || null,
      billingCity: input.billingCity?.trim() || null,
      billingCountry: input.billingCountry?.trim() || "FR",
      deliveryLine1: input.deliveryLine1 ?? null,
      deliveryPostal: input.deliveryPostal ?? null,
      deliveryCity: input.deliveryCity ?? null,
      deliveryCountry: input.deliveryCountry ?? null,
      directorySyncedAt: input.directorySyncedAt ?? null,
    },
  });

  return { client, created: true as const };
}

async function mergeClientFields(db: Db, id: string, input: FindOrCreateClientInput) {
  const siren = input.siren?.replace(/\s/g, "") || null;
  return db.counterparty.update({
    where: { id },
    data: {
      siren: siren || undefined,
      siret: input.siret?.replace(/\s/g, "") || undefined,
      vatNumber: input.vatNumber?.trim() || undefined,
      email: input.email?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      billingLine1: input.billingLine1?.trim() || undefined,
      billingPostal: input.billingPostal?.trim() || undefined,
      billingCity: input.billingCity?.trim() || undefined,
      billingCountry: input.billingCountry?.trim() || undefined,
      deliveryLine1: input.deliveryLine1 || undefined,
      deliveryPostal: input.deliveryPostal || undefined,
      deliveryCity: input.deliveryCity || undefined,
      deliveryCountry: input.deliveryCountry || undefined,
      directorySyncedAt: input.directorySyncedAt || undefined,
    },
  });
}
