import { createServerFn } from "@tanstack/react-start";

import { PA_STATUS_LABELS } from "@/lib/pa-status";
import type { PaTransmissionStatus } from "@prisma/client";

/** Décision métier acheteur (réception) — distincte du rejet technique PA à l’émission. */
export type ReceptionDecision = "A_TRAITER" | "APPROUVEE" | "REFUSEE" | "AUTRE";

export type ReceptionDetailSheet = {
  id: string;
  number: string;
  status: string;
  decision: ReceptionDecision;
  decisionLabel: string;
  decisionHint: string;
  paStatus: string | null;
  paStatusLabel: string | null;
  paStatusMessage: string | null;
  paReference: string | null;
  platformName: string | null;
  supplierName: string;
  supplierSiren: string | null;
  amountTtc: number;
  issueDate: string | null;
  receivedAt: string | null;
  hasPdf: boolean;
  hasStructured: boolean;
  /** Rappel flux PA pour l’utilisateur */
  flowExplain: {
    emission: string;
    reception: string;
  };
  timeline: {
    id: string;
    status: string;
    source: string;
    message: string | null;
    occurredAt: string;
  }[];
};

function decisionFrom(status: string): {
  decision: ReceptionDecision;
  decisionLabel: string;
  decisionHint: string;
} {
  if (status === "RECEIVED") {
    return {
      decision: "A_TRAITER",
      decisionLabel: "À traiter",
      decisionHint:
        "La facture est arrivée via la PA. Approuvez-la ou refusez-la (décision métier acheteur).",
    };
  }
  if (status === "APPROVED") {
    return {
      decision: "APPROUVEE",
      decisionLabel: "Approuvée",
      decisionHint: "Vous avez accepté cette facture fournisseur.",
    };
  }
  if (status === "REFUSED") {
    return {
      decision: "REFUSEE",
      decisionLabel: "Refusée",
      decisionHint: "Vous avez refusé cette facture fournisseur (refus métier).",
    };
  }
  return {
    decision: "AUTRE",
    decisionLabel: status,
    decisionHint: "Statut réception enregistré.",
  };
}

export const getReceptionDetail = createServerFn({ method: "POST" })
  .validator((data: { invoiceId: string }) => data)
  .handler(async ({ data }): Promise<{ detail: ReceptionDetailSheet | null; error?: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { detail: null, error: "Session expirée." };

    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        organizationId: workspace.organization.id,
        direction: "PURCHASE",
      },
      include: {
        counterparty: { select: { legalName: true, siren: true } },
        platformConnection: { include: { platform: { select: { name: true } } } },
        paInboxDocument: {
          select: {
            pdfStorageKey: true,
            structuredPayload: true,
            receivedAt: true,
            paReference: true,
            paStatus: true,
            paStatusMessage: true,
          },
        },
        lifecycleEvents: {
          orderBy: { occurredAt: "asc" },
          take: 50,
        },
      },
    });

    if (!invoice) return { detail: null, error: "Document de réception introuvable." };

    const dec = decisionFrom(invoice.status);
    const paStatus = invoice.paStatus ?? invoice.paInboxDocument?.paStatus ?? null;
    const paLabel =
      paStatus && paStatus in PA_STATUS_LABELS
        ? PA_STATUS_LABELS[paStatus as PaTransmissionStatus]
        : paStatus;

    return {
      detail: {
        id: invoice.id,
        number: invoice.number ?? "Sans numéro",
        status: invoice.status,
        ...dec,
        paStatus,
        paStatusLabel: paLabel,
        paStatusMessage:
          invoice.paStatusMessage ?? invoice.paInboxDocument?.paStatusMessage ?? null,
        paReference: invoice.paReference ?? invoice.paInboxDocument?.paReference ?? null,
        platformName: invoice.platformConnection?.platform.name ?? null,
        supplierName: invoice.counterparty?.legalName ?? "Fournisseur",
        supplierSiren: invoice.counterparty?.siren ?? null,
        amountTtc: Number(invoice.totalTtc),
        issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null,
        receivedAt:
          invoice.paInboxDocument?.receivedAt?.toISOString() ?? invoice.createdAt.toISOString(),
        hasPdf: Boolean(invoice.pdfStorageKey ?? invoice.paInboxDocument?.pdfStorageKey),
        hasStructured: Boolean(
          invoice.facturxStorageKey ?? invoice.paInboxDocument?.structuredPayload,
        ),
        flowExplain: {
          emission:
            "À l’émission, la PA peut rejeter techniquement (format / conformité) ou accepter le dépôt, puis le mettre à disposition de l’acheteur.",
          reception:
            "En réception, vous voyez la facture fournisseur livrée par la PA. Approuver / Refuser = votre décision métier — ce n’est pas le même refus que le rejet technique PA à l’émission.",
        },
        timeline: invoice.lifecycleEvents.map((e) => ({
          id: e.id,
          status: e.status,
          source: e.source,
          message: e.message,
          occurredAt: e.occurredAt.toISOString(),
        })),
      },
    };
  });
