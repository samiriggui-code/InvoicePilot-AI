import { createServerFn } from "@tanstack/react-start";

export type MerchantProviderId =
  "SHOPIFY" | "WOOCOMMERCE" | "WIX" | "PRESTASHOP" | "GENERIC_HTTP" | "MANUAL_UPLOAD" | "API_PUSH";

export type IntegrationSummary = {
  id: string;
  provider: MerchantProviderId;
  status: string;
  shopDomain: string | null;
  shopLabel: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  importedCount: number;
  authMode: "sandbox" | "live" | "unknown";
};

function readAuthMode(metadata: unknown): "sandbox" | "live" | "unknown" {
  if (!metadata || typeof metadata !== "object") return "unknown";
  const mode = (metadata as { authMode?: string }).authMode;
  if (mode === "sandbox" || mode === "live") return mode;
  return "unknown";
}

/** PDF = filet de secours toujours présent (si APIs boutique indisponibles). */
export function withManualUploadFallback(
  providers: string[] | null | undefined,
): MerchantProviderId[] {
  const base = (providers ?? []).filter((p): p is MerchantProviderId =>
    [
      "SHOPIFY",
      "WOOCOMMERCE",
      "WIX",
      "PRESTASHOP",
      "GENERIC_HTTP",
      "MANUAL_UPLOAD",
      "API_PUSH",
    ].includes(p),
  );
  if (!base.includes("MANUAL_UPLOAD")) base.unshift("MANUAL_UPLOAD");
  return [...new Set(base)];
}

async function ensureManualUploadChannel(organizationId: string) {
  const { db } = await import("@/lib/db");

  const bridge = await db.organizationBridgeProfile.findUnique({
    where: { organizationId },
  });
  const next = withManualUploadFallback(bridge?.sourceProviders);

  await db.organizationBridgeProfile.upsert({
    where: { organizationId },
    create: {
      organizationId,
      sourceProviders: next,
    },
    update: { sourceProviders: next },
  });

  await db.merchantIntegration.upsert({
    where: {
      organizationId_provider: {
        organizationId,
        provider: "MANUAL_UPLOAD",
      },
    },
    create: {
      organizationId,
      provider: "MANUAL_UPLOAD",
      status: "CONNECTED",
      shopLabel: "Chargement PDF (secours)",
      lastError: null,
      metadata: { authMode: "live", fallback: true },
    },
    update: {
      status: "CONNECTED",
      shopLabel: "Chargement PDF (secours)",
      lastError: null,
    },
  });

  return next;
}

export type SyncResultItem = {
  invoiceId: string;
  orderName: string;
  status: string;
  clientName: string;
  amount: number;
  blockingCount: number;
};

