/**
 * Exclusion des factures seed / sandbox / démo — jamais dans les listes métier.
 * Une seule source de vérité pour Analyse, Clients, Émission, etc.
 */
export const MOCK_INVOICE_NUMBER_PREFIXES = [
  "SHOP-TMP",
  "SHOP-000",
  "WOO-TMP",
  "WOO-000",
  "FAC-0001",
  "FAC-0002",
  "FAC-0003",
  "FAC-0005",
] as const;

export const MOCK_COUNTERPARTY_NAME_PATTERNS = ["demo", "test rejet", "sandbox"] as const;

/** Clause Prisma `NOT: { OR: [...] }` commune. */
export function mockInvoiceExcludeOr() {
  return [
    { id: { startsWith: "seed-" } },
    { counterpartyId: { startsWith: "seed-" } },
    { number: { in: ["FAC-0001", "FAC-0002", "FAC-0003", "FAC-0005"] } },
    { number: { startsWith: "SHOP-TMP" } },
    { number: { startsWith: "SHOP-000" } },
    { number: { startsWith: "WOO-TMP" } },
    { number: { startsWith: "WOO-000" } },
    { sourceExternalId: { startsWith: "gid://shopify/Order/" } },
    { sourceExternalId: { startsWith: "woo-" } },
    { sourceSystem: { equals: "shopify_sandbox", mode: "insensitive" as const } },
    { sourceSystem: { equals: "woocommerce_sandbox", mode: "insensitive" as const } },
  ];
}
