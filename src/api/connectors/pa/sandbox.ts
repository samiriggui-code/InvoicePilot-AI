import type { CanonicalInvoice } from "@/api/canonical/invoice";
import type {
  PaConnector,
  PaInboundInvoice,
  PaLifecycleEvent,
  PaSubmitResult,
} from "@/api/connectors/pa/types";
import { paInboxKey, paOutboxKey } from "@/api/storage/keys";
import { putStorageObject } from "@/api/storage/store";
import { mapPartnerPaCode } from "@/lib/pa-status";

function ref(stamp: string, invoiceId: string) {
  return `PA-${stamp}-${invoiceId.slice(-4).toUpperCase()}`;
}

/**
 * Adaptateur PA technique local — simule dépôt, statuts DGFiP et réception.
 * Les partenaires (WeInvoice, Seqino, B2Brouter…) mappent vers les mêmes types.
 */
export const sandboxPaConnector: PaConnector = {
  slug: "sandbox",

  async submit(organizationId, invoiceId, facturxXml, canonical: CanonicalInvoice) {
    const stamp = Date.now().toString(36);
    await putStorageObject({
      organizationId,
      invoiceId,
      kind: "PA_SUBMIT",
      storageKey: paOutboxKey(organizationId, invoiceId, stamp, "submit"),
      content: JSON.stringify({ facturxXml, canonical }, null, 2),
      filename: `${invoiceId}-submit.json`,
    });

    const paReference = ref(stamp, invoiceId);
    const result: PaSubmitResult = {
      ok: true,
      paReference,
      platformSlug: "sandbox",
    };

    await putStorageObject({
      organizationId,
      invoiceId,
      kind: "PA_RESPONSE",
      storageKey: paOutboxKey(organizationId, invoiceId, stamp, "response"),
      content: JSON.stringify(result, null, 2),
      filename: `${invoiceId}-response.json`,
    });

    return result;
  },

  async fetchInbox(organizationId) {
    const { db } = await import("@/lib/db");
    const docs = await db.paInboxDocument.findMany({
      where: { organizationId, invoiceId: null },
      orderBy: { receivedAt: "desc" },
      take: 20,
    });

    return docs.map((d): PaInboundInvoice => ({
      paReference: d.paReference,
      supplierName: d.supplierName,
      supplierSiren: d.supplierSiren,
      issueDate: d.issueDate?.toISOString().slice(0, 10) ?? null,
      amountTtc: Number(d.amountTtc),
      canonical: (d.structuredPayload as { canonical?: CanonicalInvoice } | null)?.canonical ?? {
        organizationId,
        direction: "PURCHASE",
        number: d.paReference,
        issueDate: d.issueDate?.toISOString().slice(0, 10) ?? null,
        serviceDate: null,
        currency: "EUR",
        seller: { legalName: d.supplierName, siren: d.supplierSiren },
        buyer: { legalName: "—", siren: null },
        operationCategory: null,
        lines: [],
        subtotalHt: Number(d.amountTtc),
        totalVat: 0,
        totalTtc: Number(d.amountTtc),
      },
      raw: d.structuredPayload ?? {},
    }));
  },

  mapWebhook(body: unknown): PaLifecycleEvent | null {
    if (!body || typeof body !== "object") return null;
    const o = body as Record<string, unknown>;
    const paReference = String(o.paReference ?? o.reference ?? o.id ?? "");
    if (!paReference) return null;

    const rawStatus = String(o.status ?? o.state ?? o.code ?? "");
    const mapped = mapPartnerPaCode(rawStatus);
    const status = mapped ?? rawStatus.toUpperCase();

    return {
      paReference,
      status,
      occurredAt: String(o.occurredAt ?? o.timestamp ?? new Date().toISOString()),
      message: typeof o.message === "string" ? o.message : undefined,
      raw: body,
    };
  },
};

/** Progression émission après dépôt sandbox (statuts réseau). */
export function sandboxEmissionProgression(paReference: string): PaLifecycleEvent[] {
  const now = new Date().toISOString();
  return [
    {
      paReference,
      status: "SUBMITTED_TO_PA",
      occurredAt: now,
      message: "Dépôt enregistré — contrôle PA en cours.",
    },
    {
      paReference,
      status: "ACCEPTED_BY_PA",
      occurredAt: now,
      message: "Acceptée par la PA (sandbox).",
    },
    {
      paReference,
      status: "DELIVERED_TO_BUYER_PA",
      occurredAt: now,
      message: "Mise à disposition sur le réseau public.",
    },
  ];
}

/** Progression e-reporting sandbox */
export function sandboxEReportingProgression(paReference: string): PaLifecycleEvent[] {
  const now = new Date().toISOString();
  return [
    {
      paReference,
      status: "SUBMITTED_TO_PA",
      occurredAt: now,
      message: "Lot e-reporting déposé.",
    },
    {
      paReference,
      status: "ACCEPTED_BY_PA",
      occurredAt: now,
      message: "Lot accepté par la PA (sandbox).",
    },
  ];
}

/** Exemple document fournisseur entrant (sandbox démo) */
export async function seedSandboxInboxDocument(
  organizationId: string,
  platformConnectionId: string,
) {
  const { db } = await import("@/lib/db");
  const existing = await db.paInboxDocument.findFirst({
    where: { organizationId, paReference: { startsWith: "PA-IN-DEMO" } },
  });
  if (existing) return existing;

  return db.paInboxDocument.create({
    data: {
      organizationId,
      platformConnectionId,
      paReference: `PA-IN-DEMO-${Date.now().toString(36).toUpperCase()}`,
      paStatus: "RECEIVED",
      paStatusCode: "RECEIVED",
      paStatusMessage: "Facture fournisseur reçue via le réseau PA (sandbox).",
      supplierName: "Fournitures Pro SARL",
      supplierSiren: "732829320",
      issueDate: new Date(),
      amountTtc: 1848.5,
      structuredPayload: {
        format: "FACTUR-X",
        canonical: {
          seller: { legalName: "Fournitures Pro SARL", siren: "732829320" },
          buyer: { legalName: "Client" },
          lines: [{ description: "Consommables bureau", quantity: 1, totalTtc: 1848.5 }],
          totals: { totalTtc: 1848.5 },
        },
        pa_message: "Document structuré + PDF disponible.",
      },
      pdfStorageKey: null,
      facturxStorageKey: paInboxKey(organizationId, "demo-inbound"),
      lastPaStatusAt: new Date(),
    },
  });
}
