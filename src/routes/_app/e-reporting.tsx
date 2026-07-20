import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileBarChart,
  Info,
  Radio,
  Send,
} from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import {
  EReportingCandidatesDataGrid,
  EReportingLotsDataGrid,
} from "@/components/ereporting/EReportingDataGrids";
import { EReportingLotSheet } from "@/components/ereporting/EReportingLotSheet";
import { Badge } from "@/components/reui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generateEReportingPeriod, transmitEReporting, getEReportingData } from "@/fns/e-reporting";
import { pageGuide } from "@/lib/page-guides";

export const Route = createFileRoute("/_app/e-reporting")({
  head: () => ({ meta: [{ title: "Mon e-reporting — InvoicePilot AI" }] }),
  loader: () => getEReportingData(),
  component: EReportingPage,
});

function EReportingPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState<"gen" | "tx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Session expirée.</p>
      </AppPageShell>
    );
  }

  const transmitted = data.entries.filter((e) => e.transmittedAt).length;
  const readyCount = data.entries.filter((e) => e.status === "ready").length;
  const hasLotLines = data.entries.some((e) => e.lineCount > 0);
  const periodLabel = `${new Date(data.period.start + "T12:00:00").toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  })}`;
  const analyzedCount = data.candidates.filter((c) => c.analyzed).length;
  const hasLots = data.entries.length > 0;
  const hasCandidates = data.candidates.length > 0;

  async function onGenerate() {
    setBusy("gen");
    setError(null);
    setOk(null);
    const res = await generateEReportingPeriod({
      data: {
        periodStart: data!.period.start,
        periodEnd: data!.period.end,
        refresh: Boolean(data!.currentLotId),
      },
    });
    if (!res.success) setError(res.error ?? "Génération impossible.");
    else {
      const n = data!.candidates.length;
      setOk(
        res.refreshed
          ? `Lot mis à jour — ${n} facture(s) B2C / export / intra-UE.`
          : `Lot généré — ${n} facture(s). Ouvrez le lot pour visualiser avant envoi.`,
      );
      if (res.id) {
        setSheetId(res.id);
        setSheetKey((k) => k + 1);
      }
    }
    setBusy(null);
    await router.invalidate();
  }

  async function onTransmit(entryId: string) {
    setBusy("tx");
    setError(null);
    setOk(null);
    const res = await transmitEReporting({ data: { entryId } });
    if (!res.success) setError(res.error ?? "Transmission impossible.");
    else {
      setOk(`Transmis — réf. ${(res as { paReference?: string }).paReference ?? ""}`);
      setSheetKey((k) => k + 1);
    }
    setBusy(null);
    await router.invalidate();
  }

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Flux · E-reporting"
        title="Mon e-reporting"
        description={pageGuide("e-reporting").blurb}
        meta={
          <>
            <Badge variant={hasCandidates ? "success-light" : "warning-light"} size="sm">
              {hasCandidates ? `${data.candidates.length} éligible(s)` : "0 éligible — Analyse IA"}
            </Badge>
            <Badge variant={analyzedCount > 0 ? "success-light" : "secondary"} size="sm">
              {analyzedCount > 0 ? `${analyzedCount} analysée(s) IA` : "IA en attente"}
            </Badge>
            <Badge variant={data.hasTransmitPa ? "success-light" : "destructive-light"} size="sm">
              {data.hasTransmitPa ? "PA prête" : "PA à brancher"}
            </Badge>
            <Badge variant={hasLotLines ? "success-light" : "outline"} size="sm">
              {hasLotLines ? "Lot avec lignes" : "Lot à générer"}
            </Badge>
            <Badge variant={data.needsTx ? "default" : "outline"} size="sm">
              {data.needsTx ? "Tx recommandé" : "Tx optionnel"}
            </Badge>
            <Badge variant="outline" size="sm">
              Pas de réception
            </Badge>
          </>
        }
        kpis={[
          {
            label: "Éligibles",
            value: String(data.candidates.length),
            hint: periodLabel,
            icon: FileBarChart,
          },
          {
            label: "Analysées IA",
            value: String(analyzedCount),
            hint: "Parmi les éligibles",
            icon: CircleDot,
          },
          {
            label: "À déposer",
            value: String(readyCount),
            hint: readyCount > 0 ? "Lots prêts PA" : "Rien en attente",
            icon: Radio,
            alert: readyCount > 0 && !data.hasTransmitPa,
          },
          {
            label: "Transmis",
            value: String(transmitted),
            hint: "Via PA uniquement",
            icon: Send,
          },
        ]}
      />

      <Alert>
        <Info className="size-4" />
        <AlertTitle className="text-sm">Pas de réception e-reporting</AlertTitle>
        <AlertDescription className="text-sm">
          Déclaration sortante (B2C / export / intra-UE). L’IA segmente : B2B →{" "}
          <Link to="/invoices" className="font-medium text-primary hover:underline">
            Émission
          </Link>
          , B2C → ici. La{" "}
          <Link to="/inbox" className="font-medium text-primary hover:underline">
            réception PA
          </Link>{" "}
          = factures fournisseurs uniquement.
        </AlertDescription>
      </Alert>

      {data.alerts.length > 0 ? (
        <div className="grid gap-2">
          {data.alerts.slice(0, 2).map((a) => (
            <Alert
              key={a.id}
              variant={a.urgency === "critical" ? "destructive" : "default"}
              className={a.urgency === "warning" ? "border-amber-500/30 bg-amber-500/5" : undefined}
            >
              <CalendarClock className="size-4" />
              <AlertTitle className="text-sm">{a.title}</AlertTitle>
              <AlertDescription className="text-xs">{a.detail}</AlertDescription>
            </Alert>
          ))}
        </div>
      ) : null}

      {!data.hasTransmitPa ? (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-sm">PA technique requise pour déposer</AlertTitle>
          <AlertDescription className="text-sm">
            Vous pouvez préparer / visualiser un lot ; la transmission attend une PA dans{" "}
            <Link to="/platforms" className="font-medium text-primary hover:underline">
              Ma plateforme agréée
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {ok ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{ok}</AlertDescription>
        </Alert>
      ) : null}

      {/* Comme Réception : une datatable principale pleine largeur, pas de SectionBlock vide */}
      {hasLots ? (
        <EReportingLotsDataGrid
          entries={data.entries}
          busy={busy}
          onOpen={setSheetId}
          onTransmit={(id) => void onTransmit(id)}
          onGenerate={() => void onGenerate()}
          currentLotId={data.currentLotId}
        />
      ) : (
        <EReportingCandidatesDataGrid
          candidates={data.candidates}
          busy={busy}
          currentLotId={data.currentLotId}
          onGenerate={() => void onGenerate()}
        />
      )}

      {hasLots && hasCandidates ? (
        <EReportingCandidatesDataGrid
          candidates={data.candidates}
          busy={busy}
          currentLotId={data.currentLotId}
          onGenerate={() => void onGenerate()}
        />
      ) : null}

      <EReportingLotSheet
        key={`${sheetId}-${sheetKey}`}
        entryId={sheetId}
        open={Boolean(sheetId)}
        onOpenChange={(open) => {
          if (!open) setSheetId(null);
        }}
        onTransmit={(id) => void onTransmit(id)}
        transmitting={busy === "tx"}
      />

      <PageGuide page="e-reporting" />
    </AppPageShell>
  );
}
