/**
 * Enforce one active PA per organization (product rule).
 * Keeps preferred slug / first non-sandbox connection; deactivates the rest.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, legalName: true } });

  for (const org of orgs) {
    const bridge = await prisma.organizationBridgeProfile.findUnique({
      where: { organizationId: org.id },
    });
    const active = await prisma.organizationPlatformConnection.findMany({
      where: { organizationId: org.id, isActive: true },
      include: { platform: true },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    const preferred = bridge?.preferredPlatformSlug?.trim().toLowerCase() ?? null;
    const keep =
      active.find((c) => preferred && c.platform.slug === preferred) ??
      active.find((c) => c.platform.slug !== "invoicepilot-sandbox") ??
      active[0] ??
      null;

    if (!keep) {
      console.log(org.legalName, "— no PA");
      continue;
    }

    const dropIds = active.filter((c) => c.id !== keep.id).map((c) => c.id);
    if (dropIds.length) {
      await prisma.organizationPlatformConnection.updateMany({
        where: { id: { in: dropIds } },
        data: { isActive: false, credentialsRef: null, metadata: {}, isDefault: false },
      });
    }

    await prisma.organizationBridgeProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        preferredPlatformSlug: keep.platform.slug,
        hasExistingPa: true,
        needsPaGuidance: false,
        sourceProviders: ["MANUAL_UPLOAD"],
      },
      update: {
        preferredPlatformSlug: keep.platform.slug,
        hasExistingPa: true,
        needsPaGuidance: false,
      },
    });

    await prisma.organizationPlatformConnection.update({
      where: { id: keep.id },
      data: { isDefault: true },
    });

    console.log(
      org.legalName,
      "→",
      keep.platform.slug,
      dropIds.length ? `(dropped ${dropIds.length})` : "",
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
