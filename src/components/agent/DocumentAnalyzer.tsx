import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, FileSearch, Loader2, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { HumanRemediationForm } from "@/components/agent/HumanRemediationForm";
import { analyzeInvoiceDocument, type DocumentAnalysisResult } from "@/fns/analyze-invoice";
import { listInvoices, type InvoiceListItem } from "@/fns/invoices";
import { cn } from "@/lib/utils";

type Phase = "idle" | "running" | "done" | "error";

const SOURCE_LABEL: Record<string, string> = {
  llm: "LLM",
  heuristic: "Heuristique (sans LLM)",
  skipped: "Non requise",
  none: "—",
};

export function DocumentAnalyzer({
  initialInvoiceId,
  autoStart = false,
}: {
  initialInvoiceId?: string;
  autoStart?: boolean;
}) {
  const listFn = useServerFn(listInvoices);
  const analyzeFn = useServerFn(analyzeInvoiceDocument);

  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialInvoiceId ?? "");
  const [loadingList, setLoadingList] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<DocumentAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remediationKey, setRemediationKey] = useState(0);
  const autoStarted = useRef(false);

  useEffect(() => {
    void (async () => {
      setLoadingList(true);
      try {
        const rows = await listFn();
        setInvoices(rows);
        const pick =
          (initialInvoiceId && rows.find((r) => r.id === initialInvoiceId)?.id) ||
          rows[0]?.id ||
          "";
        setSelectedId(pick);
      } finally {
        setLoadingList(false);
      }
    })();
  }, [listFn, initialInvoiceId]);

  async function runAnalysis(invoiceId = selectedId) {
    if (!invoiceId || phase === "running") return;
    setError(null);
    setResult(null);
    setPhase("running");

    try {
      const res = await analyzeFn({
        data: { invoiceId, applyExtraction: true },
      });
      if ("error" in res) {
        setError(res.error);
        setPhase("error");
        return;
      }

      setResult(res);
      const rows = await listFn();
      setInvoices(rows);
      setRemediationKey((k) => k + 1);
      setPhase("done");
    } catch {
      setError("Impossible d’analyser ce document. Réessayez.");
      setPhase("error");
    }
  }

  useEffect(() => {
    if (loadingList || !autoStart || !selectedId || autoStarted.current) return;
    autoStarted.current = true;
    void runAnalysis(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingList, autoStart, selectedId]);

  const selected = invoices.find((i) => i.id === selectedId);
  const tips = result?.extraction.tips ?? [];
  const draft = result?.extraction.draft;
  const extractConfidence = Math.round((draft?.confidence ?? 0) * 100);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardHeading>
              <CardTitle>Document</CardTitle>
              <CardDescription>
                Choisissez une facture source. L’analyse lit le PDF, structure les données, puis
                applique les contrôles 2026.
              </CardDescription>
            </CardHeading>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingList ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Chargement…
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune facture. Chargez un PDF dans{" "}
                <Link to="/integrations" className="font-medium text-primary hover:underline">
                  Sources
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="inv">
                  Facture
                </label>
                <select
                  id="inv"
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setPhase("idle");
                    setResult(null);
                    autoStarted.current = true;
                  }}
                  disabled={phase === "running"}
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} — {inv.client} —{" "}
                      {inv.amount.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </option>
                  ))}
                </select>
                {selected ? (
                  <p className="text-xs text-muted-foreground">
                    {selected.status}
                    {selected.issueDate ? ` · ${selected.issueDate}` : ""}
                  </p>
                ) : null}
              </div>
            )}

            <Button
              className="gap-2"
              disabled={!selectedId || phase === "running" || invoices.length === 0}
              onClick={() => void runAnalysis()}
            >
              {phase === "running" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSearch className="size-4" />
              )}
              {phase === "running" ? "Analyse en cours…" : "Lancer l’analyse"}
            </Button>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {phase === "done" && draft ? (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="font-medium">Extraction</p>
                  <Badge variant="secondary" size="sm">
                    {SOURCE_LABEL[result?.extraction.source ?? "none"] ?? result?.extraction.source}
                  </Badge>
                  {result?.extraction.applied ? (
                    <Badge variant="info-light" size="sm">
                      Appliquée sur la fiche
                    </Badge>
                  ) : null}
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>
                    Client :{" "}
                    <span className="text-foreground">{draft.buyerLegalName ?? "non détecté"}</span>
                    {draft.buyerSiren ? ` · ${draft.buyerSiren}` : ""}
                  </li>
                  <li>
                    Dates : {draft.issueDate ?? "—"} / {draft.serviceDate ?? "—"}
                  </li>
                  <li>
                    {draft.lines.length} ligne(s)
                    {draft.totalTtc != null
                      ? ` · TTC ${draft.totalTtc.toLocaleString("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        })}`
                      : ""}
                  </li>
                  <li>
                    Confiance extraction :{" "}
                    <span
                      className={cn(
                        "font-medium",
                        extractConfidence < 50
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-foreground",
                      )}
                    >
                      {extractConfidence} %
                    </span>
                    {result?.extraction.pdfTextChars
                      ? ` · ${result.extraction.pdfTextChars} car. PDF`
                      : ""}
                  </li>
                </ul>
                {draft.notes[0] ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">{draft.notes[0]}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardHeading>
              <CardTitle>Contrôles 2026</CardTitle>
              <CardDescription>
                Score basé sur les règles métier + pénalité si extraction peu fiable.
              </CardDescription>
            </CardHeading>
            {result ? (
              <CardToolbar>
                <Badge
                  variant={
                    result.valid
                      ? "success-light"
                      : result.score >= 60
                        ? "warning-light"
                        : "destructive-light"
                  }
                  size="sm"
                >
                  Score {result.score} %
                </Badge>
              </CardToolbar>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {phase === "idle" && !result ? (
              <p className="text-sm text-muted-foreground">
                Lancez l’analyse pour afficher les contrôles réels de cette facture.
              </p>
            ) : null}

            {phase === "running" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Lecture PDF et contrôles…
              </div>
            ) : null}

            {result ? (
              <>
                <p className="text-sm font-medium">
                  {result.valid
                    ? `Prête → ${result.dispatchLabel}`
                    : "Revue / correction requise avant dispatch"}
                </p>
                <ul className="space-y-2.5">
                  {result.checks.map((c) => (
                    <li key={c.code} className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        {c.ok ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                        )}
                        <span
                          className={cn(
                            "font-medium",
                            !c.ok && "text-amber-900 dark:text-amber-200",
                          )}
                        >
                          {c.label}
                        </span>
                      </div>
                      <p className="pl-6 text-xs text-muted-foreground">{c.detail}</p>
                    </li>
                  ))}
                </ul>

                {result.blockingErrors.length > 0 ? (
                  <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                    <p className="font-semibold">Blocages</p>
                    <ul className="mt-1 list-disc ps-4">
                      {result.blockingErrors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
                  {result.invoiceNumber} · {result.clientName} · {result.transactionType}
                  {result.valid
                    ? ` — mise en forme OK, dispatch ${result.dispatchLabel}.`
                    : " — corrigez ci-dessous, pas de dispatch tant que bloqué."}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {phase === "done" && tips.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-0.5">
            <Wrench className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Pistes de correction</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tips.map((tip) => (
              <article
                key={tip.code}
                className="rounded-xl border border-border/70 bg-card p-4 shadow-xs"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tip.code}
                </p>
                <p className="mt-1 text-sm font-medium">{tip.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tip.detail}</p>
                <p className="mt-2 text-xs font-medium text-primary">{tip.action}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {phase === "done" && selectedId ? (
        <HumanRemediationForm
          invoiceId={selectedId}
          refreshKey={remediationKey}
          onSaved={() => {
            void listFn().then(setInvoices);
          }}
        />
      ) : null}
    </div>
  );
}
