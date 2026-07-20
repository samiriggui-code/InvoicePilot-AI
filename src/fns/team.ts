import { createElement } from "react";
import { createServerFn } from "@tanstack/react-start";
import { randomBytes } from "node:crypto";

import type { MemberRole } from "@/lib/types";
import { canManageTeam, INVITABLE_ROLES, MEMBER_ROLE_LABELS } from "@/lib/team-roles";

export type TeamMemberRow = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  avatarKey: string | null;
  role: MemberRole;
  createdAt: string;
  archivedAt: string | null;
  isSelf: boolean;
};

export type TeamInviteRow = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: string;
  createdAt: string;
};

async function requireTeamAdmin() {
  const { loadWorkspace } = await import("@/lib/workspace.server");
  const workspace = await loadWorkspace();
  if (!workspace) return { error: "Session expirée." as const, workspace: null };
  if (!canManageTeam(workspace.organization.role)) {
    return {
      error: "Seuls le propriétaire et les administrateurs gèrent l’équipe." as const,
      workspace: null,
    };
  }
  return { error: null, workspace };
}

async function sendInviteEmail(params: {
  to: string;
  token: string;
  role: MemberRole;
  inviterName: string;
  organizationName: string;
  expiresAt: Date;
}) {
  const { sendReactEmail, inviteAcceptUrl, appUrl } = await import("@/lib/mail.server");
  const { TeamInviteEmail } = await import("../../emails/team-invite");
  const expiresLabel = `le ${params.expiresAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;

  return sendReactEmail({
    to: params.to,
    subject: `${params.inviterName} vous invite sur InvoicePilot — ${params.organizationName}`,
    react: createElement(TeamInviteEmail, {
      inviterName: params.inviterName,
      organizationName: params.organizationName,
      roleLabel: MEMBER_ROLE_LABELS[params.role],
      inviteUrl: inviteAcceptUrl(params.token),
      expiresLabel,
      logoUrl: `${appUrl()}/media/app/logo-full.svg`,
    }),
  });
}

/** Liste des membres — strictement filtrée sur l’org active. */
export const listTeamMembers = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    members: TeamMemberRow[];
    invites: TeamInviteRow[];
    canManage: boolean;
    error?: string;
  }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) {
      return { members: [], invites: [], canManage: false, error: "Session expirée." };
    }

    const orgId = workspace.organization.id;

    type MemberRow = {
      id: string;
      userId: string;
      role: MemberRole;
      createdAt: Date;
      archivedAt: Date | null;
      user: { id: string; email: string; name: string | null; avatarKey: string | null };
    };

    let members: MemberRow[] = [];
    let invites: Array<{
      id: string;
      email: string;
      role: MemberRole;
      expiresAt: Date;
      createdAt: Date;
    }> = [];

    try {
      members = (await db.organizationMember.findMany({
        where: { organizationId: orgId },
        include: {
          user: { select: { id: true, email: true, name: true, avatarKey: true } },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      })) as MemberRow[];
    } catch (err) {
      console.error("[team] members", err);
      return {
        members: [],
        invites: [],
        canManage: canManageTeam(workspace.organization.role),
        error: "Impossible de charger les membres.",
      };
    }

    try {
      invites = await db.organizationInvite.findMany({
        where: {
          organizationId: orgId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err) {
      console.error("[team] invites — relancez npx prisma generate", err);
    }

    return {
      canManage: canManageTeam(workspace.organization.role),
      members: members.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        avatarKey: m.user.avatarKey,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
        archivedAt: m.archivedAt ? m.archivedAt.toISOString() : null,
        isSelf: m.userId === workspace.user.id,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt.toISOString(),
        createdAt: i.createdAt.toISOString(),
      })),
    };
  },
);

/** Détail d’un membre — strictement dans l’org active. */
export const getTeamMember = createServerFn({ method: "GET" })
  .validator((data: { membershipId: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const workspace = await loadWorkspace();
    if (!workspace) {
      return { ok: false as const, error: "Session expirée." };
    }

    const member = await db.organizationMember.findFirst({
      where: {
        id: data.membershipId,
        organizationId: workspace.organization.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarKey: true,
            emailVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!member) {
      return { ok: false as const, error: "Membre introuvable dans cette organisation." };
    }

    const [lastSession, auditLogs] = await Promise.all([
      db.authSession.findFirst({
        where: { userId: member.userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.auditLog.findMany({
        where: {
          userId: member.userId,
          OR: [{ organizationId: workspace.organization.id }, { organizationId: null }],
        },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
          metadata: true,
        },
      }),
    ]);

    return {
      ok: true as const,
      canManage: canManageTeam(workspace.organization.role),
      member: {
        membershipId: member.id,
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        avatarKey: member.user.avatarKey,
        emailVerified: Boolean(member.user.emailVerified),
        role: member.role as MemberRole,
        roleLabel: MEMBER_ROLE_LABELS[member.role as MemberRole],
        createdAt: member.createdAt.toISOString(),
        archivedAt: member.archivedAt ? member.archivedAt.toISOString() : null,
        userCreatedAt: member.user.createdAt.toISOString(),
        lastSignInAt: lastSession?.createdAt.toISOString() ?? null,
        isSelf: member.userId === workspace.user.id,
      },
      activity: [
        {
          id: `joined-${member.id}`,
          action: "team.member_joined",
          label: "A rejoint l’organisation",
          createdAt: member.createdAt.toISOString(),
        },
        ...auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          label: formatAuditLabel(log.action, log.entityType),
          createdAt: log.createdAt.toISOString(),
        })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      organizationName: workspace.organization.tradeName ?? workspace.organization.legalName,
    };
  });

function formatAuditLabel(action: string, entityType: string | null): string {
  const map: Record<string, string> = {
    "team.member_joined": "A rejoint l’organisation",
    "team.role_updated": "Rôle mis à jour",
    "team.member_archived": "Compte archivé",
    "team.member_restored": "Compte restauré",
    "team.member_removed": "Retiré de l’organisation",
    "api_key.created": "Clé API créée",
    "api_key.revoked": "Clé API révoquée",
    "integration.connected": "Intégration connectée",
    "integration.disconnected": "Intégration déconnectée",
  };
  if (map[action]) return map[action];
  if (entityType) return `${action} · ${entityType}`;
  return action;
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .validator((data: { email: string; role: MemberRole }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const orgId = gate.workspace.organization.id;
    const email = data.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false as const, error: "E-mail invalide." };
    }
    if (data.role === "OWNER" || !INVITABLE_ROLES.includes(data.role)) {
      return { success: false as const, error: "Rôle non invitables." };
    }

    const existingMember = await db.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email },
      },
    });
    if (existingMember) {
      return {
        success: false as const,
        error: "Cet utilisateur est déjà membre de cette organisation.",
      };
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const orgName = gate.workspace.organization.tradeName ?? gate.workspace.organization.legalName;
    const inviterName = gate.workspace.user.name || gate.workspace.user.email;

    if (!db.organizationInvite) {
      return {
        success: false as const,
        error:
          "Client Prisma obsolète (OrganizationInvite manquant). Arrêtez npm run dev, lancez npx prisma generate, puis relancez.",
      };
    }

    try {
      await db.organizationInvite.upsert({
        where: {
          organizationId_email: { organizationId: orgId, email },
        },
        create: {
          organizationId: orgId,
          email,
          role: data.role,
          token,
          invitedById: gate.workspace.user.id,
          expiresAt,
        },
        update: {
          role: data.role,
          token,
          invitedById: gate.workspace.user.id,
          expiresAt,
          acceptedAt: null,
        },
      });
    } catch (err) {
      console.error("[team] invite upsert", err);
      return {
        success: false as const,
        error:
          err instanceof Error
            ? `Impossible d’enregistrer l’invitation : ${err.message}`
            : "Impossible d’enregistrer l’invitation.",
      };
    }

    const mail = await sendInviteEmail({
      to: email,
      token,
      role: data.role,
      inviterName,
      organizationName: orgName,
      expiresAt,
    });

    if (!mail.ok) {
      return {
        success: true as const,
        mode: "invited" as const,
        message: `Invitation créée, mais l’e-mail n’a pas pu être envoyé (${mail.error}). Vérifiez Mailpit (http://127.0.0.1:8025) / SMTP.`,
        mailSent: false as const,
      };
    }

    return {
      success: true as const,
      mode: "invited" as const,
      message: `E-mail d’invitation envoyé à ${email}. Ouvrez Mailpit : http://127.0.0.1:8025`,
      mailSent: true as const,
    };
  });

