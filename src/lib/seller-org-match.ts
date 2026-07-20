import type { ValidationIssue } from "@/lib/invoice-validation";

/** SIREN = 9 premiers chiffres (SIRET 14 → SIREN 9). */
export function toSiren(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(0, 9);
}

/** Normalise une raison sociale pour comparaison souple. */
export function normalizeLegalName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(
      /\b(sarl|sas|sasu|sa|eurl|sci|snc|earl|selarl|selas|association|auto[- ]?entrepreneur)\b/gi,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function legalNamesLikelyMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeLegalName(a);
  const nb = normalizeLegalName(b);
  if (!na || !nb) return true; // pas assez d’info → ne pas bloquer sur le nom
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wa = new Set(na.split(" ").filter((w) => w.length > 2));
  const wb = nb.split(" ").filter((w) => w.length > 2);
  if (!wb.length) return true;
  const overlap = wb.filter((w) => wa.has(w)).length;
  return overlap / wb.length >= 0.5;
}

/**
 * Contrôle émetteur (vente) : même SIREN que l’org.
 * Plusieurs SIRET / établissements OK tant que le SIREN (9 chiffres) est identique.
 */
export function validateSellerMatchesOrganization(input: {
  /** Direction facture — le contrôle ne s’applique qu’aux ventes */
  direction?: "SALE" | "PURCHASE";
  extractedSellerSiren?: string | null;
  extractedSellerLegalName?: string | null;
  organizationSiren: string | null | undefined;
  organizationLegalName?: string | null;
  organizationTradeName?: string | null;
}): ValidationIssue[] {
  if (input.direction === "PURCHASE") return [];

  const issues: ValidationIssue[] = [];
  const orgSiren = toSiren(input.organizationSiren);
  const extracted = toSiren(input.extractedSellerSiren);

  if (!orgSiren || orgSiren === "000000000") {
    issues.push({
      code: "SELLER_SIREN_PLACEHOLDER",
      message: "Complétez le SIREN de votre entreprise dans les paramètres",
      field: "organization",
      blocking: false,
      severity: "WARNING",
    });
    return issues;
  }

  if (extracted && extracted !== orgSiren) {
    issues.push({
      code: "SELLER_SIREN_MISMATCH",
      message: `Émetteur SIREN ${extracted} ≠ votre entreprise (${orgSiren}). Une vente doit être émise sous votre SIREN (plusieurs SIRET OK). Facture d’un autre émetteur → Réception (achat), pas Sources / Émission.`,
      field: "sellerSiren",
      blocking: true,
      severity: "ERROR",
    });
    return issues;
  }

  const orgNames = [input.organizationLegalName, input.organizationTradeName].filter(
    Boolean,
  ) as string[];

  if (
    extracted &&
    extracted === orgSiren &&
    input.extractedSellerLegalName &&
    orgNames.length > 0 &&
    !orgNames.some((n) => legalNamesLikelyMatch(input.extractedSellerLegalName, n))
  ) {
    issues.push({
      code: "SELLER_NAME_MISMATCH",
      message: `SIREN émetteur OK, mais le nom « ${input.extractedSellerLegalName} » ne correspond pas à « ${orgNames[0]} ». Vérifiez le document.`,
      field: "sellerLegalName",
      blocking: false,
      severity: "WARNING",
    });
  }

  if (!extracted) {
    issues.push({
      code: "SELLER_SIREN_UNVERIFIED",
      message:
        "SIREN émetteur non lu sur le PDF — contrôle SIREN org non vérifié. Vérifiez que le document est bien une facture de votre entreprise.",
      field: "sellerSiren",
      blocking: false,
      severity: "INFO",
    });
  }

  return issues;
}
