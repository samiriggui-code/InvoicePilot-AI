import { Bot, CheckCircle2, FileSearch, Scale, ShieldAlert, Sparkles } from "lucide-react";

import {
  CtaBand,
  FeatureCards,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";

export function AnalyseIaPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Produit"
        title="Analyse IA & heuristique"
        description="Avant d’envoyer vers votre plateforme agréée, InvoicePilot lit vos factures, propose les champs clés, puis applique les règles réforme 2026. L’IA accélère ; l’humain valide ; les contrôles bloquent le risque."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href="/signup">Essayer l’analyse</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/faq#agent">Voir la FAQ Analyse IA</a>
            </Button>
          </>
        }
      />

      <Section>
        <SectionHeader
          eyebrow="Comment ça marche"
          title="Trois couches, un verdict clair"
          description="Passé, Bloqué ou À analyser — une file unique pour toutes vos ventes importées."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              step: "1",
              title: "Extraction",
              body: "L’IA (ou l’heuristique locale) lit le PDF / ticket et propose SIREN, montants, dates, lignes.",
            },
            {
              step: "2",
              title: "Contrôles",
              body: "Les règles réforme 2026 s’appliquent en dur : mentions, cohérence, acheteur — pas une opinion libre.",
            },
            {
              step: "3",
              title: "Verdict",
              body: "Vous corrigez si besoin, puis vous envoyez les factures Passé vers votre PA.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-border/80 bg-card p-6 text-center transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Étape {item.step}
              </p>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="IA & heuristique"
          title="Pourquoi les deux ?"
          description="L’IA propose. L’heuristique sécurise. Les règles métier tranchent."
        />
        <FeatureCards
          columns={2}
          items={[
            {
              icon: Bot,
              title: "Analyse IA",
              description:
                "Lit les factures sources, extrait les champs, rattache ou crée un acheteur dans Mes clients.",
            },
            {
              icon: FileSearch,
              title: "Heuristique",
              description:
                "Filet de sécurité quand l’IA n’est pas disponible : lecture structurée locale pour ne jamais bloquer le parcours.",
            },
            {
              icon: Scale,
              title: "Règles réforme 2026",
              description:
                "SIREN, montants, mentions — le verdict ne repose pas sur une « hallucination », mais sur des contrôles produit.",
            },
            {
              icon: ShieldAlert,
              title: "Bloqué = à corriger",
              description:
                "Une facture bloquée n’est pas perdue : vous corrigez, vous relancez, puis vous émettez vers la PA.",
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Dans l’app"
          title="Ce que vous voyez au quotidien"
          description="Module « Mon analyse IA » — après Sources, avant Émission PA."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Sparkles,
              t: "À analyser",
              d: "Factures fraîchement importées, en attente de premier passage.",
            },
            {
              icon: CheckCircle2,
              t: "Passé",
              d: "Prêtes pour Mon émission PA — format et mentions OK.",
            },
            {
              icon: ShieldAlert,
              t: "Bloqué",
              d: "Écart détecté (SIREN, montant, mention…) — corriger puis relancer.",
            },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Testez sur vos propres factures"
        description="Importez un PDF dans Sources, lancez l’analyse, voyez le verdict avant tout dépôt PA."
        primary={{ label: "Créer un compte", href: "/signup" }}
        secondary={{ label: "FAQ produit", href: "/faq" }}
      />
    </MarketingPage>
  );
}
