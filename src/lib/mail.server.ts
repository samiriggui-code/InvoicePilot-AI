import { render } from "react-email";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";

function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:8081").replace(/\/$/, "");
}

function mailFrom() {
  return process.env.MAIL_FROM ?? "InvoicePilot AI <noreply@invoicepilot.local>";
}

/** Destinataire des messages contact (prod : support@… ; local : Mailpit). */
export function mailContactTo() {
  return process.env.MAIL_CONTACT_TO ?? "contact@invoicepilot.local";
}

/** SMTP Mailpit Laragon (défaut 127.0.0.1:1025) ou SMTP production. */
function createTransport() {
  const host = process.env.SMTP_HOST ?? "127.0.0.1";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });
}

export type SendMailResult = { ok: true; messageId?: string } | { ok: false; error: string };

export async function sendReactEmail(options: {
  to: string;
  subject: string;
  react: ReactElement;
}): Promise<SendMailResult> {
  try {
    const html = await render(options.react);
    const transport = createTransport();
    const info = await transport.sendMail({
      from: mailFrom(),
      to: options.to,
      subject: options.subject,
      html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Envoi e-mail impossible";
    console.error("[mail]", message);
    return { ok: false, error: message };
  }
}

export function inviteAcceptUrl(token: string) {
  return `${appUrl()}/invite/${token}`;
}

/** Logo wordmark pour les templates React Email. */
export function mailLogoUrl() {
  return `${appUrl()}/media/app/logo-full.svg`;
}

export { appUrl };
