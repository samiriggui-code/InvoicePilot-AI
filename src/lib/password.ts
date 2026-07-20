import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;

  try {
    const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const key = Buffer.from(keyHex, "hex");
    if (derived.length !== key.length) return false;
    return timingSafeEqual(derived, key);
  } catch {
    return false;
  }
}
