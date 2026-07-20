/**
 * Crée une session démo et GET /dashboard pour capturer l’erreur SSR.
 */
import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const db = new PrismaClient();
const COOKIE = "ip_session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function main() {
  const user = await db.user.findUnique({ where: { email: "owner@dupont.fr" } });
  if (!user) {
    console.error("user missing — run npm run db:seed");
    process.exit(1);
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.authSession.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const cookie = `${COOKIE}=${token}; Path=/; HttpOnly`;
  console.log("session created for", user.email);

  const res = await fetch("http://localhost:8081/dashboard", {
    headers: { Cookie: cookie, Accept: "text/html" },
    redirect: "manual",
  });

  console.log("status", res.status);
  console.log("location", res.headers.get("location"));
  const body = await res.text();
  console.log("body length", body.length);
  console.log("title match", body.match(/<title>[^<]+<\/title>/)?.[0]);
  console.log("has error phrase", body.includes("didn't load"));
  console.log("has Process nav", body.includes("1. Sources"));
  console.log("has journey", body.includes("Comment") && body.includes("marche"));
  console.log(
    "has prep",
    body.includes("r\u00e9forme") || body.includes("rforme") || body.includes("2026"),
  );
  if (body.includes("didn't load") || body.includes("unhandled") || body.includes("HTTPError")) {
    console.log("--- ERROR PAGE DETECTED ---");
    console.log(body.slice(0, 1500));
  } else {
    console.log("OK snippet", body.slice(0, 500).replace(/\s+/g, " "));
  }

  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
