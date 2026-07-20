import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Circle,
  FileBarChart,
  FileSearch,
  FileText,
  Inbox,
  Plug,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Flags du parcours métier Sources → Analyse → Émission / ER → Réception. */
export type JourneyFlags = {
  sourceConnected: boolean;
  hasAnalyzed: boolean;
  hasEmittedOrReady: boolean;
  hasEReporting: boolean;
  hasReception: boolean;
  /** Conservé pour compat dashboard — PA reste dans Configurer */
  paConnected?: boolean;
};

const STEPS = [
  {
    n: "1",
    title: "Sources",
    body: "Charger / sync les factures (PDF, boutique…). Jamais d’émission ici.",
    href: "/integrations" as const,
    cta: "Ouvrir Sources",
    icon: Plug,
    flag: "sourceConnected" as const,
  },
  {
    n: "2",
    title: "Analyse IA",
    body: "Extraire, corriger, classer B2B / B2C — puis dispatch.",
    href: "/agent" as const,
    cta: "Ouvrir Analyse IA",
    icon: FileSearch,
    flag: "hasAnalyzed" as const,
  },
  {
    n: "3",
    title: "Émission PA",
    body: "Factures B2B prêtes — dépôt unitaire ou multi-sélection vers la PA.",
    href: "/invoices" as const,
    cta: "Ouvrir Émission",
    icon: FileText,
    flag: "hasEmittedOrReady" as const,
  },
  {
    n: "4",
    title: "E-reporting",
    body: "Lots B2C / export périodiques via la PA (pas de réception).",
    href: "/e-reporting" as const,
    cta: "Ouvrir E-reporting",
    icon: FileBarChart,
    flag: "hasEReporting" as const,
  },
  {
    n: "5",
    title: "Réception PA",
    body: "Factures fournisseurs reçues depuis la PA — approuver / refuser.",
    href: "/inbox" as const,
    cta: "Ouvrir Réception",
    icon: Inbox,
    flag: "hasReception" as const,
  },
] as const;

/** Process métier — aligné sur le menu Flux. */
export function ProductJourney({ flags }: { flags: JourneyFlags }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Process flux
          </p>
          <h2 className="text-base font-semibold tracking-tight">
            Sources → Analyse → Émission / E-reporting → Réception
          </h2>
        </div>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STEPS.map((step) => {
          const done = Boolean(flags[step.flag]);
          const Icon = step.icon;
          return (
            <li
              key={step.n}
              className={cn(
                "flex flex-col rounded-xl border p-4",
                done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/70",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant={done ? "default" : "outline"} className="text-[10px]">
                  {step.n}
                </Badge>
                {done ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <p className="text-sm font-semibold">{step.title}</p>
              </div>
              <p className="mb-3 flex-1 text-xs text-muted-foreground">{step.body}</p>
              <Button size="sm" variant={done ? "outline" : "default"} asChild>
                <Link to={step.href}>{step.cta}</Link>
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