export const getIntegrationsData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadWorkspace } = await import("@/lib/workspace.server");
  const { db } = await import("@/lib/db");

  const workspace = await loadWorkspace();
  if (!workspace) return null;

  const orgId = workspace.organization.id;
  const ensuredProviders = await ensureManualUploadChannel(orgId);

  const [integrations, bridge] = await Promise.all([
    db.merchantIntegration.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    }),
    db.organizationBridgeProfile.findUnique({
      where: { organizationId: orgId },
      select: { sourceProviders: true, monthlyInvoiceVolume: true },
    }),
  ]);

  /** Uniquement les vrais canaux — jamais le seed / sandbox Shopify-Woo. */
  const allowedSourceSystems: string[] = ["manual_upload"];
  for (const row of integrations) {
    if (row.status !== "CONNECTED" && row.status !== "SYNCING") continue;
    if (readAuthMode(row.metadata) !== "live") continue;
    if (row.provider === "SHOPIFY") allowedSourceSystems.push("shopify");
    if (row.provider === "WOOCOMMERCE") allowedSourceSystems.push("woocommerce");
  }

  const recentImported = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      direction: "SALE",
      OR: [
        { sourceSystem: { in: allowedSourceSystems } },
        // Factures manuelles / importées sans tag source (ex. brouillon orphelin)
        { sourceSystem: null },
      ],
    },
    include: { counterparty: { select: { legalName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const chosenSources = withManualUploadFallback(
    bridge?.sourceProviders?.length ? bridge.sourceProviders : ensuredProviders,
  );

  return {
    chosenSources,
    monthlyVolume: bridge?.monthlyInvoiceVolume ?? null,
    integrations: integrations.map((i): IntegrationSummary => ({
      id: i.id,
      provider: i.provider as MerchantProviderId,
      status: i.status,
      shopDomain: i.shopDomain,
      shopLabel: i.shopLabel,
      lastSyncAt: i.lastSyncAt?.toISOString() ?? null,
      lastError: i.lastError,
      importedCount: i.importedCount,
      authMode: readAuthMode(i.metadata),
    })),
    recentImports: recentImported.map((inv) => ({
      id: inv.id,
      number: inv.number ?? "Brouillon",
      status: inv.status,
      client: inv.counterparty?.legalName ?? "—",
      amount: Number(inv.totalTtc),
      sourceExternalId: inv.sourceExternalId,
      sourceSystem: inv.sourceSystem,
      issueDate: inv.issueDate?.toISOString().slice(0, 10) ?? null,
      format: inv.format,
      hasPdf: Boolean(inv.pdfStorageKey),
      createdAt: inv.createdAt.toISOString(),
    })),
  };
});

export const connectShopifySandbox = createServerFn({ method: "POST" }).handler(async () => {
  return {
    success: false as const,
    error:
      "Connexion Shopify sandbox désactivée. Utilisez domaine + token Admin API (connexion live).",
  };
});

/** Connexion réelle : domaine boutique + Admin API access token (custom app). */
export const connectShopifyLive = createServerFn({ method: "POST" })
  .validator((data: { shopDomain: string; accessToken: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { sha256 } = await import("@/lib/crypto-utils");
    const { sealSecret } = await import("@/lib/secret-seal");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const domain = data.shopDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    const token = data.accessToken.trim();

    if (!domain.includes(".") || token.length < 10) {
      return {
        success: false as const,
        error: "Domaine boutique (ex. ma-boutique.myshopify.com) et access token Admin API requis.",
      };
    }

    let shopName = domain;
    let externalShopId: string | null = null;
    try {
      const res = await fetch(`https://${domain}/admin/api/2024-10/shop.json`, {
        headers: {
          "X-Shopify-Access-Token": token,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          success: false as const,
          error: `Shopify a refusé le token (HTTP ${res.status}). Vérifiez le custom app / scopes. ${body.slice(0, 120)}`,
        };
      }
      const json = (await res.json()) as { shop?: { name?: string; id?: number } };
      shopName = json.shop?.name ?? domain;
      externalShopId = json.shop?.id != null ? String(json.shop.id) : null;
    } catch (e) {
      return {
        success: false as const,
        error: `Impossible de joindre Shopify (${domain}). ${e instanceof Error ? e.message : ""}`,
      };
    }

    await db.merchantIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId: workspace.organization.id,
          provider: "SHOPIFY",
        },
      },
      create: {
        organizationId: workspace.organization.id,
        provider: "SHOPIFY",
        status: "CONNECTED",
        shopDomain: domain,
        shopLabel: shopName,
        externalShopId,
        lastError: null,
        metadata: {
          authMode: "live",
          tokenHash: sha256(token),
          tokenLast4: token.slice(-4),
          sealedToken: sealSecret(token),
        },
      },
      update: {
        status: "CONNECTED",
        shopDomain: domain,
        shopLabel: shopName,
        externalShopId,
        lastError: null,
        metadata: {
          authMode: "live",
          tokenHash: sha256(token),
          tokenLast4: token.slice(-4),
          sealedToken: sealSecret(token),
        },
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        action: "integration.shopify.connected",
        entityType: "MerchantIntegration",
        metadata: { shop: domain, mode: "live" },
      },
    });

    return { success: true as const, error: null };
  });

export const disconnectShopify = createServerFn({ method: "POST" })
  .validator((data?: { confirmText?: string }) => data ?? {})
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    if ((data.confirmText ?? "").trim().toUpperCase() !== "DECONNECTER") {
      return {
        success: false as const,
        error: "Confirmation invalide. Saisissez DECONNECTER pour couper le canal.",
      };
    }

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    await db.merchantIntegration.updateMany({
      where: { organizationId: workspace.organization.id, provider: "SHOPIFY" },
      data: { status: "DISCONNECTED", lastError: null },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        action: "integration.shopify.disconnected",
        entityType: "MerchantIntegration",
        metadata: { confirmed: true },
      },
    });

    return { success: true as const, error: null };
  });

