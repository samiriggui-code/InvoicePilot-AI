import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  try {
    const org = await db.organization.findFirst({ where: { siren: "512345678" } });
    console.log("org", org?.legalName, org?.id);
    if (!org) return;

    const inv = await db.invoice.count({ where: { organizationId: org.id } });
    console.log("invoices", inv);

    const pa = await db.organizationPlatformConnection.findFirst({
      where: { organizationId: org.id, isActive: true },
      include: { platform: true },
    });
    console.log("pa", pa?.platform?.name);

    const so = await db.storageObject.count();
    console.log("storageObjects", so);

    const pj = await db.pipelineJob.count();
    console.log("pipelineJobs", pj);

    // Mimic dashboard query that might fail
    const validations = await db.invoiceValidation.groupBy({
      by: ["message"],
      where: {
        blocking: true,
        invoice: { organizationId: org.id },
      },
      _count: { message: true },
      orderBy: { _count: { message: "desc" } },
      take: 5,
    });
    console.log("validations groupBy ok", validations.length);
  } catch (e) {
    console.error("DB ERROR", e);
  } finally {
    await db.$disconnect();
  }
}

main();
