import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CalendarDays, CreditCard, Gauge, Timer } from "lucide-react";

import { AppPageShell } from "@/components/app/AppPageHero";
import { PageKpiCards } from "@/components/app/PageKpiCards";
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from "@/components/metronic/toolbar";
import { pageGuide } from "@/lib/page-guides";
import { daysUntil, planLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/billing")({
  component: BillingLayout,
});

const SUBNAV = [
  { to: "/billing" as const, label: "Vue d’ensemble", exact: true },
  { to: "/billing/plans" as const, label: "Plans", exact: false },
  { to: "/billing/history" as const, label: "Historique", exact: false },
];

function BillingLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { workspace } = Route.useRouteContext();
  const sub = workspace.subscription;
  const trialDays = workspace.trialDaysLeft;
  const periodDays = daysUntil(sub?.currentPeriodEnd);

  return (
    <AppPageShell className="max-w-6xl">
      <div className="flex flex-col gap-5 lg:gap-7">
        <Toolbar>
          <ToolbarHeading>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Compte · Abonnement
            </p>
            <ToolbarPageTitle text="Mon abonnement" />
            <ToolbarDescription>{pageGuide("billing").blurb}</ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <nav className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {SUBNAV.map((item) => {
                const active = item.exact
                  ? pathname === item.to || pathname === `${item.to}/`
                  : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
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

        <PageKpiCards
          items={[
            {
              label: "Plan",
              value: sub ? planLabel(sub.plan) : "—",
              hint: "Offre SaaS",
              icon: CreditCard,
            },
            {
              label: "Statut",
              value: sub?.status ?? "—",
              hint: sub?.status === "TRIALING" ? "Période d’essai" : "Abonnement",
              icon: Gauge,
              alert: sub?.status === "PAST_DUE" || sub?.status === "UNPAID",
            },
            {
              label: "Essai restant",
              value: trialDays != null ? `${trialDays} j` : "—",
              hint: "Jours avant fin d’essai",
              icon: Timer,
              alert: trialDays != null && trialDays <= 7,
            },
            {
              label: "Période",
              value: periodDays != null ? `${periodDays} j` : "—",
              hint: sub?.currentPeriodEnd
                ? `Fin ${new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}`
                : "Pas de période Stripe",
              icon: CalendarDays,
            },
          ]}
        />

        <Outlet />
      </div>
    </AppPageShell>
  );
}
