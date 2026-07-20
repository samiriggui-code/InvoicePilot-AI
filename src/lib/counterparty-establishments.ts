import type { PrismaClient } from "@prisma/client";
import type { ExtractedEstablishment } from "@/lib/invoice-extract";

/**
 * Persiste les établissements (SIRET) d’un client extraits par l’Analyse IA.
 * Même SIREN uniquement — ignore les SIRET hors SIREN client.
 */
export async function upsertClientEstablishmentsFromAnalysis(
  db: PrismaClient,
  input: {
    counterpartyId: string;
    buyerSiren: string | null;
    establishments: ExtractedEstablishment[];
    primarySiret?: string | null;
  },
): Promise<{ primaryEstablishmentId: string | null }> {
  const siren = input.buyerSiren?.replace(/\D/g, "").slice(0, 9) || null;
  const list = [...input.establishments];
  if (input.primarySiret) {
    const p = input.primarySiret.replace(/\D/g, "").slice(0, 14);
    if (p.length === 14 && !list.some((e) => e.siret === p)) {
      list.unshift({
        siret: p,
        label: null,
        addressLine1: null,
        postalCode: null,
        city: null,
        isHeadOffice: false,
      });
    }
  }

  let primaryId: string | null = null;
  const primary = input.primarySiret?.replace(/\D/g, "").slice(0, 14) ?? null;

  for (const est of list) {
    const siret = est.siret.replace(/\D/g, "").slice(0, 14);
    if (siret.length !== 14) continue;
    if (siren && siret.slice(0, 9) !== siren) continue;

    const row = await db.counterpartyEstablishment.upsert({
      where: {
        counterpartyId_siret: {
          counterpartyId: input.counterpartyId,
          siret,
        },
      },
      create: {
        counterpartyId: input.counterpartyId,
        siret,
        label: est.label,
        isHeadOffice: est.isHeadOffice,
        source: "ANALYSIS",
        addressLine1: est.addressLine1,
        postalCode: est.postalCode,
        city: est.city,
        countryCode: "FR",
        lastSeenAt: new Date(),
      },
      update: {
        label: est.label ?? undefined,
        addressLine1: est.addressLine1 ?? undefined,
        postalCode: est.postalCode ?? undefined,
        city: est.city ?? undefined,
        lastSeenAt: new Date(),
        source: "ANALYSIS",
      },
    });

    if (primary && row.siret === primary) primaryId = row.id;
    else if (!primaryId) primaryId = row.id;
  }

  return { primaryEstablishmentId: primaryId };
}
