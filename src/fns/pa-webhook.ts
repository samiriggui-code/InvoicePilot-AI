import type { PaTransmissionStatus } from "@prisma/client";

import { resolvePaConnector } from "@/lib/pa-connectors";
import {
  applyEReportingPaStatus,
  applyInvoicePaStatus,
  progressionMessage,
} from "@/lib/pa-lifecycle";
import { mapPartnerPaCode } from "@/lib/pa-status";
import { sandboxEReportingProgression } from "@/api/connectors/pa/sandbox";

export type ProcessPaWebhookResult =
  { ok: true; kind: "invoice" | "ereporting" | "inbox"; id: string } | { ok: false; error: string };

/**
 * Traite un webhook PA entrant (statut émission, e-reporting ou réception).
 * Route : POST /api/v1/webhooks/pa/:slug
 */
export async function processPaWebhook(
  slug: string,
  body: unknown,
): Promise<ProcessPaWebhookResult> {
  const connector = resolvePaConnector(slug === "sandbox" ? "mode:sandbox" : `mode:apikey:${slug}`);
  const event = connector.mapWebhook?.(body);
  if (!event) return { ok: false, error: "Payload webhook PA invalide." };

  const paStatus = mapPartnerPaCode(event.status) ?? (event.status as PaTransmissionStatus);
  const { db } = await import("@/lib/db");

  const invoice = await db.invoice.findFirst({
    where: { paReference: event.paReference },
    select: { id: true, organizationId: true, number: true, direction: true },
  });

  if (invoice) {
    await applyInvoicePaStatus(db, {
      invoiceId: invoice.id,
      organizationId: invoice.organizationId,
      paStatus,
      paStatusCode: event.status,
      paStatusMessage: event.message ?? undefined,
      paReference: event.paReference,
      invoiceNumber: invoice.number,
      scope: invoice.direction === "PURCHASE" ? "RECEPTION" : "EMISSION",
      source: `webhook:${slug}`,
    });
    return { ok: true, kind: "invoice", id: invoice.id };
  }

  const entry = await db.eReportingEntry.findFirst({
    where: { paReference: event.paReference },
    select: { id: true, organizationId: true, periodStart: true, periodEnd: true },
  });

  if (entry) {
    const periodLabel = `${entry.periodStart.toISOString().slice(0, 10)} → ${entry.periodEnd.toISOString().slice(0, 10)}`;
    await applyEReportingPaStatus(db, {
      entryId: entry.id,
      organizationId: entry.organizationId,
      paStatus,
      paStatusCode: event.status,
      paStatusMessage: event.message ?? undefined,
      paReference: event.paReference,
      periodLabel,
    });
    return { ok: true, kind: "ereporting", id: entry.id };
  }

  const inbox = await db.paInboxDocument.findFirst({
    where: { paReference: event.paReference },
  });

  if (inbox) {
    await db.paInboxDocument.update({
      where: { id: inbox.id },
      data: {
        paStatus,
        paStatusCode: event.status,
        paStatusMessage: event.message ?? undefined,
        lastPaStatusAt: new Date(),
      },
    });
    const { notifyOrganizationPaEvent } = await import("@/lib/pa-notify");
    if (paStatus === "RECEIVED") {
      await notifyOrganizationPaEvent(inbox.organizationId, "reception_available", {
        paReference: event.paReference,
        supplierName: inbox.supplierName,
        message: event.message,
      });
    }
    return { ok: true, kind: "inbox", id: inbox.id };
  }

  return { ok: false, error: `Référence PA inconnue : ${event.paReference}` };
}

export { sandboxEReportingProgression, progressionMessage };