export const syncShopifyOrders = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    success: boolean;
    error: string | null;
    imported: SyncResultItem[];
    skipped: number;
  }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { validateInvoiceDraft, computeLineTotals } = await import("@/lib/invoice-validation");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false, error: "Session expirée.", imported: [], skipped: 0 };
    }

    const integration = await db.merchantIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: workspace.organization.id,
          provider: "SHOPIFY",
        },
      },
    });

    if (!integration || integration.status === "DISCONNECTED") {
      return {
        success: false,
        error: "Shopify non connecté. Renseignez domaine + token Admin API.",
        imported: [],
        skipped: 0,
      };
    }

    const authMode = readAuthMode(integration.metadata);

    await db.merchantIntegration.update({
      where: { id: integration.id },
      data: { status: "SYNCING", lastError: null },
    });

    const orgId = workspace.organization.id;
    const imported: SyncResultItem[] = [];
    let skipped = 0;

    try {
      if (authMode !== "live") {
        throw new Error(
          "Canal Shopify non live. Connectez la boutique avec domaine + token Admin API.",
        );
      }
      const { openSecret } = await import("@/lib/secret-seal");
      const { fetchShopifyLiveOrders } = await import("@/lib/source-live-pull");
      const meta =
        integration.metadata && typeof integration.metadata === "object"
          ? (integration.metadata as { sealedToken?: string })
          : {};
      const token = meta.sealedToken ? openSecret(meta.sealedToken) : null;
      if (!token || !integration.shopDomain) {
        throw new Error("Credentials live introuvables. Reconnectez Shopify (domaine + token).");
      }
      const orders = await fetchShopifyLiveOrders(integration.shopDomain, token);

      for (const order of orders) {
        const existing = await db.invoice.findFirst({
          where: {
            organizationId: orgId,
            sourceSystem: "shopify",
            sourceExternalId: order.id,
          },
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        let client = await db.counterparty.findFirst({
          where: {
            organizationId: orgId,
            ...(order.customer.siren
              ? { siren: order.customer.siren }
              : { legalName: order.customer.legalName }),
            type: { in: ["CLIENT", "BOTH"] },
          },
        });

        if (!client) {
          const { findOrCreateClient } = await import("@/lib/counterparty-dedupe");
          const result = await findOrCreateClient(db, {
            organizationId: orgId,
            legalName: order.customer.legalName,
            email: order.customer.email,
            siren: order.customer.siren,
            deliveryLine1: order.shippingAddress?.line1 ?? null,
            deliveryPostal: order.shippingAddress?.postal ?? null,
            deliveryCity: order.shippingAddress?.city ?? null,
            deliveryCountry: order.shippingDiffers ? "FR" : null,
          });
          client = result.client;
        } else if (order.customer.siren && !client.siren) {
          client = await db.counterparty.update({
            where: { id: client.id },
            data: { siren: order.customer.siren },
          });
        }

        // Rattrapage : si SIREN manquant, lookup officiel par raison sociale
        if (!client.siren && !order.customer.siren) {
          const { bestCompanyMatch } = await import("@/lib/company-lookup");
          const match = await bestCompanyMatch(order.customer.legalName);
          if (match?.active) {
            client = await db.counterparty.update({
              where: { id: client.id },
              data: {
                legalName: match.legalName || client.legalName,
                siren: match.siren,
                siret: match.siret,
                vatNumber: match.vatNumber,
                billingLine1: match.billingLine1 ?? client.billingLine1,
                billingPostal: match.billingPostal ?? client.billingPostal,
                billingCity: match.billingCity ?? client.billingCity,
                billingCountry: "FR",
                directorySyncedAt: new Date(),
              },
            });
            await db.auditLog.create({
              data: {
                organizationId: orgId,
                action: "counterparty.auto_enriched",
                entityType: "Counterparty",
                entityId: client.id,
                metadata: {
                  siren: match.siren,
                  source: "shopify-sync+recherche-entreprises",
                  order: order.name,
                },
              },
            });
          }
        }

        const lines = order.lineItems.map((li) => ({
          description: li.title,
          quantity: li.quantity,
          unitPriceHt: li.priceHt,
          vatRate: li.vatRate,
        }));

        let subtotalHt = 0;
        let totalVat = 0;
        const lineRows = lines.map((line, index) => {
          const { lineTotalHt, lineVat } = computeLineTotals(line);
          subtotalHt += lineTotalHt;
          totalVat += lineVat;
          return {
            lineNumber: index + 1,
            description: line.description,
            quantity: line.quantity,
            unitPriceHt: line.unitPriceHt,
            vatRate: line.vatRate,
            lineTotalHt,
            lineVat,
          };
        });
        subtotalHt = Math.round(subtotalHt * 100) / 100;
        totalVat = Math.round(totalVat * 100) / 100;
        const totalTtc = Math.round((subtotalHt + totalVat) * 100) / 100;

        const deliveryDiffers = Boolean(order.shippingDiffers);
        const issues = validateInvoiceDraft({
          buyerSiren: client.siren ?? order.customer.siren,
          operationCategory: "GOODS",
          deliveryDiffers,
          deliveryLine1: order.shippingAddress?.line1,
          deliveryCity: order.shippingAddress?.city,
          issueDate: order.createdAt,
          serviceDate: order.createdAt,
          lines,
          sellerSiren: workspace.organization.siren,
        });
        const blocking = issues.filter((i) => i.blocking);
        const status = blocking.length > 0 ? "BLOCKED" : "VALIDATED";

        const invoice = await db.$transaction(async (tx) => {
          let number: string | null = null;
          if (status === "VALIDATED") {
            let seq = await tx.invoiceSequence.findFirst({
              where: { organizationId: orgId, prefix: "SHOP", fiscalYear: null },
            });
            if (!seq) {
              seq = await tx.invoiceSequence.create({
                data: {
                  organizationId: orgId,
                  prefix: "SHOP",
                  nextNumber: 1,
                  padding: 4,
                },
              });
            }
            number = `${seq.prefix}-${String(seq.nextNumber).padStart(seq.padding, "0")}`;
            await tx.invoiceSequence.update({
              where: { id: seq.id },
              data: { nextNumber: seq.nextNumber + 1 },
            });
          } else {
            number = `SHOP-TMP-${order.name.replace("#", "")}`;
          }

          return tx.invoice.create({
            data: {
              organizationId: orgId,
              counterpartyId: client!.id,
              direction: "SALE",
              type: "INVOICE",
              status,
              format: status === "VALIDATED" ? "FACTUR_X" : null,
              number,
              issueDate: new Date(order.createdAt),
              serviceDate: new Date(order.createdAt),
              buyerSiren: client!.siren ?? order.customer.siren,
              operationCategory: "GOODS",
              deliveryDiffers,
              paymentTermsDays: 30,
              latePenaltyRate: 10.5,
              recoveryFeeAmount: 40,
              subtotalHt,
              totalVat,
              totalTtc,
              complianceScore:
                status === "VALIDATED"
                  ? 100 - issues.filter((i) => !i.blocking).length * 5
                  : Math.max(0, 100 - blocking.length * 25),
              issuedAt: status === "VALIDATED" ? new Date() : null,
              sourceSystem: "shopify",
              sourceExternalId: order.id,
              purchaseOrderRef: order.name,
              lines: { create: lineRows },
              validations: {
                create: issues.map((issue) => ({
                  code: issue.code,
                  message: issue.message,
                  severity: issue.severity,
                  field: issue.field ?? null,
                  blocking: issue.blocking,
                })),
              },
              lifecycleEvents: {
                create: {
                  status,
                  scope: "EMISSION",
                  source: "shopify-sync",
                  message:
                    status === "BLOCKED"
                      ? `Import Shopify ${order.name} — bloquée (mentions 2026)`
                      : `Import Shopify ${order.name} — prête PA`,
                  metadata: {
                    event: status === "BLOCKED" ? "blocked" : "ready",
                    shopifyOrderId: order.id,
                    shopifyOrderName: order.name,
                  },
                },
              },
            },
          });
        });

        await db.auditLog.create({
          data: {
            organizationId: orgId,
            action:
              status === "BLOCKED"
                ? "integration.shopify.imported_blocked"
                : "integration.shopify.imported_ready",
            entityType: "Invoice",
            entityId: invoice.id,
            metadata: {
              event: status === "BLOCKED" ? "blocked" : "ready",
              order: order.name,
            },
          },
        });

        imported.push({
          invoiceId: invoice.id,
          orderName: order.name,
          status,
          clientName: order.customer.legalName,
          amount: totalTtc,
          blockingCount: blocking.length,
        });
      }

      await db.merchantIntegration.update({
        where: { id: integration.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: new Date(),
          lastError: null,
          importedCount: integration.importedCount + imported.length,
        },
      });

      await db.auditLog.create({
        data: {
          organizationId: orgId,
          action: "integration.shopify.synced",
          entityType: "MerchantIntegration",
          entityId: integration.id,
          metadata: {
            event: "imported",
            imported: imported.length,
            skipped,
          },
        },
      });

      return { success: true, error: null, imported, skipped };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync Shopify échouée.";
      await db.merchantIntegration.update({
        where: { id: integration.id },
        data: { status: "ERROR", lastError: message },
      });
      return { success: false, error: message, imported, skipped };
    }
  },
);

