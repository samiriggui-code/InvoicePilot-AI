import { createServerFn } from "@tanstack/react-start";

export const ORG_COOKIE = "ip_active_org";

export type MembershipItem = {
  organizationId: string;
  legalName: string;
  tradeName: string | null;
  siren: string;
  role: string;
  isActive: boolean;
};

export const listMemberships = createServerFn({ method: "GET" }).handler(
  async (): Promise<MembershipItem[]> => {
    const { resolveSessionUser } = await import("@/lib/auth-server.server");
    const { db } = await import("@/lib/db");
    const { loadWorkspace } = await import("@/lib/workspace.server");

    const user = await resolveSessionUser();
    if (!user) return [];

    const workspace = await loadWorkspace();
    const rows = await db.organizationMember.findMany({
      where: { userId: user.id, archivedAt: null },
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((m) => ({
      organizationId: m.organizationId,
      legalName: m.organization.legalName,
      tradeName: m.organization.tradeName,
      siren: m.organization.siren,
      role: m.role,
      isActive: workspace?.organization.id === m.organizationId,
    }));
  },
);

export const switchOrganization = createServerFn({ method: "POST" })
  .validator((data: { organizationId: string }) => data)
  .handler(async ({ data }) => {
    const { resolveSessionUser } = await import("@/lib/auth-server.server");
    const { db } = await import("@/lib/db");
    const { setCookie } = await import("@tanstack/react-start/server");

    const user = await resolveSessionUser();
    if (!user) return { success: false, error: "Session expirée." };

    const membership = await db.organizationMember.findFirst({
      where: { userId: user.id, organizationId: data.organizationId },
    });
    if (!membership) {
      return { success: false, error: "Dossier inaccessible." };
    }

    setCookie(ORG_COOKIE, data.organizationId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return { success: true, error: null };
  });
