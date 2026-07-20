/** Commandes WooCommerce sandbox — Phase 5. */

export type WooSandboxOrder = {
  id: string;
  number: string;
  createdAt: string;
  customer: {
    legalName: string;
    email: string;
    siren: string | null;
  };
  lineItems: {
    title: string;
    quantity: number;
    priceHt: number;
    vatRate: number;
  }[];
  shippingAddress?: {
    line1: string;
    postal: string;
    city: string;
  };
};

export const WOO_DEMO_SHOP = {
  domain: "demo-boutique.local",
  label: "Boutique Woo démo InvoicePilot",
  externalShopId: "woo-demo-001",
} as const;

export function getWooSandboxOrders(): WooSandboxOrder[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "woo-501",
      number: "501",
      createdAt: today,
      customer: {
        legalName: "Client Woo Sans SIREN",
        email: "client@woo-demo.fr",
        siren: null,
      },
      lineItems: [{ title: "Thème WordPress Pro", quantity: 1, priceHt: 79, vatRate: 20 }],
    },
    {
      id: "woo-502",
      number: "502",
      createdAt: today,
      customer: {
        legalName: "Boulangerie Dupuis",
        email: "compta@boulangerie-dupuis.fr",
        siren: "443061841",
      },
      lineItems: [{ title: "Abonnement Woo hébergé", quantity: 12, priceHt: 29, vatRate: 20 }],
    },
  ];
}
