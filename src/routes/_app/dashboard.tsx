import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { CalendarClock, Network, Plug } from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { DashboardApexCharts } from "@/components/dashboard/DashboardApexCharts";
import { buildDashboardKpis } from "@/components/dashboard/DashboardKpis";
import { InvoiceStatusDonut } from "@/components/dashboard/InvoiceStatusDonut";
import { ModuleCoverage } from "@/components/dashboard/ModuleCoverage";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { ReceptionDataGrid } from "@/components/reception/ReceptionDataGrid";
import { ReceptionDetailSheet } from "@/components/reception/ReceptionDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardData } from "@/fns/dashboard-data";
import { importInboxDocument, getInboxData, markPurchaseReviewed } from "@/fns/pa-reception";
import { pageGuide } from "@/lib/page-guides";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Mon tableau de bord — InvoicePilot AI" }],
  }),
  loader: () => Promise.all([getDashboardData(), getInboxData()]),
  component: DashboardPage,
});

function DashboardPage() {
  const [data, inboxData] = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Impossible de charger le tableau de bord.</p>
      </AppPageShell>
    );
  }

  const next = data.readiness.nextActions[0];

  async function onImport(documentId: string) {
    setBusy("import-" + documentId);
    await importInboxDocument({ data: { documentId } });
    setBusy(null);
    await router.invalidate();
  }

  async function onReview(invoiceId: string, action: "approve" | "refuse") {
    setBusy(invoiceId + action);
    await markPurchaseReviewed({ data: { invoiceId, action } });
    setBusy(null);
    await router.invalidate();
    if (sheetId === invoiceId) setSheetKey((k) => k + 1);
  }

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

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-4 sm:px-6">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Ma réception PA</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Dernières factures fournisseurs reçues via la plateforme agréée
            </p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/inbox">Ouvrir la réception →</Link>
          </Button>
        </div>
        <div className="p-4 sm:p-5">
          <ReceptionDataGrid
            invoices={inboxData?.invoices ?? []}
            busy={busy}
            onOpen={setSheetId}
            onImport={(documentId) => void onImport(documentId)}
            onReview={(invoiceId, action) => void onReview(invoiceId, action)}
          />
        </div>
      </section>

      <ReceptionDetailSheet
        key={`${sheetId}-${sheetKey}`}
        invoiceId={sheetId}
        open={Boolean(sheetId)}
        onOpenChange={(open) => {
          if (!open) setSheetId(null);
        }}
        onReview={(id, action) => void onReview(id, action)}
        reviewing={
          busy === `${sheetId}approve` ? "approve" : busy === `${sheetId}refuse` ? "refuse" : null
        }
      />

      <PageGuide page="dashboard" />
    </AppPageShell>
  );
}
