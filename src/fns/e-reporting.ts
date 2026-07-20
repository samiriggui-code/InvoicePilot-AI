import { createServerFn } from "@tanstack/react-start";
import type { PaTransmissionStatus } from "@prisma/client";

import { mockInvoiceExcludeOr } from "@/lib/mock-invoice-exclude";
import { TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/transaction-type";

export type EReportingLinePreview = {
  invoiceId: string;
  number: string;
  client: string;
  transactionType: string;
  transactionLabel: string;
  totalTtc: number;
  issueDate: string | null;
  status: string;
  analyzed: boolean;
};

export type EReportingListItem = {
  id: string;
  volut: string;
  periodStart: string;
  periodEnd: string;
  transmittedAt: string | null;
  paReference: string | null;
  paStatus: string | null;
  paStatusCode: string | null;
  paStatusMessage: string | null;
  lineCount: number;
  totalTtc: number;
  createdAt: string;
  status: "draft" | "ready" | "transmitted" | "pending_pa" | "submitted" | "rejected";
  /** Aperçu des premières lignes du lot (avant envoi) */
  linesPreview: EReportingLinePreview[];
};

export type EReportingCandidate = EReportingLinePreview & {
  inCurrentLot: boolean;
};

export type EReportingLotDetail = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: EReportingListItem["status"];
  transmittedAt: string | null;
  paReference: string | null;
  paStatus: string | null;
  paStatusMessage: string | null;
  totalTtc: number;
  lines: EReportingLinePreview[];
  flowExplain: {
    noReception: string;
    whatItIs: string;
  };
};

function toLocalDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthBounds(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start: toLocalDateString(start),
    end: toLocalDateString(end),
    startDate: start,
    endDate: end,
  };
}

function typeLabel(t: string) {
  return TRANSACTION_TYPE_LABELS[t as TransactionType] ?? t;
}

function mapLine(inv: {
  id: string;
  number: string | null;
  status: string;
  transactionType: string;
  totalTtc: { toString(): string } | number;
  issueDate: Date | null;
  counterparty: { legalName: string } | null;
  lifecycleEvents?: { id: string }[];
}): EReportingLinePreview {
  return {
    invoiceId: inv.id,
    number: inv.number ?? "Brouillon",
    client: inv.counterparty?.legalName ?? "Particulier / export",
    transactionType: inv.transactionType,
    transactionLabel: typeLabel(inv.transactionType),
    totalTtc: Number(inv.totalTtc),
    issueDate: inv.issueDate?.toISOString().slice(0, 10) ?? null,
    status: inv.status,
    analyzed: (inv.lifecycleEvents?.length ?? 0) > 0,
  };
}

function entryStatus(
  lineCount: number,
  hasTransmitPa: boolean,
  e: {
    transmittedAt: Date | null;
    paStatus: string | null;
  },
): EReportingListItem["status"] {
  if (e.paStatus === "REJECTED" || e.paStatus === "REFUSED") return "rejected";
  if (
    e.transmittedAt ||
    e.paStatus === "ACCEPTED_BY_PA" ||
    e.paStatus === "DELIVERED_TO_BUYER_PA"
  ) {
    return "transmitted";
  }
  if (e.paStatus === "SUBMITTED_TO_PA") return "submitted";
  if (lineCount === 0) return "draft";
  if (!hasTransmitPa) return "pending_pa";
  return "ready";
}

function linesFromPayload(payload: unknown): EReportingLinePreview[] {
  const p = payload as {
    lines?: {
      invoice_id?: string;
      number?: string | null;
      client?: string;
      transaction_type?: string;
      total_ttc?: number;
      issue_date?: string | null;
      status?: string;
      analyzed?: boolean;
    }[];
  };
  if (!Array.isArray(p.lines)) return [];
  return p.lines.map((l) => ({
    invoiceId: l.invoice_id ?? "",
    number: l.number ?? "—",
    client: l.client ?? "—",
    transactionType: l.transaction_type ?? "—",
    transactionLabel: typeLabel(l.transaction_type ?? ""),
    totalTtc: Number(l.total_ttc ?? 0),
    issueDate: l.issue_date ?? null,
    status: l.status ?? "—",
    analyzed: Boolean(l.analyzed),
  }));
}

