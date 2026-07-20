import type { User } from "@prisma/client";

import {
  clearSessionCookie,
  readSessionToken,
  writeSessionCookie,
} from "@/lib/auth-cookies.server";
import { generateOtpCode, randomToken, sha256 } from "@/lib/crypto-utils";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  avatarKey: string | null;
};

export type TwoFactorChallengeResult = {
  challengeId: string;
  email: string;
  name: string;
  devCode: string | null;
};

const OTP_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

/** Affiche le code 2FA à l’écran (dev, ou prod sans SMTP via AUTH_SHOW_2FA_CODE=true). */
function shouldExpose2faCode(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.AUTH_SHOW_2FA_CODE === "true";
}

function toPublicUser(
  user: Pick<User, "id" | "email" | "name"> & { avatarKey?: string | null },
): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0] ?? "Utilisateur",
    avatarKey: user.avatarKey ?? null,
  };
}

export async function createTwoFactorChallenge(
  userId: string,
): Promise<{ challengeId: string; code: string }> {
  const code = generateOtpCode();

  await db.twoFactorCode.deleteMany({
    where: { userId, usedAt: null },
  });

  const challenge = await db.twoFactorCode.create({
    data: {
      userId,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return { challengeId: challenge.id, code };
}

export async function verifyTwoFactorChallenge(
  challengeId: string,
  code: string,
): Promise<User | null> {
  const challenge = await db.twoFactorCode.findUnique({
    where: { id: challengeId },
    include: { user: true },
  });

  if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
    return null;
  }

  if (challenge.codeHash !== sha256(code.trim())) {
    return null;
  }

  await db.twoFactorCode.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  return challenge.user;
}

export async function resendTwoFactorChallenge(
  challengeId: string,
): Promise<TwoFactorChallengeResult | null> {
  const existing = await db.twoFactorCode.findUnique({
    where: { id: challengeId },
    include: { user: true },
  });

  if (!existing || existing.usedAt) return null;

  const next = await createTwoFactorChallenge(existing.userId);
  const show2faCode = shouldExpose2faCode();
  const publicUser = toPublicUser(existing.user);

  try {
    const { sendReactEmail, mailLogoUrl } = await import("@/lib/mail.server");
    const { createElement } = await import("react");
    const { TwoFactorEmail } = await import("../../emails/two-factor");
    await sendReactEmail({
      to: existing.user.email,
      subject: "Votre code de connexion InvoicePilot AI",
      react: createElement(TwoFactorEmail, {
        name: publicUser.name,
        code: next.code,
        expiresMinutes: 10,
        logoUrl: mailLogoUrl(),
      }),
    });
  } catch (err) {
    console.error("[mail] 2fa", err);
  }

  if (show2faCode) {
    console.info(`[2fa] Nouveau code pour ${existing.user.email}: ${next.code}`);
  }

  return {
    challengeId: next.challengeId,
    email: existing.user.email,
    name: publicUser.name,
    devCode: show2faCode ? next.code : null,
  };
}

export async function createAuthSession(userId: string, rememberMe = false): Promise<PublicUser> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (rememberMe ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_MS));

  await db.authSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
    },
  });

  writeSessionCookie(token, rememberMe);

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return toPublicUser(user);
}

export async function resolveSessionUser(): Promise<PublicUser | null> {
  const token = readSessionToken();
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    clearSessionCookie();
    return null;
  }

  return toPublicUser(session.user);
}

