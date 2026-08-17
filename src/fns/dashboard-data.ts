import { createServerFn } from "@tanstack/react-start";

import { formatAuditActionLabel } from "@/lib/audit-labels";
import type { DashboardData } from "@/lib/types";

const VALID_STATUSES = [
  "VALIDATED",
  "TRANSMITTING",
  "TRANSMITTED",
  "RECEIVED",
  "APPROVED",
  "PAID",
  "ARCHIVED",
] as const;

const BLOCKED_STATUSES = ["BLOCKED", "REJECTED", "REFUSED"] as const;

const PENDING_STATUSES = ["DRAFT", "VALIDATING"] as const;

type InvoiceStatus = string;

function mapUiStatus(status: InvoiceStatus): "valid" | "blocked" | "pending" {
  if ((VALID_STATUSES as readonly string[]).includes(status)) return "valid";
  if ((BLOCKED_STATUSES as readonly string[]).includes(status)) return "blocked";
  return "pending";
}

const MONTHS_FR = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export const getDashboardData = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData | null> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return null;

    const orgId = workspace.organization.id;

    const [
      invoices,
      validations,
      org,
      paConnection,
      checklist,
      clients,
      diagnostic,
      sources,
      purchases,
      eReporting,
      teamMembers,
      auditLogs,
    ] = await Promise.all([
      db.invoice.findMany({
        where: { organizationId: orgId, direction: "SALE" },
        include: {
          counterparty: { select: { legalName: true } },
          validations: { where: { blocking: true }, select: { code: true, message: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.invoiceValidation.groupBy({
        by: ["message"],
        where: {
          blocking: true,
          invoice: { organizationId: orgId },
        },
        _count: { message: true },
        orderBy: { _count: { message: "desc" } },
        take: 5,
      }),
      db.organization.findUnique({
        where: { id: orgId },
        select: { complianceScore: true, legalName: true, tradeName: true, size: true },
      }),
      db.organizationPlatformConnection.findFirst({
        where: { organizationId: orgId, isActive: true },
        include: { platform: { select: { name: true } } },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      db.complianceChecklistItem.findMany({
        where: { organizationId: orgId },
        select: { status: true },
      }),
      db.counterparty.findMany({
        where: { organizationId: orgId, type: { in: ["CLIENT", "BOTH"] } },
        select: { siren: true },
      }),
      db.complianceDiagnostic.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        select: {
          mustReceiveBy: true,
          mustEmitBy: true,
          needsEReportingTx: true,
        },
      }),
      db.merchantIntegration.count({
        where: {
          organizationId: orgId,
          status: { in: ["CONNECTED", "SYNCING"] },
        },
      }),
      db.invoice.count({
        where: { organizationId: orgId, direction: "PURCHASE" },
      }),
      db.eReportingEntry.count({
        where: { organizationId: orgId },
      }),
      db.organizationMember.count({
        where: { organizationId: orgId, archivedAt: null },
      }),
      db.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);

    const validatedInvoices = invoices.filter((i) =>
      (VALID_STATUSES as readonly string[]).includes(i.status),
    ).length;
    const blockedErrors = invoices.filter((i) =>
      (BLOCKED_STATUSES as readonly string[]).includes(i.status),
    ).length;
    const pendingReview = invoices.filter((i) =>
      (PENDING_STATUSES as readonly string[]).includes(i.status),
    ).length;
    const revenueHt = invoices
      .filter((i) => (VALID_STATUSES as readonly string[]).includes(i.status))
      .reduce((sum, i) => sum + Number(i.subtotalHt), 0);

    const scored = invoices.filter((i) => i.complianceScore != null);
    const avgScore =
      scored.length > 0
        ? scored.reduce((sum, i) => sum + Number(i.complianceScore), 0) / scored.length
        : Number(org?.complianceScore ?? 0);

    const complianceScore =
      Number.isFinite(avgScore) && avgScore > 0
        ? Math.round(avgScore * 10) / 10
        : Number(org?.complianceScore ?? 0);

    const now = new Date();
    const monthlyTrend = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const monthInvoices = invoices.filter((inv) => {
        const ref = inv.issueDate ?? inv.createdAt;
        return ref.getFullYear() === d.getFullYear() && ref.getMonth() === d.getMonth();
      });
      const validated = monthInvoices.filter((i) =>
        (VALID_STATUSES as readonly string[]).includes(i.status),
      ).length;
      const errors = monthInvoices.filter((i) =>
        (BLOCKED_STATUSES as readonly string[]).includes(i.status),
      ).length;
      const scores = monthInvoices
        .map((i) => Number(i.complianceScore))
        .filter((s) => Number.isFinite(s) && s > 0);
      const score =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : complianceScore || 0;
      const revenue =
        Math.round(
          monthInvoices
            .filter((i) => (VALID_STATUSES as readonly string[]).includes(i.status))
            .reduce((sum, i) => sum + Number(i.subtotalHt), 0) * 100,
        ) / 100;

      return {
        month: MONTHS_FR[d.getMonth()]!,
        score,
        validated,
        errors,
        revenueHt: revenue,
      };
    });

    const errorBreakdown =
      validations.length > 0
        ? validations.map((v) => ({
            type: v.message.slice(0, 40),
            count: v._count.message,
          }))
        : blockedErrors > 0
          ? [{ type: "Factures bloquées", count: blockedErrors }]
          : [{ type: "Aucune erreur", count: 0 }];

    const recentInvoices = invoices.slice(0, 10).map((inv) => ({
      id: inv.id,
      number: inv.number ?? "Brouillon",
      client: inv.counterparty?.legalName ?? "Client inconnu",
      amount: Number(inv.totalTtc),
      status: mapUiStatus(inv.status),
      date: (inv.issueDate ?? inv.createdAt).toISOString().slice(0, 10),
      errors: inv.validations.map((v) => v.message).slice(0, 3),
    }));

    const receiveDate = diagnostic?.mustReceiveBy ?? new Date(Date.UTC(2026, 8, 1));
    const daysToReceiveDeadline = Math.max(
      0,
      Math.ceil((receiveDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    );
    const receiveDeadlineLabel = receiveDate.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const emitDeadlineLabel = diagnostic?.mustEmitBy
      ? diagnostic.mustEmitBy.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

    const checklistDone = checklist.filter((i) => i.status === "DONE").length;
    const checklistProgress =
      checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0;
    const clientsWithSiren = clients.filter((c) => Boolean(c.siren)).length;
    const paConnected = Boolean(paConnection);
    const paName = paConnection?.platform.name ?? null;

    const nextActions: {
      label: string;
      href: string;
      urgent?: boolean;
    }[] = [];
    if (!paConnected) {
      nextActions.push({
        label: "Connecter une plateforme agréée",
        href: "/platforms",
        urgent: true,
      });
    }
    if (blockedErrors > 0) {
      nextActions.push({
        label: `Corriger ${blockedErrors} facture${blockedErrors > 1 ? "s" : ""} bloquée${blockedErrors > 1 ? "s" : ""}`,
        href: "/agent",
        urgent: true,
      });
    }
    if (clients.length === 0) {
      nextActions.push({ label: "Ajouter un client avec SIREN", href: "/clients/new" });
    } else if (clientsWithSiren < clients.length) {
      nextActions.push({
        label: "Compléter les SIREN clients (mention 2026)",
        href: "/clients",
      });
    }
    if (checklistProgress < 100) {
      nextActions.push({
        label: `Avancer la checklist (${checklistProgress} %)`,
        href: "/compliance",
      });
    }
    if (validatedInvoices === 0) {
      nextActions.push({ label: "Émettre une première Factur-X", href: "/invoices/new" });
    }
    if (diagnostic?.needsEReportingTx) {
      nextActions.push({ label: "Préparer le e-reporting transaction", href: "/e-reporting" });
    }
    if (nextActions.length === 0) {
      nextActions.push({ label: "Suivre le cycle de vie des factures", href: "/invoices" });
    }

    let topInsight: string;
    if (!paConnected) {
      topInsight =
        "Sans PA connectée, aucune facture ne pourra être transmise au réseau dès la réforme. C’est le blocage n°1.";
    } else if (blockedErrors > 0) {
      topInsight = `${blockedErrors} facture${blockedErrors > 1 ? "s" : ""} bloquée${blockedErrors > 1 ? "s" : ""} par les contrôles mentions / Factur-X — à corriger avant transmission PA.`;
    } else if (daysToReceiveDeadline <= 60) {
      topInsight = `Réception obligatoire dans ${daysToReceiveDeadline} jour${daysToReceiveDeadline > 1 ? "s" : ""} (${receiveDeadlineLabel}). Votre score et vos connexions PA sont le signal de préparation.`;
    } else if (complianceScore >= 85) {
      topInsight =
        "Votre flux e-invoicing est en bonne trajectoire. Surveillez les rejets PA et le e-reporting si B2C / export.";
    } else {
      topInsight =
        "InvoicePilot valide les mentions 2026 avant envoi PA — augmentez le score en complétant clients SIREN et checklist conformité.";
    }

    const { buildReformAlerts } = await import("@/lib/reform-calendar");
    const reformAlerts = buildReformAlerts({
      size: org?.size ?? workspace.organization.size,
    });

    const sourceConnected = sources > 0 || invoices.some((i) => Boolean(i.sourceSystem));
    const hasAnalyzed = invoices.some((i) =>
      ["VALIDATED", "BLOCKED", "TRANSMITTING", "TRANSMITTED", "ARCHIVED"].includes(i.status),
    );
    const hasEmittedOrReady =
      validatedInvoices > 0 || invoices.some((i) => i.status === "TRANSMITTED");
    const hasReception = purchases > 0;
    const hasEReporting = eReporting > 0;

    const invoiceStatusPie = [
      { name: "Prêtes", value: validatedInvoices, key: "valid" },
      { name: "Bloquées", value: blockedErrors, key: "blocked" },
      { name: "En revue", value: pendingReview, key: "pending" },
    ].filter((s) => s.value > 0);

    const modules = [
      {
        id: "sources",
        label: "Sources",
        href: "/integrations",
        done: sourceConnected,
        hint: sourceConnected ? `${sources || 1} source(s)` : "Connecter une source",
      },
      {
        id: "analyse",
        label: "Analyse IA",
        href: "/agent",
        done: hasAnalyzed,
        hint: hasAnalyzed ? "File alimentée" : "Analyser les imports",
      },
      {
        id: "emission",
        label: "Mon émission PA",
        href: "/invoices",
        done: hasEmittedOrReady,
        hint: `${validatedInvoices} prête(s) B2B`,
      },
      {
        id: "ereporting",
        label: "Mon e-reporting",
        href: "/e-reporting",
        done: hasEReporting,
        hint: hasEReporting ? `${eReporting} entrée(s)` : "Pas encore démarré",
      },
      {
        id: "reception",
        label: "Ma réception PA",
        href: "/inbox",
        done: hasReception,
        hint: hasReception ? `${purchases} achat(s)` : "Aucune réception",
      },
      {
        id: "pa",
        label: "Ma plateforme agréée",
        href: "/platforms",
        done: paConnected,
        hint: paConnected ? (paName ?? "Connectée") : "Non connectée",
      },
      {
        id: "clients",
        label: "Acheteurs",
        href: "/clients",
        done: clients.length > 0 && clientsWithSiren === clients.length,
        hint:
          clients.length === 0
            ? "Aucun client"
            : `${clientsWithSiren}/${clients.length} avec SIREN`,
      },
      {
        id: "compliance",
        label: "Ma conformité",
        href: "/compliance",
        done: checklistProgress >= 100,
        hint: `Checklist ${checklistProgress} %`,
      },
      {
        id: "team",
        label: "Équipe",
        href: "/team",
        done: teamMembers > 1,
        hint: `${teamMembers} membre(s)`,
      },
    ];

    const recentActivity = auditLogs.map((log) => ({
      id: log.id,
      label: formatAuditActionLabel(log.action, log.entityType),
      action: log.action,
      createdAt: log.createdAt.toISOString(),
      actor: log.user?.name ?? log.user?.email ?? null,
    }));

    return {
      organizationName: org?.tradeName ?? org?.legalName ?? workspace.organization.legalName,
      journey: {
        sourceConnected,
        hasAnalyzed,
        paConnected,
        hasEmittedOrReady,
        hasEReporting,
        hasReception,
      },
      reformAlerts,
      stats: {
        complianceScore,
        validatedInvoices,
        blockedErrors,
        pendingReview,
        revenueHt,
        totalInvoices: invoices.length,
        teamMembers,
        sourcesCount: sources,
      },
      invoiceStatusPie:
        invoiceStatusPie.length > 0
          ? invoiceStatusPie
          : [{ name: "Aucune facture", value: 1, key: "empty" }],
      modules,
      recentActivity,
      readiness: {
        daysToReceiveDeadline,
        receiveDeadlineLabel,
        emitDeadlineLabel,
        paConnected,
        paName,
        checklistProgress,
        clientsCount: clients.length,
        clientsWithSiren,
        topInsight,
        nextActions: nextActions.slice(0, 4),
      },
      agentAnalysis: [
        {
          label: "SIREN / SIRET clients",
          ok: clients.length > 0 && clientsWithSiren === clients.length,
        },
        {
          label: "Mentions obligatoires 2026",
          ok: checklistProgress >= 70 || complianceScore >= 80,
        },
        {
          label: "Format Factur-X / contrôles",
          ok: validatedInvoices > 0 && blockedErrors === 0,
        },
        {
          label: "Plateforme agréée (PA)",
          ok: paConnected,
        },
      ],
      monthlyTrend,
      errorBreakdown,
      recentInvoices,
    };
  },
);
