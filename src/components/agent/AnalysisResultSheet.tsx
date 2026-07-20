import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getAnalysisDetail, type AnalysisDetailSheet } from "@/fns/analysis-detail";
import type { AnalysisQueueVerdict } from "@/fns/clients";
import { cn } from "@/lib/utils";

const verdictLabel: Record<AnalysisQueueVerdict, string> = {
  A_ANALYSER: "À analyser",
  PASSE: "Passé",
  BLOQUE: "Bloqué",
  A_VALIDER: "À valider",
};

const verdictVariant: Record<
  AnalysisQueueVerdict,
  "secondary" | "success-light" | "destructive-light" | "warning-light"
> = {
  A_ANALYSER: "secondary",
  PASSE: "success-light",
  BLOQUE: "destructive-light",
  A_VALIDER: "warning-light",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Chargée",
  VALIDATING: "En analyse",
  BLOCKED: "Bloquée",
  VALIDATED: "Prête",
  TRANSMITTING: "Transmission",
  TRANSMITTED: "Transmise",
  REJECTED: "Rejetée",
  ARCHIVED: "Archivée",
};

type Props = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnalyze?: (invoiceId: string) => void;
  analyzing?: boolean;
};

/** Sheet résultat Analyse IA — chronologie, contrôles, prochaine action. */
export function AnalysisResultSheet({
  invoiceId,
  open,
  onOpenChange,
  onAnalyze,
  analyzing,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisDetailSheet | null>(null);

  useEffect(() => {
    if (!open || !invoiceId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getAnalysisDetail({ data: { invoiceId } }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.detail) {
        setError(res.error ?? "Détail introuvable.");
        return;
      }
      setDetail(res.detail);
    });

    return () => {
      cancelled = true;
    };
  }, [open, invoiceId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-4 text-left">
          <SheetTitle className="font-mono">{detail?.number ?? "Analyse IA"}</SheetTitle>
          <SheetDescription>
            Résultat, chronologie et dispatch — B2B → Émission · B2C → E-reporting.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Chargement…
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {detail ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={verdictVariant[detail.verdict]} size="sm">
                  {verdictLabel[detail.verdict]}
                </Badge>
                <Badge variant="outline" size="sm">
                  {STATUS_LABEL[detail.status] ?? detail.status}
                </Badge>
                {detail.score != null ? (
                  <Badge variant="secondary" size="sm">
                    Score {Math.round(detail.score)} %
                  </Badge>
                ) : null}
                {detail.dispatch === "emission" ? (
                  <Badge variant="success-light" size="sm">
                    → Émission PA
                  </Badge>
                ) : null}
                {detail.dispatch === "e-reporting" ? (
                  <Badge variant="info-light" size="sm">
                    → E-reporting
                  </Badge>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Client
                  </p>
                  <p className="mt-1 text-sm font-medium">{detail.clientName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {detail.clientSiren ?? "SIREN —"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Montant TTC
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {detail.amountTtc.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{detail.transactionType}</p>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border p-4",
                  detail.verdict === "PASSE"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : detail.verdict === "BLOQUE"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-primary/20 bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {detail.verdict === "PASSE" ? (
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                  ) : detail.verdict === "BLOQUE" ? (
                    <AlertTriangle className="mt-0.5 size-4 text-destructive" />
                  ) : (
                    <Sparkles className="mt-0.5 size-4 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{detail.nextAction.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail.nextAction.hint}</p>
                  </div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Contrôles</h3>
                {detail.validations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun contrôle enregistré — lancez l’analyse.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {detail.validations.map((v) => (
                      <li
                        key={v.id}
                        className="rounded-lg border border-border/60 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={v.blocking ? "destructive-light" : "secondary"} size="sm">
                            {v.blocking ? "Bloquant" : "Info"}
                          </Badge>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {v.code}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{v.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-3.5" />
                  Chronologie
                </h3>
                {detail.timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun événement.</p>
                ) : (
                  <ol className="space-y-3 border-l border-border/60 pl-4">
                    {[...detail.timeline].reverse().map((e) => (
                      <li key={e.id} className="relative">
                        <div className="absolute -left-[1.28rem] mt-1.5 size-2 rounded-full bg-primary/70" />
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" size="sm">
                            {STATUS_LABEL[e.status] ?? e.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(e.occurredAt).toLocaleString("fr-FR")}
                          </span>
                          <span className="text-[11px] text-muted-foreground">· {e.source}</span>
                        </div>
                        {e.message ? (
                          <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : null}
        </div>

        {detail ? (
          <SheetFooter className="border-t border-border/60 px-6 py-4 sm:justify-start">
            <div className="flex w-full flex-wrap gap-2">
              {detail.verdict === "A_ANALYSER" ||
              detail.verdict === "BLOQUE" ||
              detail.verdict === "A_VALIDER" ? (
                <Button disabled={analyzing} onClick={() => onAnalyze?.(detail.id)}>
                  {analyzing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {detail.verdict === "A_ANALYSER" ? "Analyser" : "Relancer l’analyse"}
                </Button>
              ) : null}
              {detail.nextAction.href ? (
                <Button variant="outline" asChild>
                  <Link to={detail.nextAction.href} onClick={() => onOpenChange(false)}>
                    {detail.nextAction.label} →
                  </Link>
                </Button>
              ) : null}
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
