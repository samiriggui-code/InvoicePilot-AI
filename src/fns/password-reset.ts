import { createServerFn } from "@tanstack/react-start";

const RESET_TTL_MS = 60 * 60 * 1000;

const GENERIC_SUCCESS_MESSAGE =
  "Si un compte est associé à cette adresse, vous recevrez un e-mail avec les instructions de réinitialisation sous quelques minutes.";

export function buildResetPasswordUrl(token: string, origin: string): string {
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = data.email?.trim().toLowerCase() ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { message: GENERIC_SUCCESS_MESSAGE, devResetUrl: null as string | null };
    }

    const { db } = await import("@/lib/db");
    const { randomToken, sha256 } = await import("@/lib/crypto-utils");

    const user = await db.user.findUnique({ where: { email } });
    let devResetUrl: string | null = null;

    if (user) {
      const rawToken = randomToken();
      const tokenHash = sha256(rawToken);

      await db.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      });

      const origin = process.env.APP_URL ?? "http://localhost:8081";
      const resetUrl = buildResetPasswordUrl(rawToken, origin);
      devResetUrl = process.env.NODE_ENV !== "production" ? resetUrl : null;

      const { sendReactEmail, appUrl } = await import("@/lib/mail.server");
      const { PasswordResetEmail } = await import("../../emails/password-reset");
      const { createElement } = await import("react");

      await sendReactEmail({
        to: email,
        subject: "Réinitialisation de votre mot de passe — InvoicePilot AI",
        react: createElement(PasswordResetEmail, {
          name: user.name ?? "là",
          resetUrl,
          expiresMinutes: 60,
          logoUrl: `${appUrl()}/media/app/logo-full.svg`,
        }),
      });

      if (devResetUrl) {
        console.info(`[password-reset] Lien démo pour ${email}: ${devResetUrl}`);
      }
    }

    return { message: GENERIC_SUCCESS_MESSAGE, devResetUrl };
  });

export const verifyPasswordResetTokenFn = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const { db } = await import("@/lib/db");
    const { sha256 } = await import("@/lib/crypto-utils");

    const token = await db.passwordResetToken.findFirst({
      where: {
        tokenHash: sha256(data.token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!token) {
      return { valid: false as const, email: null };
    }

    return { valid: true as const, email: token.user.email };
  });

export const completePasswordReset = createServerFn({ method: "POST" })
  .validator((data: { token: string; password: string }) => data)
  .handler(async ({ data }) => {
    const { db } = await import("@/lib/db");
    const { sha256 } = await import("@/lib/crypto-utils");
    const { hashPassword } = await import("@/lib/password");

    const resetToken = await db.passwordResetToken.findFirst({
      where: {
        tokenHash: sha256(data.token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      return {
        success: false,
        message: "Lien expiré ou invalide. Demandez une nouvelle réinitialisation.",
      };
    }

    if (data.password.length < 8) {
      return { success: false, message: "Le mot de passe doit contenir au moins 8 caractères." };
    }

    const passwordHash = await hashPassword(data.password);

    await db.$transaction([
      db.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      db.authSession.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return {
      success: true,
      message: "Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.",
    };
  });
