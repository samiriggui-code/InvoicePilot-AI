import { Building2, Layers, ShieldCheck, Users } from "lucide-react";

import {
  CtaBand,
  FeatureCards,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
  StatStrip,
} from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";

export function LicencesApiPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Entreprise · Éditeurs"
        title="Licences — conformité dans votre logiciel"
        description="Intégrez la couche conformité e-facture 2026 dans votre ERP ou logiciel de facturation. Vous gardez l’expérience utilisateur ; InvoicePilot valide et prépare avant dépôt via la PA de votre client."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href="/contact">Demander une licence</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/#tarifs">Voir les tarifs SaaS</a>
            </Button>
          </>
        }
      />

      <Section>
        <StatStrip
          items={[
            { value: "SC", label: "Vous restez éditeur — pas une PA" },
            { value: "2026", label: "Mentions & formats réforme" },
            { value: "B2B", label: "Licence volume sur devis" },
            { value: "FR", label: "Accompagnement commercial FR" },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Offre"
          title="Ce que couvre une licence"
          description="Une offre commerciale pour embarquer InvoicePilot dans votre produit — sans jargon technique."
        />
        <FeatureCards
          columns={2}
          items={[
            {
              icon: ShieldCheck,
              title: "Contrôles conformité",
              description:
                "Mentions obligatoires, identification acheteur, cohérence des montants — avant que la facture parte vers la PA.",
            },
            {
              icon: Layers,
              title: "Formats structurés",
              description:
                "Préparation Factur-X / UBL pour que vos clients déposent sans rejet côté plateforme agréée.",
            },
            {
              icon: Building2,
              title: "Multi-clients / multi-dossiers",
              description:
                "Adapté aux éditeurs qui servent des PME, ETI ou cabinets avec plusieurs SIREN.",
            },
            {
              icon: Users,
              title: "Accompagnement go-to-market",
              description:
                "Positionnement SC vs PA clarifié pour vos équipes commerciales et votre documentation produit.",
            },
          ]}
        />
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Pour qui"
          title="Éditeurs, intégrateurs, marketplaces"
          description="Si vous vendez un logiciel de facturation ou d’ERP et que vos clients devront émettre en e-facture, la licence évite de reconstruire toute la couche conformité."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              t: "Éditeurs ERP / facturation",
              d: "Ajoutez la conformité 2026 dans votre roadmap sans devenir plateforme agréée.",
            },
            {
              t: "Intégrateurs SI",
              d: "Déployez une couche unique pour plusieurs clients ou cabinets du portefeuille.",
            },
            {
              t: "Marketplaces & plateformes",
              d: "Sécurisez les flux vendeurs avant routage vers la PA de chaque marchand.",
            },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <h3 className="text-lg font-semibold">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Parlons de votre volume"
        description="Licence adaptée à votre nombre de dossiers ou de factures. Réponse commerciale sous 2 jours ouvrés."
        primary={{ label: "Demander une licence", href: "/contact" }}
        secondary={{ label: "Offre cabinets", href: "/cabinets-comptables" }}
      />
    </MarketingPage>
  );
}