export async function destroyAuthSession(): Promise<void> {
  const token = readSessionToken();
  if (token) {
    await db.authSession.deleteMany({ where: { tokenHash: sha256(token) } }).catch(() => undefined);
  }
  clearSessionCookie();
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  legalName?: string;
  siren?: string;
  siret?: string;
  companySize?: "MICRO" | "PME" | "ETI" | "GE";
  vatRegime?: "STANDARD" | "FRANCHISE_BASE" | "EXEMPT";
  hasB2cClients?: boolean;
  hasForeignClients?: boolean;
  hasPublicSector?: boolean;
  bridge?: {
    hasExistingPa?: boolean;
    needsPaGuidance?: boolean;
    preferredPlatformSlug?: string;
    paPurpose?: "EMISSION" | "RECEPTION" | "BOTH";
    sourceProviders?: string[];
    monthlyInvoiceVolume?: number;
    intendedPlan?: "STARTER" | "PRO" | "ENTERPRISE";
    wantsCheckoutNow?: boolean;
  };
}): Promise<{ user: PublicUser; challenge?: TwoFactorChallengeResult } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const legalName = (input.legalName ?? name).trim();
  const siren = (input.siren ?? "").replace(/\s/g, "");

  if (!name || !email || input.password.length < 8) {
    return { error: "Nom, email et mot de passe (8 caractères min.) requis." };
  }

  if (siren && !/^\d{9}$/.test(siren)) {
    return { error: "SIREN invalide — 9 chiffres requis (réforme 2026)." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await hashPassword(input.password);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const companySize = input.companySize ?? "PME";
  const vatRegime = input.vatRegime ?? "STANDARD";
  const mustReceiveBy = new Date("2026-09-01");
  const mustEmitBy =
    companySize === "MICRO" || companySize === "PME"
      ? new Date("2027-09-01")
      : new Date("2026-09-01");

  const intendedPlan = input.bridge?.intendedPlan ?? "PRO";
  const bridge = input.bridge;

  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      memberships: {
        create: {
          role: "OWNER",
          organization: {
            create: {
              legalName,
              tradeName: name,
              siren: siren || "000000000",
              siret: input.siret?.replace(/\s/g, "") || null,
              size: companySize,
              vatRegime,
              email,
              subscription: {
                create: {
                  plan: intendedPlan,
                  status: "TRIALING",
                  trialEndsAt,
                },
              },
              diagnostics: {
                create: {
                  companySize,
                  vatRegime,
                  hasB2bClients: true,
                  hasB2cClients: Boolean(input.hasB2cClients),
                  hasForeignClients: Boolean(input.hasForeignClients),
                  hasPublicSector: Boolean(input.hasPublicSector),
                  mustReceiveBy,
                  mustEmitBy,
                  needsEInvoicing: true,
                  needsEReportingTx: Boolean(input.hasB2cClients || input.hasForeignClients),
                  needsEReportingPay: vatRegime === "STANDARD",
                  completedAt: new Date(),
                },
              },
              bridgeProfile: bridge
                ? {
                    create: {
                      hasExistingPa: Boolean(bridge.hasExistingPa),
                      needsPaGuidance: bridge.needsPaGuidance !== false,
                      preferredPlatformSlug: bridge.preferredPlatformSlug ?? null,
                      paPurpose: bridge.paPurpose ?? "BOTH",
                      sourceProviders: (() => {
                        const raw = bridge.sourceProviders ?? [];
                        return raw.includes("MANUAL_UPLOAD") ? raw : ["MANUAL_UPLOAD", ...raw];
                      })(),
                      monthlyInvoiceVolume: bridge.monthlyInvoiceVolume ?? null,
                      intendedPlan,
                      wantsCheckoutNow: Boolean(bridge.wantsCheckoutNow),
                      onboardingStep: "signup_done",
                      completedAt: new Date(),
                    },
                  }
                : undefined,
            },
          },
        },
      },
    },
    include: {
      memberships: { include: { organization: true } },
    },
  });

  const orgId = user.memberships[0]?.organizationId;
  if (orgId && bridge?.preferredPlatformSlug) {
    const platform = await db.approvedPlatform.findFirst({
      where: {
        OR: [
          { slug: bridge.preferredPlatformSlug },
          { name: { contains: bridge.preferredPlatformSlug, mode: "insensitive" } },
        ],
        isActive: true,
      },
    });
    if (platform) {
      await db.organizationPlatformConnection.create({
        data: {
          organizationId: orgId,
          platformId: platform.id,
          purpose: bridge.paPurpose ?? "BOTH",
          label: "Déclarée à l’inscription (pas encore d’API)",
          isDefault: false,
          isActive: true,
          credentialsRef: "mode:declared",
        },
      });
    }
  }

  // Invitations en attente pour cet e-mail → memberships org (isolation par invite.organizationId)
  const pendingInvites = await db.organizationInvite.findMany({
    where: {
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  for (const invite of pendingInvites) {
    await db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: user.id,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
      },
      update: {},
    });
    await db.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  }

  // E-mail de bienvenue (Mailpit en local)
  try {
    const { sendReactEmail, appUrl } = await import("@/lib/mail.server");
    const { createElement } = await import("react");
    const { WelcomeEmail } = await import("../../emails/welcome");
    await sendReactEmail({
      to: email,
      subject: "Bienvenue sur InvoicePilot AI",
      react: createElement(WelcomeEmail, {
        name: name || "là",
        dashboardUrl: `${appUrl()}/dashboard`,
        trialDays: 14,
        logoUrl: `${appUrl()}/media/app/logo-full.svg`,
      }),
    });
  } catch (err) {
    console.error("[mail] welcome", err);
  }

  // 2FA désactivée temporairement — session directe après inscription
  const publicUser = await createAuthSession(user.id, false);
  return { user: publicUser };
}

