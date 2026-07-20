import { createServerFn } from "@tanstack/react-start";

export type ApiKeyListItem = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export const listApiKeys = createServerFn({ method: "GET" }).handler(
  async (): Promise<ApiKeyListItem[]> => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return [];

    const rows = await db.apiKey.findMany({
      where: { organizationId: workspace.organization.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      keyPrefix: r.keyPrefix,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
    }));
  },
);

export const createApiKey = createServerFn({ method: "POST" })
  .validator((data: { name: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; rawKey: string; key: ApiKeyListItem } | { success: false; error: string }
    > => {
      const { loadWorkspace } = await import("@/lib/workspace.server");
      const { db } = await import("@/lib/db");
      const { generateLiveApiKey } = await import("@/lib/api-auth.server");

      const workspace = await loadWorkspace();
      if (!workspace) return { success: false, error: "Session expirée." };

      const name = data.name.trim() || "Clé API";
      const generated = generateLiveApiKey();

      const row = await db.apiKey.create({
        data: {
          organizationId: workspace.organization.id,
          name,
          keyPrefix: generated.prefix,
          keyHash: generated.hash,
        },
      });

      await db.auditLog.create({
        data: {
          organizationId: workspace.organization.id,
          userId: workspace.user.id,
          action: "api_key.created",
          entityType: "ApiKey",
          entityId: row.id,
          metadata: { prefix: generated.prefix },
        },
      });

      return {
        success: true,
        rawKey: generated.raw,
        key: {
          id: row.id,
          name: row.name,
          keyPrefix: row.keyPrefix,
          lastUsedAt: null,
          createdAt: row.createdAt.toISOString(),
          revokedAt: null,
        },
      };
    },
  );

export const revokeApiKey = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false, error: "Session expirée." };

    const row = await db.apiKey.findFirst({
      where: { id: data.id, organizationId: workspace.organization.id },
    });
    if (!row) return { success: false, error: "Clé introuvable." };

    await db.apiKey.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    return { success: true, error: null };
  });
