import { Link } from "@tanstack/react-router";
import { Check, CheckCircle2, Clock, Inbox, Loader2, X, XCircle } from "lucide-react";
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
import {
  getReceptionDetail,
  type ReceptionDecision,
  type ReceptionDetailSheet,
} from "@/fns/reception-detail";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Reçue",
  APPROVED: "Approuvée",
  REFUSED: "Refusée",
  ARCHIVED: "Archivée",
  REJECTED: "Rejetée",
};

const decisionVariant: Record<
  ReceptionDecision,
  "secondary" | "success-light" | "destructive-light" | "warning-light"
> = {
  A_TRAITER: "warning-light",
  APPROUVEE: "success-light",
  REFUSEE: "destructive-light",
  AUTRE: "secondary",
};

type Props = {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReview?: (invoiceId: string, action: "approve" | "refuse") => void;
  reviewing?: "approve" | "refuse" | null;
};

/** Sheet détail réception PA — décision acheteur + chronologie + rappel flux. */
export function ReceptionDetailSheet({
  invoiceId,
  open,
  onOpenChange,
  onReview,
  reviewing,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReceptionDetailSheet | null>(null);

  useEffect(() => {
    if (!open || !invoiceId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getReceptionDetail({ data: { invoiceId } }).then((res) => {
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
        <SheetHeader className="border-b border-border/60 px-6 py-4 pr-12 text-left">
          <SheetTitle className="font-mono">{detail?.number ?? "Réception PA"}</SheetTitle>
          <SheetDescription>Décision acheteur, statut PA et chronologie.</SheetDescription>
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
                <Badge variant={decisionVariant[detail.decision]} size="sm">
                  {detail.decisionLabel}
                </Badge>
                <Badge variant="outline" size="sm">
                  {STATUS_LABEL[detail.status] ?? detail.status}
                </Badge>
                {detail.paStatusLabel ? (
                  <Badge variant="outline" size="sm">
                    PA · {detail.paStatusLabel}
                  </Badge>
                ) : null}
              </div>

              <div
                className={cn(
                  "rounded-xl border p-4",
                  detail.decision === "APPROUVEE"
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : detail.decision === "REFUSEE"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-primary/20 bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {detail.decision === "APPROUVEE" ? (
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                  ) : detail.decision === "REFUSEE" ? (
                    <XCircle className="mt-0.5 size-4 text-destructive" />
                  ) : (
                    <Inbox className="mt-0.5 size-4 text-primary" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">{detail.decisionLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{detail.decisionHint}</p>
                    {detail.paStatusMessage ? (
                      <p className="mt-2 text-xs text-muted-foreground">{detail.paStatusMessage}</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fournisseur
                  </p>
                  <p className="mt-1 text-sm font-medium">{detail.supplierName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {detail.supplierSiren ?? "SIREN —"}
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
                  <p className="text-[11px] text-muted-foreground">
                    {detail.platformName ?? "PA"}
                    {detail.paReference ? ` · ${detail.paReference}` : ""}
                  </p>
                </div>
              </div>

              <section className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-4">
                <h3 className="text-sm font-semibold">Émission vs réception</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Émission :</span>{" "}
                  {detail.flowExplain.emission}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Réception :</span>{" "}
                  {detail.flowExplain.reception}
                </p>
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
              {detail.decision === "A_TRAITER" && onReview ? (
                <>
                  <Button
                    disabled={Boolean(reviewing)}
                    onClick={() => onReview(detail.id, "approve")}
                  >
                    {reviewing === "approve" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Approuver
                  </Button>
                  <Button
                    variant="outline"
                    disabled={Boolean(reviewing)}
                    onClick={() => onReview(detail.id, "refuse")}
                  >
                    {reviewing === "refuse" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <X className="size-4" />
                    )}
                    Refuser
                  </Button>
                </>
              ) : null}
              <Button variant="outline" asChild>
                <Link
                  to="/inbox/$id"
                  params={{ id: detail.id }}
                  onClick={() => onOpenChange(false)}
                >
                  Page complète →
                </Link>
              </Button>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
