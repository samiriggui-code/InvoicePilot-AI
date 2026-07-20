import { Link } from "@tanstack/react-router";
import { Bot, GitBranch, Link2, Plug, ShieldCheck, Sparkles } from "lucide-react";

import {
  CtaBand,
  FeatureCards,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";
import { getDocsUrl } from "@/lib/docs-url";

export function FonctionnalitesPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Produit"
        title="La couche de conformité avant votre PA"
        description="Diagnostic, contrôles, formats structurés, score — puis transmission via la plateforme agréée que vous choisissez."
        actions={
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <a href="/signup">Essai Pro 14 jours</a>
          </Button>
        }
      />
      <Section>
        <SectionHeader
          title="Modules livrés"
          description="Alignés sur le cahier des charges réforme 2026."
        />
        <FeatureCards
          items={[
            {
              icon: ShieldCheck,
              title: "Contrôles bloquants",
              description: "SIREN, catégorie, débits, adresse de livraison — avant émission.",
            },
            {
              icon: Link2,
              title: "Connexion multi-PA",
              description: "Sandbox aujourd’hui, credentials production demain.",
            },
            {
              icon: Bot,
              title: "Agent IA réglementaire",
              description: "Questions sourcées sur calendrier, mentions, PA vs SC.",
            },
            {
              icon: Plug,
              title: "Connecteurs & API",
              description: "ERP, e-commerce, CRM — ou REST pour les éditeurs.",
            },
            {
              icon: Sparkles,
              title: "Score de conformité",
              description: "Pilotage temps réel du risque avant le 01/09/2026.",
            },
            {
              icon: GitBranch,
              title: "Pas une PA",
              description: "Solution compatible : l’échange légal reste chez votre PA.",
            },
          ]}
        />
      </Section>
      <CtaBand
        title="Voir le produit en action"
        description="Compte démo ou essai — même socle conformité."
        primary={{ label: "Créer un compte", href: "/signup" }}
        secondary={{ label: "Doc API", href: getDocsUrl() }}
      />
    </MarketingPage>
  );
}

export function ConnecteursPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Produit"
        title="Source → InvoicePilot → PA"
        description="Un connecteur n’est pas un raccourci magique. On normalise, on valide, puis on route vers la plateforme agréée."
        actions={
          <>
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/">Voir le hub sur la landing</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href={getDocsUrl()} target="_blank" rel="noreferrer">
                API REST (Mintlify)
              </a>
            </Button>
          </>
        }
      />
      <Section muted>
        <SectionHeader
          title="Catalogue"
          description="Shopify, WooCommerce, PrestaShop · Odoo, Dolibarr · Sage, Pennylane, QuickBooks · Stripe · HubSpot, Salesforce · API REST."
        />
        <FeatureCards
          columns={2}
          items={[
            {
              icon: Plug,
              title: "Mapping métier",
              description: "SIREN, lignes, taux TVA — avant les contrôles 2026.",
            },
            {
              icon: ShieldCheck,
              title: "Webhooks",
              description: "invoice.validated · blocked · emitted pour orchestrer.",
            },
          ]}
        />
      </Section>
      <CtaBand
        title="Besoin d’un connecteur sur mesure ?"
        description="Contactez-nous pour prioriser une source ou une PA de votre stack."
        primary={{ label: "Contact", href: "/contact" }}
        secondary={{ label: "Changelog", href: "/changelog" }}
      />
    </MarketingPage>
  );
}
