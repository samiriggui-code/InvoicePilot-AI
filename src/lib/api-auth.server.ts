import { createHash, randomBytes } from "node:crypto";

const SANDBOX_KEYS = new Set(["ip_sandbox_demo", "ip_sandbox_test"]);

export type ApiAuthContext = {
  mode: "sandbox" | "live";
  organizationId: string | null;
  apiKeyId: string | null;
  keyPrefix: string | null;
};

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateLiveApiKey(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const raw = `ip_live_${secret}`;
  const prefix = raw.slice(0, 16);
  return { raw, prefix, hash: hashApiKey(raw) };
}

export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const headerKey = request.headers.get("x-api-key")?.trim();
  return bearer || headerKey || null;
}

/** Auth sandbox (clés démo) ou live (clés hashées en DB). */
export async function resolveApiAuth(request: Request): Promise<ApiAuthContext | null> {
  const key = extractApiKey(request);
  if (!key) return null;

  if (SANDBOX_KEYS.has(key)) {
    return {
      mode: "sandbox",
      organizationId: null,
      apiKeyId: null,
      keyPrefix: key.slice(0, 16),
    };
  }

  if (!key.startsWith("ip_live_")) return null;

  const { db } = await import("@/lib/db");
  const hash = hashApiKey(key);
  const row = await db.apiKey.findFirst({
    where: { keyHash: hash, revokedAt: null },
  });
  if (!row) return null;

  await db.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    mode: "live",
    organizationId: row.organizationId,
    apiKeyId: row.id,
    keyPrefix: row.keyPrefix,
  };
}
