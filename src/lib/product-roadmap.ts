/**
 * Cartographie produit InvoicePilot AI — promesses landing → modules applicatifs.
 * Aligné sur la réforme facturation électronique (economie.gouv.fr, sept. 2026).
 */
export const productModules = [
  {
    id: "compliance-api",
    landingPromise: "API de conformité Factur-X & UBL",
    route: "docs",
    status: "demo" as const,
    description:
      "Validation structurée avant émission : SIREN/SIRET, mentions obligatoires 2026, formats normés. Doc Mintlify (apps/docs).",
  },
  {
    id: "ai-agent",
    landingPromise: "Agent IA réglementaire",
    route: "/dashboard",
    status: "demo" as const,
    description:
      "Assistant juridique en sheet : base DGFiP, calendrier, mentions 2026, PA vs solution compatible.",
  },
  {
    id: "pdp",
    landingPromise: "Intégration plateformes agréées (PDP)",
    route: "/platforms",
    status: "demo" as const,
    description:
      "Émission + réception sandbox (inbox fournisseurs) — InvoicePilot reste solution compatible.",
  },
  {
    id: "error-detection",
    landingPromise: "Détection et blocage d'erreurs",
    route: "/dashboard",
    status: "demo" as const,
    description:
      "Bloque SIRET invalide, TVA incorrecte, mentions manquantes avant transmission PDP.",
  },
  {
    id: "dashboard",
    landingPromise: "Tableau de bord conformité temps réel",
    route: "/dashboard",
    status: "demo" as const,
    description: "Score, tendances, factures récentes — démo SaaS interactive Dupont Conseil.",
  },
  {
    id: "connectors",
    landingPromise: "Connecteurs Shopify, Odoo, Sage…",
    route: "/integrations",
    status: "demo" as const,
    description:
      "Shopify + WooCommerce sandbox — sync commandes → factures → pipeline remediation.",
  },
  {
    id: "e-reporting",
    landingPromise: "Transmission données transaction & paiement",
    route: "/e-reporting",
    status: "demo" as const,
    description: "Lots e-reporting transaction (période) + transmission sandbox via PA.",
  },
  {
    id: "archive",
    landingPromise: "Archive documentaire Factur-X + journal",
    route: "/invoices",
    status: "demo" as const,
    description: "Conservation locale sandbox : XML Factur-X, journal contrôles, snapshot payload.",
  },
  {
    id: "pricing",
    landingPromise: "Plans Starter / Pro / Enterprise + essai gratuit",
    route: "/#tarifs",
    status: "demo" as const,
    description: "Stripe checkout, licences API éditeurs, offre cabinets multi-dossiers.",
  },
] as const;

export const regulatoryMilestones = [
  {
    date: "1er septembre 2026",
    obligation: "Réception e-factures pour toutes les entreprises",
  },
  {
    date: "1er septembre 2026",
    obligation: "Émission + e-reporting pour GE et ETI",
  },
  {
    date: "1er septembre 2027",
    obligation: "Émission + e-reporting pour TPE/PME et micro-entreprises",
  },
] as const;

export const newMandatoryMentions2026 = [
  "Numéro SIREN du client",
  "Catégorie d'opération (vente, prestation, mixte)",
  "Option TVA sur les débits (si applicable)",
  "Adresse de livraison si différente de la facturation",
] as const;
