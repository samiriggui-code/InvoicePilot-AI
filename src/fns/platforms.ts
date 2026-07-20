import { createServerFn } from "@tanstack/react-start";
import type { Prisma } from "@prisma/client";

import {
  canConnectionTransmit,
  getPaPartnerMeta,
  parseCredentialsMode,
  type PaConnectCapability,
} from "@/lib/pa-partners";

export type PlatformConnectionItem = {
  id: string;
  label: string | null;
  purpose: string;
  isDefault: boolean;
  isActive: boolean;
  lastSyncAt: string | null;
  credentialsMode: "sandbox" | "declared" | "apikey" | "unknown";
  canTransmit: boolean;
  platform: {
    id: string;
    name: string;
    slug: string;
    dgfipReference: string | null;
  };
};

export type ApprovedPlatformItem = {
  id: string;
  name: string;
  slug: string;
  dgfipReference: string | null;
  isActive: boolean;
  websiteUrl: string | null;
  apiDocsUrl: string | null;
  capability: PaConnectCapability;
  authHint: string;
  canTransmit: boolean;
};

export type PlatformsPageData = {
  preferredSlug: string | null;
  paPurpose: "EMISSION" | "RECEPTION" | "BOTH";
  /** La PA unique du client (choix inscription ou connexion active). */
  platform: ApprovedPlatformItem | null;
  connection: PlatformConnectionItem | null;
};

export const getPlatformsData = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformsPageData | null> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return null;

    const orgId = workspace.organization.id;

    const [bridge, connections] = await Promise.all([
      db.organizationBridgeProfile.findUnique({
        where: { organizationId: orgId },
        select: { preferredPlatformSlug: true, paPurpose: true },
      }),
      db.organizationPlatformConnection.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          platform: {
            select: {
              id: true,
              name: true,
              slug: true,
              dgfipReference: true,
              websiteUrl: true,
              apiDocsUrl: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      }),
    ]);

    const preferredSlug = bridge?.preferredPlatformSlug?.trim().toLowerCase() || null;
    const paPurpose = (bridge?.paPurpose ?? "BOTH") as PlatformsPageData["paPurpose"];

    // Une seule PA métier : priorité au choix inscription, sinon connexion active (hors sandbox)
    const primaryConn =
      connections.find(
        (c) =>
          preferredSlug &&
          c.platform.slug === preferredSlug &&
          c.platform.slug !== "invoicepilot-sandbox",
      ) ??
      connections.find((c) => c.platform.slug !== "invoicepilot-sandbox") ??
      null;

    let platformRow = primaryConn?.platform ?? null;
    if (!platformRow && preferredSlug) {
      platformRow = await db.approvedPlatform.findFirst({
        where: {
          isActive: true,
          OR: [{ slug: preferredSlug }, { name: { contains: preferredSlug, mode: "insensitive" } }],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          dgfipReference: true,
          websiteUrl: true,
          apiDocsUrl: true,
          isActive: true,
        },
      });
    }

    function toItem(p: NonNullable<typeof platformRow>): ApprovedPlatformItem {
      const meta = getPaPartnerMeta(p.slug);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        dgfipReference: p.dgfipReference,
        isActive: p.isActive,
        websiteUrl: p.websiteUrl,
        apiDocsUrl: p.apiDocsUrl ?? meta.docsUrl ?? null,
        capability: meta.capability,
        authHint: meta.authHint,
        canTransmit: meta.canTransmit,
      };
    }

    const connection: PlatformConnectionItem | null = primaryConn
      ? {
          id: primaryConn.id,
          label: primaryConn.label,
          purpose: primaryConn.purpose,
          isDefault: primaryConn.isDefault,
          isActive: primaryConn.isActive,
          lastSyncAt: primaryConn.lastSyncAt?.toISOString() ?? null,
          credentialsMode: parseCredentialsMode(primaryConn.credentialsRef),
          canTransmit: canConnectionTransmit(primaryConn.credentialsRef),
          platform: {
            id: primaryConn.platform.id,
            name: primaryConn.platform.name,
            slug: primaryConn.platform.slug,
            dgfipReference: primaryConn.platform.dgfipReference,
          },
        }
      : null;

    return {
      preferredSlug: preferredSlug ?? platformRow?.slug ?? null,
      paPurpose,
      platform: platformRow ? toItem(platformRow) : null,
      connection,
    };
  },
);

export type ConnectPlatformInput = {
  platformId: string;
  purpose: "EMISSION" | "RECEPTION" | "BOTH";
  /** sandbox | partner_api | declare_only — must match platform capability */
  mode: "sandbox" | "partner_api" | "declare_only";
  /** Clé générique (Seqino, B2Brouter…) */
  apiKey?: string;
  /** Qonto OAuth — Bearer access token (scope client_invoice.write / einvoicing.read) */
  qontoAccessToken?: string;
  /** Refresh token optionnel (offline_access) */
  qontoRefreshToken?: string;
  /** staging | production — e-invoicing réseau = production only */
  qontoEnv?: "staging" | "production";
};