export const resendTeamInvite = createServerFn({ method: "POST" })
  .validator((data: { inviteId: string }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const orgId = gate.workspace.organization.id;
    const invite = await db.organizationInvite.findFirst({
      where: { id: data.inviteId, organizationId: orgId, acceptedAt: null },
    });
    if (!invite) return { success: false as const, error: "Invitation introuvable." };

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await db.organizationInvite.update({
      where: { id: invite.id },
      data: { token, expiresAt },
    });

    const orgName = gate.workspace.organization.tradeName ?? gate.workspace.organization.legalName;
    const mail = await sendInviteEmail({
      to: invite.email,
      token,
      role: invite.role,
      inviterName: gate.workspace.user.name || gate.workspace.user.email,
      organizationName: orgName,
      expiresAt,
    });

    if (!mail.ok) {
      return { success: false as const, error: `Renvoi impossible : ${mail.error}` };
    }
    return { success: true as const, message: `Invitation renvoyée à ${invite.email}.` };
  });

export const getInviteByToken = createServerFn({ method: "GET" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const { db } = await import("@/lib/db");
    const { resolveSessionUser } = await import("@/lib/auth-server.server");

    const invite = await db.organizationInvite.findUnique({
      where: { token: data.token },
      include: {
        organization: { select: { id: true, legalName: true, tradeName: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    if (!invite || invite.acceptedAt) {
      return { ok: false as const, error: "Invitation invalide ou déjà utilisée." };
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      return { ok: false as const, error: "Cette invitation a expiré." };
    }

    const existingUser = await db.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });
    const sessionUser = await resolveSessionUser();

    return {
      ok: true as const,
      invite: {
        email: invite.email,
        role: invite.role as MemberRole,
        roleLabel: MEMBER_ROLE_LABELS[invite.role as MemberRole],
        organizationName: invite.organization.tradeName ?? invite.organization.legalName,
        inviterName: invite.invitedBy.name || invite.invitedBy.email,
        expiresAt: invite.expiresAt.toISOString(),
        hasAccount: Boolean(existingUser),
        sessionEmail: sessionUser?.email ?? null,
        sessionMatches: sessionUser?.email === invite.email,
      },
    };
  });

/** Création de compte + rejoindre l’org (sans nouvelle entreprise). */
export const acceptInviteSignup = createServerFn({ method: "POST" })
  .validator((data: { token: string; name: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { registerUserFromInvite } = await import("@/lib/auth-server.server");
    const result = await registerUserFromInvite(data);
    if ("error" in result) {
      return { success: false as const, error: result.error };
    }
    return {
      success: true as const,
      organizationId: result.organizationId,
      user: result.user,
    };
  });

export const acceptTeamInvite = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const { db } = await import("@/lib/db");
    const { resolveSessionUser } = await import("@/lib/auth-server.server");
    const { setCookie } = await import("@tanstack/react-start/server");
    const { ORG_COOKIE } = await import("@/fns/cabinet");

    const sessionUser = await resolveSessionUser();
    if (!sessionUser) {
      return {
        success: false as const,
        error: "Connectez-vous pour accepter l’invitation.",
        needsAuth: true as const,
      };
    }

    const invite = await db.organizationInvite.findUnique({
      where: { token: data.token },
    });
    if (!invite || invite.acceptedAt) {
      return { success: false as const, error: "Invitation invalide ou déjà utilisée." };
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      return { success: false as const, error: "Cette invitation a expiré." };
    }
    if (sessionUser.email !== invite.email) {
      return {
        success: false as const,
        error: `Connectez-vous avec ${invite.email} pour accepter cette invitation.`,
      };
    }

    await db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: sessionUser.id,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId: sessionUser.id,
        role: invite.role,
      },
      update: { role: invite.role },
    });

    await db.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    setCookie(ORG_COOKIE, invite.organizationId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return { success: true as const, organizationId: invite.organizationId };
  });

