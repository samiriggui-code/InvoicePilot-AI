/**
 * Registre API PA — recherche publique (mai–juil. 2026).
 *
 * Vérité DGFiP : TOUTES les PA ont une interconnexion technique PPF (obligation d’agrément).
 * Mais une API ouverte aux éditeurs tiers (Solution Compatible) n’est PAS universelle.
 *
 * Sources :
 * - https://compafacturation.com/api-facturation-electronique
 * - Docs éditeurs (Qonto PAaaS, Seqino, B2Brouter, SUPER PDP…)
 *
 * Auth typique observée : OAuth2 client_credentials / Bearer + parfois mTLS.
 * Flux générique : token → POST facture Factur-X/UBL → webhook / poll statut.
 */

export type PaApiMaturity =
  /** Doc publique + endpoints e-invoicing documentés pour intégrateurs */
  | "partner_docs"
  /** Positionnement API-first / marque grise explicite */
  | "api_first"
  /** SaaS utilisateur : API produit possible, pas forcément PAaaS éditeur */
  | "saas_user_api"
  /** EDI / enterprise — API sur devis / portail partenaire */
  | "enterprise_partner"
  /** Pas de doc partenaire e-invoicing trouvée — credentials stockables, connecteur à brancher */
  | "unknown";

export type PaApiRegistryEntry = {
  slug: string;
  maturity: PaApiMaturity;
  authHint: string;
  docsUrl?: string;
};

/**
 * PA pour lesquelles une API / portail développeur est documenté publiquement.
 * Le reste du catalogue = unknown (sheet générique quand même).
 */
export const PA_API_REGISTRY: Record<string, PaApiRegistryEntry> = {
  qonto: {
    slug: "qonto",
    maturity: "partner_docs",
    authHint: "PAaaS — OAuth Bearer. bulk Factur-X → send_by_einvoice · GET supplier_invoices.",
    docsUrl: "https://docs.qonto.com/qonto-embed/plateforme-agreee-as-a-service",
  },
  seqino: {
    slug: "seqino",
    maturity: "api_first",
    authHint: "API marque grise / partenaire — clé API sandbox puis prod.",
    docsUrl:
      "https://dev-portal.seqino.dev/portal/catalogue-products/seqino-pdp-1/b4a01d315c59492f601ffcac91e1a2a6/docs",
  },
  b2brouter: {
    slug: "b2brouter",
    maturity: "api_first",
    authHint: "OpenAPI partenaire — sandbox + production.",
    docsUrl: "https://developer.b2brouter.net/docs/introduction",
  },
  "chorus-pro": {
    slug: "chorus-pro",
    maturity: "partner_docs",
    authHint: "API Chorus Pro B2G (Portail de services).",
    docsUrl: "https://www.data.gouv.fr/dataservices/api-chorus-pro",
  },
  "super-pdp": {
    slug: "super-pdp",
    maturity: "api_first",
    authHint: "Offre API explicite (tarification par facture) — brique infrastructure.",
    docsUrl: "https://www.superpdp.fr/",
  },
  iopole: {
    slug: "iopole",
    maturity: "api_first",
    authHint: "PA API / marque grise — credentials partenaire.",
  },
  docoon: {
    slug: "docoon",
    maturity: "enterprise_partner",
    authHint: "API / connecteurs EDI — accès partenaire.",
  },
  "quadient-serensia": {
    slug: "quadient-serensia",
    maturity: "api_first",
    authHint: "Serensia / Quadient — marque blanche + API.",
    docsUrl: "https://serensia.com/integrer-plateforme-agreee-marque-blanche/",
  },
  sovos: {
    slug: "sovos",
    maturity: "enterprise_partner",
    authHint: "API EDI e-invoicing — portail partenaire.",
  },
  esker: {
    slug: "esker",
    maturity: "enterprise_partner",
    authHint: "API / portail Esker — intégration entreprise.",
  },
  pagero: {
    slug: "pagero",
    maturity: "enterprise_partner",
    authHint: "API Peppol / e-invoicing — portail partenaire.",
  },
  storecove: {
    slug: "storecove",
    maturity: "api_first",
    authHint: "API Peppol / e-invoicing orientée développeurs.",
  },
  "tradeshift-babelway": {
    slug: "tradeshift-babelway",
    maturity: "enterprise_partner",
    authHint: "API Babelway / Tradeshift — partenaire.",
  },
  "edicom-france": {
    slug: "edicom-france",
    maturity: "enterprise_partner",
    authHint: "API EDI Edicom — partenaire.",
  },
  "edicom-group": {
    slug: "edicom-group",
    maturity: "enterprise_partner",
    authHint: "API EDI Edicom — partenaire.",
  },
  "generix-group": {
    slug: "generix-group",
    maturity: "enterprise_partner",
    authHint: "API / EDI Generix — partenaire.",
  },
  cegedim: {
    slug: "cegedim",
    maturity: "enterprise_partner",
    authHint: "API Cegedim e-invoicing — partenaire.",
  },
  "axway-software": {
    slug: "axway-software",
    maturity: "enterprise_partner",
    authHint: "API Axway — partenaire enterprise.",
  },
  basware: {
    slug: "basware",
    maturity: "enterprise_partner",
    authHint: "API Basware — portail partenaire.",
  },
  medius: {
    slug: "medius",
    maturity: "enterprise_partner",
    authHint: "API Medius — partenaire.",
  },
  yooz: {
    slug: "yooz",
    maturity: "enterprise_partner",
    authHint: "Intégration partenaire Yooz à négocier.",
  },
  pennylane: {
    slug: "pennylane",
    maturity: "saas_user_api",
    authHint:
      "API produit Pennylane (compta) — PAaaS e-invoicing éditeur non documenté ici. Clé / token si vous avez un accès partenaire.",
    docsUrl: "https://pennylane.readme.io/",
  },
  sellsy: {
    slug: "sellsy",
    maturity: "saas_user_api",
    authHint: "API Sellsy produit — accès partenaire e-invoicing selon contrat.",
  },
  sage: {
    slug: "sage",
    maturity: "saas_user_api",
    authHint: "Sage Connect / API — selon offre partenaire.",
  },
  cegid: {
    slug: "cegid",
    maturity: "saas_user_api",
    authHint: "API Cegid / Apidae — selon offre partenaire.",
  },
  indy: {
    slug: "indy",
    maturity: "saas_user_api",
    authHint: "SaaS Indy — API partenaire e-invoicing non documentée publiquement.",
  },
  tiime: {
    slug: "tiime",
    maturity: "saas_user_api",
    authHint: "SaaS Tiime — API partenaire e-invoicing non documentée publiquement.",
  },
  shine: {
    slug: "shine",
    maturity: "saas_user_api",
    authHint: "Shine — API partenaire e-invoicing non documentée publiquement.",
  },
  odoo: {
    slug: "odoo",
    maturity: "saas_user_api",
    authHint: "Odoo — connecteurs / API selon édition et module PA.",
  },
};

export function getPaApiRegistry(slug: string): PaApiRegistryEntry {
  return (
    PA_API_REGISTRY[slug] ?? {
      slug,
      maturity: "unknown",
      authHint:
        "Credentials génériques (clé API ou Bearer OAuth). Doc partenaire à confirmer — connecteur InvoicePilot spécifique pas encore branché.",
    }
  );
}

export function paApiAllowsGenericConnect(_maturity: PaApiMaturity): boolean {
  return true;
}
