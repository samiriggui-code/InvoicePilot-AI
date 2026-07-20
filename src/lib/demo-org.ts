/**
 * Séparation comptes démo (seed Dupont…) vs clients réels (inscription).
 * Les mocks / sync sandbox fournisseurs / boutons « Données démo » = isDemo uniquement.
 */

const DEMO_SIRENS = new Set(["512345678", "823456789", "390123456"]);

export function isDemoOrganization(org: {
  isDemo?: boolean | null;
  siren?: string | null;
}): boolean {
  if (org.isDemo === true) return true;
  if (org.siren && DEMO_SIRENS.has(org.siren)) return true;
  return false;
}
