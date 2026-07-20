import type { CanonicalInvoice } from "@/api/canonical/invoice";

/** Connecteur source → jamais d’appel PA ici. */
export type SourcePullResult = {
  invoices: CanonicalInvoice[];
  /** Payloads bruts à stocker (SOURCE_RAW) */
  rawItems: { externalId: string; payload: unknown }[];
};

export type SourceConnector = {
  provider: string;
  pull(organizationId: string): Promise<SourcePullResult>;
};
