import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";

import type { DashboardData } from "@/lib/types";

const ReactApexChart = lazy(() => import("react-apexcharts"));

function ChartSkeleton() {
  return <div className="h-[260px] animate-pulse rounded-lg bg-muted/40" />;
}

export function DashboardApexCharts({
  monthlyTrend,
  errorBreakdown,
}: {
  monthlyTrend: DashboardData["monthlyTrend"];
  errorBreakdown: DashboardData["errorBreakdown"];
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const months = monthlyTrend.map((m) => m.month);
  const revenueSeries = useMemo(
    () => [
      {
        name: "CA HT",
        data: monthlyTrend.map((m) => Math.round(m.revenueHt)),
      },
    ],
    [monthlyTrend],
  );

  const volumeCategories = useMemo(
    () => errorBreakdown.map((e) => (e.type.length > 22 ? `${e.type.slice(0, 22)}…` : e.type)),
    [errorBreakdown],
  );
  const volumeSeries = useMemo(
    () => [{ name: "Occurrences", data: errorBreakdown.map((e) => e.count) }],
    [errorBreakdown],
  );

  const revenueOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        fontFamily: "inherit",
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      colors: ["#3b6ef5"],
      grid: {
        borderColor: "#e2e8f0",
        strokeDashArray: 4,
        padding: { left: 8, right: 8 },
      },
      xaxis: {
        categories: months,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: "#64748b", fontSize: "12px" } },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748b", fontSize: "12px" },
          formatter: (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v)}`),
        },
      },
      tooltip: {
        y: {
          formatter: (v) =>
            `${Number(v).toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            })}`,
        },
      },
      legend: { show: false },
    }),
    [months],
  );

  const blockersOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "inherit",
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "48%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      colors: ["#3b6ef5"],
      grid: {
        borderColor: "#e2e8f0",
        strokeDashArray: 4,
        padding: { left: 4, right: 8 },
      },
      xaxis: {
        categories: volumeCategories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: "#64748b", fontSize: "11px" },
          rotate: volumeCategories.length > 3 ? -25 : 0,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        tickAmount: 4,
        labels: {
          style: { colors: "#64748b", fontSize: "12px" },
          formatter: (v) => `${Math.round(v)}`,
        },
      },
      tooltip: {
        y: { formatter: (v) => `${v} signal${Number(v) > 1 ? "s" : ""}` },
      },
      legend: { show: false },
    }),
    [volumeCategories],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight">CA HT mensuel</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Factures validées — 6 derniers mois
          </p>
        </div>
        <div className="px-2 pb-3 pt-2 sm:px-4">
          {ready ? (
            <Suspense fallback={<ChartSkeleton />}>
              <ReactApexChart
                type="area"
                height={260}
                series={revenueSeries}
                options={revenueOptions}
              />
            </Suspense>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight">Signaux bloquants</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Mentions, SIREN, TVA — volume par type
          </p>
        </div>
        <div className="px-2 pb-3 pt-2 sm:px-4">
          {ready ? (
            <Suspense fallback={<ChartSkeleton />}>
              <ReactApexChart
                type="bar"
                height={260}
                series={volumeSeries}
                options={blockersOptions}
              />
            </Suspense>
          ) : (
            <ChartSkeleton />
          )}
        </div>
      </section>
    </div>
  );
}