export const connectWooSandbox = createServerFn({ method: "POST" }).handler(async () => {
  return {
    success: false as const,
    error:
      "Connexion WooCommerce sandbox désactivée. Utilisez URL boutique + clés REST (connexion live).",
  };
});

/** Connexion réelle Woo : URL boutique + Consumer Key / Secret REST. */
export const connectWooLive = createServerFn({ method: "POST" })
  .validator((data: { storeUrl: string; consumerKey: string; consumerSecret: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { sha256 } = await import("@/lib/crypto-utils");
    const { sealSecret } = await import("@/lib/secret-seal");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const base = data.storeUrl.trim().replace(/\/$/, "");
    const key = data.consumerKey.trim();
    const secret = data.consumerSecret.trim();

    if (!base.startsWith("http") || key.length < 8 || secret.length < 8) {
      return {
        success: false as const,
        error: "URL boutique (https://…) + Consumer Key + Consumer Secret WooCommerce REST requis.",
      };
    }

    const auth = Buffer.from(`${key}:${secret}`).toString("base64");
    let shopLabel = base;
    try {
      const res = await fetch(`${base}/wp-json/wc/v3/system_status`, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        // fallback léger : liste produits
        const res2 = await fetch(`${base}/wp-json/wc/v3/products?per_page=1`, {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
        });
        if (!res2.ok) {
          return {
            success: false as const,
            error: `WooCommerce a refusé les credentials (HTTP ${res2.status}). Vérifiez clé/secret et permaliens REST.`,
          };
        }
      } else {
        const json = (await res.json()) as { environment?: { site_url?: string } };
        shopLabel = json.environment?.site_url ?? base;
      }
    } catch (e) {
      return {
        success: false as const,
        error: `Impossible de joindre WooCommerce. ${e instanceof Error ? e.message : ""}`,
      };
    }

    const domain = base.replace(/^https?:\/\//, "");

    await db.merchantIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId: workspace.organization.id,
          provider: "WOOCOMMERCE",
        },
      },
      create: {
        organizationId: workspace.organization.id,
        provider: "WOOCOMMERCE",
        status: "CONNECTED",
        shopDomain: domain,
        shopLabel,
        lastError: null,
        metadata: {
          authMode: "live",
          storeUrl: base,
          keyHash: sha256(key),
          keyLast4: key.slice(-4),
          sealedKey: sealSecret(key),
          sealedSecret: sealSecret(secret),
        },
      },
      update: {
        status: "CONNECTED",
        shopDomain: domain,
        shopLabel,
        lastError: null,
        metadata: {
          authMode: "live",
          storeUrl: base,
          keyHash: sha256(key),
          keyLast4: key.slice(-4),
          sealedKey: sealSecret(key),
          sealedSecret: sealSecret(secret),
        },
      },
    });

    return { success: true as const, error: null };
  });

