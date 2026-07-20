/** Flux réglementaire facture — e-invoicing B2B vs e-reporting */

export type TransactionType = "B2B_DOMESTIC" | "B2C" | "EXPORT" | "INTRA_EU";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  B2B_DOMESTIC: "Entreprise B2B",
  B2C: "Particulier B2C",
  EXPORT: "Export hors UE",
  INTRA_EU: "Intracommunautaire",
};

export const TRANSACTION_TYPE_HINTS: Record<TransactionType, string> = {
  B2B_DOMESTIC: "E-facture structurée via plateforme agréée (SIREN obligatoire)",
  B2C: "Hors e-invoicing B2B — lot e-reporting périodique",
  EXPORT: "Client hors UE — e-reporting de transaction",
  INTRA_EU: "Client UE — e-reporting de transaction",
};

const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

export function isEReportingTransaction(type: TransactionType): boolean {
  return type === "B2C" || type === "EXPORT" || type === "INTRA_EU";
}

export function requiresBuyerSiren(type: TransactionType): boolean {
  return type === "B2B_DOMESTIC";
}

export function inferTransactionType(input: {
  isConsumer?: boolean;
  billingCountry?: string | null;
  buyerSiren?: string | null;
  explicit?: TransactionType | null;
}): TransactionType {
  if (input.explicit) return input.explicit;
  if (input.isConsumer) {
    const country = (input.billingCountry ?? "FR").toUpperCase();
    if (country === "FR") return "B2C";
    if (EU_COUNTRY_CODES.has(country)) return "INTRA_EU";
    return "EXPORT";
  }
  const country = (input.billingCountry ?? "FR").toUpperCase();
  if (country !== "FR" && country !== "") {
    return EU_COUNTRY_CODES.has(country) ? "INTRA_EU" : "EXPORT";
  }
  if (!input.buyerSiren?.replace(/\D/g, "")) return "B2C";
  return "B2B_DOMESTIC";
}

export function clientMatchesTransactionType(
  client: {
    isConsumer: boolean;
    siren: string | null;
    billingCountry: string;
    defaultTransactionType?: TransactionType | null;
  },
  type: TransactionType,
): boolean {
  if (client.defaultTransactionType) return client.defaultTransactionType === type;
  if (type === "B2B_DOMESTIC") return !client.isConsumer && Boolean(client.siren);
  if (type === "B2C") return client.isConsumer && client.billingCountry === "FR";
  if (type === "INTRA_EU") {
    return (
      client.isConsumer &&
      client.billingCountry !== "FR" &&
      EU_COUNTRY_CODES.has(client.billingCountry)
    );
  }
  if (type === "EXPORT") {
    return client.isConsumer && !EU_COUNTRY_CODES.has(client.billingCountry);
  }
  return true;
}
