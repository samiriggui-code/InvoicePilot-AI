/** Shared réforme 2026 helpers for onboarding & diagnostics */

export type CompanySize = "MICRO" | "PME" | "ETI" | "GE";
export type VatRegime = "STANDARD" | "FRANCHISE_BASE" | "EXEMPT";

export function computeReformDeadlines(size: CompanySize) {
  const mustReceiveBy = new Date("2026-09-01T00:00:00.000Z");
  const mustEmitBy =
    size === "MICRO" || size === "PME"
      ? new Date("2027-09-01T00:00:00.000Z")
      : new Date("2026-09-01T00:00:00.000Z");
  return { mustReceiveBy, mustEmitBy };
}

export function formatDeadlineFr(d: Date) {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function sirenLooksValid(siren: string) {
  const digits = siren.replace(/\s/g, "");
  return /^\d{9}$/.test(digits);
}

export function normalizeSiren(siren: string) {
  return siren.replace(/\s/g, "");
}

export const SIZE_LABELS: Record<CompanySize, string> = {
  MICRO: "Micro-entreprise / AE",
  PME: "PME",
  ETI: "ETI",
  GE: "Grande entreprise",
};

export const VAT_LABELS: Record<VatRegime, string> = {
  STANDARD: "Assujetti TVA (régime réel / simplifié)",
  FRANCHISE_BASE: "Franchise en base (art. 293 B CGI)",
  EXEMPT: "Exonéré de TVA",
};
