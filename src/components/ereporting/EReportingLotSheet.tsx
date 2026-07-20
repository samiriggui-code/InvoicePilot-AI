import { Link } from "@tanstack/react-router";
import { CheckCircle2, Info, Loader2, Send } from "lucide-react";
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
import { getEReportingLotDetail, type EReportingLotDetail } from "@/fns/e-reporting";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prêt à déposer",
  pending_pa: "PA requise",
  submitted: "Déposé PA",
  transmitted: "Transmis",
  rejected: "Rejeté PA",
};

type Props = {
  entryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransmit?: (entryId: string) => void;
  transmitting?: boolean;
};

/** Sheet lot e-reporting — lignes avant envoi PA (pas de réception). */
export function EReportingLotSheet({
  entryId,
  open,
  onOpenChange,
  onTransmit,
  transmitting,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<EReportingLotDetail | null>(null);

  useEffect(() => {
    if (!open || !entryId) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getEReportingLotDetail({ data: { entryId } }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.detail) {
        setError(res.error ?? "Lot introuvable.");
        return;
      }
      setDetail(res.detail);
    });

    return () => {
      cancelled = true;
    };
  }, [open, entryId]);

  const canTransmit =
    detail &&
    !detail.transmittedAt &&
    detail.lines.length > 0 &&
    detail.status !== "transmitted" &&
    detail.status !== "rejected";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-4 pr-12 text-left">
          <SheetTitle>Lot e-reporting</SheetTitle>
          <SheetDescription>
            {detail
              ? `${new Date(detail.periodStart).toLocaleDateString("fr-FR")} → ${new Date(detail.periodEnd).toLocaleDateString("fr-FR")}`
              : "Aperçu des lignes avant dépôt PA"}
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
                <Badge
                  variant={
                    detail.status === "ready"
                      ? "success-light"
                      : detail.status === "rejected" || detail.status === "pending_pa"
                        ? "destructive-light"
                        : "secondary"
                  }
                  size="sm"
                >
                  {STATUS_LABEL[detail.status] ?? detail.status}
                </Badge>
                <Badge variant="outline" size="sm">
                  {detail.lines.length} ligne(s)
                </Badge>
                <Badge variant="outline" size="sm">
                  {detail.totalTtc.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </Badge>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
                    <p>{detail.flowExplain.whatItIs}</p>
                    <p>
                      <span className="font-medium text-foreground">Pas de réception :</span>{" "}
                      {detail.flowExplain.noReception}
                    </p>
                  </div>
                </div>
              </div>

              {detail.paStatusMessage || detail.paReference ? (
                <div className="rounded-lg border border-border/60 p-3 text-sm">
                  {detail.paReference ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      Réf. {detail.paReference}
                    </p>
                  ) : null}
                  {detail.paStatusMessage ? (
                    <p className="mt-1 text-muted-foreground">{detail.paStatusMessage}</p>
                  ) : null}
                </div>
              ) : null}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Factures du lot</h3>
                {detail.lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Lot vide — aucune vente B2C / export / intra-UE sur la période. Vérifiez Analyse
                    IA (type de transaction).
                  </p>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                    {detail.lines.map((l) => (
                      <li key={l.invoiceId || l.number} className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium">{l.number}</p>
                            <p className="truncate text-xs text-muted-foreground">{l.client}</p>
                          </div>
                          <div className="text-end">
                            <p className="text-sm tabular-nums">
                              {l.totalTtc.toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </p>
                            <div className="mt-0.5 flex flex-wrap justify-end gap-1">
                              <Badge variant="outline" size="sm">
                                {l.transactionLabel}
                              </Badge>
                              {l.analyzed ? (
                                <Badge variant="success-light" size="sm">
                                  Analysée
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          ) : null}
        </div>

        {detail ? (
          <SheetFooter className="border-t border-border/60 px-6 py-4 sm:justify-start">
            <div className="flex w-full flex-wrap gap-2">
              {canTransmit && onTransmit ? (
                <Button disabled={transmitting} onClick={() => onTransmit(detail.id)}>
                  {transmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Transmettre via PA
                </Button>
              ) : detail.transmittedAt ? (
                <Badge variant="success-light" className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Déjà transmis
                </Badge>
              ) : null}
              <Button variant="outline" asChild>
                <Link to="/agent" onClick={() => onOpenChange(false)}>
                  Analyse IA
                </Link>
              </Button>
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
