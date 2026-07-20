import { Bot, CheckCircle2, Circle, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Bandeau « Agent IA — Analyse » — même promesse que le mockup landing. */
export function AgentAnalysisPanel({ checks }: { checks: { label: string; ok: boolean }[] }) {
  const allOk = checks.length > 0 && checks.every((c) => c.ok);
  const running = checks.some((c) => !c.ok);

  return (
    <div className="rounded-xl border border-border/70 bg-card p-1 shadow-xs">
      <div className="rounded-lg bg-muted/40 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-red-400/80" />
          <div className="size-2.5 rounded-full bg-yellow-400/80" />
          <div className="size-2.5 rounded-full bg-green-400/80" />
          <span className="ml-2 text-xs text-muted-foreground">dashboard.invoicepilot.ai</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/80 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15">
                <Shield className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  Agent IA — {allOk ? "Flux conforme" : running ? "Analyse en cours" : "En attente"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {checks.map((c) => (
                    <li
                      key={c.label}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      {c.ok ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="size-3.5 shrink-0 text-amber-500" />
                      )}
                      <span className={cn(c.ok && "text-foreground/80")}>
                        {c.label}
                        {c.ok ? " ✓" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" asChild>
              <a href="/agent">
                <Bot className="size-3.5" />
                Ouvrir l&apos;analyse documents
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
