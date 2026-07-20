import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Archive, Mail, Shield, Users } from "lucide-react";

import { AppPageShell } from "@/components/app/AppPageHero";
import { PageKpiCards } from "@/components/app/PageKpiCards";
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from "@/components/metronic/toolbar";
import { listTeamMembers } from "@/fns/team";
import { pageGuide } from "@/lib/page-guides";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/team")({
  loader: () => listTeamMembers(),
  component: TeamLayout,
});

const SUBNAV = [
  { to: "/team" as const, label: "Membres", exact: false, matchPrefix: "/team" },
  { to: "/team/roles" as const, label: "Rôles", exact: false, matchPrefix: "/team/roles" },
  {
    to: "/team/permissions" as const,
    label: "Permissions",
    exact: false,
    matchPrefix: "/team/permissions",
  },
];

/** Layout utilisateurs — sous-pages hors sidebar (comme billing). */
function TeamLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMemberProfile = pathname.startsWith("/team/members/");
  const data = Route.useLoaderData();
  const active = data.members.filter((m) => !m.archivedAt).length;
  const archived = data.members.filter((m) => m.archivedAt).length;
  const admins = data.members.filter(
    (m) => !m.archivedAt && (m.role === "OWNER" || m.role === "ADMIN"),
  ).length;

  return (
    <AppPageShell className="max-w-none">
      <div className="flex w-full flex-col gap-5 lg:gap-7">
        <Toolbar>
          <ToolbarHeading>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Compte · Équipe
            </p>
            <ToolbarPageTitle text={isMemberProfile ? "Profil membre" : "Mon équipe"} />
            <ToolbarDescription>
              {isMemberProfile
                ? "Fiche du membre dans votre organisation."
                : pageGuide("team").blurb}
            </ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {SUBNAV.map((item) => {
                const isActive =
                  item.to === "/team"
                    ? pathname === "/team" ||
                      pathname === "/team/" ||
                      pathname.startsWith("/team/members/")
                    : pathname.startsWith(item.matchPrefix);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ToolbarActions>
        </Toolbar>

        {!isMemberProfile ? (
          <PageKpiCards
            items={[
              {
                label: "Membres actifs",
                value: String(active),
                hint: "Comptes non archivés",
                icon: Users,
              },
              {
                label: "Invitations",
                value: String(data.invites.length),
                hint: "En attente d’acceptation",
                icon: Mail,
                alert: data.invites.length > 0,
              },
              {
                label: "Admins",
                value: String(admins),
                hint: "Owner + Admin",
                icon: Shield,
              },
              {
                label: "Archivés",
                value: String(archived),
                hint: "Soft-delete org",
                icon: Archive,
              },
            ]}
          />
        ) : null}

        <Outlet />
      </div>
    </AppPageShell>
  );
}
