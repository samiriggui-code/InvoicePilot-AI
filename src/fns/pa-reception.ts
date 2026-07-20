import { createServerFn } from "@tanstack/react-start";

import { seedSandboxInboxDocument } from "@/api/connectors/pa/sandbox";
import { resolvePaConnector } from "@/lib/pa-connectors";
import { notifyOrganizationPaEvent } from "@/lib/pa-notify";
import { PA_STATUS_LABELS } from "@/lib/pa-status";

export type InboxInvoice = {
  id: string;
  documentId: string | null;
  number: string | null;
  status: string;
  paStatus: string | null;
  paStatusMessage: string | null;
  supplierName: string;
  supplierSiren: string | null;
  amountTtc: number;
  issueDate: string | null;
  receivedAt: string;
  paReference: string | null;
  platformName: string | null;
  hasStructuredPayload: boolean;
  hasPdf: boolean;
  isImportable: boolean;
};

export type InboxData = {
  invoices: InboxInvoice[];
  pendingDocuments: InboxInvoice[];
  hasReceptionPa: boolean;
  platformName: string | null;
};

function mapDocument(d: {
  id: string;
  paReference: string;
  paStatus: string;
  paStatusMessage: string | null;
  supplierName: string;
  supplierSiren: string | null;
  amountTtc: unknown;
  issueDate: Date | null;
  receivedAt: Date;
  structuredPayload: unknown;
  pdfStorageKey: string | null;
  invoice: {
    id: string;
    number: string | null;
    status: string;
    paStatus: string | null;
    paStatusMessage: string | null;
    platformConnection: { platform: { name: string } } | null;
  } | null;
}): InboxInvoice {
  const inv = d.invoice;
  return {
    id: inv?.id ?? d.id,
    documentId: d.id,
    number: inv?.number ?? d.paReference,
    status: inv?.status ?? d.paStatus,
    paStatus: inv?.paStatus ?? d.paStatus,
    paStatusMessage: inv?.paStatusMessage ?? d.paStatusMessage,
    supplierName: d.supplierName,
    supplierSiren: d.supplierSiren,
    amountTtc: Number(d.amountTtc),
    issueDate: d.issueDate?.toISOString().slice(0, 10) ?? null,
    receivedAt: d.receivedAt.toISOString(),
    paReference: d.paReference,
    platformName: inv?.platformConnection?.platform.name ?? null,
    hasStructuredPayload: Boolean(d.structuredPayload),
    hasPdf: Boolean(d.pdfStorageKey),
    isImportable: !inv,
  };
}

/**
 * Réception PA — documents entrants + factures fournisseurs importées.
 */
