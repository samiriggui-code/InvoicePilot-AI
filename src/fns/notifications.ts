import { createServerFn } from "@tanstack/react-start";

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  category: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationCounts = {
  total: number;
  unread: number;
  /** Non lus WARNING + ALERT */
  alerts: number;
  read: number;
};

/** Création serveur d’une notification in-app. */
export async function createNotification(input: {
  userId: string;
  organizationId?: string | null;
  title: string;
  body: string;
  severity?: "INFO" | "SUCCESS" | "WARNING" | "ALERT";
  category?: "SYSTEM" | "BILLING" | "COMPLIANCE" | "INVOICE" | "TEAM" | "PA" | "SECURITY";
  href?: string | null;
}) {
  const { db } = await import("@/lib/db");
  return db.notification.create({
    data: {
      userId: input.userId,
      organizationId: input.organizationId ?? null,
      title: input.title,
      body: input.body,
      severity: input.severity ?? "INFO",
      category: input.category ?? "SYSTEM",
      href: input.href ?? null,
    },
  });
}

/** Premier chargement : quelques notifications d’exemple si la boîte est vide. */
async function ensureStarterNotifications(userId: string, organizationId: string) {
  const { db } = await import("@/lib/db");
  const count = await db.notification.count({ where: { userId } });
  if (count > 0) return;

  const seeds = [
    {
      title: "Essai Pro actif",
      body: "Votre essai 14 jours est en cours. Branchez une source et votre PA pour valider le parcours.",
      severity: "INFO" as const,
      category: "BILLING" as const,
      href: "/billing",
    },
    {
      title: "Réforme 2026 — réception",
      body: "À partir du 1er septembre 2026, la réception électronique est obligatoire pour toutes les entreprises.",
      severity: "WARNING" as const,
      category: "COMPLIANCE" as const,
      href: "/compliance",
    },
    {
      title: "Analyse IA disponible",
      body: "Importez une facture via Mes sources pour lancer une analyse IA.",
      severity: "SUCCESS" as const,
      category: "INVOICE" as const,
      href: "/agent",
    },
    {
      title: "Action requise — plateforme agréée",
      body: "Aucune PA n’est encore configurée. Choisissez une plateforme pour l’émission / réception.",
      severity: "ALERT" as const,
      category: "PA" as const,
      href: "/platforms",
    },
  ];

  await db.notification.createMany({
    data: seeds.map((s) => ({
      userId,
      organizationId,
      ...s,
    })),
  });
}

export const getNotificationCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<NotificationCounts> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return { total: 0, unread: 0, alerts: 0, read: 0 };

    await ensureStarterNotifications(workspace.user.id, workspace.organization.id);

    const userId = workspace.user.id;
    const [total, unread, alerts, read] = await Promise.all([
      db.notification.count({ where: { userId } }),
      db.notification.count({ where: { userId, readAt: null } }),
      db.notification.count({
        where: {
          userId,
          readAt: null,
          severity: { in: ["ALERT", "WARNING"] },
        },
      }),
      db.notification.count({ where: { userId, readAt: { not: null } } }),
    ]);

    return { total, unread, alerts, read };
  },
);

export const listNotifications = createServerFn({ method: "POST" })
  .validator((data?: { alertsOnly?: boolean }) => data ?? {})
  .handler(async ({ data }): Promise<{ items: NotificationRow[]; error?: string }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return { items: [], error: "Session expirée." };

    await ensureStarterNotifications(workspace.user.id, workspace.organization.id);

    const rows = await db.notification.findMany({
      where: {
        userId: workspace.user.id,
        ...(data.alertsOnly ? { severity: { in: ["ALERT", "WARNING"] as const } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      items: rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        severity: n.severity,
        category: n.category,
        href: n.href,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return { ok: false as const, error: "Session expirée." };

    await db.notification.updateMany({
      where: { id: data.id, userId: workspace.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .validator((data?: { alertsOnly?: boolean }) => data ?? {})
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) return { ok: false as const, error: "Session expirée." };

    await db.notification.updateMany({
      where: {
        userId: workspace.user.id,
        readAt: null,
        ...(data.alertsOnly ? { severity: { in: ["ALERT", "WARNING"] as const } } : {}),
      },
      data: { readAt: new Date() },
    });
    return { ok: true as const };
  });