export const connectPlatform = createServerFn({ method: "POST" })
  .validator((data: ConnectPlatformInput) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { sha256 } = await import("@/lib/crypto-utils");
    const { sealSecret } = await import("@/lib/secret-seal");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const platform = await db.approvedPlatform.findFirst({
      where: { id: data.platformId, isActive: true },
    });
    if (!platform) return { success: false as const, error: "Plateforme introuvable." };

    if (platform.slug === "invoicepilot-sandbox") {
      return {
        success: false as const,
        error: "Le sandbox n’est plus exposé ici. Une seule PA client par organisation.",
      };
    }

    const meta = getPaPartnerMeta(platform.slug);

    const bridge = await db.organizationBridgeProfile.findUnique({
      where: { organizationId: workspace.organization.id },
      select: { preferredPlatformSlug: true },
    });
    const preferred = bridge?.preferredPlatformSlug?.trim().toLowerCase() ?? null;
    if (preferred && preferred !== platform.slug) {
      return {
        success: false as const,
        error: `Votre PA est « ${preferred} ». Changez-la avant de brancher une autre.`,
      };
    }

    // Toute PA client : déclaration OU credentials API (générique / Qonto)
    if (data.mode === "sandbox") {
      return { success: false as const, error: "Mode sandbox local désactivé sur Plateforme." };
    }
    if (data.mode !== "partner_api" && data.mode !== "declare_only") {
      return { success: false as const, error: "Mode de connexion invalide." };
    }

    let credentialsRef: string;
    let metadata: Prisma.InputJsonObject | undefined;

    if (data.mode === "declare_only") {
      credentialsRef = "mode:declared";
    } else if (platform.slug === "qonto") {
      const accessToken = data.qontoAccessToken?.trim() ?? "";
      const refreshToken = data.qontoRefreshToken?.trim() ?? "";
      if (accessToken.length < 16) {
        return {
          success: false as const,
          error:
            "Qonto : access token OAuth requis (Bearer). Scopes utiles : client_invoice.write, einvoicing.read.",
        };
      }
      credentialsRef = `mode:apikey:${sha256(accessToken)}`;
      metadata = {
        authMode: "qonto_oauth",
        env: data.qontoEnv === "staging" ? "staging" : "production",
        sealedAccessToken: sealSecret(accessToken),
        ...(refreshToken.length > 8 ? { sealedRefreshToken: sealSecret(refreshToken) } : {}),
        note: "Auth OAuth Bearer. E-invoicing réseau = production only. Flux : bulk Factur-X → send_by_einvoice.",
      };
    } else {
      const key = data.apiKey?.trim() ?? "";
      if (key.length < 8) {
        return {
          success: false as const,
          error: "Clé API ou token Bearer requis (min. 8 caractères).",
        };
      }
      credentialsRef = `mode:apikey:${sha256(key)}`;
      metadata = {
        authMode: "generic_bearer_or_key",
        sealedKey: sealSecret(key),
        apiMaturity: meta.apiMaturity,
        note:
          meta.apiMaturity === "unknown" || meta.apiMaturity === "saas_user_api"
            ? "Credentials scellés — connecteur d’émission spécifique à valider pour cette PA."
            : "Credentials scellés — prêt pour connecteur partenaire.",
      };
    }

    const existing = await db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: workspace.organization.id,
        platformId: platform.id,
        purpose: data.purpose,
      },
    });

    // Une PA active max — désactive les autres (y compris sandbox)
    await db.organizationPlatformConnection.updateMany({
      where: {
        organizationId: workspace.organization.id,
        isActive: true,
        ...(existing ? { id: { not: existing.id } } : {}),
      },
      data: { isActive: false, credentialsRef: null, metadata: {}, isDefault: false },
    });

    await db.organizationBridgeProfile.upsert({
      where: { organizationId: workspace.organization.id },
      create: {
        organizationId: workspace.organization.id,
        preferredPlatformSlug: platform.slug,
        paPurpose: data.purpose,
        hasExistingPa: true,
        needsPaGuidance: false,
      },
      update: {
        preferredPlatformSlug: platform.slug,
        paPurpose: data.purpose,
        hasExistingPa: true,
        needsPaGuidance: false,
      },
    });

    if (existing) {
      await db.organizationPlatformConnection.update({
        where: { id: existing.id },
        data: {
          credentialsRef,
          isActive: true,
          isDefault: canConnectionTransmit(credentialsRef),
          lastSyncAt: null,
          label: connectionLabel(platform.name, data.purpose, data.mode),
          ...(metadata ? { metadata } : {}),
        },
      });
      return { success: true as const, error: null };
    }

    await db.organizationPlatformConnection.create({
      data: {
        organizationId: workspace.organization.id,
        platformId: platform.id,
        purpose: data.purpose,
        label: connectionLabel(platform.name, data.purpose, data.mode),
        isDefault: canConnectionTransmit(credentialsRef),
        isActive: true,
        credentialsRef,
        lastSyncAt: null,
        ...(metadata ? { metadata } : {}),
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        userId: workspace.user.id,
        action: "pa.connected",
        entityType: "OrganizationPlatformConnection",
        metadata: { slug: platform.slug, mode: data.mode, purpose: data.purpose },
      },
    });

    return { success: true as const, error: null };
  });