export const getInboxData = createServerFn({ method: "GET" }).handler(
  async (): Promise<InboxData | null> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return null;

    const receptionPa = await db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: workspace.organization.id,
        isActive: true,
        purpose: { in: ["RECEPTION", "BOTH"] },
      },
      include: { platform: { select: { name: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    const documents = await db.paInboxDocument.findMany({
      where: { organizationId: workspace.organization.id },
      include: {
        invoice: {
          include: {
            platformConnection: { include: { platform: { select: { name: true } } } },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });

    const purchaseInvoices = await db.invoice.findMany({
      where: {
        organizationId: workspace.organization.id,
        direction: "PURCHASE",
        paInboxDocument: null,
        NOT: {
          OR: [{ id: { startsWith: "seed-" } }, { counterpartyId: { startsWith: "seed-" } }],
        },
      },
      include: {
        counterparty: { select: { legalName: true, siren: true } },
        platformConnection: { include: { platform: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const fromDocs = documents.map(mapDocument);
    const fromInvoices: InboxInvoice[] = purchaseInvoices.map((inv) => ({
      id: inv.id,
      documentId: null,
      number: inv.number,
      status: inv.status,
      paStatus: inv.paStatus,
      paStatusMessage: inv.paStatusMessage,
      supplierName: inv.counterparty?.legalName ?? "Fournisseur",
      supplierSiren: inv.counterparty?.siren ?? null,
      amountTtc: Number(inv.totalTtc),
      issueDate: inv.issueDate?.toISOString().slice(0, 10) ?? null,
      receivedAt: inv.createdAt.toISOString(),
      paReference: inv.paReference,
      platformName: inv.platformConnection?.platform.name ?? null,
      hasStructuredPayload: Boolean(inv.facturxStorageKey),
      hasPdf: Boolean(inv.pdfStorageKey),
      isImportable: false,
    }));

    const merged = [...fromDocs, ...fromInvoices].sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );

    const pendingDocuments = documents.filter((d) => !d.invoiceId).map(mapDocument);

    return {
      hasReceptionPa: Boolean(receptionPa),
      platformName: receptionPa?.platform.name ?? null,
      invoices: merged,
      pendingDocuments,
    };
  },
);

/** Synchronise la réception sandbox (document démo + fetch connecteur). */
export const syncPaInboxSandbox = createServerFn({ method: "POST" }).handler(
  async (): Promise<
    | { success: true; imported: number; skipped: number; message: string }
    | { success: false; error: string }
  > => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { canConnectionTransmit } = await import("@/lib/pa-partners");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false, error: "Session expirée." };

    const receptionPa = await db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: workspace.organization.id,
        isActive: true,
        purpose: { in: ["RECEPTION", "BOTH"] },
      },
    });

    if (!receptionPa || !canConnectionTransmit(receptionPa.credentialsRef)) {
      return {
        success: false,
        error: "Branchez une PA réception (sandbox ou API) dans Plateformes agréées.",
      };
    }

    await seedSandboxInboxDocument(workspace.organization.id, receptionPa.id);

    const connector = resolvePaConnector(receptionPa.credentialsRef);
    const inbound = (await connector.fetchInbox?.(workspace.organization.id)) ?? [];

    let imported = 0;
    for (const item of inbound) {
      const exists = await db.paInboxDocument.findFirst({
        where: { organizationId: workspace.organization.id, paReference: item.paReference },
      });
      if (exists?.invoiceId) continue;

      if (!exists) {
        await db.paInboxDocument.create({
          data: {
            organizationId: workspace.organization.id,
            platformConnectionId: receptionPa.id,
            paReference: item.paReference,
            paStatus: "RECEIVED",
            paStatusCode: "RECEIVED",
            paStatusMessage: PA_STATUS_LABELS.RECEIVED,
            supplierName: item.supplierName,
            supplierSiren: item.supplierSiren,
            issueDate: item.issueDate ? new Date(item.issueDate) : null,
            amountTtc: item.amountTtc,
            structuredPayload: {
              canonical: item.canonical,
              raw: JSON.parse(JSON.stringify(item.raw ?? null)),
            },
            lastPaStatusAt: new Date(),
          },
        });
        imported++;
      }
    }

    if (imported > 0) {
      await notifyOrganizationPaEvent(workspace.organization.id, "reception_available", {
        supplierName: inbound[0]?.supplierName,
        paReference: inbound[0]?.paReference,
        message: `${imported} document(s) disponible(s) en réception PA.`,
      });
    }

    return {
      success: true,
      imported,
      skipped: inbound.length - imported,
      message:
        imported > 0
          ? `${imported} document(s) récupéré(s) depuis la PA.`
          : "Aucun nouveau document — la boîte est à jour.",
    };
  },
);

/** Importe un PaInboxDocument en facture fournisseur PURCHASE */
export const importInboxDocument = createServerFn({ method: "POST" })
  .validator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const doc = await db.paInboxDocument.findFirst({
      where: { id: data.documentId, organizationId: workspace.organization.id },
    });
    if (!doc) return { success: false as const, error: "Document introuvable." };
    if (doc.invoiceId) return { success: false as const, error: "Déjà importé." };

    let counterparty = await db.counterparty.findFirst({
      where: {
        organizationId: workspace.organization.id,
        siren: doc.supplierSiren ?? undefined,
      },
    });

    if (!counterparty) {
      counterparty = await db.counterparty.create({
        data: {
          organizationId: workspace.organization.id,
          legalName: doc.supplierName,
          siren: doc.supplierSiren,
          type: "SUPPLIER",
        },
      });
    }

    const invoice = await db.invoice.create({
      data: {
        organizationId: workspace.organization.id,
        counterpartyId: counterparty.id,
        direction: "PURCHASE",
        status: "RECEIVED",
        number: doc.paReference,
        issueDate: doc.issueDate,
        totalTtc: doc.amountTtc,
        subtotalHt: doc.amountTtc,
        paReference: doc.paReference,
        paStatus: doc.paStatus,
        paStatusCode: doc.paStatusCode,
        paStatusMessage: doc.paStatusMessage,
        lastPaStatusAt: doc.lastPaStatusAt ?? new Date(),
        platformConnectionId: doc.platformConnectionId,
        sourceSystem: "pa-inbox",
        sourceExternalId: doc.paReference,
        lifecycleEvents: {
          create: {
            status: "RECEIVED",
            scope: "RECEPTION",
            source: "pa-inbox-import",
            message: doc.paStatusMessage ?? "Facture fournisseur reçue via PA.",
          },
        },
      },
    });

    await db.paInboxDocument.update({
      where: { id: doc.id },
      data: { invoiceId: invoice.id },
    });

    await notifyOrganizationPaEvent(workspace.organization.id, "reception_available", {
      supplierName: doc.supplierName,
      paReference: doc.paReference,
      message: "Document importé en facture fournisseur.",
    });

    return { success: true as const, invoiceId: invoice.id };
  });

export const markPurchaseReviewed = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string; action: "approve" | "refuse" }) => data)
  .handler(async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false, error: "Session expirée." };

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
        direction: "PURCHASE",
      },
    });

    if (!invoice) return { success: false, error: "Facture introuvable." };
    if (invoice.status !== "RECEIVED") {
      return { success: false, error: "Seules les factures reçues peuvent être traitées." };
    }

    const next = data.action === "approve" ? "APPROVED" : "REFUSED";
    const paStatus = data.action === "approve" ? "ACCEPTED_BY_PA" : "REFUSED";

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: next,
        paStatus,
        paStatusMessage:
          data.action === "approve"
            ? "Facture fournisseur approuvée."
            : "Facture fournisseur refusée.",
        lastPaStatusAt: new Date(),
        lifecycleEvents: {
          create: {
            status: next,
            scope: "RECEPTION",
            source: "user",
            message:
              data.action === "approve"
                ? "Facture fournisseur approuvée."
                : "Facture fournisseur refusée.",
          },
        },
      },
    });

    return { success: true };
  });
