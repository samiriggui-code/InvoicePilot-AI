import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Check, FileText, Inbox, Loader2, Radio, X } from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { InvoiceDetail } from "@/fns/invoice-remediation";
import { markPurchaseReviewed } from "@/fns/pa-reception";
import { PA_STATUS_LABELS } from "@/lib/pa-status";
import type { PaTransmissionStatus } from "@prisma/client";

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Reçue",
  APPROVED: "Approuvée",
  REFUSED: "Refusée",
  ARCHIVED: "Archivée",
  REJECTED: "Rejetée",
};

/**
 * Détail réception fournisseur — pleine largeur, distinct de l’émission PA.
 */
export function PurchaseReceptionDetail({ detail: initial }: { detail: InvoiceDetail }) {
  const router = useRouter();
  const [detail, setDetail] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paLabel =
    detail.paStatus && detail.paStatus in PA_STATUS_LABELS
      ? PA_STATUS_LABELS[detail.paStatus as PaTransmissionStatus]
      : detail.paStatus;

  async function onReview(action: "approve" | "refuse") {
    setBusy(action);
    setError(null);
    const res = await markPurchaseReviewed({ data: { invoiceId: detail.id, action } });
    if (!res.success) {
      setError(res.error);
      setBusy(null);
      return;
    }
    setBusy(null);
    await router.invalidate();
    setDetail({
      ...detail,
      status: action === "approve" ? "APPROVED" : "REFUSED",
      paStatus: action === "approve" ? "ACCEPTED_BY_PA" : "REFUSED",
      paStatusMessage:
        action === "approve" ? "Facture fournisseur approuvée." : "Facture fournisseur refusée.",
    });
  }

  return (
    <AppPageShell className="max-w-none w-full">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild className="-ms-2 gap-1.5 text-muted-foreground">
          <Link to="/inbox">
            <ArrowLeft className="size-3.5" />
            Ma réception PA
          </Link>
        </Button>
      </div>

      <AppPageHero
        eyebrow="Flux · Réception PA"
        title={detail.number ?? "Document fournisseur"}
        description="Facture reçue via votre plateforme agréée — consultation, statut réseau et décision d’approbation."
        meta={
          <>
            <Badge variant={detail.status === "REFUSED" ? "destructive" : "secondary"}>
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Badge>
            {paLabel ? (
              <Badge variant="outline" className="text-[10px]">
                PA · {paLabel}
              </Badge>
            ) : null}
            {detail.paReference ? (
              <Badge variant="outline" className="font-mono text-[10px]">
                {detail.paReference}
              </Badge>
            ) : null}
            {detail.format ? <Badge variant="outline">{detail.format}</Badge> : null}
          </>
        }
        kpis={[
          {
            label: "Fournisseur",
            value: detail.client?.legalName ?? "—",
            hint: detail.client?.siren ? `SIREN ${detail.client.siren}` : "Sans SIREN",
            icon: Inbox,
          },
          {
            label: "Montant TTC",
            value: detail.totalTtc.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            }),
            hint: `HT ${detail.subtotalHt.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`,
            icon: FileText,
          },
          {
            label: "Date",
            value: detail.issueDate ? new Date(detail.issueDate).toLocaleDateString("fr-FR") : "—",
            hint: "Date d’émission fournisseur",
            icon: Radio,
          },
          {
            label: "Canal",
            value: detail.platformName ?? "PA",
            hint: "Plateforme agréée",
            icon: Radio,
          },
        ]}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {detail.paStatusMessage ? (
        <Alert>
          <Radio className="size-4" />
          <AlertTitle>Message PA</AlertTitle>
          <AlertDescription>{detail.paStatusMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contenu reçu</CardTitle>
              <CardDescription>
                Document structuré et métadonnées remontés par la PA — ce n’est pas une facture
                d’émission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fournisseur
                  </p>
                  <p className="mt-1.5 text-base font-medium">{detail.client?.legalName ?? "—"}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {detail.client?.siren ? `SIREN ${detail.client.siren}` : "SIREN inconnu"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Acheteur (vous)
                  </p>
                  <p className="mt-1.5 text-base font-medium">{detail.seller.legalName}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    SIREN {detail.seller.siren}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Total HT
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums">
                    {detail.subtotalHt.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    TVA
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums">
                    {detail.totalVat.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-primary/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Total TTC
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums">
                    {detail.totalTtc.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </p>
                </div>
              </div>

              {detail.lines.length > 0 ? (
                <ul className="divide-y overflow-hidden rounded-lg border border-border/60">
                  <li className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_6.5rem] gap-2 bg-muted/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Description</span>
                    <span className="text-right">Qté</span>
                    <span className="text-right">PU HT</span>
                    <span className="text-right">Total HT</span>
                  </li>
                  {detail.lines.map((l) => (
                    <li
                      key={l.id}
                      className="grid grid-cols-[minmax(0,1fr)_4.5rem_6.5rem_6.5rem] gap-2 px-4 py-2.5"
                    >
                      <span className="min-w-0 truncate">{l.description}</span>
                      <span className="text-right tabular-nums">{l.quantity}</span>
                      <span className="text-right tabular-nums">
                        {l.unitPriceHt.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                      <span className="text-right font-medium tabular-nums">
                        {l.lineTotalHt.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">
                  Pas de lignes détaillées en base — le document structuré / PDF est porté par la
                  PA.
                </p>
              )}
            </CardContent>
          </Card>

          {detail.status === "RECEIVED" ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Décision</CardTitle>
                <CardDescription>Approuvez ou refusez cette facture fournisseur.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button disabled={Boolean(busy)} onClick={() => onReview("approve")}>
                  {busy === "approve" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  disabled={Boolean(busy)}
                  onClick={() => onReview("refuse")}
                >
                  {busy === "refuse" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  Refuser
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statut réseau PA</CardTitle>
              <CardDescription>Référence et dernier message plateforme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Référence PA
                </p>
                <p className="mt-1 font-mono text-sm break-all">{detail.paReference ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Statut
                </p>
                <p className="mt-1 font-medium">
                  {paLabel ?? STATUS_LABEL[detail.status] ?? detail.status}
                </p>
                {detail.lastPaStatusAt ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mis à jour {new Date(detail.lastPaStatusAt).toLocaleString("fr-FR")}
                  </p>
                ) : null}
              </div>
              {detail.paStatusMessage ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Message PA
                  </p>
                  <p className="mt-1 leading-relaxed">{detail.paStatusMessage}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Journal de réception</CardTitle>
              <CardDescription>Événements PA et actions utilisateur</CardDescription>
            </CardHeader>
            <CardContent>
              {(detail.lifecycle ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun événement.</p>
              ) : (
                <ol className="space-y-3">
                  {[...(detail.lifecycle ?? [])].reverse().map((e) => (
                    <li
                      key={e.id}
                      className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="mt-0.5 size-2 shrink-0 rounded-full bg-primary/70" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {STATUS_LABEL[e.status] ?? e.status}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(e.occurredAt).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        {e.message ? (
                          <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppPageShell>
  );
}
