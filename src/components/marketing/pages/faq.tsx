import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  CtaBand,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { getLandingFaqSections } from "@/lib/page-guides";

const FLOW = [
  {
    step: "1",
    title: "Configurer",
    body: "Sources, clients et plateforme agréée — brancher les entrées et la PA.",
  },
  {
    step: "2",
    title: "Analyser",
    body: "Analyse IA : extraction, mentions, verdict Passé / Bloqué.",
  },
  {
    step: "3",
    title: "Émettre & recevoir",
    body: "Émission vers la PA, réception fournisseurs, e-reporting si besoin.",
  },
];

/**
 * FAQ produit (landing) — même pattern que Guide réforme / Fonctionnalités :
 * hero + SectionHeader centrés, contenu dans la grille max-w-6xl.
 */
export function FaqProduitPage() {
  const sections = getLandingFaqSections();

  return (
    <MarketingPage>
      <PageHero
        eyebrow="Ressources"
        title="FAQ & guide produit"
        description="InvoicePilot AI prépare votre conformité e-facture 2026 : sources, analyse, clients, puis dépôt via votre plateforme agréée. Voici le lexique des pages et les réponses utiles — sans jargon technique."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href="/signup">Créer un compte</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/guide-reforme-2026">Guide réforme 2026</a>
            </Button>
          </>
        }
      />

      <Section>
        <SectionHeader
          eyebrow="En bref"
          title="Ce que fait l’application"
          description="Solution compatible — pas une plateforme agréée. On orchestre ; votre PA dépose."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {FLOW.map((item) => (
            <div
              key={item.step}
              className="rounded-xl border border-border/80 bg-card p-6 text-center transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Étape {item.step}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          <strong className="font-medium text-foreground">PA</strong> = plateforme agréée : c’est
          elle qui échange avec le réseau public. InvoicePilot valide et prépare les flux avant ce
          dépôt.
        </p>
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Lexique"
          title="Les pages de l’application"
          description="Chaque libellé du menu, expliqué en une phrase — dans l’ordre du parcours."
        />
        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {sections.map((section, index) => (
            <div
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-xl border border-border/80 bg-card p-6 sm:p-8"
            >
              <p className="text-xs font-semibold tabular-nums text-primary">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">{section.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.blurb}</p>
              <Accordion type="single" collapsible className="mt-6">
                {section.faq.map((item, faqIndex) => (
                  <AccordionItem key={item.title} value={`${section.id}-${faqIndex}`}>
                    <AccordionTrigger className="text-left text-sm">{item.title}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">
                      {item.text}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Prêt à parcourir le produit ?"
        description="Essai Pro 14 jours — même parcours que décrit ci-dessus."
        primary={{ label: "Créer un compte", href: "/signup" }}
        secondary={{ label: "Voir les tarifs", href: "/#tarifs" }}
      />
    </MarketingPage>
  );
}