export const disconnectWoo = createServerFn({ method: "POST" })
  .validator((data?: { confirmText?: string }) => data ?? {})
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    if ((data.confirmText ?? "").trim().toUpperCase() !== "DECONNECTER") {
      return {
        success: false as const,
        error: "Confirmation invalide. Saisissez DECONNECTER pour couper le canal.",
      };
    }

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    await db.merchantIntegration.updateMany({
      where: { organizationId: workspace.organization.id, provider: "WOOCOMMERCE" },
      data: { status: "DISCONNECTED", lastError: null },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        action: "integration.woocommerce.disconnected",
        entityType: "MerchantIntegration",
        metadata: { confirmed: true },
      },
    });

    return { success: true as const, error: null };
  });

export const syncWooOrders = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    success: boolean;
    error: string | null;
    imported: SyncResultItem[];
    skipped: number;
  }> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { validateInvoiceDraft, computeLineTotals } = await import("@/lib/invoice-validation");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false, error: "Session expirée.", imported: [], skipped: 0 };
    }

    const integration = await db.merchantIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: workspace.organization.id,
          provider: "WOOCOMMERCE",
        },
      },
    });

    if (!integration || integration.status === "DISCONNECTED") {
      return {
        success: false,
        error: "WooCommerce non connecté. URL boutique + clés REST requis.",
        imported: [],
        skipped: 0,
      };
    }

    const authMode = readAuthMode(integration.metadata);

    await db.merchantIntegration.update({
      where: { id: integration.id },
      data: { status: "SYNCING", lastError: null },
    });

    const orgId = workspace.organization.id;
    const imported: SyncResultItem[] = [];
    let skipped = 0;

    try {
      if (authMode !== "live") {
        throw new Error("Canal WooCommerce non live. Connectez la boutique avec URL + clés REST.");
      }
      const { openSecret } = await import("@/lib/secret-seal");
      const { fetchWooLiveOrders } = await import("@/lib/source-live-pull");
      const meta =
        integration.metadata && typeof integration.metadata === "object"
          ? (integration.metadata as {
              sealedKey?: string;
              sealedSecret?: string;
              storeUrl?: string;
            })
          : {};
      const key = meta.sealedKey ? openSecret(meta.sealedKey) : null;
      const secret = meta.sealedSecret ? openSecret(meta.sealedSecret) : null;
      const storeUrl = meta.storeUrl ?? integration.shopDomain;
      if (!key || !secret || !storeUrl) {
        throw new Error(
          "Credentials live introuvables. Reconnectez WooCommerce (URL + clés REST).",
        );
      }
      const orders = await fetchWooLiveOrders(storeUrl, key, secret);

      for (const order of orders) {
        const existing = await db.invoice.findFirst({
          where: {
            organizationId: orgId,
            sourceSystem: "woocommerce",
            sourceExternalId: order.id,
          },
        });
        if (existing) {
          skipped += 1;
          continue;
        }

        let client = await db.counterparty.findFirst({
          where: {
            organizationId: orgId,
            ...(order.customer.siren
              ? { siren: order.customer.siren }
              : { legalName: order.customer.legalName }),
            type: { in: ["CLIENT", "BOTH"] },
          },
        });

        if (!client) {
          const { findOrCreateClient } = await import("@/lib/counterparty-dedupe");
          const result = await findOrCreateClient(db, {
            organizationId: orgId,
            legalName: order.customer.legalName,
            email: order.customer.email,
            siren: order.customer.siren,
            deliveryLine1: order.shippingAddress?.line1 ?? null,
            deliveryPostal: order.shippingAddress?.postal ?? null,
            deliveryCity: order.shippingAddress?.city ?? null,
          });
          client = result.client;
        }

        if (!client.siren && !order.customer.siren) {
          const { bestCompanyMatch } = await import("@/lib/company-lookup");
          const match = await bestCompanyMatch(order.customer.legalName);
          if (match?.active) {
            client = await db.counterparty.update({
              where: { id: client.id },
              data: {
                legalName: match.legalName || client.legalName,
                siren: match.siren,
                siret: match.siret,
                vatNumber: match.vatNumber,
                billingLine1: match.billingLine1,
                billingPostal: match.billingPostal,
                billingCity: match.billingCity,
                directorySyncedAt: new Date(),
              },
            });
          }
        } else if (order.customer.siren && !client.siren) {
          client = await db.counterparty.update({
            where: { id: client.id },
            data: { siren: order.customer.siren },
          });
        }

        const lines = order.lineItems.map((li) => ({
          description: li.title,
          quantity: li.quantity,
          unitPriceHt: li.priceHt,
          vatRate: li.vatRate,
        }));

        let subtotalHt = 0;
        let totalVat = 0;
        const lineRows = lines.map((line, index) => {
          const { lineTotalHt, lineVat } = computeLineTotals(line);
          subtotalHt += lineTotalHt;
          totalVat += lineVat;
          return {
            lineNumber: index + 1,
            description: line.description,
            quantity: line.quantity,
            unitPriceHt: line.unitPriceHt,
            vatRate: line.vatRate,
            lineTotalHt,
            lineVat,
          };
        });
        subtotalHt = Math.round(subtotalHt * 100) / 100;
        totalVat = Math.round(totalVat * 100) / 100;
        const totalTtc = Math.round((subtotalHt + totalVat) * 100) / 100;

        const issues = validateInvoiceDraft({
          buyerSiren: client.siren ?? order.customer.siren,
          operationCategory: "GOODS",
          deliveryDiffers: false,
          issueDate: order.createdAt,
          serviceDate: order.createdAt,
          lines,
          sellerSiren: workspace.organization.siren,
        });
        const blocking = issues.filter((i) => i.blocking);
        const status = blocking.length > 0 ? "BLOCKED" : "VALIDATED";

        const invoice = await db.$transaction(async (tx) => {
          let number: string | null = null;
          if (status === "VALIDATED") {
            let seq = await tx.invoiceSequence.findFirst({
              where: { organizationId: orgId, prefix: "WOO", fiscalYear: null },
            });
            if (!seq) {
              seq = await tx.invoiceSequence.create({
                data: {
                  organizationId: orgId,
                  prefix: "WOO",
                  nextNumber: 1,
                  padding: 4,
                },
              });
            }
            number = `${seq.prefix}-${String(seq.nextNumber).padStart(seq.padding, "0")}`;
            await tx.invoiceSequence.update({
              where: { id: seq.id },
              data: { nextNumber: seq.nextNumber + 1 },
            });
          } else {
            number = `WOO-TMP-${order.number}`;
          }

          return tx.invoice.create({
            data: {
              organizationId: orgId,
              counterpartyId: client!.id,
              direction: "SALE",
              type: "INVOICE",
              status,
              format: status === "VALIDATED" ? "FACTUR_X" : null,
              number,
              issueDate: new Date(order.createdAt),
              serviceDate: new Date(order.createdAt),
              buyerSiren: client!.siren ?? order.customer.siren,
              operationCategory: "GOODS",
              paymentTermsDays: 30,
              latePenaltyRate: 10.5,
              recoveryFeeAmount: 40,
              subtotalHt,
              totalVat,
              totalTtc,
              complianceScore:
                status === "VALIDATED" ? 95 : Math.max(0, 100 - blocking.length * 25),
              issuedAt: status === "VALIDATED" ? new Date() : null,
              sourceSystem: "woocommerce",
              sourceExternalId: order.id,
              purchaseOrderRef: `#${order.number}`,
              lines: { create: lineRows },
              validations: {
                create: issues.map((issue) => ({
                  code: issue.code,
                  message: issue.message,
                  severity: issue.severity,
                  field: issue.field ?? null,
                  blocking: issue.blocking,
                })),
              },
              lifecycleEvents: {
                create: {
                  status,
                  scope: "EMISSION",
                  source: "woocommerce-sync",
                  message:
                    status === "BLOCKED"
                      ? `Import Woo #${order.number} — bloquée`
                      : `Import Woo #${order.number} — prête`,
                },
              },
            },
          });
        });

        imported.push({
          invoiceId: invoice.id,
          orderName: `#${order.number}`,
          status,
          clientName: order.customer.legalName,
          amount: totalTtc,
          blockingCount: blocking.length,
        });
      }

      await db.merchantIntegration.update({
        where: { id: integration.id },
        data: {
          status: "CONNECTED",
          lastSyncAt: new Date(),
          lastError: null,
          importedCount: integration.importedCount + imported.length,
        },
      });

      return { success: true, error: null, imported, skipped };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync WooCommerce échouée.";
      await db.merchantIntegration.update({
        where: { id: integration.id },
        data: { status: "ERROR", lastError: message },
      });
      return { success: false, error: message, imported, skipped };
    }
  },
);

