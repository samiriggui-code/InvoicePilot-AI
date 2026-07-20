/** Commandes Shopify sandbox — pas d’API réelle (Phase 3 POC). */

export type ShopifySandboxOrder = {
  id: string;
  name: string;
  createdAt: string;
  customer: {
    legalName: string;
    email: string;
    /** null = manquant → facture BLOCKED (parcours correction) */
    siren: string | null;
  };
  lineItems: {
    title: string;
    quantity: number;
    priceHt: number;
    vatRate: number;
  }[];
  /** Si true, adresse livraison différente (mention 2026) */
  shippingDiffers?: boolean;
  shippingAddress?: {
    line1: string;
    postal: string;
    city: string;
  };
};

export const SHOPIFY_DEMO_SHOP = {
  domain: "demo-boutique.myshopify.com",
  label: "Boutique démo InvoicePilot",
  externalShopId: "shopify-demo-001",
} as const;

/** Jeu de commandes pour prouver import → validate → corriger → Factur-X → PA */
export function getShopifySandboxOrders(): ShopifySandboxOrder[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "gid://shopify/Order/1001",
      name: "#1001",
      createdAt: today,
      customer: {
        legalName: "Client Demo Shopify XYZ",
        email: "compta@client-demo-shopify.fr",
        siren: null, // → lookup auto ; si échec → BLOCKED + recherche manuelle
      },
      lineItems: [
        { title: "Abonnement boutique Pro", quantity: 1, priceHt: 120, vatRate: 20 },
        { title: "Frais de mise en service", quantity: 1, priceHt: 40, vatRate: 20 },
      ],
    },
    {
      id: "gid://shopify/Order/1002",
      name: "#1002",
      createdAt: today,
      customer: {
        legalName: "Maison Dupuis SARL",
        email: "contact@maison-dupuis.fr",
        siren: "552100554",
      },
      lineItems: [{ title: "Pack e-commerce annuel", quantity: 1, priceHt: 890, vatRate: 20 }],
      shippingDiffers: true,
      shippingAddress: {
        line1: "12 rue des Entrepôts",
        postal: "69007",
        city: "Lyon",
      },
    },
    {
      id: "gid://shopify/Order/1003",
      name: "#1003",
      createdAt: today,
      customer: {
        legalName: "Test Rejet PA SARL",
        email: "test@rejet-pa.fr",
        siren: "123456000", // finit par 000 → rejet PA auto en Phase 2
      },
      lineItems: [{ title: "Prestation consulting", quantity: 2, priceHt: 250, vatRate: 20 }],
    },
  ];
}
