import { resolveSessionUser } from "@/lib/auth-server.server";
import { db } from "@/lib/db";
import { daysUntil, type WorkspaceContext } from "@/lib/types";

export async function loadWorkspace(): Promise<WorkspaceContext | null> {
  const user = await resolveSessionUser();
  if (!user) return null;

  const { readActiveOrgCookie } = await import("@/lib/org-cookie.server");
  const preferredOrgId = readActiveOrgCookie();

  let membership = preferredOrgId
    ? await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: preferredOrgId,
          archivedAt: null,
        },
        include: {
          organization: { include: { subscription: true } },
        },
      })
    : null;

  if (!membership) {
    membership = await db.organizationMember.findFirst({
      where: { userId: user.id, archivedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        organization: { include: { subscription: true } },
      },
    });
  }

  if (!membership) return null;

  const org = membership.organization;
  let sub = org.subscription;
  const { isDemoOrganization } = await import("@/lib/demo-org");

  // Essai local écoulé sans paiement Stripe → suspension (UNPAID)
  if (
    sub?.status === "TRIALING" &&
    sub.trialEndsAt &&
    sub.trialEndsAt.getTime() <= Date.now() &&
    !sub.stripeSubscriptionId
  ) {
    sub = await db.subscription.update({
      where: { id: sub.id },
      data: { status: "UNPAID" },
    });
  }

  const trialDaysLeft = sub?.status === "TRIALING" ? daysUntil(sub.trialEndsAt) : null;

  return {
    user,
    organization: {
      id: org.id,
      legalName: org.legalName,
      tradeName: org.tradeName,
      siren: org.siren,
      siret: org.siret,
      size: org.size,
      vatRegime: org.vatRegime,
      complianceScore: org.complianceScore ? Number(org.complianceScore) : null,
      role: membership.role,
      isDemo: isDemoOrganization(org),
    },
    subscription: sub
      ? {
          plan: sub.plan,
          status: sub.status,
          trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          stripeLinked: Boolean(sub.stripeCustomerId || sub.stripeSubscriptionId),
        }
      : null,
    trialDaysLeft,
  };
}
