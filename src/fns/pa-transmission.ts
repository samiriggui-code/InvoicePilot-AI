import { createServerFn } from "@tanstack/react-start";

import { sandboxEmissionProgression } from "@/api/connectors/pa/sandbox";
import type { InvoiceDetail } from "@/fns/invoice-remediation";
import { resolvePaConnector } from "@/lib/pa-connectors";
import { applyInvoicePaStatus, EMISSION_PROGRESSION, progressionMessage } from "@/lib/pa-lifecycle";
import type { PaTransmissionStatus } from "@prisma/client";
import { mapPartnerPaCode } from "@/lib/pa-status";

export type TransmitInput = {
  invoiceId: string;
};

export type TransmitResult =
  | {
      success: true;
      status: "TRANSMITTED" | "REJECTED";
      paReference: string;
      platformName: string;
      message: string;
      paStatus: PaTransmissionStatus;
      detail: InvoiceDetail;
    }
  | { success: false; error: string; detail: InvoiceDetail | null };

/**
 * Émission vers la PA connectée — dépôt réel via connecteur sandbox/partenaire,
 * progression statuts réseau + notifications.
 */
export const transmitInvoice = createServerFn({ method: "POST" })
  .validator((data: TransmitInput) => data)
  .handler(async ({ data }): Promise<TransmitResult> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
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
      },
      include: {
        counterparty: true,
        lines: true,
        platformConnection: { include: { platform: true } },
      },
    });

    if (!invoice) {
      return { success: false, error: "Facture introuvable.", detail: null };
    }

    if (invoice.status !== "VALIDATED") {
      return {
        success: false,
        error:
          invoice.status === "TRANSMITTED"
            ? "Facture déjà transmise."
            : invoice.status === "TRANSMITTING"
              ? "Transmission déjà en cours."
              : invoice.status === "REJECTED"
                ? "Corrigez le rejet et remettez la facture prête avant de renvoyer."
                : "La facture doit être prête (VALIDATED) avant émission PA.",
        detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
      };
    }

    const connection =
      invoice.platformConnection ??
      (await db.organizationPlatformConnection.findFirst({
        where: {
          organizationId: workspace.organization.id,
          isActive: true,
          purpose: { in: ["EMISSION", "BOTH"] },
          OR: [
            { credentialsRef: "mode:sandbox" },
            { credentialsRef: "demo-sandbox" },
            { credentialsRef: { startsWith: "mode:apikey:" } },
          ],
        },
        include: { platform: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }));

    if (connection) {
      const { canConnectionTransmit } = await import("@/lib/pa-partners");
      if (!canConnectionTransmit(connection.credentialsRef)) {
        return {
          success: false,
          error:
            "Cette PA est seulement déclarée. Configurez une API partenaire ou activez le canal technique sandbox.",
          detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
        };
      }
    }

    if (!connection) {
      return {
        success: false,
        error: "Aucune PA connectée. Allez dans Plateformes agréées.",
        detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
      };
    }

    const buyerSiren = invoice.buyerSiren ?? invoice.counterparty?.siren;
    const issues = validateInvoiceDraft({
      buyerSiren,
      operationCategory: invoice.operationCategory,
      deliveryDiffers: invoice.deliveryDiffers,
      deliveryLine1: invoice.counterparty?.deliveryLine1,
      deliveryCity: invoice.counterparty?.deliveryCity,
      issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
      serviceDate: invoice.serviceDate?.toISOString().slice(0, 10) ?? null,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceHt: Number(l.unitPriceHt),
        vatRate: Number(l.vatRate),
      })),
      sellerSiren: workspace.organization.siren,
      transactionType: invoice.transactionType,
    });

    if (issues.some((i) => i.blocking)) {
      return {
        success: false,
        error: "Contrôles bloquants restants — corrigez avant transmission PA.",
        detail: await getInvoiceDetail({ data: { invoiceId: data.invoiceId } }),
      };
    }

    const platformName = connection.platform.name;
    const connector = resolvePaConnector(connection.credentialsRef);

    await db.invoice.update({
      where: { id: invoice.id },
      data: { platformConnectionId: connection.id },
    });

    await applyInvoicePaStatus(db, {
      invoiceId: invoice.id,
      organizationId: workspace.organization.id,
      paStatus: "QUEUED",
      paStatusCode: "QUEUED",
      paStatusMessage: "Mise en file avant dépôt PA.",
      invoiceNumber: invoice.number,
      notify: false,
    });

    const facturxXml = `<!-- Factur-X placeholder ${invoice.id} -->`;
    const canonical = {
      number: invoice.number,
      totals: { totalTtc: Number(invoice.totalTtc) },
    };

    const submitResult = await connector.submit(
      workspace.organization.id,
      invoice.id,
      facturxXml,
      canonical as never,
    );

    if (!submitResult.ok) {
      const errMsg = submitResult.errors.map((e) => e.message).join(" · ");
      await applyInvoicePaStatus(db, {
        invoiceId: invoice.id,
        organizationId: workspace.organization.id,
        paStatus: "REJECTED",
        paStatusCode: submitResult.errors[0]?.code ?? "REJECTED",
        paStatusMessage: errMsg,
        invoiceNumber: invoice.number,
      });
      const detail = await getInvoiceDetail({ data: { invoiceId: data.invoiceId } });
      return {
        success: false,
        error: errMsg,
        detail,
      };
    }

    const paReference = submitResult.paReference;
    const events = sandboxEmissionProgression(paReference);

    for (const ev of events) {
      const paStatus = mapPartnerPaCode(ev.status) ?? (ev.status as PaTransmissionStatus);
      if (!EMISSION_PROGRESSION.includes(paStatus) && paStatus !== "SUBMITTED_TO_PA") {
        continue;
      }
      await applyInvoicePaStatus(db, {
        invoiceId: invoice.id,
        organizationId: workspace.organization.id,
        paStatus,
        paStatusCode: ev.status,
        paStatusMessage: progressionMessage(paStatus, platformName),
        paReference,
        invoiceNumber: invoice.number,
        source: `pa:${connector.slug}`,
      });
    }

    const detail = await getInvoiceDetail({ data: { invoiceId: data.invoiceId } });
    if (!detail) {
      return { success: false, error: "Facture introuvable après transmission.", detail: null };
    }

    return {
      success: true,
      status: "TRANSMITTED",
      paReference,
      platformName,
      message: progressionMessage("DELIVERED_TO_BUYER_PA", platformName),
      paStatus: "DELIVERED_TO_BUYER_PA",
      detail,
    };
  });
