import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmCheckoutSession } from "@/fns/stripe-billing";

/**
 * Page post-Stripe Checkout — synchronise la session même si le webhook est en retard.
 */
export const Route = createFileRoute("/checkout/success")({
  head: () => ({
    meta: [{ title: "Paiement confirmé — InvoicePilot AI" }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: (search.session_id as string) ?? undefined,
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { session_id } = Route.useSearch();
  const confirmFn = useServerFn(confirmCheckoutSession);
  const [syncing, setSyncing] = useState(Boolean(session_id));
  const [amountTotal, setAmountTotal] = useState<number | null>(null);
  const [subStatus, setSubStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session_id) {
      setSyncing(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await confirmFn({ data: { sessionId: session_id } });
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
        } else {
          setAmountTotal(result.amountTotal);
          setSubStatus(result.status);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Synchronisation impossible");
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session_id, confirmFn]);

  const paidNow = (amountTotal ?? 0) > 0;
  const title = syncing
    ? "Confirmation en cours…"
    : paidNow
      ? "Paiement confirmé"
      : "Carte enregistrée";
  const description = syncing
    ? "Nous synchronisons votre abonnement Stripe avec InvoicePilot."
    : paidNow
      ? "Votre abonnement est actif. La facture est disponible dans l’historique de facturation."
      : "Votre carte est liée à Stripe. Pendant l’essai, aucun montant n’est débité ; la facturation démarre à la conversion / fin d’essai.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-20">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
            {syncing ? (
              <Loader2 className="size-8 animate-spin text-emerald-600" />
            ) : (
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          {subStatus ? (
            <p className="mt-2 text-xs text-muted-foreground">Statut Stripe : {subStatus}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {session_id ? (
            <p className="font-mono text-xs text-muted-foreground">
              Session : {session_id.slice(0, 20)}…
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/billing">Mon abonnement</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/billing/history">Voir les factures</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
