import { createServerFn } from "@tanstack/react-start";

import { canMutateSourceInvoice, invoiceImmutabilityMessage } from "@/lib/invoice-lifecycle-rules";

export const updateSourceInvoice = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string; number: string; issueDate: string | null }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false as const, error: "Session expirée." };
    }

    const number = data.number.trim();
    if (!number) {
      return { success: false as const, error: "Le numéro de facture est obligatoire." };
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
      },
    });
    if (!invoice) {
      return { success: false as const, error: "Facture introuvable." };
    }

    if (!canMutateSourceInvoice(invoice.status)) {
      return {
        success: false as const,
        error: invoiceImmutabilityMessage(invoice.status),
      };
    }

    const clash = await db.invoice.findFirst({
      where: {
        organizationId: workspace.organization.id,
        number,
        NOT: { id: invoice.id },
      },
      select: { id: true },
    });
    if (clash) {
      return {
        success: false as const,
        error: `Le numéro « ${number} » est déjà utilisé — une facture ne peut pas être chargée / numérotée deux fois.`,
      };
    }

    let issueDate: Date | null = null;
    if (data.issueDate) {
      const parsed = new Date(`${data.issueDate}T12:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) {
        return { success: false as const, error: "Date d’émission invalide." };
      }
      issueDate = parsed;
    }

    const nextStatus =
      invoice.status === "ARCHIVED" || invoice.status === "BLOCKED" ? "DRAFT" : invoice.status;

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        number,
        issueDate,
        status: nextStatus,
      },
    });

    await db.invoiceLifecycleEvent.create({
      data: {
        invoiceId: invoice.id,
        status: nextStatus,
        source: "USER",
        message: "Facture source modifiée (Sources).",
      },
    });

    return { success: true as const, error: null };
  });

export const deleteSourceInvoice = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string; confirmText: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    if ((data.confirmText ?? "").trim().toUpperCase() !== "SUPPRIMER") {
      return {
        success: false as const,
        error: "Confirmation invalide. Saisissez SUPPRIMER.",
      };
    }

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false as const, error: "Session expirée." };
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
      },
      select: {
        id: true,
        number: true,
        status: true,
        sourceSystem: true,
      },
    });

    if (!invoice) {
      return { success: false as const, error: "Facture introuvable." };
    }

    if (!canMutateSourceInvoice(invoice.status)) {
      return {
        success: false as const,
        error: invoiceImmutabilityMessage(invoice.status),
      };
    }

    await db.invoice.delete({ where: { id: invoice.id } });

    return { success: true as const, error: null };
  });

export const deleteSourceInvoices = createServerFn({ method: "POST" })
  .validator((data: { invoiceIds: string[]; confirmText: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    if ((data.confirmText ?? "").trim().toUpperCase() !== "SUPPRIMER") {
      return {
        success: false as const,
        error: "Confirmation invalide. Saisissez SUPPRIMER.",
        deleted: 0,
        skipped: 0,
      };
    }

    const ids = [...new Set(data.invoiceIds.filter(Boolean))];
    if (ids.length === 0) {
      return {
        success: false as const,
        error: "Aucune facture sélectionnée.",
        deleted: 0,
        skipped: 0,
      };
    }

    const workspace = await loadWorkspace();
    if (!workspace) {
      return {
        success: false as const,
        error: "Session expirée.",
        deleted: 0,
        skipped: 0,
      };
    }

    const invoices = await db.invoice.findMany({
      where: {
        id: { in: ids },
        organizationId: workspace.organization.id,
      },
      select: { id: true, status: true, number: true },
    });

    const deletable = invoices.filter((inv) => canMutateSourceInvoice(inv.status));
    const skipped = invoices.length - deletable.length;

    if (deletable.length > 0) {
      await db.invoice.deleteMany({
        where: {
          id: { in: deletable.map((i) => i.id) },
          organizationId: workspace.organization.id,
        },
      });
    }

    if (deletable.length === 0) {
      return {
        success: false as const,
        error:
          skipped > 0
            ? "Aucune facture supprimable — déjà envoyées sur le réseau PA (verrouillage légal)."
            : "Factures introuvables.",
        deleted: 0,
        skipped,
      };
    }

    return {
      success: true as const,
      error: null,
      deleted: deletable.length,
      skipped,
    };
  });