export const updateTeamMemberRole = createServerFn({ method: "POST" })
  .validator((data: { membershipId: string; role: MemberRole }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const orgId = gate.workspace.organization.id;

    const member = await db.organizationMember.findFirst({
      where: { id: data.membershipId, organizationId: orgId },
    });
    if (!member)
      return { success: false as const, error: "Membre introuvable dans cette organisation." };

    if (member.role === "OWNER") {
      return {
        success: false as const,
        error: "Le rôle propriétaire ne peut pas être modifié ainsi.",
      };
    }
    if (data.role === "OWNER") {
      return { success: false as const, error: "Impossible de promouvoir en propriétaire ici." };
    }
    if (member.userId === gate.workspace.user.id) {
      return { success: false as const, error: "Vous ne pouvez pas modifier votre propre rôle." };
    }

    await db.organizationMember.update({
      where: { id: member.id },
      data: { role: data.role },
    });

    return { success: true as const };
  });

/** OWNER/ADMIN peut changer l’avatar d’un membre de l’org (sauf propriétaire). */
export const updateTeamMemberAvatar = createServerFn({ method: "POST" })
  .validator((data: { membershipId: string; avatarKey: string | null }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const { isValidAvatarKey } = await import("@/lib/media");
    const orgId = gate.workspace.organization.id;

    const member = await db.organizationMember.findFirst({
      where: { id: data.membershipId, organizationId: orgId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!member) {
      return { success: false as const, error: "Membre introuvable dans cette organisation." };
    }
    if (member.role === "OWNER" && member.userId !== gate.workspace.user.id) {
      return {
        success: false as const,
        error: "Impossible de modifier l’avatar du propriétaire.",
      };
    }

    let avatarKey: string | null = null;
    if (data.avatarKey !== null && data.avatarKey !== "") {
      if (!isValidAvatarKey(data.avatarKey)) {
        return { success: false as const, error: "Avatar invalide." };
      }
      avatarKey = data.avatarKey;
    }

    await db.user.update({
      where: { id: member.userId },
      data: { avatarKey },
    });

    await db.auditLog.create({
      data: {
        organizationId: orgId,
        userId: gate.workspace.user.id,
        action: "team.avatar_updated",
        entityType: "user",
        entityId: member.userId,
        metadata: {
          targetEmail: member.user.email,
          avatarKey,
        },
      },
    });

    return { success: true as const, avatarKey };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .validator((data: { membershipId: string }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const orgId = gate.workspace.organization.id;

    const member = await db.organizationMember.findFirst({
      where: { id: data.membershipId, organizationId: orgId },
    });
    if (!member)
      return { success: false as const, error: "Membre introuvable dans cette organisation." };
    if (member.role === "OWNER") {
      return { success: false as const, error: "Impossible de retirer le propriétaire." };
    }
    if (member.userId === gate.workspace.user.id) {
      return { success: false as const, error: "Vous ne pouvez pas vous retirer vous-même." };
    }

    await db.organizationMember.delete({ where: { id: member.id } });
    return { success: true as const };
  });

/** Archive soft — le membre perd l’accès à l’org (réversible). */
export const archiveTeamMember = createServerFn({ method: "POST" })
  .validator((data: { membershipId: string }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const orgId = gate.workspace.organization.id;

    const member = await db.organizationMember.findFirst({
      where: { id: data.membershipId, organizationId: orgId },
    });
    if (!member)
      return { success: false as const, error: "Membre introuvable dans cette organisation." };
    if (member.role === "OWNER") {
      return { success: false as const, error: "Impossible d’archiver le propriétaire." };
    }
    if (member.userId === gate.workspace.user.id) {
      return { success: false as const, error: "Vous ne pouvez pas vous archiver vous-même." };
    }
    if (member.archivedAt) {
      return { success: false as const, error: "Ce membre est déjà archivé." };
    }

    await db.organizationMember.update({
      where: { id: member.id },
      data: { archivedAt: new Date() },
    });
    return { success: true as const };
  });

/** Restaure un membre archivé. */
export const restoreTeamMember = createServerFn({ method: "POST" })
  .validator((data: { membershipId: string }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const orgId = gate.workspace.organization.id;

    const member = await db.organizationMember.findFirst({
      where: { id: data.membershipId, organizationId: orgId },
    });
    if (!member)
      return { success: false as const, error: "Membre introuvable dans cette organisation." };
    if (!member.archivedAt) {
      return { success: false as const, error: "Ce membre n’est pas archivé." };
    }

    await db.organizationMember.update({
      where: { id: member.id },
      data: { archivedAt: null },
    });
    return { success: true as const };
  });

export const cancelTeamInvite = createServerFn({ method: "POST" })
  .validator((data: { inviteId: string }) => data)
  .handler(async ({ data }) => {
    const gate = await requireTeamAdmin();
    if (gate.error || !gate.workspace) return { success: false as const, error: gate.error };

    const { db } = await import("@/lib/db");
    const deleted = await db.organizationInvite.deleteMany({
      where: {
        id: data.inviteId,
        organizationId: gate.workspace.organization.id,
      },
    });
    if (deleted.count === 0) {
      return { success: false as const, error: "Invitation introuvable." };
    }
    return { success: true as const };
  });
