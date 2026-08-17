import { ArrowRight, CheckCircle2, Shield } from "lucide-react";

import { InvoiceAnalysisProgress } from "@/components/agent/InvoiceAnalysisProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const highlights = [
  "Conforme Factur-X & UBL",
  "Intégration PDP agréées",
  "Agent IA réglementaire",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.45_0.18_255/0.12),transparent)]" />
      <div className="pointer-events-none absolute -right-32 top-20 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 size-72 rounded-full bg-accent/40 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
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
            connexion aux plateformes agréées et réponses instantanées aux questions
            réglementaires.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="w-full gap-2 sm:w-auto">
              Démarrer gratuitement
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Voir la démo API
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

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-xl border border-border/80 bg-card p-1 shadow-2xl shadow-primary/5">
            <div className="rounded-lg bg-[oklch(0.15_0.04_260)] p-4 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-400/80" />
                <div className="size-3 rounded-full bg-yellow-400/80" />
                <div className="size-3 rounded-full bg-green-400/80" />
                <span className="ml-2 text-xs text-white/40">dashboard.invoicepilot.ai</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <DashboardStat label="Factures validées" value="1 247" trend="+12%" positive />
                <DashboardStat label="Erreurs bloquées" value="38" trend="-67%" positive />
                <DashboardStat label="Score conformité" value="98,4%" trend="+2,1%" positive />
              </div>
              <InvoiceAnalysisProgress running tone="dark" className="mt-4" />
            </div>
          </div>
        </div>
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
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      <p className={`mt-1 text-xs ${positive ? "text-emerald-400" : "text-red-400"}`}>{trend}</p>
    </div>
  );
}
