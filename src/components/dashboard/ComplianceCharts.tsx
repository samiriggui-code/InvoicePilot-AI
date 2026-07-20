import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardData } from "@/lib/types";

const trendConfig = {
  score: { label: "Score (%)", color: "var(--primary)" },
  validated: { label: "Validées", color: "oklch(0.62 0.15 158)" },
  errors: { label: "Erreurs", color: "oklch(0.75 0.14 75)" },
} satisfies ChartConfig;

const errorConfig = {
  count: { label: "Occurrences", color: "var(--primary)" },
} satisfies ChartConfig;

export function ComplianceCharts({
  monthlyTrend,
  errorBreakdown,
}: {
  monthlyTrend: DashboardData["monthlyTrend"];
  errorBreakdown: DashboardData["errorBreakdown"];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight">Trajectoire conformité</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Score mensuel — qualité des contrôles avant envoi PA
          </p>
        </div>
        <div className="px-3 pb-4 pt-4 sm:px-5">
          <ChartContainer config={trendConfig} className="h-[260px] w-full">
            <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} domain={[0, 100]} width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--color-score)"
                strokeWidth={2.5}
                dot={{ r: 3.5, strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight">Signaux bloquants</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Mentions, SIREN, TVA — ce qui empêche la transmission
          </p>
        </div>
        <div className="px-3 pb-4 pt-4 sm:px-5">
          <ChartContainer config={errorConfig} className="h-[260px] w-full">
            <BarChart data={errorBreakdown} layout="vertical" margin={{ left: 8, right: 12 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-border/40"
              />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="type"
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ChartContainer>
        </div>
      </section>
    </div>
  );
}
