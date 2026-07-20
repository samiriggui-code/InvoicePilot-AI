import { ClipboardCheck, FolderKanban, LineChart, Users } from "lucide-react";

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

export function CabinetsPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Entreprise · Cabinets"
        title="Pilotez la réforme 2026 sur tout le portefeuille"
        description="Vos clients n’ont pas la même date d’émission. InvoicePilot isole chaque dossier (SIREN), surface les blocages, et laisse la PA du client porter l’échange."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <a href="/signup">Créer un compte essai</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/contact">Demander l’offre cabinet</a>
            </Button>
          </>
        }
      />

      <Section>
        <StatStrip
          items={[
            { value: "10+", label: "Dossiers pour tarifs dégressifs" },
            { value: "GE→micro", label: "Échéances mixtes dans un même cabinet" },
            { value: "SC", label: "Vous n’êtes pas la PA du client" },
            { value: "14 j", label: "Essai Pro pour prototyper" },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Offre"
          title="Ce que le collaborateur voit chaque matin"
          description="Moins de relances manuelles, plus de signaux conformité avant le 01/09/2026."
        />
        <FeatureCards
          items={[
            {
              icon: FolderKanban,
              title: "Multi-dossiers",
              description:
                "Un tenant par organisation. Intervention admin / collaborateur selon le mandat.",
            },
            {
              icon: ClipboardCheck,
              title: "Checklist Module A",
              description:
                "Taille, TVA, B2C / export → échéances personnalisées partagées avec le client.",
            },
            {
              icon: LineChart,
              title: "Vue conformité",
              description:
                "Score, factures bloquées, PA non branchée — priorisez les dossiers à risque.",
            },
            {
              icon: Users,
              title: "Onboarding PA",
              description:
                "Accompagnement au choix d’une plateforme agréée — sans confusion avec notre rôle SC.",
            },
          ]}
          columns={2}
        />
      </Section>

      <CtaBand
        title="Activez l’offre cabinets"
        description="Démarrez l’essai, puis contactez-nous pour le packing multi-dossiers et le reporting."
        primary={{ label: "Essai gratuit", href: "/signup" }}
        secondary={{ label: "Parler à l’équipe", href: "/contact" }}
      />
    </MarketingPage>
  );
}
