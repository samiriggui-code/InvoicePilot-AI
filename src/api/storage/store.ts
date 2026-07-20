import type { Prisma, StorageObjectKind } from "@prisma/client";

import { STORAGE_MIME } from "@/api/storage/keys";

/**
 * Persistance artefacts par organisation.
 * Sandbox : contenu en base (StorageObject.content).
 * Prod : uploader vers S3/R2 et ne garder que storageKey.
 */
export async function putStorageObject(input: {
  organizationId: string;
  invoiceId?: string | null;
  kind: StorageObjectKind;
  storageKey: string;
  content: string;
  filename?: string;
  metadata?: Prisma.InputJsonObject;
}) {
  const { db } = await import("@/lib/db");
  const mimeType = STORAGE_MIME[input.kind];
  const byteSize = Buffer.byteLength(input.content, "utf8");

  return db.storageObject.upsert({
    where: {
      organizationId_storageKey: {
        organizationId: input.organizationId,
        storageKey: input.storageKey,
      },
    },
    create: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId ?? null,
      kind: input.kind,
      storageKey: input.storageKey,
      filename: input.filename ?? null,
      mimeType,
      content: input.content,
      byteSize,
      metadata: input.metadata ?? undefined,
    },
    update: {
      invoiceId: input.invoiceId ?? null,
      kind: input.kind,
      filename: input.filename ?? null,
      mimeType,
      content: input.content,
      byteSize,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function getStorageObject(organizationId: string, storageKey: string) {
  const { db } = await import("@/lib/db");
  return db.storageObject.findUnique({
    where: {
      organizationId_storageKey: { organizationId, storageKey },
    },
  });
}
