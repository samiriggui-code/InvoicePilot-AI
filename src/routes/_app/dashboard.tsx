import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Network, Plug } from "lucide-react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { DashboardApexCharts } from "@/components/dashboard/DashboardApexCharts";
import { buildDashboardKpis } from "@/components/dashboard/DashboardKpis";
import { InvoiceStatusDonut } from "@/components/dashboard/InvoiceStatusDonut";
import { InvoiceTable } from "@/components/dashboard/InvoiceTable";
import { ModuleCoverage } from "@/components/dashboard/ModuleCoverage";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/fns/dashboard-data";
import { pageGuide } from "@/lib/page-guides";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Mon tableau de bord — InvoicePilot AI" }],
  }),
  loader: () => getDashboardData(),
  component: DashboardPage,
});

function DashboardPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Impossible de charger le tableau de bord.</p>
      </AppPageShell>
    );
  }

  const next = data.readiness.nextActions[0];

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Pilotage"
        title="Mon tableau de bord"
        description={`${data.organizationName} — ${pageGuide("dashboard").blurb}`}
        actions={
          next
            ? [
                {
                  label: next.label,
                  href: next.href as
                    | "/platforms"
                    | "/invoices"
                    | "/invoices/new"
                    | "/clients"
                    | "/clients/new"
                    | "/compliance"
                    | "/e-reporting"
                    | "/integrations",
                  icon: next.href.includes("platform")
                    ? Network
                    : next.href.includes("integration")
                      ? Plug
                      : undefined,
                },
              ]
            : [{ label: "Mon émission PA", href: "/invoices", icon: Plug }]
        }
        meta={
          <>
            <Badge variant="secondary">
              Réception dans {data.readiness.daysToReceiveDeadline} j
            </Badge>
            <Badge variant={data.readiness.paConnected ? "default" : "outline"}>
              {data.readiness.paConnected ? `PA · ${data.readiness.paName}` : "PA non connectée"}
            </Badge>
            <Badge variant="outline">Score {data.stats.complianceScore || "—"} %</Badge>
          </>
        }
        kpis={buildDashboardKpis(data.stats)}
      />

      {!data.readiness.paConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <Network className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold">PA non connectée</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Sans plateforme agréée, pas d’émission ni de réception légale.
              </p>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link to="/platforms">Connecter une plateforme</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <InvoiceStatusDonut
          data={data.invoiceStatusPie}
          total={data.stats.totalInvoices}
          stats={data.stats}
        />
        <RecentActivityFeed items={data.recentActivity} />
      </div>

      <DashboardApexCharts monthlyTrend={data.monthlyTrend} errorBreakdown={data.errorBreakdown} />

      <ModuleCoverage modules={data.modules} />

      {data.reformAlerts.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {data.reformAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
                alert.urgency === "critical" && "border-destructive/30 bg-destructive/10",
                alert.urgency === "warning" && "border-amber-500/25 bg-amber-500/10",
                alert.urgency === "info" && "border-border bg-muted/40",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.detail}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link to={alert.href}>{alert.daysLeft} j</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <InvoiceTable invoices={data.recentInvoices} />

      <PageGuide page="dashboard" />
    </AppPageShell>
  );
}