const PROVIDER_IDS: MerchantProviderId[] = [
  "SHOPIFY",
  "WOOCOMMERCE",
  "WIX",
  "PRESTASHOP",
  "GENERIC_HTTP",
  "MANUAL_UPLOAD",
  "API_PUSH",
];

/** Rectifier les sources choisies à l’inscription. */
export const updateSourceProviders = createServerFn({ method: "POST" })
  .validator((data: { providers: MerchantProviderId[] }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const providers = withManualUploadFallback(data.providers);
    if (providers.length === 0) {
      return {
        success: false as const,
        error: "Sélectionnez au moins une source (boutique, caisse, PDF…).",
      };
    }

    await db.organizationBridgeProfile.upsert({
      where: { organizationId: workspace.organization.id },
      create: {
        organizationId: workspace.organization.id,
        sourceProviders: providers,
      },
      update: { sourceProviders: providers },
    });

    await db.merchantIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId: workspace.organization.id,
          provider: "MANUAL_UPLOAD",
        },
      },
      create: {
        organizationId: workspace.organization.id,
        provider: "MANUAL_UPLOAD",
        status: "CONNECTED",
        shopLabel: "Chargement PDF (secours)",
        lastError: null,
        metadata: { authMode: "live", fallback: true },
      },
      update: {
        status: "CONNECTED",
        shopLabel: "Chargement PDF (secours)",
        lastError: null,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        action: "integration.sources.updated",
        entityType: "OrganizationBridgeProfile",
        metadata: { providers },
      },
    });

    return { success: true as const, error: null };
  });

