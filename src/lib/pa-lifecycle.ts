import type { InvoiceStatus, PaTransmissionStatus, Prisma } from "@prisma/client";

import { invoiceStatusForPaEmission } from "@/lib/pa-status";
import { notifyOrganizationPaEvent, paStatusToNotifyEvent } from "@/lib/pa-notify";

type DbClient = Prisma.TransactionClient | import("@prisma/client").PrismaClient;

export type ApplyPaStatusInput = {
  invoiceId: string;
  organizationId: string;
  paStatus: PaTransmissionStatus;
  paStatusCode?: string | null;
  paStatusMessage?: string | null;
  paReference?: string | null;
  source?: string;
  scope?: "EMISSION" | "RECEPTION";
  notify?: boolean;
  invoiceNumber?: string | null;
};

export async function applyInvoicePaStatus(db: DbClient, input: ApplyPaStatusInput) {
  const now = new Date();
  const invoiceStatus = invoiceStatusForPaEmission(input.paStatus);
  const scope = input.scope ?? "EMISSION";

  const data: Prisma.InvoiceUpdateInput = {
    paStatus: input.paStatus,
    paStatusCode: input.paStatusCode ?? undefined,
    paStatusMessage: input.paStatusMessage ?? undefined,
    lastPaStatusAt: now,
    ...(input.paReference ? { paReference: input.paReference } : {}),
    ...(invoiceStatus ? { status: invoiceStatus } : {}),
    ...(input.paStatus === "ACCEPTED_BY_PA" || input.paStatus === "DELIVERED_TO_BUYER_PA"
      ? { transmittedAt: now }
      : {}),
    lifecycleEvents: {
      create: {
        status: invoiceStatus ?? "TRANSMITTING",
        scope,
        source: input.source ?? "pa-lifecycle",
        message: input.paStatusMessage ?? input.paStatus,
        metadata: {
          paStatus: input.paStatus,
          paStatusCode: input.paStatusCode ?? null,
          paReference: input.paReference ?? null,
        },
      },
    },
  };

  await db.invoice.update({
    where: { id: input.invoiceId },
    data,
  });

  if (input.notify !== false) {
    const event = paStatusToNotifyEvent(
      input.paStatus,
      scope === "RECEPTION" ? "reception" : "emission",
    );
    if (event) {
      await notifyOrganizationPaEvent(input.organizationId, event, {
        paReference: input.paReference,
        invoiceNumber: input.invoiceNumber,
        message: input.paStatusMessage,
      });
    }
  }
}

export type ApplyEReportingPaStatusInput = {
  entryId: string;
  organizationId: string;
  paStatus: PaTransmissionStatus;
  paStatusCode?: string | null;
  paStatusMessage?: string | null;
  paReference?: string | null;
  periodLabel?: string | null;
  notify?: boolean;
};

export async function applyEReportingPaStatus(db: DbClient, input: ApplyEReportingPaStatusInput) {
  const now = new Date();
  const transmitted =
    input.paStatus === "ACCEPTED_BY_PA" ||
    input.paStatus === "DELIVERED_TO_BUYER_PA" ||
    input.paStatus === "SUBMITTED_TO_PA";

  await db.eReportingEntry.update({
    where: { id: input.entryId },
    data: {
      paStatus: input.paStatus,
      paStatusCode: input.paStatusCode ?? undefined,
      paStatusMessage: input.paStatusMessage ?? undefined,
      lastPaStatusAt: now,
      ...(input.paReference ? { paReference: input.paReference } : {}),
      ...(transmitted && input.paStatus !== "SUBMITTED_TO_PA"
        ? { transmittedAt: now }
        : input.paStatus === "SUBMITTED_TO_PA"
          ? { transmittedAt: null }
          : {}),
    },
  });

  if (input.notify !== false) {
    const event = paStatusToNotifyEvent(input.paStatus, "ereporting");
    if (event) {
      await notifyOrganizationPaEvent(input.organizationId, event, {
        paReference: input.paReference,
        periodLabel: input.periodLabel,
        message: input.paStatusMessage,
      });
    }
  }
}

/** Progression émission sandbox / partenaire après dépôt initial */
export const EMISSION_PROGRESSION: PaTransmissionStatus[] = [
  "SUBMITTED_TO_PA",
  "ACCEPTED_BY_PA",
  "DELIVERED_TO_BUYER_PA",
];

export const EREPORTING_PROGRESSION: PaTransmissionStatus[] = ["SUBMITTED_TO_PA", "ACCEPTED_BY_PA"];

export function progressionMessage(status: PaTransmissionStatus, platformName: string): string {
  switch (status) {
    case "SUBMITTED_TO_PA":
      return `Dépôt reçu par ${platformName} — en cours de traitement réseau.`;
    case "ACCEPTED_BY_PA":
      return `${platformName} a accepté le document (contrôles réglementaires OK).`;
    case "DELIVERED_TO_BUYER_PA":
      return `Document mis à disposition sur le réseau public de facturation.`;
    case "REJECTED":
      return `Rejet par ${platformName} — corriger et renvoyer.`;
    case "REFUSED":
      return `Refus métier remonté par ${platformName}.`;
    case "TECHNICAL_ERROR":
      return `Erreur technique côté ${platformName} — réessayer ou contacter le support PA.`;
    case "RECEIVED":
      return `Document reçu via ${platformName}.`;
    default:
      return `Statut PA : ${status}`;
  }
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Partial<Record<InvoiceStatus, string>> = {
    TRANSMITTING: "Transmission en cours",
    TRANSMITTED: "Transmise PA",
    REJECTED: "Rejetée PA",
    REFUSED: "Refusée",
    RECEIVED: "Reçue",
  };
  return labels[status] ?? status;
}
