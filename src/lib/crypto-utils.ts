import { createHash, randomBytes, randomInt } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}
