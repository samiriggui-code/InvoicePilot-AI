import { createServerFn } from "@tanstack/react-start";

import type { BillingInvoiceRow } from "@/components/billing/BillingHistoryGrid";

function mapInvoiceStatus(status: string | null | undefined): BillingInvoiceRow["status"] {
  switch (status) {
    case "paid":
      return "success-light";
    case "open":
    case "draft":
      return "warning-light";
    case "uncollectible":
    case "void":
      return "destructive-light";
    default:
      return "secondary";
  }
}

function mapInvoiceLabel(status: string | null | undefined, amountPaid: number): string {
  if (status === "paid" && amountPaid === 0) return "Carte enregistrée";
  if (status === "paid") return "Payée";
  if (status === "open") return "À venir";
  if (status === "void" || status === "uncollectible") return "Refusée";
  return status ?? "—";
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(sec: number | null | undefined): string {
  if (!sec) return "—";
  return new Date(sec * 1000).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Historique factures Stripe pour l’organisation courante. */
export const listStripeBillingInvoices = createServerFn({ method: "GET" }).handler(
  async (): Promise<BillingInvoiceRow[]> => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return [];

    const { resolveSessionUser, getPrimaryOrganizationId } =
      await import("@/lib/auth-server.server");
    const { db } = await import("@/lib/db");
    const Stripe = (await import("stripe")).default;

    const user = await resolveSessionUser();
    if (!user) return [];

    const organizationId = await getPrimaryOrganizationId(user.id);
    if (!organizationId) return [];

    const sub = await db.subscription.findUnique({ where: { organizationId } });
    if (!sub?.stripeCustomerId) return [];

    const stripe = new Stripe(secretKey);
    const invoices = await stripe.invoices.list({
      customer: sub.stripeCustomerId,
      limit: 24,
    });

    return invoices.data.map((inv) => {
      const amount = inv.status === "paid" ? inv.amount_paid : inv.amount_due;
      return {
        id: inv.id,
        invoice: inv.number ?? inv.id,
        label: mapInvoiceLabel(inv.status, inv.amount_paid ?? 0),
        status: mapInvoiceStatus(inv.status),
        date: formatDate(inv.created),
        dueDate: formatDate(inv.due_date ?? inv.created),
        amount: formatAmount(amount ?? 0, inv.currency ?? "eur"),
      };
    });
  },
);

/**
 * Fallback si le webhook Stripe n’a pas encore tourné :
 * synchronise la session Checkout → subscription locale.
 */
export const confirmCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: { sessionId: string }) => data)
  .handler(async ({ data }) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return { ok: false as const, error: "Stripe non configuré", status: null, amountTotal: null };
    }

    const { resolveSessionUser, getPrimaryOrganizationId } =
      await import("@/lib/auth-server.server");
    const { syncSubscriptionFromStripe } = await import("@/lib/stripe-webhook");
    const { createNotification } = await import("@/fns/notifications");
    const { db } = await import("@/lib/db");
    const Stripe = (await import("stripe")).default;

    const user = await resolveSessionUser();
    if (!user) {
      return { ok: false as const, error: "Non authentifié", status: null, amountTotal: null };
    }

    const organizationId = await getPrimaryOrganizationId(user.id);
    if (!organizationId) {
      return {
        ok: false as const,
        error: "Organisation introuvable",
        status: null,
        amountTotal: null,
      };
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(data.sessionId, {
      expand: ["subscription", "subscription.items.data"],
    });

    const sessionOrg = session.metadata?.organizationId ?? session.client_reference_id ?? undefined;
    if (sessionOrg && sessionOrg !== organizationId) {
      return {
        ok: false as const,
        error: "Session Stripe d’une autre organisation",
        status: null,
        amountTotal: null,
      };
    }

    if (session.mode !== "subscription" || !session.subscription) {
      return {
        ok: false as const,
        error: "Session sans abonnement",
        status: null,
        amountTotal: null,
      };
    }

    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription, {
            expand: ["items.data"],
          })
        : session.subscription;

    await syncSubscriptionFromStripe(
      stripe,
      subscription,
      organizationId,
      session.metadata?.planId,
    );

    const amountTotal = session.amount_total ?? 0;
    const status = subscription.status;

    const already = await db.notification.findFirst({
      where: {
        userId: user.id,
        organizationId,
        category: "BILLING",
        title: { in: ["Paiement Stripe confirmé", "Carte enregistrée sur Stripe"] },
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });

    if (!already) {
      if (amountTotal > 0 && status === "active") {
        await createNotification({
          userId: user.id,
          organizationId,
          title: "Paiement Stripe confirmé",
          body: "Votre abonnement est actif. Retrouvez la facture dans Historique de facturation.",
          severity: "SUCCESS",
          category: "BILLING",
          href: "/billing/history",
        });
      } else {
        await createNotification({
          userId: user.id,
          organizationId,
          title: "Carte enregistrée sur Stripe",
          body: "Votre moyen de paiement est lié. L’abonnement sera facturé à la fin de l’essai (ou immédiatement si vous convertissez).",
          severity: "SUCCESS",
          category: "BILLING",
          href: "/billing",
        });
      }
    }

    return {
      ok: true as const,
      error: null,
      status,
      amountTotal,
    };
  });
