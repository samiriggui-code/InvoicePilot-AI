import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createServerFn } from "@tanstack/react-start";

import type { InvoiceDetail } from "@/fns/invoice-remediation";

const ARCHIVEABLE = ["VALIDATED", "TRANSMITTED", "APPROVED", "PAID"] as const;

export type ArchiveResult =
  | {
      success: true;
      artifactCount: number;
      detail: InvoiceDetail;
      message: string;
    }
  | { success: false; error: string; detail: InvoiceDetail | null };

export type ArchiveArtifactItem = {
  id: string;
  kind: string;
  filename: string;
  mimeType: string;
  createdAt: string;
};

/**
 * Archive v1 (Phase 6) : Factur-X XML + journal contrôles + snapshot payload.
 * Stockage local `.data/archives/` + lignes DB (preuve / téléchargement).
 */
export const archiveInvoice = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string }) => data)
  .handler(async ({ data }): Promise<ArchiveResult> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { buildFacturXXml } = await import("@/lib/facturx");
    const { validateInvoiceDraft } = await import("@/lib/invoice-validation");
    const { getInvoiceDetail } = await import("@/fns/invoice-remediation");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false, error: "Session expirée.", detail: null };
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
        direction: "SALE",
      },
      include: {
        counterparty: true,
        lines: { orderBy: { lineNumber: "asc" } },
        validations: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!invoice) {
      return { success: false, error: "Facture introuvable.", detail: null };
    }

    if (invoice.status === "ARCHIVED") {
      return {
        success: false,
        error: "Facture déjà archivée.",
        detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
      };
    }

    if (!(ARCHIVEABLE as readonly string[]).includes(invoice.status)) {
      return {
        success: false,
        error:
          "Archivage possible uniquement pour une facture prête, transmise, approuvée ou payée.",
        detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
      };
    }

    if (!invoice.counterparty) {
      return { success: false, error: "Client manquant.", detail: null };
    }

    const buyerSiren = invoice.buyerSiren ?? invoice.counterparty.siren;
    const issues = validateInvoiceDraft({
      buyerSiren,
      operationCategory: invoice.operationCategory,
      deliveryDiffers: invoice.deliveryDiffers,
      deliveryLine1: invoice.counterparty.deliveryLine1,
      deliveryCity: invoice.counterparty.deliveryCity,
      issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
      serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceHt: Number(l.unitPriceHt),
        vatRate: Number(l.vatRate),
      })),
      sellerSiren: workspace.organization.siren,
    });

    if (issues.some((i) => i.blocking)) {
      return {
        success: false,
        error: "Contrôles bloquants restants — corrigez avant archivage.",
        detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
      };
    }

    if (!invoice.operationCategory) {
      return { success: false, error: "Catégorie d’opération manquante.", detail: null };
    }

    const number = invoice.number ?? `TMP-${invoice.id.slice(-6).toUpperCase()}`;
    const issueDate =
      invoice.issueDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10);

    const payload = {
      number,
      issueDate,
      seller: {
        legalName: workspace.organization.legalName,
        siren: workspace.organization.siren,
      },
      buyer: {
        legalName: invoice.counterparty.legalName,
        siren: buyerSiren!,
      },
      operationCategory: invoice.operationCategory,
      lines: invoice.lines.map((l) => ({
        lineNumber: l.lineNumber,
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceHt: Number(l.unitPriceHt),
        vatRate: Number(l.vatRate),
        lineTotalHt: Number(l.lineTotalHt),
        lineVat: Number(l.lineVat),
      })),
      subtotalHt: Number(invoice.subtotalHt),
      totalVat: Number(invoice.totalVat),
      totalTtc: Number(invoice.totalTtc),
    };

    const xml = buildFacturXXml(payload);
    const journal = JSON.stringify(
      {
        archivedAt: new Date().toISOString(),
        statusBefore: invoice.status,
        validations: invoice.validations.map((v) => ({
          code: v.code,
          message: v.message,
          severity: v.severity,
          blocking: v.blocking,
          field: v.field,
        })),
        liveChecks: issues,
        paReference: invoice.paReference,
      },
      null,
      2,
    );
    const snapshot = JSON.stringify(payload, null, 2);

    const dir = path.join(
      process.cwd(),
      ".data",
      "archives",
      workspace.organization.id,
      invoice.id,
    );
    await mkdir(dir, { recursive: true });

    const xmlKey = `archives/${workspace.organization.id}/${invoice.id}/facturx.xml`;
    const journalKey = `archives/${workspace.organization.id}/${invoice.id}/journal.json`;
    const snapKey = `archives/${workspace.organization.id}/${invoice.id}/snapshot.json`;

    await Promise.all([
      writeFile(path.join(dir, "facturx.xml"), xml, "utf8"),
      writeFile(path.join(dir, "journal.json"), journal, "utf8"),
      writeFile(path.join(dir, "snapshot.json"), snapshot, "utf8"),
    ]);

    const checksum = (content: string) =>
      createHash("sha256").update(content, "utf8").digest("hex").slice(0, 16);

    const { randomBytes } = await import("node:crypto");
    const newId = () => `c${randomBytes(12).toString("base64url")}`;

    await db.$executeRaw`
      DELETE FROM invoice_archive_artifacts WHERE invoice_id = ${invoice.id}
    `;

    const artifacts = [
      {
        id: newId(),
        kind: "FACTURX_XML",
        filename: `${number}.facturx.xml`,
        mimeType: "application/xml",
        content: xml,
        storageKey: xmlKey,
      },
      {
        id: newId(),
        kind: "VALIDATION_JOURNAL",
        filename: `${number}.journal.json`,
        mimeType: "application/json",
        content: journal,
        storageKey: journalKey,
      },
      {
        id: newId(),
        kind: "PAYLOAD_SNAPSHOT",
        filename: `${number}.snapshot.json`,
        mimeType: "application/json",
        content: snapshot,
        storageKey: snapKey,
      },
    ] as const;

    for (const a of artifacts) {
      await db.$executeRaw`
        INSERT INTO invoice_archive_artifacts
          (id, invoice_id, kind, filename, mime_type, content, storage_key, created_at)
        VALUES
          (${a.id}, ${invoice.id}, ${a.kind}::"InvoiceArchiveKind", ${a.filename}, ${a.mimeType}, ${a.content}, ${a.storageKey}, NOW())
      `;
    }

    const eventId = newId();
    const meta = JSON.stringify({
      artifacts: ["FACTURX_XML", "VALIDATION_JOURNAL", "PAYLOAD_SNAPSHOT"],
      retentionNote: "Conservation 10 ans — stockage local sandbox (.data/archives)",
    });

    await db.$executeRaw`
      INSERT INTO invoice_lifecycle_events
        (id, invoice_id, status, scope, source, message, metadata, occurred_at)
      VALUES
        (${eventId}, ${invoice.id}, 'ARCHIVED'::"InvoiceStatus", 'EMISSION'::"LifecycleScope",
         'archive-v1', ${`Archivage documentaire (Factur-X + journal). checksum=${checksum(xml)}`},
         ${meta}::jsonb, NOW())
    `;

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "ARCHIVED",
        format: "FACTUR_X",
        number: invoice.number ?? number,
        facturxStorageKey: xmlKey,
      },
    });

    const detail = await getInvoiceDetail({ data: { invoiceId: data.invoiceId } });
    if (!detail) {
      return { success: false, error: "Facture introuvable après archivage.", detail: null };
    }

    return {
      success: true,
      artifactCount: 3,
      detail,
      message: "Facture archivée — Factur-X, journal des contrôles et snapshot conservés.",
    };
  });

