import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function credentialsKey(): Buffer {
  const secret = process.env.CREDENTIALS_SECRET ?? "invoicepilot-dev-credentials-key-change-me";
  return createHash("sha256").update(secret).digest();
}

/** Chiffre un secret (token API) pour stockage metadata — pas un vault prod. */
export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialsKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function openSecret(sealed: string): string | null {
  try {
    const [v, ivB64, tagB64, dataB64] = sealed.split(":");
    if (v !== "v1" || !ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      credentialsKey(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
