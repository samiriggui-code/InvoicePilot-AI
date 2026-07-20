import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import Stripe from "stripe";

import { db } from "@/lib/db";
import type { PlanId } from "@/lib/types";

const PLAN_TO_STRIPE: Record<PlanId, SubscriptionPlan> = {
  starter: "STARTER",
  pro: "PRO",
  enterprise: "ENTERPRISE",
};

export function mapPlanId(planId: string | undefined): SubscriptionPlan {
  if (planId && planId in PLAN_TO_STRIPE) {
    return PLAN_TO_STRIPE[planId as PlanId];
  }
  return "PRO";
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
    default:
      return "CANCELED";
  }
}

/** Stripe API ≥ 2025-03 : current_period_* est sur SubscriptionItem, plus sur Subscription. */
function subscriptionPeriod(subscription: Stripe.Subscription): {
  start: Date | null;
  end: Date | null;
} {
  const item = subscription.items?.data?.[0];
  const startSec =
    item?.current_period_start ??
    (subscription as { current_period_start?: number }).current_period_start ??
    subscription.billing_cycle_anchor ??
    null;
  const endSec =
    item?.current_period_end ??
    (subscription as { current_period_end?: number }).current_period_end ??
    null;

  return {
    start: startSec != null ? new Date(startSec * 1000) : null,
    end: endSec != null ? new Date(endSec * 1000) : null,
  };
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacy = (invoice as { subscription?: string | Stripe.Subscription | null }).subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;

  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object" && "id" in parentSub) {
    return parentSub.id;
  }
  return null;
}

export async function syncSubscriptionFromStripe(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  organizationId: string,
  planId?: string,
) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = planId ? mapPlanId(planId) : mapPlanId(subscription.metadata.planId);
  const period = subscriptionPeriod(subscription);

  await db.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan,
      status: mapStripeSubscriptionStatus(subscription.status),
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
    update: {
      plan,
      status: mapStripeSubscriptionStatus(subscription.status),
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });
}

export async function handleStripeWebhookEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) return;

      const organizationId =
        session.metadata?.organizationId ?? session.client_reference_id ?? undefined;
      if (!organizationId) {
        console.warn("[stripe] checkout.session.completed sans organizationId");
        return;
      }

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data"],
      });
      await syncSubscriptionFromStripe(
        stripe,
        subscription,
        organizationId,
        session.metadata?.planId,
      );

      const userId = session.metadata?.userId;
      if (userId) {
        const { createNotification } = await import("@/fns/notifications");
        const amount = session.amount_total ?? 0;
        await createNotification({
          userId,
          organizationId,
          title: amount > 0 ? "Paiement Stripe confirme" : "Moyen de paiement Stripe lie",
          body:
            amount > 0
              ? "Votre abonnement est enregistre. Consultez l'historique de facturation."
              : "Votre carte est enregistree et associee a votre abonnement.",
          severity: "SUCCESS",
          category: "BILLING",
          href: amount > 0 ? "/billing/history" : "/billing",
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata?.organizationId;

      if (!organizationId) {
        const existing = await db.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (!existing) return;
        await syncSubscriptionFromStripe(stripe, subscription, existing.organizationId);
        return;
      }

      await syncSubscriptionFromStripe(stripe, subscription, organizationId);
      break;
    }

    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) break;

      const existing = await db.subscription.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: {
          organization: {
            include: {
              members: { where: { role: "OWNER" }, take: 1 },
            },
          },
        },
      });
      if (!existing) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data"],
      });
      await syncSubscriptionFromStripe(stripe, subscription, existing.organizationId);

      const owner = existing.organization.members[0];
      if (owner && (invoice.amount_paid ?? 0) > 0) {
        const { createNotification } = await import("@/fns/notifications");
        await createNotification({
          userId: owner.userId,
          organizationId: existing.organizationId,
          title: "Paiement Stripe recu",
          body: `Facture ${invoice.number ?? invoice.id} payee — ${(invoice.amount_paid / 100).toFixed(2)} EUR.`,
          severity: "SUCCESS",
          category: "BILLING",
          href: "/billing/history",
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoiceSubscriptionId(invoice);
      if (!subscriptionId) return;

      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: "PAST_DUE" },
      });
      break;
    }

    default:
      break;
  }
}

export async function processStripeWebhook(request: Request): Promise<Response> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return new Response("Stripe webhook non configuré", { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Signature manquante", { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe] Signature webhook invalide", error);
    return new Response("Signature invalide", { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(stripe, event);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("[stripe] Erreur traitement webhook", error);
    return new Response("Erreur interne", { status: 500 });
  }
}
