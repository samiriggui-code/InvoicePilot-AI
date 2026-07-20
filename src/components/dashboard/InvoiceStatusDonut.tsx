import { Link } from "@tanstack/react-router";
import { Cell, Label, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { DashboardData } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  valid: "oklch(0.62 0.15 158)",
  blocked: "oklch(0.65 0.18 45)",
  pending: "oklch(0.62 0.14 268)",
  empty: "oklch(0.85 0.003 270)",
};

const STATUS_HINTS: Record<string, string> = {
  valid: "Prêtes à transmettre via PA",
  blocked: "Contrôles bloquants à corriger",
  pending: "Brouillons & validations en cours",
  empty: "Créez une première facture",
};

const pieConfig = {
  valid: { label: "Prêtes", color: STATUS_COLORS.valid },
  blocked: { label: "Bloquées", color: STATUS_COLORS.blocked },
  pending: { label: "En revue", color: STATUS_COLORS.pending },
  empty: { label: "Aucune facture", color: STATUS_COLORS.empty },
} satisfies ChartConfig;

export function InvoiceStatusDonut({
  data,
  total,
  stats,
}: {
  data: DashboardData["invoiceStatusPie"];
  total: number;
  stats: Pick<DashboardData["stats"], "validatedInvoices" | "blockedErrors" | "pendingReview">;
}) {
  const chartData = data.map((d) => ({
    ...d,
    fill: `var(--color-${d.key})`,
  }));

  const footerItems = [
    { key: "valid", label: "Prêtes", value: stats.validatedInvoices },
    { key: "blocked", label: "Bloquées", value: stats.blockedErrors },
    { key: "pending", label: "En revue", value: stats.pendingReview },
  ];

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold tracking-tight">Répartition des factures</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Statuts après contrôles mentions / Factur-X
        </p>
      </div>
      <div className="flex flex-1 flex-col px-3 pt-2 sm:px-5">
        <ChartContainer config={pieConfig} className="mx-auto aspect-square h-[220px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="key"
              innerRadius={58}
              outerRadius={84}
              strokeWidth={2}
              paddingAngle={chartData.length > 1 ? 2 : 0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? STATUS_COLORS.empty} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) - 6}
                          className="fill-foreground text-2xl font-semibold tabular-nums"
                        >
                          {total}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 16}
                          className="fill-muted-foreground text-[11px]"
                        >
                          factures
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="key" />} />
          </PieChart>
        </ChartContainer>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/60 py-3">
          {footerItems.map((item) => (
            <div key={item.key} className="min-w-0 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
                {item.value}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {STATUS_HINTS[item.key]}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-border/60 px-5 py-2.5 text-center sm:px-6">
        <Link
          to="/invoices"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Voir le cycle de vie →
        </Link>
      </div>
    </section>
  );
}
