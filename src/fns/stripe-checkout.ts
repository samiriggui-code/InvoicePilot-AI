import { createServerFn } from "@tanstack/react-start";

import type { PlanId } from "@/lib/types";

const PLANS = {
  starter: { name: "Starter", amount: 2900, description: "InvoicePilot AI — Plan Starter" },
  pro: { name: "Pro", amount: 7900, description: "InvoicePilot AI — Plan Pro" },
  enterprise: {
    name: "Enterprise",
    amount: 19900,
    description: "InvoicePilot AI — Plan Enterprise",
  },
} as const;

/** Origine app : APP_URL, sinon port Vite courant (8081 si 8080 pris). */
function appOrigin(): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:8081";
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: { planId: PlanId }) => data)
  .handler(async ({ data }) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return {
        error:
          "Stripe n'est pas configuré. Ajoutez STRIPE_SECRET_KEY dans vos variables d'environnement.",
        url: null,
      };
    }

    const { resolveSessionUser, getPrimaryOrganizationId } =
      await import("@/lib/auth-server.server");
    const { db } = await import("@/lib/db");
    const Stripe = (await import("stripe")).default;

    const user = await resolveSessionUser();
    if (!user) {
      return {
        error: "Connectez-vous pour souscrire à un abonnement.",
        url: null,
      };
    }

    const organizationId = await getPrimaryOrganizationId(user.id);
    if (!organizationId) {
      return {
        error: "Aucune entreprise associée à votre compte.",
        url: null,
      };
    }

    const plan = PLANS[data.planId];
    if (!plan) {
      return { error: "Plan invalide.", url: null };
    }

    const existing = await db.subscription.findUnique({
      where: { organizationId },
    });

    const stripe = new Stripe(secretKey);
    const origin = appOrigin();

    const priceIdKey = `STRIPE_PRICE_${data.planId.toUpperCase()}` as const;
    const priceId = process.env[priceIdKey];

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "eur",
              product_data: { name: plan.description },
              unit_amount: plan.amount,
              recurring: { interval: "month" as const },
            },
            quantity: 1,
          },
        ];

    /**
     * Essai 14 j = gratuit a l inscription (DB locale), SANS carte.
     * Au checkout Stripe on facture immediatement (pas de 2e trial Stripe),
     * pour que sidebar / factures / notifications refletent un vrai paiement.
     */
    const subscriptionData: {
      metadata: { planId: PlanId; organizationId: string; userId: string };
    } = {
      metadata: {
        planId: data.planId,
        organizationId,
        userId: user.id,
      },
    };

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
      client_reference_id: organizationId,
      customer_email: existing?.stripeCustomerId ? undefined : user.email,
      customer: existing?.stripeCustomerId ?? undefined,
      metadata: {
        planId: data.planId,
        organizationId,
        userId: user.id,
      },
      subscription_data: subscriptionData,
      allow_promotion_codes: true,
    };

    try {
      const session = await stripe.checkout.sessions.create(sessionParams);
      return { url: session.url, error: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Impossible de créer la session Checkout.";
      console.error("[stripe] createCheckoutSession", error);
      return { url: null, error: message };
    }
  });
