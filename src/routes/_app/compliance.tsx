import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  ListChecks,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import {
  BranchConnectionCard,
  BranchConnectionsSection,
} from "@/components/app/BranchConnectionCard";
import { PageGuide } from "@/components/app/PageGuide";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getComplianceData, saveQuickDiagnostic } from "@/fns/compliance";
import { pageGuide } from "@/lib/page-guides";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/compliance")({
  head: () => ({ meta: [{ title: "Ma conformité — InvoicePilot AI" }] }),
  loader: () => getComplianceData(),
  component: CompliancePage,
});

function CompliancePage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [size, setSize] = useState<"MICRO" | "PME" | "ETI" | "GE">(
    (data?.diagnostic?.companySize as "MICRO" | "PME" | "ETI" | "GE") ??
      (data?.organization.size as "MICRO" | "PME" | "ETI" | "GE") ??
      "PME",
  );
  const [vat, setVat] = useState<"STANDARD" | "FRANCHISE_BASE" | "EXEMPT">(
    (data?.diagnostic?.vatRegime as "STANDARD" | "FRANCHISE_BASE" | "EXEMPT") ??
      (data?.organization.vatRegime as "STANDARD" | "FRANCHISE_BASE" | "EXEMPT") ??
      "STANDARD",
  );
  const [hasB2c, setHasB2c] = useState(Boolean(data?.diagnostic?.hasB2cClients));
  const [hasForeign, setHasForeign] = useState(Boolean(data?.diagnostic?.hasForeignClients));

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Données indisponibles.</p>
      </AppPageShell>
    );
  }

  async function handleDiagnostic(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await saveQuickDiagnostic({
      data: {
        companySize: size,
        vatRegime: vat,
        hasB2cClients: hasB2c,
        hasForeignClients: hasForeign,
      },
    });
    setSaving(false);
    await router.invalidate();
  }

  const receiveBy = data.diagnostic?.mustReceiveBy
    ? new Date(data.diagnostic.mustReceiveBy).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "1 septembre 2026";
  const emitBy = data.diagnostic?.mustEmitBy
    ? new Date(data.diagnostic.mustEmitBy).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "1 septembre 2027";
  const timelineActive = data.onboarding?.paTransmitReady ? 2 : data.diagnostic ? 2 : 1;
  const scoreTone =
    data.readinessScore >= 70
      ? "text-emerald-600"
      : data.readinessScore >= 40
        ? "text-amber-600"
        : "text-destructive";
  const checklistOk = data.checklist.filter((i) => i.status === "DONE").length;

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Pilotage · Conformité"
        title="Ma conformité"
        description={pageGuide("compliance").blurb}
        actions={[
          {
            label: "Ma plateforme agréée",
            to: "/platforms",
            icon: ClipboardCheck,
            variant: "outline",
          },
        ]}
        meta={
          <>
            <Badge variant="secondary">Préparation · {data.readinessScore} %</Badge>
            {data.onboarding ? (
              <Badge variant="outline">Réception dans {data.onboarding.daysToReceive} j</Badge>
            ) : null}
          </>
        }
        kpis={[
          {
            label: "Préparation",
            value: `${data.readinessScore} %`,
            hint: "Sources + PA + jalons + diagnostic",
            icon: ShieldCheck,
            alert: data.readinessScore < 70,
          },
          {
            label: "Sources API",
            value: data.onboarding
              ? `${data.readinessBreakdown.sources.connected}/${data.readinessBreakdown.sources.chosen || "—"}`
              : "—",
            hint: data.readinessBreakdown.sources.label,
            icon: ListChecks,
            alert: Boolean(
              data.onboarding &&
              data.readinessBreakdown.sources.chosen > 0 &&
              !data.readinessBreakdown.sources.ready,
            ),
          },
          {
            label: "Canal PA",
            value: data.onboarding?.paTransmitReady ? "OK" : "À brancher",
            hint: data.readinessBreakdown.pa.label,
            icon: ClipboardCheck,
            alert: !data.onboarding?.paTransmitReady,
          },
          {
            label: "Réception",
            value: data.onboarding ? `${data.onboarding.daysToReceive} j` : "—",
            hint: receiveBy,
            icon: CalendarClock,
            alert: Boolean(data.onboarding && data.onboarding.daysToReceive <= 60),
          },
        ]}
      />

      {data.onboarding ? (
        <BranchConnectionsSection>
          <BranchConnectionCard
            eyebrow="Sources"
            title={
              data.onboarding.sourcesChosen.length > 0
                ? data.onboarding.sourcesChosen.join(" · ")
                : "Aucune source déclarée"
            }
            description={
              data.onboarding.monthlyVolume != null
                ? `Volume estimé · ~${data.onboarding.monthlyVolume}/mois`
                : "PDF / saisie · flux par défaut"
            }
            icon={Plug}
            iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-400"
            tone={data.onboarding.sourcesConnected.length > 0 ? "ok" : "neutral"}
            statusLabel={
              data.onboarding.sourcesConnected.length > 0
                ? `${data.onboarding.sourcesConnected.length} connectée${data.onboarding.sourcesConnected.length > 1 ? "s" : ""}`
                : "À brancher"
            }
            action={{ label: "Gérer les sources", to: "/integrations" }}
          />
          <BranchConnectionCard
            eyebrow="Plateforme agréée"
            title={
              data.onboarding.preferredPaSlug
                ? data.onboarding.preferredPaSlug.charAt(0).toUpperCase() +
                  data.onboarding.preferredPaSlug.slice(1)
                : (data.onboarding.paDeclaredName ?? "Non choisie")
            }
            description={
              <>
                {data.onboarding.paPurposeLabel}
                {data.onboarding.paTransmitReady && data.onboarding.paTransmitName
                  ? ` · ${data.onboarding.paTransmitName}`
                  : data.onboarding.hasExistingPa
                    ? " · PA déjà connue"
                    : ""}
              </>
            }
            icon={ShieldCheck}
            iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-400"
            tone={
              data.onboarding.paTransmitReady
                ? "ok"
                : data.onboarding.paDeclaredName
                  ? "warn"
                  : "neutral"
            }
            statusLabel={
              data.onboarding.paTransmitReady
                ? "Canal prêt"
                : data.onboarding.paDeclaredName
                  ? "Déclarée"
                  : "À brancher"
            }
            action={{ label: "Configurer ma PA", to: "/platforms" }}
          />
        </BranchConnectionsSection>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="flex flex-col gap-5 border-b border-border/60 bg-muted/20 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Indice de préparation
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Sources branchées + canal PA + jalons + diagnostic.
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span
                  className={cn("text-5xl font-semibold tabular-nums tracking-tight", scoreTone)}
                >
                  {data.readinessScore}
                </span>
                <span className="mb-2 text-lg text-muted-foreground">%</span>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-border/80">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${data.readinessScore}%` }}
                />
              </div>
            </div>

            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {data.readinessBreakdown.sources.ready ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="leading-snug text-muted-foreground">
                    {data.readinessBreakdown.sources.label}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums">
                  {data.readinessBreakdown.sources.points}/{data.readinessBreakdown.sources.max}
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {data.readinessBreakdown.pa.ready ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="leading-snug text-muted-foreground">
                    {data.readinessBreakdown.pa.label}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums">
                  {data.readinessBreakdown.pa.points}/{data.readinessBreakdown.pa.max}
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {data.readinessBreakdown.checklist.ready ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 leading-snug">
                    <span className="text-muted-foreground">
                      Jalons réforme · {checklistOk}/{data.checklist.length}
                    </span>
                    <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="mt-0.5 block text-left text-xs font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Comprendre le détail →
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Détail des jalons</DialogTitle>
                          <DialogDescription>
                            Ce qui compose la ligne « jalons » de l’indice — détecté automatiquement
                            depuis vos modules.
                          </DialogDescription>
                        </DialogHeader>
                        <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border/60">
                          {data.checklist.map((item) => {
                            const ok = item.badge === "OK";
                            const waiting = item.badge === "En attente" || item.waiting;
                            return (
                              <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                                <span className="mt-0.5 shrink-0" aria-hidden>
                                  {ok ? (
                                    <CheckCircle2 className="size-4 text-emerald-600" />
                                  ) : waiting ? (
                                    <Circle className="size-4 text-sky-600" />
                                  ) : (
                                    <Circle className="size-4 text-amber-600" />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium">{item.label}</p>
                                    <span
                                      className={cn(
                                        "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                                        ok &&
                                          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                        waiting && "bg-sky-500/10 text-sky-800 dark:text-sky-300",
                                        !ok &&
                                          !waiting &&
                                          "bg-amber-500/10 text-amber-800 dark:text-amber-200",
                                      )}
                                    >
                                      {item.badge}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {item.liveHint ?? item.description}
                                  </p>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums">
                  {data.readinessBreakdown.checklist.points}/{data.readinessBreakdown.checklist.max}
                </span>
              </li>
              <li className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {data.readinessBreakdown.diagnostic.ready ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="leading-snug text-muted-foreground">
                    {data.readinessBreakdown.diagnostic.label}
                  </span>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums">
                  {data.readinessBreakdown.diagnostic.points}/
                  {data.readinessBreakdown.diagnostic.max}
                </span>
              </li>
            </ul>

            {data.diagnostic ? (
              <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-4">
                {data.diagnostic.needsEInvoicing && <Badge>E-invoicing</Badge>}
                {data.diagnostic.needsEReportingTx && (
                  <Badge variant="secondary">E-reporting TX</Badge>
                )}
                {data.diagnostic.needsEReportingPay && (
                  <Badge variant="outline">E-reporting paiement</Badge>
                )}
              </div>
            ) : null}
          </div>

          <div className="p-6 sm:p-8">
            <h3 className="text-base font-semibold tracking-tight">Calendrier réglementaire</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Dates légales — personnalisées par le diagnostic ci-dessous
            </p>
            <div className="mt-6">
              <Timeline value={timelineActive}>
                <TimelineItem step={1}>
                  <TimelineHeader>
                    <TimelineDate>Maintenant</TimelineDate>
                    <TimelineTitle>Sources API &amp; canal PA</TimelineTitle>
                  </TimelineHeader>
                  <TimelineIndicator />
                  <TimelineSeparator />
                  <TimelineContent>
                    {data.onboarding?.preferredPaSlug
                      ? `PA : ${data.onboarding.preferredPaSlug}${
                          data.onboarding.paTransmitReady
                            ? ` — canal OK (${data.onboarding.paTransmitName}).`
                            : " — API émission à brancher."
                        }`
                      : "Choisir et brancher une PA."}
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem step={2}>
                  <TimelineHeader>
                    <TimelineDate>{receiveBy}</TimelineDate>
                    <TimelineTitle>Réception obligatoire</TimelineTitle>
                  </TimelineHeader>
                  <TimelineIndicator />
                  <TimelineSeparator />
                  <TimelineContent>
                    Toutes les entreprises assujetties doivent pouvoir recevoir des e-factures.
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem step={3}>
                  <TimelineHeader>
                    <TimelineDate>{emitBy}</TimelineDate>
                    <TimelineTitle>Émission obligatoire</TimelineTitle>
                  </TimelineHeader>
                  <TimelineIndicator />
                  <TimelineSeparator />
                  <TimelineContent>
                    {data.diagnostic
                      ? "Échéance selon votre taille (diagnostic)."
                      : "GE/ETI 2026, Micro/PME 2027 — peaufinez via le diagnostic."}
                  </TimelineContent>
                </TimelineItem>
              </Timeline>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight">
            Diagnostic — personnaliser vos dates
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Change 3 choses : calendrier, jalon e-reporting, mise en avant du module{" "}
            <Link to="/e-reporting" className="font-medium text-primary hover:underline">
              E-reporting
            </Link>
            .
          </p>
        </div>
        <form
          onSubmit={(e) => void handleDiagnostic(e)}
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4"
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Taille (année d’émission)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={size}
              onChange={(e) => setSize(e.target.value as typeof size)}
            >
              <option value="MICRO">Micro / AE → 2027</option>
              <option value="PME">PME → 2027</option>
              <option value="ETI">ETI → 2026</option>
              <option value="GE">GE → 2026</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Régime TVA</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={vat}
              onChange={(e) => setVat(e.target.value as typeof vat)}
            >
              <option value="STANDARD">Assujetti</option>
              <option value="FRANCHISE_BASE">Franchise en base</option>
              <option value="EXEMPT">Exonéré</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label className="text-xs">Clients (e-reporting)</Label>
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasB2c}
                  onChange={(e) => setHasB2c(e.target.checked)}
                />
                B2C
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={hasForeign}
                  onChange={(e) => setHasForeign(e.target.checked)}
                />
                Étranger
              </label>
            </div>
          </div>
          <div className="flex flex-col justify-end gap-2 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] text-muted-foreground">
              → {receiveBy} /{" "}
              {size === "MICRO" || size === "PME" ? "émission 2027" : "émission 2026"} · e-reporting{" "}
              {hasB2c || hasForeign ? "oui" : "non"}
            </p>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? "…" : data.diagnostic ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </section>

      <PageGuide page="compliance" />
    </AppPageShell>
  );
}