/** Ajoute une source au catalogue (ne déconnecte jamais une autre). */
export const addSourceProvider = createServerFn({ method: "POST" })
  .validator((data: { provider: MerchantProviderId }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };
    if (!PROVIDER_IDS.includes(data.provider)) {
      return { success: false as const, error: "Source inconnue." };
    }

    const bridge = await db.organizationBridgeProfile.findUnique({
      where: { organizationId: workspace.organization.id },
    });
    const current = (bridge?.sourceProviders ?? []) as MerchantProviderId[];
    if (current.includes(data.provider)) {
      return { success: true as const, error: null, alreadyPresent: true as const };
    }

    const next = [...current, data.provider];
    await db.organizationBridgeProfile.upsert({
      where: { organizationId: workspace.organization.id },
      create: {
        organizationId: workspace.organization.id,
        sourceProviders: next,
      },
      update: { sourceProviders: next },
    });

    if (data.provider === "MANUAL_UPLOAD") {
      await db.merchantIntegration.upsert({
        where: {
          organizationId_provider: {
            organizationId: workspace.organization.id,
            provider: "MANUAL_UPLOAD",
          },
        },
        create: {
          organizationId: workspace.organization.id,
          provider: "MANUAL_UPLOAD",
          status: "CONNECTED",
          shopLabel: "Chargement PDF",
          metadata: { authMode: "live" },
        },
        update: { status: "CONNECTED", lastError: null },
      });
    }

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        action: "integration.source.added",
        entityType: "OrganizationBridgeProfile",
        metadata: { provider: data.provider },
      },
    });

    return { success: true as const, error: null, alreadyPresent: false as const };
  });

/**
 * Retire une source du catalogue.
 * Refusée si encore CONNECTED/SYNCING — il faut d’abord déconnecter.
 */
export const removeSourceProvider = createServerFn({ method: "POST" })
  .validator((data: { provider: MerchantProviderId; confirmText: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    if (data.provider === "MANUAL_UPLOAD") {
      return {
        success: false as const,
        error:
          "Le canal PDF est le filet de secours obligatoire — il ne peut pas être retiré du catalogue.",
      };
    }

    if (data.confirmText.trim().toUpperCase() !== "RETIRER") {
      return {
        success: false as const,
        error: "Confirmation invalide. Saisissez RETIRER pour valider.",
      };
    }

    const integration = await db.merchantIntegration.findUnique({
      where: {
        organizationId_provider: {
          organizationId: workspace.organization.id,
          provider: data.provider,
        },
      },
    });

    if (integration && (integration.status === "CONNECTED" || integration.status === "SYNCING")) {
      return {
        success: false as const,
        error: "Déconnectez d’abord cette source (procédure sécurisée), puis retirez-la.",
      };
    }

    const bridge = await db.organizationBridgeProfile.findUnique({
      where: { organizationId: workspace.organization.id },
    });
    const current = (bridge?.sourceProviders ?? []) as MerchantProviderId[];
    if (!current.includes(data.provider)) {
      return { success: true as const, error: null };
    }
    if (current.length <= 1) {
      return {
        success: false as const,
        error: "Impossible de retirer la dernière source. Ajoutez-en une autre avant.",
      };
    }

    await db.organizationBridgeProfile.update({
      where: { organizationId: workspace.organization.id },
      data: { sourceProviders: current.filter((p) => p !== data.provider) },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        action: "integration.source.removed",
        entityType: "OrganizationBridgeProfile",
        metadata: { provider: data.provider },
      },
    });

    return { success: true as const, error: null };
  });

export type PdfUploadFile = {
  filename: string;
  /** Contenu PDF en base64 (sans préfixe data:) */
  base64: string;
  byteSize: number;
};

