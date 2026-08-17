import { CheckCircle2, CircleDashed, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { ANALYSIS_PROGRESS_STEPS } from "@/lib/analysis-progress-steps";
import { cn } from "@/lib/utils";

type Props = {
  /** true = animation active (boucle). false = toutes les étapes cochées (fin). */
  running?: boolean;
  className?: string;
  /** Variante sombre (mock landing) ou claire (sheet app). */
  tone?: "dark" | "light";
};

/**
 * Bandeau « Agent IA — Analyse » + badge Progression temps réel.
 * Même liste d’étapes que le Hero landing.
 */
export function InvoiceAnalysisProgress({
  running = true,
  className,
  tone = "light",
}: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!running) {
      setActiveStep(ANALYSIS_PROGRESS_STEPS.length);
      return;
    }
    setActiveStep(0);
    const id = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % ANALYSIS_PROGRESS_STEPS.length);
    }, 1700);
    return () => window.clearInterval(id);
  }, [running]);

  const dark = tone === "dark";

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        dark
          ? "border-white/10 bg-white/5"
          : "border-border/60 bg-muted/30",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            dark ? "bg-primary/20" : "bg-primary/15",
          )}
        >
          <Shield className={cn("size-4", dark ? "text-primary" : "text-primary")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                dark ? "text-white/90" : "text-foreground",
              )}
            >
              Agent IA — {running ? "Analyse en cours" : "Analyse terminée"}
            </p>
            {running ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  dark
                    ? "border-sky-400/20 bg-sky-400/10 text-sky-200"
                    : "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
                )}
              >
                <Sparkles className="size-3" />
                Progression temps réel
              </span>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {ANALYSIS_PROGRESS_STEPS.map((label, index) => {
              const done = running ? index < activeStep : true;
              const current = running && index === activeStep;
              return (
                <div key={label} className="flex items-start gap-2 text-xs">
                  {done ? (
                    <CheckCircle2
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        dark ? "text-emerald-400" : "text-emerald-600 dark:text-emerald-400",
                      )}
                    />
                  ) : current ? (
                    <CircleDashed
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0 animate-spin",
                        dark ? "text-sky-300" : "text-sky-600 dark:text-sky-300",
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        "mt-1 size-2 shrink-0 rounded-full",
                        dark ? "bg-white/25" : "bg-muted-foreground/30",
                      )}
                    />
                  )}
                  <span
                    className={
                      done
                        ? dark
                          ? "text-white/80"
                          : "text-foreground/80"
                        : current
                          ? dark
                            ? "text-sky-100"
                            : "text-sky-800 dark:text-sky-200"
                          : dark
                            ? "text-white/45"
                            : "text-muted-foreground"
                    }
                  >
                    {label}
                    {done ? " ✓" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