export const listInvoiceArchives = createServerFn({ method: "GET" })
  .validator((data: { invoiceId: string }) => data)
  .handler(async ({ data }): Promise<ArchiveArtifactItem[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const invoice = await db.invoice.findFirst({
      where: { id: data.invoiceId, organizationId: workspace.organization.id },
      select: { id: true },
    });
    if (!invoice) return [];

    try {
      const rows = await db.$queryRaw<
        {
          id: string;
          kind: string;
          filename: string;
          mime_type: string;
          created_at: Date;
        }[]
      >`
        SELECT id, kind::text AS kind, filename, mime_type, created_at
        FROM invoice_archive_artifacts
        WHERE invoice_id = ${invoice.id}
        ORDER BY created_at ASC
      `;

      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        filename: r.filename,
        mimeType: r.mime_type,
        createdAt: new Date(r.created_at).toISOString(),
      }));
    } catch {
      return [];
    }
  });

export const downloadArchiveArtifact = createServerFn({ method: "GET" })
  .validator((data: { artifactId: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; filename: string; mimeType: string; content: string }
      | { success: false; error: string }
    > => {
      const { loadWorkspace } = await import("@/lib/workspace.server");
      const { db } = await import("@/lib/db");

      const workspace = await loadWorkspace();
      if (!workspace) return { success: false, error: "Session expirée." };

      try {
        const rows = await db.$queryRaw<{ filename: string; mime_type: string; content: string }[]>`
          SELECT a.filename, a.mime_type, a.content
          FROM invoice_archive_artifacts a
          INNER JOIN invoices i ON i.id = a.invoice_id
          WHERE a.id = ${data.artifactId}
            AND i.organization_id = ${workspace.organization.id}
          LIMIT 1
        `;

        const artifact = rows[0];
        if (!artifact) return { success: false, error: "Artefact introuvable." };

        return {
          success: true,
          filename: artifact.filename,
          mimeType: artifact.mime_type,
          content: artifact.content,
        };
      } catch {
        return {
          success: false,
          error: "Archive indisponible — redémarrez le serveur (prisma generate).",
        };
      }
    },
  );
