/**
 * Pull live des commandes Sources (Shopify Admin API / WooCommerce REST).
 * Normalise vers le même shape que le sandbox pour réutiliser l’ingest.
 */

import type { ShopifySandboxOrder } from "@/lib/shopify-sandbox";
import type { WooSandboxOrder } from "@/lib/woocommerce-sandbox";

export async function fetchShopifyLiveOrders(
  shopDomain: string,
  accessToken: string,
  limit = 50,
): Promise<ShopifySandboxOrder[]> {
  const domain = shopDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const res = await fetch(
    `https://${domain}/admin/api/2024-10/orders.json?status=any&limit=${limit}`,
    {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Shopify orders HTTP ${res.status}: ${body.slice(0, 160)}`);
  }

  const json = (await res.json()) as {
    orders?: Array<{
      id: number | string;
      name?: string;
      created_at?: string;
      email?: string;
      customer?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        default_address?: { company?: string };
      };
      line_items?: Array<{
        title?: string;
        name?: string;
        quantity?: number;
        price?: string;
      }>;
      shipping_address?: {
        address1?: string;
        zip?: string;
        city?: string;
        company?: string;
      };
      billing_address?: { company?: string; name?: string };
    }>;
  };

  return (json.orders ?? []).map((order) => {
    const company =
      order.customer?.default_address?.company ||
      order.billing_address?.company ||
      order.shipping_address?.company ||
      [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ") ||
      order.billing_address?.name ||
      "Client Shopify";

    const email = order.customer?.email || order.email || "";
    const createdAt = (order.created_at ?? new Date().toISOString()).slice(0, 10);

    return {
      id: String(order.id),
      name: order.name ?? `#${order.id}`,
      createdAt,
      customer: {
        legalName: company.trim() || "Client Shopify",
        email,
        siren: null,
      },
      lineItems: (order.line_items ?? []).map((li) => ({
        title: li.title || li.name || "Ligne",
        quantity: Number(li.quantity ?? 1) || 1,
        priceHt: Number(li.price ?? 0) || 0,
        vatRate: 20,
      })),
      shippingDiffers: Boolean(order.shipping_address?.address1),
      shippingAddress: order.shipping_address?.address1
        ? {
            line1: order.shipping_address.address1,
            postal: order.shipping_address.zip ?? "",
            city: order.shipping_address.city ?? "",
          }
        : undefined,
    } satisfies ShopifySandboxOrder;
  });
}

export async function fetchWooLiveOrders(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  limit = 50,
): Promise<WooSandboxOrder[]> {
  const base = storeUrl.trim().replace(/\/$/, "");
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

  const res = await fetch(
    `${base}/wp-json/wc/v3/orders?per_page=${limit}&status=processing,completed,on-hold`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WooCommerce orders HTTP ${res.status}: ${body.slice(0, 160)}`);
  }

  const orders = (await res.json()) as Array<{
    id: number;
    number?: string;
    date_created?: string;
    billing?: {
      company?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      address_1?: string;
      postcode?: string;
      city?: string;
    };
    shipping?: {
      address_1?: string;
      postcode?: string;
      city?: string;
    };
    line_items?: Array<{
      name?: string;
      quantity?: number;
      price?: number;
      total?: string;
    }>;
  }>;

  return orders.map((order) => {
    const legalName =
      order.billing?.company?.trim() ||
      [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ") ||
      "Client WooCommerce";

    const createdAt = (order.date_created ?? new Date().toISOString()).slice(0, 10);

    return {
      id: String(order.id),
      number: order.number ?? String(order.id),
      createdAt,
      customer: {
        legalName,
        email: order.billing?.email ?? "",
        siren: null,
      },
      lineItems: (order.line_items ?? []).map((li) => {
        const qty = Number(li.quantity ?? 1) || 1;
        const total = Number(li.total ?? li.price ?? 0) || 0;
        const unit = qty > 0 ? Math.round((total / qty) * 100) / 100 : total;
        return {
          title: li.name || "Ligne",
          quantity: qty,
          priceHt: unit,
          vatRate: 20,
        };
      }),
      shippingAddress: order.shipping?.address_1
        ? {
            line1: order.shipping.address_1,
            postal: order.shipping.postcode ?? "",
            city: order.shipping.city ?? "",
          }
        : undefined,
    } satisfies WooSandboxOrder;
  });
}
