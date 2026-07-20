/**
 * Purge factures / clients mock (SHOP-*, seed-*, Demo, Test Rejet…).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.invoice.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "seed-" } },
        { counterpartyId: { startsWith: "seed-" } },
        { number: { startsWith: "SHOP-" } },
        { number: { startsWith: "WOO-" } },
        { number: { in: ["FAC-0001", "FAC-0002", "FAC-0003", "FAC-0005"] } },
        { sourceExternalId: { startsWith: "gid://shopify/Order/" } },
        { sourceExternalId: { startsWith: "woo-" } },
        {
          counterparty: {
            OR: [
              { legalName: { contains: "Demo", mode: "insensitive" } },
              { legalName: { contains: "Test Rejet", mode: "insensitive" } },
              { legalName: { contains: "sandbox", mode: "insensitive" } },
            ],
          },
        },
      ],
    },
  });

  const cps = await prisma.counterparty.deleteMany({
    where: {
      OR: [
        { id: { startsWith: "seed-" } },
        { legalName: { contains: "Demo", mode: "insensitive" } },
        { legalName: { contains: "Test Rejet", mode: "insensitive" } },
        { legalName: { contains: "Maison Dupuis", mode: "insensitive" } },
      ],
    },
  });

  console.log("invoices deleted:", deleted.count);
  console.log("counterparties deleted:", cps.count);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
