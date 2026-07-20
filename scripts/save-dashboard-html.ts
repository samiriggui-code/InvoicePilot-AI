import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

const db = new PrismaClient();

async function main() {
  const user = await db.user.findUnique({ where: { email: "owner@dupont.fr" } });
  if (!user) throw new Error("no user");
  const token = randomBytes(32).toString("hex");
  await db.authSession.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const res = await fetch("http://localhost:8081/dashboard", {
    headers: { Cookie: `ip_session=${token}`, Accept: "text/html" },
  });
  const body = await res.text();
  writeFileSync("scripts/dash-body.html", body, "utf8");
  console.log("status", res.status, "len", body.length);
  for (const needle of [
    "didn't load",
    "1. Sources",
    "Sources",
    "Tableau de bord",
    "Dupont",
    "Préparation",
    "Preparation",
    "Comment",
    "error",
    "Error",
  ]) {
    console.log(needle, body.includes(needle));
  }
  await db.$disconnect();
}

main();
