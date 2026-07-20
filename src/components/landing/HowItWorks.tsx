import {
  Activity,
  BarChart3,
  BellRing,
  CheckCircle2,
  Link2,
  Plug,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { LANDING_CONTAINER, LANDING_SECTION_TITLE } from "@/lib/landing-layout";
import { cn } from "@/lib/utils";

const STEP_DURATION_MS = 12_000;

const SOURCE_INTEGRATIONS = [
  "Shopify · WooCommerce · PrestaShop",
  "Stripe · Odoo · Dolibarr · Sage",
  "PDF / tickets · API REST · webhooks",
];

const PA_INTEGRATIONS = [
  "Pennylane · Qonto · Indy · Tiime",
  "Sage · Cegid · Seqino · B2Brouter",
  "149 PA référencées — branchement guidé + API",
];

const STEPS = [
  {
    id: "sources",
    icon: Upload,
    title: "Récupération des factures",
    screenLabel: "INVOICEPILOT · MES SOURCES",
    screenshot: "/media/landing/flow/01-sources.png",
    screenshotAlt: "Page Mes sources — intégrations et import",
    lead: "Nous récupérons les factures depuis les canaux que le client choisit : boutique en ligne, PDF, tickets ou sync API. Aucune ressaisie — nous centralisons les documents sources avant traitement.",
    bullets: [
      "Connexion aux sources via nos intégrations natives ou l’API",
      "Import PDF et file d’attente unifiée avant analyse",
      "Canal de secours si une source est indisponible",
    ],
    footer:
      "Sans source branchée, nous ne pouvons pas lancer l’analyse ni alimenter l’émission PA et l’e-reporting.",
  },
  {
    id: "analyse",
    icon: Sparkles,
    title: "Analyse IA & qualification",
    screenLabel: "INVOICEPILOT · ANALYSE IA",
    screenshot: "/media/landing/flow/02-analyse-ia.png",
    screenshotAlt: "Page Mon analyse IA — score et verdicts",
    lead: "Nous analysons chaque document par IA : extraction client, montants et lignes, puis qualification du flux réglementaire — B2B domestique, B2C, export ou intra-UE.",
    bullets: [
      "Lecture intelligente du document + contrôles métier 2026",
      "Verdict Passé / Bloqué / À analyser et score de conformité",
      "Enrichissement automatique du référentiel clients",
    ],
    footer:
      "Les règles de conformité restent déterministes — l’IA accélère la lecture, nous appliquons les contrôles.",
  },
  {
    id: "emission",
    icon: Send,
    title: "Émission PA (flux B2B)",
    screenLabel: "INVOICEPILOT · ÉMISSION PA",
    screenshot: "/media/landing/flow/03-emission-pa.png",
    screenshotAlt: "Page Mon émission PA — dépôt vers plateforme agréée",
    lead: "Nous mettons en forme les factures B2B validées (Factur-X, mentions 2026) et les déposons vers la plateforme agréée choisie par le client — pas un simple envoi e-mail.",
    bullets: [
      "Registre des factures prêtes à transmettre",
      "Format structuré compatible réseau public",
      "Blocages remontés avant dépôt PA",
    ],
    footer:
      "Nous orchestrons le dépôt ; la PA assure l’échange réseau vers l’acheteur et remonte les statuts.",
  },
  {
    id: "ereporting",
    icon: BarChart3,
    title: "E-reporting (B2C / export)",
    screenLabel: "INVOICEPILOT · E-REPORTING",
    screenshot: "/media/landing/flow/04-e-reporting.png",
    screenshotAlt: "Page Mon e-reporting — lots périodiques",
    lead: "Nous agrégeons les ventes hors e-invoicing B2B (particuliers, export…) en lots périodiques et les transmettons à l’administration via la PA du client.",
    bullets: [
      "Séparation B2B vs B2C / export / intra-UE",
      "Génération du lot mensuel depuis les ventes qualifiées",
      "Historique et statut de transmission PA",
    ],
    footer:
      "Ce n’est pas une facture client — nous préparons le déclaratif fiscal périodique exigé par la réforme.",
  },
  {
    id: "reception",
    icon: BellRing,
    title: "Réception & alertes PA",
    screenLabel: "INVOICEPILOT · RÉCEPTION PA",
    screenshot: "/media/landing/flow/05-reception-pa.png",
    screenshotAlt: "Page Ma réception PA — factures fournisseurs et retours",
    lead: "Nous récupérons les factures fournisseurs via la PA, consolidons les retours d’émission (accepté, refusé, rejeté) et notifions le client par e-mail et in-app à chaque événement.",
    bullets: [
      "Boîte réception PA pour les documents entrants",
      "Statuts PA remontés : transmis, reçu, refusé, erreur technique",
      "Alertes configurables sur les événements critiques",
    ],
    footer:
      "Le client voit ce que la PA transmet — nous traduisons les messages techniques en actions claires.",
  },
] as const;

export function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const current = STEPS[activeStep]!;

  useEffect(() => {
    if (paused) return;

    setProgress(0);
    const tick = setInterval(() => {
      setProgress((prev) => Math.min(100, prev + 100 / (STEP_DURATION_MS / 50)));
    }, 50);

    const next = setTimeout(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, STEP_DURATION_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(next);
    };
  }, [activeStep, paused]);

  function selectStep(index: number) {
    setActiveStep(index);
    setProgress(0);
    setPaused(true);
    window.setTimeout(() => setPaused(false), STEP_DURATION_MS + 2000);
  }

  return (
    <section
      id="parcours"
      className="relative scroll-mt-24 overflow-hidden border-t border-border/60 bg-muted/20 py-20 sm:py-28"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,oklch(0.55_0.19_267/0.08),transparent)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,oklch(0.55_0.19_267/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.19_267/0.06)_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className={`relative ${LANDING_CONTAINER}`}>
        <div className={LANDING_SECTION_TITLE}>
          <Badge
            variant="secondary"
            className="mb-4 border border-primary/20 bg-primary/5 text-primary"
          >
            Parcours InvoicePilot
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Comment ça fonctionne</h2>
          <p className="mt-4 text-muted-foreground">
            Nous récupérons les factures, les analysons, qualifions B2B / B2C, mettons en forme pour
            la PA et l’e-reporting, transmettons et remontons les retours — le client choisit ses
            sources et sa plateforme agréée via nos intégrations.
          </p>
        </div>

        <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-10">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => selectStep(index)}
                  className={cn(
                    "group flex cursor-pointer flex-col items-center text-center transition-all duration-300",
                    isActive ? "scale-[1.02]" : "opacity-70 hover:opacity-100",
                  )}
                >
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full transition-all duration-300 sm:size-12",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[0_8px_24px_oklch(0.55_0.19_267/0.35)]"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </div>
                  <h3
                    className={cn(
                      "mt-2.5 px-1 text-[11px] font-semibold leading-snug sm:text-xs",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.title}
                  </h3>
                  <div className="mt-2 h-0.5 w-full max-w-[7rem] bg-border/60">
                    {isActive ? (
                      <div
                        className="h-0.5 rounded-full bg-gradient-to-r from-primary to-[oklch(0.55_0.15_200)] transition-[width] duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-black/10">
            <div className="flex items-center gap-2 border-b border-border/80 bg-muted/40 px-4 py-3 sm:px-6">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full border border-red-500/30 bg-red-500/20" />
                <div className="size-3 rounded-full border border-yellow-500/30 bg-yellow-500/20" />
                <div className="size-3 rounded-full border border-green-500/30 bg-green-500/20" />
              </div>
              <div className="ml-3 flex items-center gap-2 font-mono text-[10px] text-muted-foreground sm:text-xs">
                <Activity className="size-3 animate-pulse text-primary" />
                {current.screenLabel}
              </div>
            </div>

            <div className="grid flex-1 gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
              <div
                key={current.id}
                className="animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary sm:text-xs">
                  Étape {activeStep + 1} · {current.title}
                </div>

                <h4 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
                  {current.title}
                </h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {current.lead}
                </p>

                <ul className="mt-5 space-y-2.5">
                  {current.bullets.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-background/80 px-3 py-2.5 text-sm"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <Plug className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p className="text-sm font-medium leading-relaxed text-foreground/90">
                    {current.footer}
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted/20 shadow-inner">
                <div className="border-b border-border/60 bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Capture écran — application en action
                </div>
                <div className="max-h-[520px] overflow-y-auto bg-background">
                  <img
                    src={current.screenshot}
                    alt={current.screenshotAlt}
                    className="block w-full object-contain object-top"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Plug className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Intégrations sources
                  </p>
                  <h3 className="text-lg font-bold">Nous branchons les canaux d’entrée</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Le client choisit d’où nous récupérons les factures. Nous connectons boutiques, ERP,
                paiement ou dépôts PDF via nos connecteurs et l’API REST — sans ressaisie manuelle.
              </p>
              <ul className="mt-4 space-y-2">
                {SOURCE_INTEGRATIONS.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm">
                    <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                <img
                  src="/media/landing/flow/01-sources.png"
                  alt="Intégrations sources dans l’application"
                  className="block w-full object-contain object-top"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Link2 className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">
                    Intégrations PA
                  </p>
                  <h3 className="text-lg font-bold">Nous routons vers la PA choisie</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Le client sélectionne sa plateforme agréée dans notre catalogue. Nous déposons
                l’émission B2B, l’e-reporting et remontons les statuts PA (transmis, accepté,
                refusé, erreur technique) via l’API.
              </p>
              <ul className="mt-4 space-y-2">
                {PA_INTEGRATIONS.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm">
                    <Link2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
                <img
                  src="/media/landing/flow/06-platforms-pa.png"
                  alt="Choix de la plateforme agréée"
                  className="block w-full object-contain object-top"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
