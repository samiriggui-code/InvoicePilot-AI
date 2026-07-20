import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type PageKpi = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  /** true = alerte visuelle (ambre) */
  alert?: boolean;
  accent?: string;
  iconClass?: string;
};

const DEFAULT_ACCENTS = [
  {
    accent: "from-sky-500/15 to-transparent",
    iconClass: "text-sky-700 dark:text-sky-400",
  },
  {
    accent: "from-emerald-500/15 to-transparent",
    iconClass: "text-emerald-700 dark:text-emerald-400",
  },
  {
    accent: "from-amber-500/15 to-transparent",
    iconClass: "text-amber-700 dark:text-amber-400",
  },
  {
    accent: "from-violet-500/10 to-transparent",
    iconClass: "text-muted-foreground",
  },
] as const;

/**
 * KPI cards — dimensions figées sur le modèle dashboard.
 * Toutes les pages partagent la même hauteur / typo / padding.
 */
export function PageKpiCards({ items, className }: { items: PageKpi[]; className?: string }) {
  if (items.length === 0) return null;

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item, index) => {
        const tone = DEFAULT_ACCENTS[index % DEFAULT_ACCENTS.length]!;
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={cn(
              "relative h-[116px] overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-xs",
              item.alert && "border-amber-500/30",
            )}
          >
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br",
                item.alert ? "from-amber-500/15 to-transparent" : (item.accent ?? tone.accent),
              )}
            />
            <div className="relative flex h-full items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 truncate text-2xl font-semibold leading-none tracking-tight tabular-nums">
                  {item.value}
                </p>
                <p className="mt-2 truncate text-xs leading-none text-muted-foreground">
                  {item.hint}
                </p>
              </div>
              <div className="shrink-0 rounded-lg border border-border/50 bg-background/70 p-2">
                <Icon
                  className={cn(
                    "size-4",
                    item.alert
                      ? "text-amber-700 dark:text-amber-400"
                      : (item.iconClass ?? tone.iconClass),
                  )}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
