import type { NotificationSeverity } from "@prisma/client";

import type { PaTransmissionStatus } from "@prisma/client";

import { PA_STATUS_LABELS } from "@/lib/pa-status";

export type PaNotifyEvent =
  | "emission_submitted"
  | "emission_accepted"
  | "emission_delivered"
  | "emission_rejected"
  | "emission_refused"
  | "emission_technical_error"
  | "reception_available"
  | "ereporting_submitted"
  | "ereporting_accepted"
  | "ereporting_rejected";

function eventMeta(
  event: PaNotifyEvent,
  ctx: {
    paReference?: string | null;
    invoiceNumber?: string | null;
    supplierName?: string | null;
    periodLabel?: string | null;
    message?: string | null;
  },
): { title: string; body: string; severity: NotificationSeverity; href: string } {
  const ref = ctx.paReference ? ` Réf. ${ctx.paReference}.` : "";
  const num = ctx.invoiceNumber ? ` ${ctx.invoiceNumber}` : "";
  const extra = ctx.message ? ` ${ctx.message}` : "";

  switch (event) {
    case "emission_submitted":
      return {
        title: "Émission transmise à la PA",
        body: `Facture${num} déposée sur la plateforme agréée.${ref}`,
        severity: "INFO",
        href: "/invoices",
      };
    case "emission_accepted":
      return {
        title: "Émission acceptée par la PA",
        body: `Facture${num} validée par la PA.${ref}${extra}`,
        severity: "SUCCESS",
        href: "/invoices",
      };
    case "emission_delivered":
      return {
        title: "Facture mise à disposition",
        body: `Facture${num} disponible chez l’acheteur via le réseau PA.${ref}`,
        severity: "SUCCESS",
        href: "/invoices",
      };
    case "emission_rejected":
      return {
        title: "Émission rejetée",
        body: `La PA a rejeté la facture${num}.${ref}${extra}`,
        severity: "ALERT",
        href: "/invoices",
      };
    case "emission_refused":
      return {
        title: "Refus acheteur / PA",
        body: `Refus sur la facture${num}.${ref}${extra}`,
        severity: "WARNING",
        href: "/invoices",
      };
    case "emission_technical_error":
      return {
        title: "Erreur technique PA",
        body: `Incident PA sur la facture${num}.${ref}${extra}`,
        severity: "ALERT",
        href: "/invoices",
      };
    case "reception_available":
      return {
        title: "Réception disponible",
        body: `Nouvelle facture fournisseur : ${ctx.supplierName ?? "document PA"}.${ref}`,
        severity: "INFO",
        href: "/inbox",
      };
    case "ereporting_submitted":
      return {
        title: "E-reporting déposé",
        body: `Lot ${ctx.periodLabel ?? "période"} transmis à la PA.${ref}`,
        severity: "INFO",
        href: "/e-reporting",
      };
    case "ereporting_accepted":
      return {
        title: "E-reporting accepté",
        body: `Lot ${ctx.periodLabel ?? "période"} accepté par la PA.${ref}${extra}`,
        severity: "SUCCESS",
        href: "/e-reporting",
      };
    case "ereporting_rejected":
      return {
        title: "E-reporting rejeté",
        body: `Lot ${ctx.periodLabel ?? "période"} refusé par la PA.${ref}${extra}`,
        severity: "ALERT",
        href: "/e-reporting",
      };
  }
}

/** Notifie tous les membres actifs de l’organisation */
export async function notifyOrganizationPaEvent(
  organizationId: string,
  event: PaNotifyEvent,
  ctx: Parameters<typeof eventMeta>[1] = {},
) {
  const { db } = await import("@/lib/db");
  const { createNotification } = await import("@/fns/notifications");
  const meta = eventMeta(event, ctx);

  const members = await db.organizationMember.findMany({
    where: { organizationId, archivedAt: null },
    select: { userId: true },
  });

  await Promise.all(
    members.map((m) =>
      createNotification({
        userId: m.userId,
        organizationId,
        title: meta.title,
        body: meta.body,
        severity: meta.severity,
        category: "PA",
        href: meta.href,
      }),
    ),
  );
}

export function paStatusToNotifyEvent(
  paStatus: PaTransmissionStatus,
  scope: "emission" | "ereporting" | "reception",
): PaNotifyEvent | null {
  if (scope === "reception" && paStatus === "RECEIVED") return "reception_available";
  if (scope === "ereporting") {
    if (paStatus === "SUBMITTED_TO_PA") return "ereporting_submitted";
    if (paStatus === "ACCEPTED_BY_PA" || paStatus === "DELIVERED_TO_BUYER_PA") {
      return "ereporting_accepted";
    }
    if (paStatus === "REJECTED" || paStatus === "REFUSED") return "ereporting_rejected";
    return null;
  }
  switch (paStatus) {
    case "SUBMITTED_TO_PA":
      return "emission_submitted";
    case "ACCEPTED_BY_PA":
      return "emission_accepted";
    case "DELIVERED_TO_BUYER_PA":
      return "emission_delivered";
    case "REJECTED":
      return "emission_rejected";
    case "REFUSED":
      return "emission_refused";
    case "TECHNICAL_ERROR":
      return "emission_technical_error";
    default:
      return null;
  }
}

export function formatPaStatusForMessage(status: PaTransmissionStatus) {
  return PA_STATUS_LABELS[status];
}
