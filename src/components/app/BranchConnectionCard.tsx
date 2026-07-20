import { Link } from "@tanstack/react-router";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BranchTone = "ok" | "warn" | "neutral" | "bad";

const toneBar: Record<BranchTone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  neutral: "bg-border",
  bad: "bg-destructive",
};

const toneBadge: Record<BranchTone, string> = {
  ok: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/10 text-amber-800 dark:text-amber-400",
  neutral: "bg-muted text-muted-foreground",
  bad: "bg-destructive/10 text-destructive",
};

const toneDot: Record<BranchTone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  neutral: "bg-muted-foreground/40",
  bad: "bg-destructive",
};

type LinkAction = {
  label: string;
  to: string;
};

type Props = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  statusLabel: string;
  tone: BranchTone;
  /** Lien unique en bas (pattern Conformité). */
  action?: LinkAction;
  /** Remplace le bouton lien (actions Brancher / Charger PDF…). */
  footer?: ReactNode;
  /** Contenu sous la description (ex. erreur sync). */
  children?: ReactNode;
  className?: string;
};

/**
 * Carte branchement unique — Conformité · Sources · Plateforme agréée.
 * Bandeau coloré + icône + badge statut + CTA.
 */
export function BranchConnectionCard({
  eyebrow,
  title,
  description,
  icon: Icon,
  iconClassName = "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  statusLabel,
  tone,
  action,
  footer,
  children,
  className,
}: Props) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-0.5", toneBar[tone])} />
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              iconClassName,
            )}
          >
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
              toneBadge[tone],
            )}
          >
            <span className={cn("size-1.5 rounded-full", toneDot[tone])} />
            {statusLabel}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {eyebrow}
          </p>
          <p className="text-lg font-semibold tracking-tight">{title}</p>
          {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        </div>

        {children}

        <div className="mt-auto pt-1">
          {footer ??
            (action ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-between gap-2 group-hover:border-primary/40"
                asChild
              >
                <Link to={action.to}>
                  {action.label}
                  <ArrowUpRight className="size-3.5 opacity-60" />
                </Link>
              </Button>
            ) : null)}
        </div>
      </div>
    </article>
  );
}

type SectionProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  gridClassName?: string;
  /** Bouton à droite du titre (ex. Ajouter). */
  headerAction?: ReactNode;
};

/** Grille + titre « Branchements ». */
export function BranchConnectionsSection({
  title = "Branchements",
  description = "Choix à l’inscription · état réel aujourd’hui",
  children,
  className,
  gridClassName,
  headerAction,
}: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {headerAction}
      </div>
      <div className={cn("grid gap-3 sm:grid-cols-2", gridClassName)}>{children}</div>
    </section>
  );
}
