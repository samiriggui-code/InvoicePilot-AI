import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Bell, BellRing, CheckCheck, TriangleAlert } from "lucide-react";

import { AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { PageKpiCards } from "@/components/app/PageKpiCards";
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from "@/components/metronic/toolbar";
import { NotificationsDataGrid } from "@/components/notifications/NotificationsDataGrid";
import { getNotificationCounts } from "@/fns/notifications";
import { pageGuide } from "@/lib/page-guides";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: search.view === "alerts" ? ("alerts" as const) : ("all" as const),
  }),
  loader: () => getNotificationCounts(),
  head: () => ({ meta: [{ title: "Notifications — InvoicePilot AI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { view } = Route.useSearch();
  const counts = Route.useLoaderData();
  const router = useRouter();
  const alertsOnly = view === "alerts";
  const guide = pageGuide("notifications");

  return (
    <AppPageShell className="max-w-none">
      <div className="flex w-full flex-col gap-5 lg:gap-7">
        <Toolbar>
          <ToolbarHeading>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Compte · Centre d’alertes
            </p>
            <ToolbarPageTitle text={alertsOnly ? "Alertes" : "Notifications"} />
            <ToolbarDescription>{guide.blurb}</ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <Link
                to="/notifications"
                search={{ view: "all" }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  !alertsOnly
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Toutes
              </Link>
              <Link
                to="/notifications"
                search={{ view: "alerts" }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  alertsOnly
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Alertes
              </Link>
            </nav>
          </ToolbarActions>
        </Toolbar>

        <PageKpiCards
          items={[
            {
              label: "Total",
              value: String(counts.total),
              hint: "Messages in-app",
              icon: Bell,
            },
            {
              label: "Non lus",
              value: String(counts.unread),
              hint: "À traiter",
              icon: BellRing,
              alert: counts.unread > 0,
            },
            {
              label: "Alertes",
              value: String(counts.alerts),
              hint: "WARNING + ALERT non lus",
              icon: TriangleAlert,
              alert: counts.alerts > 0,
            },
            {
              label: "Lues",
              value: String(counts.read),
              hint: "Déjà consultées",
              icon: CheckCheck,
            },
          ]}
        />

        <NotificationsDataGrid
          alertsOnly={alertsOnly}
          onChanged={() => {
            void router.invalidate();
          }}
        />

        <PageGuide page="notifications" />
      </div>
    </AppPageShell>
  );
}