async function fetchEligibleInvoices(
  db: Awaited<typeof import("@/lib/db")>["db"],
  orgId: string,
  start: Date,
  end: Date,
) {
  return db.invoice.findMany({
    where: {
      organizationId: orgId,
      direction: "SALE",
      transactionType: { in: ["B2C", "EXPORT", "INTRA_EU"] },
      OR: [
        { issueDate: { gte: start, lte: end } },
        {
          AND: [{ issueDate: null }, { createdAt: { gte: start, lte: end } }],
        },
      ],
      NOT: { OR: mockInvoiceExcludeOr() },
    },
    include: {
      counterparty: { select: { legalName: true, siren: true } },
      lifecycleEvents: {
        where: { source: { in: ["ai-analyze", "ai-extract", "remediation"] } },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { issueDate: "desc" },
    take: 200,
  });
}

export const getEReportingData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadWorkspace } = await import("@/lib/workspace.server");
  const { db } = await import("@/lib/db");
  const { buildReformAlerts } = await import("@/lib/reform-calendar");
  const { canConnectionTransmit } = await import("@/lib/pa-partners");

  const workspace = await loadWorkspace();
  if (!workspace) return null;

  const orgId = workspace.organization.id;
  const bounds = monthBounds();

  const [entries, diagnostic, pa, eligible] = await Promise.all([
    db.eReportingEntry.findMany({
      where: { organizationId: orgId },
      orderBy: { periodStart: "desc" },
      take: 24,
    }),
    db.complianceDiagnostic.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    }),
    db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: orgId,
        isActive: true,
        purpose: { in: ["EMISSION", "BOTH"] },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
    fetchEligibleInvoices(db, orgId, bounds.startDate, bounds.endDate),
  ]);

  const hasTransmitPa = Boolean(pa && canConnectionTransmit(pa.credentialsRef));

  const currentLot = entries.find(
    (e) =>
      e.periodStart.toISOString().slice(0, 10) === bounds.start &&
      e.periodEnd.toISOString().slice(0, 10) === bounds.end,
  );
  const currentLotLines = currentLot ? linesFromPayload(currentLot.payload) : [];
  const inLotIds = new Set(currentLotLines.map((l) => l.invoiceId).filter(Boolean));

  const candidates: EReportingCandidate[] = eligible.map((inv) => ({
    ...mapLine(inv),
    inCurrentLot: inLotIds.has(inv.id),
  }));

  const candidatesTotalTtc = Math.round(candidates.reduce((s, c) => s + c.totalTtc, 0) * 100) / 100;

  return {
    needsTx: Boolean(diagnostic?.needsEReportingTx),
    needsPay: Boolean(diagnostic?.needsEReportingPay),
    orgSize: workspace.organization.size,
    hasTransmitPa,
    alerts: buildReformAlerts({ size: workspace.organization.size }),
    period: { start: bounds.start, end: bounds.end },
    currentLotId: currentLot?.id ?? null,
    candidates,
    candidatesTotalTtc,
    /** Pas de « réception » e-reporting — déclaration sortante uniquement */
    hasReception: false as const,
    entries: entries.map((e): EReportingListItem => {
      const payload = e.payload as { lines?: unknown[]; total_ttc?: number };
      const linesPreview = linesFromPayload(e.payload).slice(0, 5);
      const lineCount = Array.isArray(payload.lines) ? payload.lines.length : 0;
      return {
        id: e.id,
        volut: e.volut,
        periodStart: e.periodStart.toISOString().slice(0, 10),
        periodEnd: e.periodEnd.toISOString().slice(0, 10),
        transmittedAt: e.transmittedAt?.toISOString() ?? null,
        paReference: e.paReference,
        paStatus: e.paStatus,
        paStatusCode: e.paStatusCode,
        paStatusMessage: e.paStatusMessage,
        lineCount,
        totalTtc: Number(payload.total_ttc ?? 0),
        createdAt: e.createdAt.toISOString(),
        status: entryStatus(lineCount, hasTransmitPa, e),
        linesPreview,
      };
    }),
  };
});

