import type { ReactNode } from "react";

import { AboutPage } from "@/components/marketing/pages/about";
import { AnalyseIaPage } from "@/components/marketing/pages/analyse-ia";
import { BlogPage } from "@/components/marketing/pages/blog";
import { CabinetsPage } from "@/components/marketing/pages/cabinets";
import { ContactPage } from "@/components/marketing/pages/contact";
import { FaqProduitPage } from "@/components/marketing/pages/faq";
import { GuideReformePage } from "@/components/marketing/pages/guide-reforme";
import {
  CguPage,
  ConfidentialitePage,
  MentionsLegalesPage,
  RgpdPage,
} from "@/components/marketing/pages/legal";
import { LicencesApiPage } from "@/components/marketing/pages/licences-api";
import { PartenairesPage } from "@/components/marketing/pages/partenaires";
import { ConnecteursPage, FonctionnalitesPage } from "@/components/marketing/pages/produit";
import { ChangelogPage } from "@/components/marketing/pages/changelog";
import { StatusPage } from "@/components/marketing/pages/status";
import { WebinairesPage } from "@/components/marketing/pages/webinaires";

export type MarketingRouteMeta = {
  title: string;
  description: string;
  render: () => ReactNode;
};

export const MARKETING_ROUTES: Record<string, MarketingRouteMeta> = {
  // Produit
  fonctionnalites: {
    title: "Fonctionnalités",
    description:
      "Contrôles 2026, multi-PA, agent IA, connecteurs — solution compatible InvoicePilot AI.",
    render: () => <FonctionnalitesPage />,
  },
  connecteurs: {
    title: "Connecteurs",
    description: "ERP, e-commerce, CRM et API REST vers la conformité puis la PA.",
    render: () => <ConnecteursPage />,
  },
  changelog: {
    title: "Changelog",
    description:
      "Versioning InvoicePilot AI, chronologie des livraisons et avancement Sources / PA.",
    render: () => <ChangelogPage />,
  },
  "analyse-ia": {
    title: "Analyse IA & heuristique",
    description:
      "Extraction, contrôles réforme 2026 et verdict Passé / Bloqué avant dépôt vers votre PA.",
    render: () => <AnalyseIaPage />,
  },

  // Ressources
  faq: {
    title: "FAQ produit",
    description:
      "Lexique des pages InvoicePilot AI et FAQ par section — sans détail API technique.",
    render: () => <FaqProduitPage />,
  },
  "guide-reforme-2026": {
    title: "Guide réforme 2026",
    description:
      "Calendrier, PA / PPF / solution compatible, mentions bloquantes — guide opérationnel.",
    render: () => <GuideReformePage />,
  },
  blog: {
    title: "Blog",
    description: "Veille réforme e-facture et intégrations InvoicePilot AI.",
    render: () => <BlogPage />,
  },
  webinaires: {
    title: "Webinaires",
    description: "Sessions live cabinets, DSI et éditeurs — réforme 2026.",
    render: () => <WebinairesPage />,
  },
  status: {
    title: "Status",
    description: "Disponibilité des services InvoicePilot AI.",
    render: () => <StatusPage />,
  },

  // Entreprise
  "a-propos": {
    title: "À propos",
    description:
      "InvoicePilot AI — solution compatible française pour la facturation électronique 2026.",
    render: () => <AboutPage />,
  },
  "cabinets-comptables": {
    title: "Cabinets comptables",
    description: "Offre multi-dossiers réforme 2026 pour experts-comptables.",
    render: () => <CabinetsPage />,
  },
  "licences-api": {
    title: "Licences",
    description: "Licence conformité e-facture 2026 pour éditeurs ERP et logiciels de facturation.",
    render: () => <LicencesApiPage />,
  },
  partenaires: {
    title: "Partenaires",
    description: "Partenariats PA, intégrateurs et éditeurs autour d’InvoicePilot AI.",
    render: () => <PartenairesPage />,
  },
  contact: {
    title: "Contact",
    description: "Contacter InvoicePilot AI — API, cabinets, partenariats.",
    render: () => <ContactPage />,
  },

  // Légal
  "mentions-legales": {
    title: "Mentions légales",
    description: "Mentions légales InvoicePilot AI.",
    render: () => <MentionsLegalesPage />,
  },
  cgu: {
    title: "CGU",
    description: "Conditions générales d’utilisation InvoicePilot AI.",
    render: () => <CguPage />,
  },
  "politique-confidentialite": {
    title: "Confidentialité",
    description: "Politique de confidentialité InvoicePilot AI.",
    render: () => <ConfidentialitePage />,
  },
  rgpd: {
    title: "RGPD",
    description: "RGPD et sous-traitance — InvoicePilot AI.",
    render: () => <RgpdPage />,
  },
};

export function getMarketingRoute(slug: string): MarketingRouteMeta | null {
  return MARKETING_ROUTES[slug] ?? null;
}
