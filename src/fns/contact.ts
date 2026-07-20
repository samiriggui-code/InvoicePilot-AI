import { createElement } from "react";
import { createServerFn } from "@tanstack/react-start";

export const submitContactForm = createServerFn({ method: "POST" })
  .validator((data: { name: string; email: string; subject: string; message: string }) => data)
  .handler(async ({ data }) => {
    const name = data.name?.trim() ?? "";
    const email = data.email?.trim().toLowerCase() ?? "";
    const subject = data.subject?.trim() ?? "";
    const message = data.message?.trim() ?? "";

    if (!name || name.length > 120) {
      return { ok: false as const, error: "Nom invalide." };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return { ok: false as const, error: "E-mail invalide." };
    }
    if (!subject || subject.length > 200) {
      return { ok: false as const, error: "Sujet invalide." };
    }
    if (!message || message.length < 10 || message.length > 5000) {
      return { ok: false as const, error: "Message trop court ou trop long." };
    }

    const { db } = await import("@/lib/db");
    const { sendReactEmail, appUrl, mailContactTo } = await import("@/lib/mail.server");
    const { ContactInquiryEmail } = await import("../../emails/contact-inquiry");
    const { ContactConfirmationEmail } = await import("../../emails/contact-confirmation");

    await db.contactMessage.create({
      data: { name, email, subject, message },
    });

    const logoUrl = `${appUrl()}/media/app/logo-full.svg`;
    const inbox = mailContactTo();

    const toTeam = await sendReactEmail({
      to: inbox,
      subject: `[Contact] ${subject}`,
      react: createElement(ContactInquiryEmail, {
        name,
        email,
        subject,
        message,
        logoUrl,
      }),
    });

    const toUser = await sendReactEmail({
      to: email,
      subject: "Nous avons bien reçu votre message — InvoicePilot AI",
      react: createElement(ContactConfirmationEmail, {
        name,
        subject,
        logoUrl,
        siteUrl: appUrl(),
      }),
    });

    if (!toTeam.ok && !toUser.ok) {
      return {
        ok: false as const,
        error:
          "Impossible d’envoyer l’e-mail pour le moment. Réessayez ou écrivez à contact@invoicepilot.ai.",
      };
    }

    return { ok: true as const };
  });