export const getEReportingLotDetail = createServerFn({ method: "POST" })
  .validator((data: { entryId: string }) => data)
  .handler(async ({ data }): Promise<{ detail: EReportingLotDetail | null; error?: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { canConnectionTransmit } = await import("@/lib/pa-partners");

    const workspace = await loadWorkspace();
    if (!workspace) return { detail: null, error: "Session expirée." };

    const entry = await db.eReportingEntry.findFirst({
      where: { id: data.entryId, organizationId: workspace.organization.id },
    });
    if (!entry) return { detail: null, error: "Lot introuvable." };

    const pa = await db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: workspace.organization.id,
        isActive: true,
        purpose: { in: ["EMISSION", "BOTH"] },
      },
    });
    const hasTransmitPa = Boolean(pa && canConnectionTransmit(pa.credentialsRef));
    const lines = linesFromPayload(entry.payload);
    const payload = entry.payload as { total_ttc?: number };

    return {
      detail: {
        id: entry.id,
        periodStart: entry.periodStart.toISOString().slice(0, 10),
        periodEnd: entry.periodEnd.toISOString().slice(0, 10),
        status: entryStatus(lines.length, hasTransmitPa, entry),
        transmittedAt: entry.transmittedAt?.toISOString() ?? null,
        paReference: entry.paReference,
        paStatus: entry.paStatus,
        paStatusMessage: entry.paStatusMessage,
        totalTtc: Number(payload.total_ttc ?? 0),
        lines,
        flowExplain: {
          noReception:
            "L’e-reporting n’a pas de « réception » : ce n’est pas une facture fournisseur. C’est une déclaration périodique vers l’administration via votre PA.",
          whatItIs:
            "Le lot regroupe les ventes B2C / export / intra-UE déjà analysées ou importées. Vous visualisez les lignes ici, puis vous déposez le lot via la PA.",
        },
      },
    };
  });

export const generateEReportingPeriod = createServerFn({ method: "POST" })
  .validator((data: { periodStart?: string; periodEnd?: string; refresh?: boolean } = {}) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée.", id: null };

    const bounds = monthBounds();
    const periodStart = data.periodStart ?? bounds.start;
    const periodEnd = data.periodEnd ?? bounds.end;
    const orgId = workspace.organization.id;

    const start = new Date(periodStart);
    const end = new Date(`${periodEnd}T23:59:59.999Z`);

    const existing = await db.eReportingEntry.findFirst({
      where: {
        organizationId: orgId,
        volut: "E_REPORTING_TRANSACTION",
        periodStart: {
          gte: new Date(start.getFullYear(), start.getMonth(), 1),
          lt: new Date(start.getFullYear(), start.getMonth() + 1, 1),
        },
      },
    });

    if (existing?.transmittedAt) {
      return {
        success: false as const,
        error: "Ce lot a déjà été transmis — impossible de le régénérer.",
        id: existing.id,
      };
    }

    const invoices = await fetchEligibleInvoices(db, orgId, start, end);

    const lines = invoices.map((inv) => ({
      invoice_id: inv.id,
      number: inv.number,
      issue_date: inv.issueDate?.toISOString().slice(0, 10) ?? null,
      client: inv.counterparty?.legalName ?? "Particulier / export",
      buyer_siren: inv.buyerSiren ?? inv.counterparty?.siren ?? null,
      transaction_type: inv.transactionType,
      total_ht: Number(inv.subtotalHt),
      total_vat: Number(inv.totalVat),
      total_ttc: Number(inv.totalTtc),
      category: inv.operationCategory,
      status: inv.status,
      analyzed: inv.lifecycleEvents.length > 0,
    }));

    const totalTtc = Math.round(lines.reduce((s, l) => s + l.total_ttc, 0) * 100) / 100;
    const payload = {
      type: "transaction",
      seller_siren: workspace.organization.siren,
      seller_name: workspace.organization.legalName,
      period_start: periodStart,
      period_end: periodEnd,
      lines,
      total_ttc: totalTtc,
      generated_at: new Date().toISOString(),
    };

    if (existing) {
      await db.eReportingEntry.update({
        where: { id: existing.id },
        data: {
          payload,
          paStatus: null,
          paStatusCode: null,
          paStatusMessage: null,
          paReference: null,
        },
      });
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: workspace.user.id,
          action: "e_reporting.refreshed",
          entityType: "EReportingEntry",
          entityId: existing.id,
          metadata: { lines: lines.length, total_ttc: totalTtc },
        },
      });
      return { success: true as const, error: null, id: existing.id, refreshed: true as const };
    }

    const entry = await db.eReportingEntry.create({
      data: {
        organizationId: orgId,
        volut: "E_REPORTING_TRANSACTION",
        periodStart: start,
        periodEnd: new Date(periodEnd),
        payload,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: orgId,
        userId: workspace.user.id,
        action: "e_reporting.generated",
        entityType: "EReportingEntry",
        entityId: entry.id,
        metadata: { lines: lines.length, total_ttc: totalTtc },
      },
    });

    return { success: true as const, error: null, id: entry.id, refreshed: false as const };
  });

