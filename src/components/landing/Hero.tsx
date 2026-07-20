import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocsUrl } from "@/lib/docs-url";
import { LANDING_CONTAINER, LANDING_HERO_TEXT } from "@/lib/landing-layout";
import { ArrowRight, CheckCircle2, Shield } from "lucide-react";

const highlights = ["Conforme Factur-X & UBL", "Intégration PDP agréées", "Agent IA réglementaire"];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.55_0.19_267/0.12),transparent)]" />
      <div className="pointer-events-none absolute -right-32 top-20 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 size-72 rounded-full bg-accent/40 blur-3xl" />

      <div className={`relative ${LANDING_CONTAINER} py-20 sm:py-28`}>
        <div className={LANDING_HERO_TEXT}>
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border border-primary/20 bg-primary/5 px-3 py-1 text-primary"
          >
            <Shield className="size-3.5" />
            Réforme facturation électronique 2026
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            La conformité facture,{" "}
            <span className="bg-gradient-to-r from-primary to-[oklch(0.55_0.15_200)] bg-clip-text text-transparent">
              pilotée par l&apos;IA
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            InvoicePilot AI sécurise votre chaîne de facturation : validation avant émission,
            connexion aux plateformes agréées et réponses instantanées aux questions réglementaires.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full gap-2 sm:w-auto" asChild>
              <Link to="/signup">
                Démarrer gratuitement
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href={getDocsUrl()} target="_blank" rel="noreferrer">
                Voir la doc API
              </a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {highlights.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <a
          href="/login"
          className="mx-auto mt-16 block max-w-4xl transition-opacity hover:opacity-95"
        >
          <div className="rounded-xl border border-border/80 bg-card p-1 shadow-2xl shadow-primary/5">
            <div className="rounded-lg bg-muted p-4 dark:bg-[oklch(0.19_0.004_285)] sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-400/80" />
                <div className="size-3 rounded-full bg-yellow-400/80" />
                <div className="size-3 rounded-full bg-green-400/80" />
                <span className="ml-2 text-xs text-muted-foreground dark:text-white/40">
                  dashboard.invoicepilot.ai
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardStat label="Factures validées" value="1 247" trend="+12%" positive />
                <DashboardStat label="Erreurs bloquées" value="38" trend="-67%" positive />
                <DashboardStat label="Score conformité" value="98,4%" trend="+2,1%" positive />
                <DashboardStat label="Clients / PA" value="86 · 1" trend="PA active" positive />
              </div>
              <div className="mt-4 rounded-lg border border-border/60 bg-background/60 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Shield className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Agent IA — Analyse en cours</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground dark:text-white/50">
                      SIRET client vérifié ✓ · TVA intracommunautaire valide ✓ · Mentions
                      obligatoires présentes ✓ · Format Factur-X conforme ✓
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}

function DashboardStat({
  label,
  value,
  trend,
  positive,
}: {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-4 dark:border-white/10 dark:bg-white/5">
      <p className="text-xs text-muted-foreground dark:text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p
        className={`mt-1 text-xs ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}
      >
        {trend}
      </p>
    </div>
  );
}