/**
 * Inscription via invitation équipe : crée le compte + membership
 * sur l’org invitante (pas de nouvelle entreprise / essai).
 */
export async function registerUserFromInvite(input: {
  token: string;
  name: string;
  password: string;
}): Promise<{ user: PublicUser; organizationId: string } | { error: string }> {
  const name = input.name.trim();
  const token = input.token.trim();

  if (!name || input.password.length < 8) {
    return { error: "Nom et mot de passe (8 caractères min.) requis." };
  }
  if (!token) {
    return { error: "Lien d’invitation invalide." };
  }

  const invite = await db.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, legalName: true, tradeName: true } },
    },
  });

  if (!invite || invite.acceptedAt) {
    return { error: "Invitation invalide ou déjà utilisée." };
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { error: "Cette invitation a expiré. Demandez un nouvel e-mail." };
  }

  const email = invite.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      error: "Un compte existe déjà avec cet e-mail. Connectez-vous pour rejoindre l’équipe.",
    };
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        memberships: {
          create: {
            organizationId: invite.organizationId,
            role: invite.role,
          },
        },
      },
    });

    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return created;
  });

  const { setCookie } = await import("@tanstack/react-start/server");
  const { ORG_COOKIE } = await import("@/fns/cabinet");
  setCookie(ORG_COOKIE, invite.organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  try {
    const { sendReactEmail, appUrl } = await import("@/lib/mail.server");
    const { createElement } = await import("react");
    const { WelcomeEmail } = await import("../../emails/welcome");
    const orgLabel = invite.organization.tradeName ?? invite.organization.legalName;
    await sendReactEmail({
      to: email,
      subject: `Bienvenue sur InvoicePilot — ${orgLabel}`,
      react: createElement(WelcomeEmail, {
        name: name || "là",
        dashboardUrl: `${appUrl()}/dashboard`,
        organizationName: orgLabel,
        logoUrl: `${appUrl()}/media/app/logo-full.svg`,
      }),
    });
  } catch (err) {
    console.error("[mail] welcome invite", err);
  }

  const publicUser = await createAuthSession(user.id, false);
  return { user: publicUser, organizationId: invite.organizationId };
}

export async function authenticateUser(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<{ user: PublicUser; challenge?: TwoFactorChallengeResult } | { error: string }> {
  const email = input.email.trim().toLowerCase();

  if (!email || !input.password) {
    return { error: "Email et mot de passe requis." };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return { error: "Identifiants incorrects." };
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    return { error: "Identifiants incorrects." };
  }

  // 2FA désactivée temporairement — session directe après mot de passe
  const publicUser = await createAuthSession(user.id, input.rememberMe ?? false);
  return { user: publicUser };
}

export async function completeTwoFactorLogin(input: {
  challengeId: string;
  code: string;
  rememberMe?: boolean;
}): Promise<{ user: PublicUser } | { error: string }> {
  const user = await verifyTwoFactorChallenge(input.challengeId, input.code);
  if (!user) {
    return { error: "Code incorrect ou expiré. Réessayez ou demandez un nouveau code." };
  }

  const publicUser = await createAuthSession(user.id, input.rememberMe ?? false);
  return { user: publicUser };
}

export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const membership = await db.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

export { hashPassword, verifyPassword, toPublicUser };