/**
 * Transmission e-reporting via connecteur PA (sandbox / partenaire).
 */
export const transmitEReporting = createServerFn({ method: "POST" })
  .validator((data: { entryId: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { canConnectionTransmit } = await import("@/lib/pa-partners");
    const { applyEReportingPaStatus, progressionMessage } = await import("@/lib/pa-lifecycle");
    const { sandboxEReportingProgression } = await import("@/api/connectors/pa/sandbox");
    const { mapPartnerPaCode } = await import("@/lib/pa-status");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const entry = await db.eReportingEntry.findFirst({
      where: {
        id: data.entryId,
        organizationId: workspace.organization.id,
      },
    });
    if (!entry) return { success: false as const, error: "Lot introuvable." };
    if (entry.transmittedAt && entry.paStatus === "ACCEPTED_BY_PA") {
      return { success: false as const, error: "Déjà transmis et accepté." };
    }

    const payload = entry.payload as { lines?: unknown[] };
    if (!Array.isArray(payload.lines) || payload.lines.length === 0) {
      return {
        success: false as const,
        error: "Lot vide — aucune vente B2C / export / intra-UE sur la période.",
      };
    }

    const pa = await db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: workspace.organization.id,
        isActive: true,
        purpose: { in: ["EMISSION", "BOTH"] },
      },
      include: { platform: { select: { slug: true, name: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    if (!pa || !canConnectionTransmit(pa.credentialsRef)) {
      return {
        success: false as const,
        error:
          "Aucune plateforme technique connectée. Configurez le canal sandbox ou une API partenaire.",
      };
    }

    const paReference = `ER-TX-${Date.now().toString(36).toUpperCase()}`;
    const periodLabel = `${entry.periodStart.toISOString().slice(0, 10)} → ${entry.periodEnd.toISOString().slice(0, 10)}`;
    const platformName = pa.platform.name;

    const events = sandboxEReportingProgression(paReference);

    for (const ev of events) {
      const paStatus = mapPartnerPaCode(ev.status) ?? (ev.status as PaTransmissionStatus);
      await applyEReportingPaStatus(db, {
        entryId: entry.id,
        organizationId: workspace.organization.id,
        paStatus,
        paStatusCode: ev.status,
        paStatusMessage: progressionMessage(paStatus, platformName),
        paReference,
        periodLabel,
      });
    }

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        userId: workspace.user.id,
        action: "e_reporting.transmitted",
        entityType: "EReportingEntry",
        entityId: entry.id,
        metadata: { paReference, lines: payload.lines.length },
      },
    });

    return {
      success: true as const,
      error: null,
      paReference,
      message: progressionMessage("ACCEPTED_BY_PA", platformName),
    };
  });

/** @deprecated alias — ne plus simuler */
export const transmitEReportingSandbox = transmitEReporting;
