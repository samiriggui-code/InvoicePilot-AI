import { Building2, Scale, ShieldCheck, Target, Users } from "lucide-react";

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
import { getDocsUrl } from "@/lib/docs-url";

export function AboutPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Entreprise"
        title="À propos d’InvoicePilot AI"
        description="Produit français de conformité e-facture : rendre la réforme 2026 actionnable sans se faire passer pour une plateforme agréée."
        actions={
          <>
            <Button size="lg" className="w-full gap-2 sm:w-auto" asChild>
              <a href="/signup">Essayer le produit</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="/contact">Nous contacter</a>
            </Button>
          </>
        }
      />

      <Section>
        <StatStrip
          items={[
            { value: "SC", label: "Solution compatible — pas une PA" },
            { value: "2026", label: "Réforme e-facture au cœur du produit" },
            { value: "14 j", label: "Essai Pro sans carte bancaire" },
            { value: "FR", label: "Conçu et opéré en France" },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Mission"
          title="Contrôler avant d’émettre, brancher ensuite la PA"
          description="Le réseau d’échange appartient aux plateformes agréées. Notre job : diagnostic, mentions 2026, formats structurés, score de conformité et intégration — pour que le dépôt PA ne soit plus une loterie."
        />
        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-6 sm:p-8">
            <h3 className="text-lg font-semibold">Ce que nous faisons</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                Validation Factur-X / UBL / CII et mentions bloquantes
              </li>
              <li className="flex gap-3">
                <Scale className="mt-0.5 size-4 shrink-0 text-primary" />
                Positionnement juridique clair : SC ≠ PA ≠ PPF
              </li>
              <li className="flex gap-3">
                <Target className="mt-0.5 size-4 shrink-0 text-primary" />
                API sandbox pour éditeurs et cabinets multi-dossiers
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Ce que nous ne sommes pas
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              InvoicePilot AI n’est pas une plateforme agréée DGFiP. Nous ne remplaçons pas votre
              contrat d’échange. Le PPF reste annuaire et concentrateur — plus d’échange gratuit.
              Votre PA exécute la transmission ; nous préparons le flux pour qu’il passe.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <a href={getDocsUrl()} target="_blank" rel="noreferrer">
                Lire la doc développeur
              </a>
            </Button>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Pour qui"
          title="Trois publics, une même exigence de conformité"
          description="Chaque persona a son parcours — le fil rouge reste la réforme 2026."
        />
        <FeatureCards
          columns={3}
          items={[
            {
              icon: Building2,
              title: "PME & ETI",
              description:
                "Diagnostic d’échéances, checklist, contrôles avant émission, connexion PA sandbox puis production.",
              color: "bg-primary/10 text-primary",
            },
            {
              icon: Users,
              title: "Cabinets comptables",
              description:
                "Multi-dossiers par SIREN, vue des blocages, accompagnement choix PA — sans porter l’échange vous-même.",
              color: "bg-[oklch(0.55_0.15_200/0.12)] text-[oklch(0.45_0.12_200)]",
            },
            {
              icon: ShieldCheck,
              title: "Éditeurs & intégrateurs",
              description:
                "Licences API validate / score / webhooks pour embarquer la conformité dans l’ERP sans devenir PA.",
              color: "bg-[oklch(0.55_0.18_300/0.12)] text-[oklch(0.45_0.14_300)]",
            },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Principes"
          title="Comment on construit le produit"
          description="Quatre règles non négociables — elles structurent le backlog autant que le positionnement commercial."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {[
            {
              n: "01",
              t: "Clarté juridique",
              d: "Jamais se présenter comme PA. Chaque écran rappelle le rôle de la plateforme agréée pour l’échange.",
            },
            {
              n: "02",
              t: "Contrôler avant d’émettre",
              d: "Les mentions 2026 et formats structurés bloquent ici — pas après un rejet PA coûteux.",
            },
            {
              n: "03",
              t: "Multi-tenant dès le jour 1",
              d: "Une organisation = un SIREN. Les cabinets et éditeurs s’appuient sur la même isolation.",
            },
            {
              n: "04",
              t: "API réelle, pas une démo figée",
              d: "Sandbox OpenAPI + Mintlify branchés sur l’app — les intégrateurs prototyptent tout de suite.",
            },
          ].map((item) => (
            <div
              key={item.n}
              className="group rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                {item.n}
              </p>
              <h3 className="mt-4 text-lg font-semibold">{item.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Prêt à préparer septembre 2026 ?"
        description="Créez un compte essai, lancez le diagnostic réforme, testez l’API sandbox."
        primary={{ label: "Essai gratuit", href: "/signup" }}
        secondary={{ label: "Contact commercial", href: "/contact" }}
      />
    </MarketingPage>
  );
}
