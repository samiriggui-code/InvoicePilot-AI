import { createServerFn } from "@tanstack/react-start";

/**
 * PDF source d’une facture importée — pour la visionneuse.
 * Contenu stocké en base64 dans StorageObject (upload manuel).
 */
export const getInvoiceSourcePdf = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { getStorageObject } = await import("@/api/storage/store");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false as const, error: "Session expirée.", pdfUrl: null, filename: null };
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
      },
      select: {
        id: true,
        number: true,
        pdfStorageKey: true,
        purchaseOrderRef: true,
        sourceSystem: true,
      },
    });

    if (!invoice) {
      return {
        success: false as const,
        error: "Facture introuvable.",
        pdfUrl: null,
        filename: null,
      };
    }

    if (!invoice.pdfStorageKey) {
      return {
        success: false as const,
        error: "Aucun PDF source pour cette facture (import boutique sans fichier).",
        pdfUrl: null,
        filename: null,
      };
    }

    const obj = await getStorageObject(workspace.organization.id, invoice.pdfStorageKey);
    if (!obj?.content) {
      return {
        success: false as const,
        error: "Fichier PDF introuvable en stockage.",
        pdfUrl: null,
        filename: null,
      };
    }

    const meta = (obj.metadata ?? {}) as { encoding?: string };
    const isBase64 =
      meta.encoding === "base64" || /^[A-Za-z0-9+/=\s]+$/.test(obj.content.slice(0, 80));
    const pdfUrl = isBase64
      ? `data:application/pdf;base64,${obj.content.replace(/\s/g, "")}`
      : `data:application/pdf;base64,${Buffer.from(obj.content, "utf8").toString("base64")}`;

    return {
      success: true as const,
      error: null,
      pdfUrl,
      filename: obj.filename ?? invoice.purchaseOrderRef ?? `${invoice.number ?? invoice.id}.pdf`,
      number: invoice.number,
      sourceSystem: invoice.sourceSystem,
    };
  });