/**
 * Changer la PA unique de l’organisation (slug inscription).
 * Déconnecte l’ancienne. Confirmation DECONNECTER requise si une API était branchée.
 */
export const changePreferredPa = createServerFn({ method: "POST" })
  .validator((data: { slug: string; name?: string; confirmText?: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { getPaPartnerMeta } = await import("@/lib/pa-partners");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée." };

    const slug = data.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    if (slug.length < 2) {
      return { success: false as const, error: "Choisissez une PA dans la liste." };
    }
    if (slug === "invoicepilot-sandbox") {
      return { success: false as const, error: "Choisissez une PA client, pas le sandbox." };
    }

    const activeApi = await db.organizationPlatformConnection.findFirst({
      where: {
        organizationId: workspace.organization.id,
        isActive: true,
        credentialsRef: { startsWith: "mode:apikey" },
      },
    });
    if (activeApi && (data.confirmText ?? "").trim().toUpperCase() !== "DECONNECTER") {
      return {
        success: false as const,
        error: "Une API est branchée. Confirmez avec DECONNECTER pour changer de PA.",
        needsConfirm: true as const,
        capability: null as string | null,
      };
    }

    const displayName =
      data.name?.trim() ||
      slug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    let platform = await db.approvedPlatform.findFirst({
      where: {
        isActive: true,
        OR: [{ slug }, { name: { equals: displayName, mode: "insensitive" } }],
      },
    });
    if (!platform) {
      platform = await db.approvedPlatform.create({
        data: {
          slug,
          name: displayName,
          isActive: true,
          websiteUrl: null,
          apiDocsUrl: getPaPartnerMeta(slug).docsUrl ?? null,
        },
      });
    }

    await db.organizationPlatformConnection.updateMany({
      where: { organizationId: workspace.organization.id, isActive: true },
      data: { isActive: false, credentialsRef: null, metadata: {}, isDefault: false },
    });

    await db.organizationBridgeProfile.upsert({
      where: { organizationId: workspace.organization.id },
      create: {
        organizationId: workspace.organization.id,
        preferredPlatformSlug: platform.slug,
        hasExistingPa: true,
        needsPaGuidance: false,
      },
      update: {
        preferredPlatformSlug: platform.slug,
        hasExistingPa: true,
        needsPaGuidance: false,
      },
    });

    await db.organizationPlatformConnection.create({
      data: {
        organizationId: workspace.organization.id,
        platformId: platform.id,
        purpose: "BOTH",
        label: `${platform.name} — déclarée`,
        isDefault: false,
        isActive: true,
        credentialsRef: "mode:declared",
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        userId: workspace.user.id,
        action: "pa.preferred_changed",
        entityType: "OrganizationBridgeProfile",
        metadata: { slug: platform.slug },
      },
    });

    const meta = getPaPartnerMeta(platform.slug);
    return {
      success: true as const,
      error: null,
      needsConfirm: false as const,
      capability: meta.capability,
      platformId: platform.id,
      slug: platform.slug,
    };
  });

export const disconnectPlatform = createServerFn({ method: "POST" })
  .validator((data: { connectionId: string; confirmText: string }) => data)
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

    const conn = await db.organizationPlatformConnection.findFirst({
      where: { id: data.connectionId, organizationId: workspace.organization.id },
      include: { platform: { select: { slug: true, name: true } } },
    });
    if (!conn) return { success: false as const, error: "Connexion introuvable." };

    // Coupe l’API mais garde la déclaration (PA unique du client)
    await db.organizationPlatformConnection.update({
      where: { id: conn.id },
      data: {
        credentialsRef: "mode:declared",
        metadata: {},
        isDefault: false,
        label: `${conn.platform.name} — déclarée`,
      },
    });

    await db.auditLog.create({
      data: {
        organizationId: workspace.organization.id,
        userId: workspace.user.id,
        action: "pa.disconnected",
        entityType: "OrganizationPlatformConnection",
        entityId: conn.id,
        metadata: { slug: conn.platform.slug, confirmed: true },
      },
    });

    return { success: true as const, error: null };
  });

