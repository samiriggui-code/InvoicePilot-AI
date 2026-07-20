import type { CanonicalInvoice } from "@/api/canonical/invoice";

export type PaSubmitResult =
  | {
      ok: true;
      paReference: string;
      platformSlug: string;
      raw?: unknown;
    }
  | {
      ok: false;
      errors: { code: string; message: string }[];
      raw?: unknown;
    };

export type PaLifecycleEvent = {
  paReference: string;
  status: string;
  occurredAt: string;
  message?: string;
  raw?: unknown;
};

export type PaInboundInvoice = {
  paReference: string;
  supplierName: string;
  supplierSiren: string | null;
  issueDate: string | null;
  amountTtc: number;
  canonical: CanonicalInvoice;
  raw: unknown;
};

/** Connecteur PA — seul endroit qui parle au réseau immatriculé. */
export type PaConnector = {
  slug: string;
  submit(
    organizationId: string,
    invoiceId: string,
    facturxXml: string,
    canonical: CanonicalInvoice,
  ): Promise<PaSubmitResult>;
  fetchInbox?(organizationId: string): Promise<PaInboundInvoice[]>;
  mapWebhook?(body: unknown): PaLifecycleEvent | null;
};
