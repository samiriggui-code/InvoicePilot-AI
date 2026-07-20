import { BookOpen, Building, FileWarning, Scale } from "lucide-react";

import {
  CtaBand,
  FeatureCards,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
  Timeline,
} from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";
import { docsHref } from "@/lib/docs-url";

export function GuideReformePage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Ressources"
        title="Guide opérationnel — réforme 2026"
        description="Calendrier, rôles PA / PPF / solution compatible, formats et mentions. Pour dirigeants, DSI et cabinets — pas un PDF marketing creux."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href="/signup">Lancer mon diagnostic</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href={docsHref("/reforme-2026")} target="_blank" rel="noreferrer">
                Version développeur
              </a>
            </Button>
          </>
        }
      />

      <Section>
        <SectionHeader
          eyebrow="Calendrier"
          title="Dates à graver"
          description="Les obligations de réception et d’émission ne tombent pas le même jour selon la taille."
        />
        <Timeline
          items={[
            {
              date: "1er septembre 2026",
              title: "Réception pour tous",
              body: "Tout assujetti à la TVA doit pouvoir recevoir des e-factures via le réseau PA / PPF.",
            },
            {
              date: "1er septembre 2026",
              title: "Émission GE & ETI",
              body: "Grandes entreprises et ETI doivent émettre en format électronique via une PA.",
            },
            {
              date: "1er septembre 2027",
              title: "Émission PME & micro",
              body: "PME et micro-entreprises rejoignent l’obligation d’émission.",
            },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Architecture"
          title="Trois rôles à ne jamais mélanger"
          description="PA, PPF et solution compatible ne sont pas interchangeables."
        />
        <FeatureCards
          items={[
            {
              icon: Building,
              title: "Plateforme agréée (PA)",
              description:
                "Opérateur d’échange immatriculé DGFiP. C’est elle qui transmet légalement les factures.",
              color: "bg-primary/10 text-primary",
            },
            {
              icon: Scale,
              title: "PPF",
              description:
                "Annuaire + concentrateur. Plus d’échange gratuit de factures via le portail public.",
              color: "bg-[oklch(0.55_0.15_200/0.12)] text-[oklch(0.45_0.12_200)]",
            },
            {
              icon: BookOpen,
              title: "Solution compatible",
              description:
                "Logiciel (nous) qui produit et contrôle des factures conformes, puis se connecte à une PA.",
              color: "bg-[oklch(0.55_0.18_300/0.12)] text-[oklch(0.45_0.14_300)]",
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Mentions"
          title="Quatre mentions bloquantes à l’émission"
          description="Mieux vaut refuser ici que chez la PA."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {[
            "SIREN du client (B2B)",
            "Catégorie d’opération (biens / services / mixte)",
            "Option taxe d’après les débits, si applicable",
            "Adresse de livraison si ≠ facturation",
          ].map((m, i) => (
            <div
              key={m}
              className="flex gap-4 rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <p className="self-center text-sm font-medium leading-relaxed">{m}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <FileWarning className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-muted-foreground">
            Formats structurés attendus : Factur-X, UBL ou CII. Un PDF seul par e-mail ne remplit
            plus l’obligation d’échange.
          </p>
        </div>
      </Section>

      <CtaBand
        title="Passez du guide à l’action"
        description="Le diagnostic InvoicePilot calcule vos échéances selon taille, TVA et flux B2C / export."
        primary={{ label: "Créer un compte", href: "/signup" }}
        secondary={{ label: "Webinaires", href: "/webinaires" }}
      />
    </MarketingPage>
  );
}
