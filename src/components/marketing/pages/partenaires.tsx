import { Handshake, Network, Puzzle } from "lucide-react";

import {
  CtaBand,
  FeatureCards,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";

export function PartenairesPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Entreprise"
        title="Partenaires PA, intégrateurs, éditeurs"
        description="Co-construire l’écosystème autour de la conformité — sans ambiguïté sur qui porte l’échange légal des factures."
        actions={
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <a href="/contact">Proposer un partenariat</a>
          </Button>
        }
      />

      <Section>
        <SectionHeader
          title="Profils prioritaires avant septembre 2026"
          description="Nous priorisons les intégrations qui réduisent le risque de non-conformité au 01/09/2026."
        />
        <FeatureCards
          items={[
            {
              icon: Network,
              title: "Plateformes agréées",
              description:
                "Sandbox credentials, mapping émission / réception, co-documentation du flux SC → PA.",
            },
            {
              icon: Puzzle,
              title: "Intégrateurs SI",
              description:
                "Déploiements multi-dossiers cabinets, connecteurs ERP, runbooks conformité.",
            },
            {
              icon: Handshake,
              title: "Éditeurs logiciels",
              description:
                "Licences API volume, co-marketing, landing technique Mintlify partagée.",
            },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Processus"
          title="Comment ça se passe"
          description="Un échange court, puis un plan d’intégration clair."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Brief",
              d: "Votre rôle (PA, SI, éditeur), volumes, échéance client.",
            },
            {
              n: "2",
              t: "Sandbox",
              d: "Accès API / mapping PA, tests validate → emit.",
            },
            {
              n: "3",
              t: "Go-live",
              d: "Contrat, credentials production, co-communication.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-xl border border-border/80 bg-card p-6 text-center transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Étape {s.n}
              </p>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Parlez-nous de votre rôle"
        description="Indiquez si vous êtes PA immatriculée, SI ou éditeur."
        primary={{ label: "Nous écrire", href: "/contact" }}
        secondary={{ label: "Licences API", href: "/licences-api" }}
      />
    </MarketingPage>
  );
}
