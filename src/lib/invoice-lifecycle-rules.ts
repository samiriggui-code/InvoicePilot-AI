/**
 * Règles de cycle de vie facture — conformité e-facture (France).
 *
 * Avant dépôt PA : Sources peut éditer / supprimer / remplacer / relancer l’analyse.
 * Après envoi réseau PA : document figé — pas de retour arrière (correction = avoir).
 */

export const PA_NETWORK_STATUSES = [
  "TRANSMITTING",
  "TRANSMITTED",
  "PAID",
  "APPROVED",
  "RECEIVED",
] as const;

export type PaNetworkStatus = (typeof PA_NETWORK_STATUSES)[number];

const PA_NETWORK_SET = new Set<string>(PA_NETWORK_STATUSES);

/** Facture déjà engagée sur le réseau PA — immutable. */
export function isInvoiceImmutable(status: string): boolean {
  return PA_NETWORK_SET.has(status);
}

export function invoiceImmutabilityMessage(status: string): string {
  return `Facture verrouillée (statut « ${status} ») : déjà envoyée sur le réseau PA. Pas de modification ni suppression — émettez un avoir pour corriger.`;
}

/** Édition / suppression / re-analyse autorisées tant que non envoyée PA. */
export function canMutateSourceInvoice(status: string): boolean {
  return !isInvoiceImmutable(status);
}

export function canReanalyzeInvoice(status: string): boolean {
  return !isInvoiceImmutable(status);
}