/** Import PDF 1 ou N (max 10) → factures source manual_upload. */
export const uploadSourcePdfs = createServerFn({ method: "POST" })
  .validator((data: { files: PdfUploadFile[] }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { createHash } = await import("node:crypto");
    const { putStorageObject } = await import("@/api/storage/store");
    const { sourcePdfKey } = await import("@/api/storage/keys");

    const workspace = await loadWorkspace();
    if (!workspace) {
      return { success: false as const, error: "Session expirée.", imported: [] as string[] };
    }

    const files = (data.files ?? []).slice(0, 10);
    if (files.length === 0) {
      return {
        success: false as const,
        error: "Sélectionnez au moins un PDF.",
        imported: [] as string[],
      };
    }

    for (const f of files) {
      if (!f.filename.toLowerCase().endsWith(".pdf")) {
        return {
          success: false as const,
          error: `Fichier non PDF : ${f.filename}`,
          imported: [] as string[],
        };
      }
      if (f.byteSize > 12 * 1024 * 1024) {
        return {
          success: false as const,
          error: `PDF trop volumineux (> 12 Mo) : ${f.filename}`,
          imported: [] as string[],
        };
      }
    }

    const orgId = workspace.organization.id;

    await db.organizationBridgeProfile.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        sourceProviders: ["MANUAL_UPLOAD"],
      },
      update: {},
    });

    const bridge = await db.organizationBridgeProfile.findUnique({
      where: { organizationId: orgId },
    });
    if (bridge && !bridge.sourceProviders.includes("MANUAL_UPLOAD")) {
      await db.organizationBridgeProfile.update({
        where: { organizationId: orgId },
        data: {
          sourceProviders: [...bridge.sourceProviders, "MANUAL_UPLOAD"],
        },
      });
    }

    const integration = await db.merchantIntegration.upsert({
      where: {
        organizationId_provider: {
          organizationId: orgId,
          provider: "MANUAL_UPLOAD",
        },
      },
      create: {
        organizationId: orgId,
        provider: "MANUAL_UPLOAD",
        status: "CONNECTED",
        shopLabel: "Chargement PDF",
        metadata: { authMode: "live" },
      },
      update: {
        status: "CONNECTED",
        lastError: null,
      },
    });

    let placeholder = await db.counterparty.findFirst({
      where: {
        organizationId: orgId,
        legalName: "Client à identifier (PDF)",
        type: { in: ["CLIENT", "BOTH"] },
      },
    });
    if (!placeholder) {
      placeholder = await db.counterparty.create({
        data: {
          organizationId: orgId,
          type: "CLIENT",
          legalName: "Client à identifier (PDF)",
          email: null,
          siren: null,
        },
      });
    }

    const imported: string[] = [];
    const skippedDuplicates: string[] = [];

    for (const file of files) {
      // Empreinte contenu PDF (pas le nom) — un même fichier ne se charge jamais 2 fois
      const contentHash = createHash("sha256")
        .update(Buffer.from(file.base64, "base64"))
        .digest("hex");
      const externalId = `pdf-${contentHash.slice(0, 32)}`;

      const existing = await db.invoice.findFirst({
        where: {
          organizationId: orgId,
          sourceSystem: "manual_upload",
          sourceExternalId: externalId,
        },
        select: { id: true, number: true },
      });
      if (existing) {
        skippedDuplicates.push(`${file.filename} (déjà chargé comme ${existing.number})`);
        continue;
      }

      const invoice = await db.$transaction(async (tx) => {
        let seq = await tx.invoiceSequence.findFirst({
          where: { organizationId: orgId, prefix: "PDF", fiscalYear: null },
        });
        if (!seq) {
          seq = await tx.invoiceSequence.create({
            data: {
              organizationId: orgId,
              prefix: "PDF",
              nextNumber: 1,
              padding: 4,
            },
          });
        }
        const number = `${seq.prefix}-${String(seq.nextNumber).padStart(seq.padding, "0")}`;
        await tx.invoiceSequence.update({
          where: { id: seq.id },
          data: { nextNumber: seq.nextNumber + 1 },
        });

        const storageKey = sourcePdfKey(orgId, externalId);

        const created = await tx.invoice.create({
          data: {
            organizationId: orgId,
            counterpartyId: placeholder!.id,
            direction: "SALE",
            type: "INVOICE",
            status: "DRAFT",
            number,
            issueDate: new Date(),
            sourceSystem: "manual_upload",
            sourceExternalId: externalId,
            purchaseOrderRef: file.filename,
            pdfStorageKey: storageKey,
            subtotalHt: 0,
            totalVat: 0,
            totalTtc: 0,
            paymentTermsDays: 30,
            latePenaltyRate: 10.5,
            recoveryFeeAmount: 40,
            lines: {
              create: {
                lineNumber: 1,
                description: `PDF source · ${file.filename}`,
                quantity: 1,
                unitPriceHt: 0,
                vatRate: 20,
                lineTotalHt: 0,
                lineVat: 0,
              },
            },
            validations: {
              create: [
                {
                  code: "PDF_PENDING_ENRICHMENT",
                  message:
                    "PDF chargé — complétez client (SIREN), montants et lignes avant émission PA.",
                  severity: "WARNING",
                  field: null,
                  blocking: false,
                },
              ],
            },
            lifecycleEvents: {
              create: {
                status: "DRAFT",
                scope: "EMISSION",
                source: "manual-upload",
                message: `PDF importé · ${file.filename}`,
              },
            },
          },
        });

        return { created, storageKey };
      });

      await putStorageObject({
        organizationId: orgId,
        invoiceId: invoice.created.id,
        kind: "FACTURX_PDF",
        storageKey: invoice.storageKey,
        content: file.base64,
        filename: file.filename,
        metadata: {
          encoding: "base64",
          byteSize: file.byteSize,
          source: "manual_upload",
        },
      });

      imported.push(invoice.created.id);
    }

    await db.merchantIntegration.update({
      where: { id: integration.id },
      data: {
        lastSyncAt: new Date(),
        importedCount: integration.importedCount + imported.length,
        lastError: null,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: orgId,
        action: "integration.pdf.uploaded",
        entityType: "MerchantIntegration",
        entityId: integration.id,
        metadata: {
          count: imported.length,
          skippedDuplicates: skippedDuplicates.length,
          filenames: files.map((f) => f.filename),
        },
      },
    });

    if (imported.length === 0 && skippedDuplicates.length > 0) {
      return {
        success: false as const,
        error: `Doublon(s) refusé(s) — facture déjà chargée : ${skippedDuplicates.join(" · ")}`,
        imported: [] as string[],
        skippedDuplicates,
      };
    }

    return {
      success: true as const,
      error:
        skippedDuplicates.length > 0
          ? `${imported.length} importé(s), ${skippedDuplicates.length} doublon(s) ignoré(s).`
          : null,
      imported,
      skippedDuplicates,
    };
  });
