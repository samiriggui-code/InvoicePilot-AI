import type { CanonicalInvoice } from "@/api/canonical/invoice";
import { canonicalKey, facturxXmlKey, sourceRawKey } from "@/api/storage/keys";
import { putStorageObject } from "@/api/storage/store";

/**
 * Centre de tri — crée des PipelineJob + artefacts storage.
 * Les server fns existants (validate / remediate / transmit) brancheront ici progressivement.
 */
export async function recordIngest(input: {
  organizationId: string;
  provider: string;
  externalId: string;
  raw: unknown;
  canonical: CanonicalInvoice;
  invoiceId?: string;
}) {
  const { db } = await import("@/lib/db");

  await putStorageObject({
    organizationId: input.organizationId,
    invoiceId: input.invoiceId,
    kind: "SOURCE_RAW",
    storageKey: sourceRawKey(input.organizationId, input.provider, input.externalId),
    content: JSON.stringify(input.raw, null, 2),
    filename: `${input.externalId}.json`,
    metadata: { provider: input.provider },
  });

  if (input.invoiceId) {
    await putStorageObject({
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      kind: "CANONICAL_JSON",
      storageKey: canonicalKey(input.organizationId, input.invoiceId),
      content: JSON.stringify(input.canonical, null, 2),
      filename: "canonical.json",
    });
  }

  return db.pipelineJob.create({
    data: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId ?? null,
      direction: "INBOUND_SOURCE",
      stage: "INGEST",
      status: "SUCCEEDED",
      finishedAt: new Date(),
      payload: {
        provider: input.provider,
        externalId: input.externalId,
      },
    },
  });
}

export async function recordRenderArtifact(input: {
  organizationId: string;
  invoiceId: string;
  xml: string;
}) {
  const { db } = await import("@/lib/db");

  await putStorageObject({
    organizationId: input.organizationId,
    invoiceId: input.invoiceId,
    kind: "FACTURX_XML",
    storageKey: facturxXmlKey(input.organizationId, input.invoiceId),
    content: input.xml,
    filename: "factur-x.xml",
  });

  return db.pipelineJob.create({
    data: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      direction: "OUTBOUND_PA",
      stage: "RENDER",
      status: "SUCCEEDED",
      finishedAt: new Date(),
    },
  });
}

export async function createPipelineJob(input: {
  organizationId: string;
  invoiceId?: string | null;
  direction: "INBOUND_SOURCE" | "OUTBOUND_PA" | "INBOUND_PA";
  stage:
    "INGEST" | "VALIDATE" | "REMEDIATE" | "RENDER" | "SUBMIT" | "RECEIVE" | "ARCHIVE" | "NOTIFY";
  status?: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  error?: string;
  payload?: unknown;
  result?: unknown;
}) {
  const { db } = await import("@/lib/db");
  return db.pipelineJob.create({
    data: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId ?? null,
      direction: input.direction,
      stage: input.stage,
      status: input.status ?? "PENDING",
      error: input.error,
      payload: input.payload as object | undefined,
      result: input.result as object | undefined,
      finishedAt: input.status === "SUCCEEDED" || input.status === "FAILED" ? new Date() : null,
    },
  });
}
