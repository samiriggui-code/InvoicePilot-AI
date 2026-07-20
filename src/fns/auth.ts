import { createServerFn } from "@tanstack/react-start";

export type Pending2FAClient = {
  challengeId: string;
  email: string;
  name: string;
  redirect: string;
  rememberMe?: boolean;
  devCode?: string | null;
};

const PENDING_2FA_KEY = "invoicepilot-pending-2fa";

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "••••••••••";
  const visible = local.slice(-2);
  return `••••••${visible}@${domain}`;
}

export function getPending2FA(): Pending2FAClient | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_2FA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Pending2FAClient;
  } catch {
    return null;
  }
}

export function setPending2FA(pending: Pending2FAClient) {
  sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(pending));
}

export function clearPending2FA() {
  sessionStorage.removeItem(PENDING_2FA_KEY);
}

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveSessionUser } = await import("@/lib/auth-server.server");
  return resolveSessionUser();
});

export const signupUser = createServerFn({ method: "POST" })
  .validator(
    (data: {
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
    }) => data,
  )
  .handler(async ({ data }) => {
    const { registerUser } = await import("@/lib/auth-server.server");
    return registerUser(data);
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string; rememberMe?: boolean }) => data)
  .handler(async ({ data }) => {
    const { authenticateUser } = await import("@/lib/auth-server.server");
    return authenticateUser(data);
  });

export const verify2FA = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string; code: string; rememberMe?: boolean }) => data)
  .handler(async ({ data }) => {
    const { completeTwoFactorLogin } = await import("@/lib/auth-server.server");
    return completeTwoFactorLogin(data);
  });

export const resend2FA = createServerFn({ method: "POST" })
  .validator((data: { challengeId: string }) => data)
  .handler(async ({ data }) => {
    const { resendTwoFactorChallenge } = await import("@/lib/auth-server.server");
    const result = await resendTwoFactorChallenge(data.challengeId);
    if (!result) {
      return { success: false as const, devCode: null, challengeId: null };
    }
    return {
      success: true as const,
      devCode: result.devCode,
      challengeId: result.challengeId,
    };
  });

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const { destroyAuthSession } = await import("@/lib/auth-server.server");
  await destroyAuthSession();
  return { success: true };
});

/** Mise à jour du profil connecté (nom + avatar Metronic). */
export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: { name: string; avatarKey?: string | null }) => data)
  .handler(async ({ data }) => {
    const { resolveSessionUser } = await import("@/lib/auth-server.server");
    const { db } = await import("@/lib/db");
    const { isValidAvatarKey } = await import("@/lib/media");
    const user = await resolveSessionUser();
    if (!user) return { success: false as const, error: "Session expirée." };

    const name = data.name.trim();
    if (!name || name.length < 2) {
      return { success: false as const, error: "Indiquez un nom (2 caractères min.)." };
    }

    let avatarKey: string | null = null;
    if (data.avatarKey === null || data.avatarKey === "") {
      avatarKey = null;
    } else if (data.avatarKey !== undefined) {
      if (!isValidAvatarKey(data.avatarKey)) {
        return { success: false as const, error: "Avatar invalide." };
      }
      avatarKey = data.avatarKey;
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        name,
        ...(data.avatarKey !== undefined ? { avatarKey } : {}),
      },
      select: { name: true, avatarKey: true },
    });

    return {
      success: true as const,
      name: updated.name ?? name,
      avatarKey: updated.avatarKey,
    };
  });
