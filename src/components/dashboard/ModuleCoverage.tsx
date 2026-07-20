import { CheckCircle2, Circle } from "lucide-react";

import type { DashboardData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ModuleCoverage({ modules }: { modules: DashboardData["modules"] }) {
  const done = modules.filter((m) => m.done).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Couverture modules</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Vue transversale — {done}/{modules.length} prêts
          </p>
        </div>
        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-border/80">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((done / Math.max(modules.length, 1)) * 100)}%` }}
          />
        </div>
      </div>
      <div className="grid gap-px bg-border/50 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((mod) => (
          <a
            key={mod.id}
            href={mod.href}
            className="flex items-start gap-3 bg-card px-4 py-3.5 transition-colors hover:bg-muted/40"
          >
            {mod.done ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", !mod.done && "text-muted-foreground")}>
                {mod.label}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{mod.hint}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