/**
 * Test de connexion PA — Qonto : GET /v2/einvoicing/settings (Bearer OAuth).
 * Pas de faux succès : HTTP réel ou erreur claire.
 */
export const testPaConnection = createServerFn({ method: "POST" })
  .validator((data: { connectionId: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");
    const { openSecret } = await import("@/lib/secret-seal");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false as const, error: "Session expirée.", detail: null };

    const conn = await db.organizationPlatformConnection.findFirst({
      where: {
        id: data.connectionId,
        organizationId: workspace.organization.id,
        isActive: true,
      },
      include: { platform: true },
    });
    if (!conn) return { success: false as const, error: "Connexion introuvable.", detail: null };

    if (conn.platform.slug === "invoicepilot-sandbox") {
      return {
        success: true as const,
        error: null,
        detail: "Sandbox local InvoicePilot — canal technique OK (pas de dépôt réseau PA).",
      };
    }

    if (conn.platform.slug !== "qonto") {
      return {
        success: false as const,
        error: `Test auto non branché pour ${conn.platform.name}. Vérifiez la doc partenaire.`,
        detail: null,
      };
    }

    const meta =
      conn.metadata && typeof conn.metadata === "object"
        ? (conn.metadata as {
            sealedAccessToken?: string;
            sealedLogin?: string;
            sealedSecret?: string;
            env?: string;
          })
        : {};

    let accessToken = meta.sealedAccessToken ? openSecret(meta.sealedAccessToken) : null;
    if (!accessToken && meta.sealedSecret) {
      accessToken = openSecret(meta.sealedSecret);
    }
    if (!accessToken) {
      return {
        success: false as const,
        error: "Token OAuth Qonto introuvable — reconnectez via le panneau (Bearer).",
        detail: null,
      };
    }

    const base =
      meta.env === "staging"
        ? "https://thirdparty-sandbox.qonto.com"
        : "https://thirdparty.qonto.com";

    try {
      const res = await fetch(`${base}/v2/einvoicing/settings`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await res.text().catch(() => "");
      if (!res.ok) {
        return {
          success: false as const,
          error: `Qonto a refusé l’auth (HTTP ${res.status}). Token expiré ou scope einvoicing.read manquant.`,
          detail: body.slice(0, 240) || null,
        };
      }
      let sending: string | undefined;
      try {
        const json = JSON.parse(body) as { sending_status?: string };
        sending = json.sending_status;
      } catch {
        /* ignore */
      }
      await db.organizationPlatformConnection.update({
        where: { id: conn.id },
        data: { lastSyncAt: new Date() },
      });
      return {
        success: true as const,
        error: null,
        detail: `Auth Qonto OK (${meta.env === "staging" ? "staging" : "production"})${
          sending ? ` — envoi e-invoicing : ${sending}` : ""
        }. Réseau PA = production only.`,
      };
    } catch (e) {
      return {
        success: false as const,
        error: e instanceof Error ? e.message : "Appel Qonto impossible.",
        detail: null,
      };
    }
  });

/**
 * Sonde émission Qonto — vérifie l’auth puis documente le flux PAaaS
 * sans inventer un envoi réussi (bulk + send_by_einvoice = prod réelle).
 */
export const probePaEmission = createServerFn({ method: "POST" })
  .validator((data: { connectionId: string }) => data)
  .handler(async ({ data }) => {
    const test = await testPaConnection({ data: { connectionId: data.connectionId } });
    if (!test.success) {
      return {
        success: false as const,
        error: test.error,
        steps: [] as string[],
      };
    }

    return {
      success: true as const,
      error: null,
      steps: [
        "1. Auth OK — GET /v2/einvoicing/settings (scope einvoicing.read)",
        "2. Import Factur-X/UBL/CII — POST /v2/client_invoices/bulk → client_invoice_id",
        "3. Émission réseau PA — POST /v2/client_invoices/{id}/send_by_einvoice (prod, scope client_invoice.write)",
        "4. Suivi — GET /v2/client_invoices/{id}",
        "5. Réception — GET /v2/supplier_invoices",
        "6. Prérequis destinataire — client.e_invoicing_reachable = true",
      ],
    };
  });

function connectionLabel(
  name: string,
  purpose: string,
  mode: ConnectPlatformInput["mode"],
): string {
  const p = purpose === "BOTH" ? "Achats & ventes" : purpose === "EMISSION" ? "Ventes" : "Achats";
  const m = mode === "sandbox" ? "Sandbox" : mode === "partner_api" ? "API partenaire" : "Déclarée";
  return `${name} — ${p} (${m})`;
}
