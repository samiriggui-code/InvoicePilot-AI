import { ArrowRight, CalendarClock, Network, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MissionControl({
  orgName,
  role,
  score,
  readiness,
}: {
  orgName: string;
  role: string;
  score: number;
  readiness: DashboardData["readiness"];
}) {
  const scoreTone =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 60
        ? "text-amber-600"
        : "text-destructive";

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="relative grid gap-0 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="relative border-b border-border/60 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,_oklch(0.68_0.15_268_/_0.12),_transparent_55%)]"
          />
          <div className="relative">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="size-3" />
                Pilotage e-invoicing 2026
              </Badge>
              <Badge variant="outline" className="font-normal">
                {role}
              </Badge>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">{orgName}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {readiness.topInsight}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Signal
                icon={CalendarClock}
                label="Réception obligatoire"
                value={`${readiness.daysToReceiveDeadline} j`}
                hint={readiness.receiveDeadlineLabel}
                tone={readiness.daysToReceiveDeadline <= 60 ? "warn" : "ok"}
              />
              <Signal
                icon={Network}
                label="Plateforme agréée"
                value={readiness.paConnected ? "Connectée" : "Manquante"}
                hint={readiness.paName ?? "Aucune PA active"}
                tone={readiness.paConnected ? "ok" : "danger"}
              />
              <Signal
                icon={ShieldAlert}
                label="Checklist réforme"
                value={`${readiness.checklistProgress} %`}
                hint={
                  readiness.emitDeadlineLabel
                    ? `Émission : ${readiness.emitDeadlineLabel}`
                    : "Diagnostic pour personnaliser"
                }
                tone={readiness.checklistProgress >= 70 ? "ok" : "warn"}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 bg-muted/20 p-6 sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Score conformité
            </p>
            <div className="mt-3 flex items-end gap-3">
              <span className={cn("text-5xl font-semibold tabular-nums tracking-tight", scoreTone)}>
                {score || "—"}
              </span>
              <span className="mb-2 text-lg text-muted-foreground">%</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border/80">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, score || 0)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Mentions 2026 · Factur-X · contrôles avant envoi PA
            </p>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Prochaines actions
            </p>
            <ul className="space-y-1.5">
              {readiness.nextActions.map((action) => (
                <li key={action.label}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-between gap-2 px-2 py-2 text-left text-sm font-medium",
                      action.urgent && "text-amber-800 hover:bg-amber-500/10 dark:text-amber-200",
                    )}
                    asChild
                  >
                    <a href={action.href}>
                      <span className="min-w-0 truncate">{action.label}</span>
                      <ArrowRight className="size-3.5 shrink-0 opacity-60" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Signal({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof CalendarClock;
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "warn" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-3.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-semibold tracking-tight",
          tone === "ok" && "text-emerald-700 dark:text-emerald-400",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
