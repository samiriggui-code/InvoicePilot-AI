import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageKpiCards, type PageKpi } from "@/components/app/PageKpiCards";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageAction = {
  label: string;
  to?: string;
  href?: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary";
  onClick?: () => void;
};

export function AppPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** @deprecated Ignoré. */
  showStats?: boolean;
}) {
  return (
    <main
      className={cn(
        "app-page relative mx-auto px-4 py-6 sm:px-6 sm:py-7",
        className ?? "max-w-6xl",
      )}
    >
      <div className="relative space-y-5">{children}</div>
    </main>
  );
}

/**
 * Titre de page. KPIs optionnels — chaque page passe les siens via `kpis`.
 * Pas de KPI global automatique.
 */
export function AppPageHero({
  eyebrow,
  title,
  description,
  actions,
  meta,
  kpis,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: PageAction[];
  meta?: ReactNode;
  /** KPIs spécifiques à CETTE page, affichés sous le titre. */
  kpis?: PageKpi[];
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/80">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          {meta ? <div className="mt-2.5 flex flex-wrap gap-2">{meta}</div> : null}
        </div>
        {actions && actions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  {Icon ? <Icon className="size-4" /> : null}
                  {action.label}
                </>
              );
              if (action.to) {
                return (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant ?? "default"}
                    asChild
                  >
                    <Link to={action.to}>{content}</Link>
                  </Button>
                );
              }
              if (action.href) {
                return (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant ?? "default"}
                    asChild
                  >
                    <a href={action.href}>{content}</a>
                  </Button>
                );
              }
              return (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant ?? "default"}
                  onClick={action.onClick}
                >
                  {content}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>
      {kpis && kpis.length > 0 ? <PageKpiCards items={kpis} /> : null}
    </div>
  );
}
