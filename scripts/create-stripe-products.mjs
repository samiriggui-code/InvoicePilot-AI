/**
 * Crée les produits / prix Stripe test pour InvoicePilot AI.
 * Usage: node scripts/create-stripe-products.mjs
 * Lit STRIPE_SECRET_KEY depuis process.env ou .env
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional if env already set
  }
}

loadEnv();

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey || secretKey.includes("...")) {
  console.error("STRIPE_SECRET_KEY manquante ou placeholder dans .env");
  process.exit(1);
}

const stripe = new Stripe(secretKey);

const plans = [
  {
    id: "starter",
    name: "InvoicePilot AI — Starter",
    description: "Facturation électronique conforme — plan Starter (TPE/micro)",
    amount: 2900,
  },
  {
    id: "pro",
    name: "InvoicePilot AI — Pro",
    description: "Facturation électronique conforme — plan Pro (PME)",
    amount: 7900,
  },
  {
    id: "enterprise",
    name: "InvoicePilot AI — Enterprise",
    description: "Facturation électronique conforme — plan Enterprise (multi-dossiers)",
    amount: 19900,
  },
];

const existing = await stripe.products.search({
  query: "name~'InvoicePilot'",
});

console.log(
  "Produits InvoicePilot existants:",
  existing.data.map((p) => ({ id: p.id, name: p.name, active: p.active })),
);

const results = {};

for (const plan of plans) {
  let product = existing.data.find((p) => p.metadata?.planId === plan.id || p.name === plan.name);

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: { planId: plan.id, product: "invoicepilot-ai" },
    });
    console.log("Créé produit", plan.id, product.id);
  } else {
    console.log("Réutilise produit", plan.id, product.id);
  }

  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });

  let price = prices.data.find(
    (p) =>
      p.recurring?.interval === "month" && p.unit_amount === plan.amount && p.currency === "eur",
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: "eur",
      recurring: { interval: "month" },
      metadata: { planId: plan.id, product: "invoicepilot-ai" },
    });
    console.log("Créé prix", plan.id, price.id);
  } else {
    console.log("Réutilise prix", plan.id, price.id);
  }

  results[plan.id] = {
    productId: product.id,
    priceId: price.id,
    amount: plan.amount,
  };
}

console.log("\n=== IDs à mettre dans .env ===");
console.log(`STRIPE_PRICE_STARTER=${results.starter.priceId}`);
console.log(`STRIPE_PRICE_PRO=${results.pro.priceId}`);
console.log(`STRIPE_PRICE_ENTERPRISE=${results.enterprise.priceId}`);
console.log("\n" + JSON.stringify(results, null, 2));
