/**
 * Format interne unique — toute source et toute PA passent par ici.
 * Aligné mentions obligatoires 2026 + EN 16931 (champs essentiels).
 */

export type CanonicalParty = {
  legalName: string;
  siren: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryCode?: string;
};

export type CanonicalLine = {
  lineNumber: number;
  description: string;
  quantity: number;
  unitPriceHt: number;
  vatRate: number;
  lineTotalHt: number;
  lineVat: number;
};

export type CanonicalInvoice = {
  /** Id InvoicePilot si déjà persisté */
  id?: string;
  organizationId: string;
  direction: "SALE" | "PURCHASE";
  number: string | null;
  issueDate: string | null; // YYYY-MM-DD
  serviceDate: string | null;
  currency: string;
  seller: CanonicalParty;
  buyer: CanonicalParty;
  operationCategory: "GOODS" | "SERVICES" | "MIXED" | null;
  vatOnDebitsOption?: boolean;
  deliveryDiffers?: boolean;
  delivery?: {
    line1?: string | null;
    postalCode?: string | null;
    city?: string | null;
  } | null;
  lines: CanonicalLine[];
  subtotalHt: number;
  totalVat: number;
  totalTtc: number;
  /** Provenance */
  source?: {
    system: string;
    externalId: string;
  };
};

export function emptyCanonicalSale(
  organizationId: string,
  seller: CanonicalParty,
): CanonicalInvoice {
  return {
    organizationId,
    direction: "SALE",
    number: null,
    issueDate: null,
    serviceDate: null,
    currency: "EUR",
    seller,
    buyer: { legalName: "", siren: null },
    operationCategory: null,
    lines: [],
    subtotalHt: 0,
    totalVat: 0,
    totalTtc: 0,
  };
}
