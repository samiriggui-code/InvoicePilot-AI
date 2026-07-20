import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Check, Inbox, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { ReceptionDataGrid } from "@/components/reception/ReceptionDataGrid";
import { ReceptionDetailSheet } from "@/components/reception/ReceptionDetailSheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getInboxData,
  importInboxDocument,
  markPurchaseReviewed,
  syncPaInboxSandbox,
} from "@/fns/pa-reception";
import { pageGuide } from "@/lib/page-guides";

export const Route = createFileRoute("/_app/inbox")({
  head: () => ({ meta: [{ title: "Ma réception PA — InvoicePilot AI" }] }),
  loader: () => getInboxData(),
  component: InboxPage,
});

function InboxPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Session expirée.</p>
      </AppPageShell>
    );
  }

  async function onSync() {
    setBusy("sync");
    setError(null);
    const res = await syncPaInboxSandbox();
    if (!res.success) setError(res.error);
    setBusy(null);
    await router.invalidate();
  }

  async function onImport(documentId: string) {
    setBusy("import-" + documentId);
    setError(null);
    const res = await importInboxDocument({ data: { documentId } });
    if (!res.success) setError(res.error);
    setBusy(null);
    await router.invalidate();
  }

  async function onReview(invoiceId: string, action: "approve" | "refuse") {
    setBusy(invoiceId + action);
    setError(null);
    const res = await markPurchaseReviewed({ data: { invoiceId, action } });
    if (!res.success) setError(res.error);
    setBusy(null);
    await router.invalidate();
    if (sheetId === invoiceId) setSheetKey((k) => k + 1);
  }

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Flux · Réception PA"
        title="Ma réception PA"
        description={pageGuide("inbox").blurb}
        meta={
          <>
            <Badge variant={data.hasReceptionPa ? "default" : "outline"}>
              {data.hasReceptionPa ? `PA · ${data.platformName}` : "PA réception manquante"}
            </Badge>
            <Badge variant="secondary">{data.invoices.length} document(s)</Badge>
            {data.hasReceptionPa ? (
              <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={onSync}>
                {busy === "sync" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Synchroniser PA
              </Button>
            ) : null}
          </>
        }
        kpis={[
          {
            label: "Reçues",
            value: String(data.invoices.length),
            hint: "Depuis la PA",
            icon: Inbox,
          },
          {
            label: "À traiter",
            value: String(data.invoices.filter((i) => i.status === "RECEIVED").length),
            hint: "Approuver / refuser",
            icon: AlertTriangle,
            alert: data.invoices.some((i) => i.status === "RECEIVED"),
          },
          {
            label: "Approuvées",
            value: String(data.invoices.filter((i) => i.status === "APPROVED").length),
            hint: "Validées fournisseur",
            icon: Check,
          },
          {
            label: "Canal PA",
            value: data.hasReceptionPa ? "OK" : "Non",
            hint: data.platformName ?? "Connecter la plateforme agréée",
            icon: RefreshCw,
            alert: !data.hasReceptionPa,
          },
        ]}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!data.hasReceptionPa ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4" />
              Connectez une PA de réception
            </CardTitle>
            <CardDescription>
              InvoicePilot ne reçoit pas directement : la PA immatriculée livre les factures
              fournisseurs dans votre inbox.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/platforms">Ouvrir Ma plateforme agréée</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ReceptionDataGrid
        invoices={data.invoices}
        busy={busy}
        onOpen={setSheetId}
        onImport={(documentId) => void onImport(documentId)}
        onReview={(invoiceId, action) => void onReview(invoiceId, action)}
      />

      <ReceptionDetailSheet
        key={`${sheetId}-${sheetKey}`}
        invoiceId={sheetId}
        open={Boolean(sheetId)}
        onOpenChange={(open) => {
          if (!open) setSheetId(null);
        }}
        onReview={(id, action) => void onReview(id, action)}
        reviewing={
          busy === `${sheetId}approve` ? "approve" : busy === `${sheetId}refuse` ? "refuse" : null
        }
      />

      <PageGuide page="inbox" />
    </AppPageShell>
  );
}
