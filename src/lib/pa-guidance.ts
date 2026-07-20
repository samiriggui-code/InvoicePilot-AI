/** Reco PA à l’inscription — tags sur approved_platforms.recommendTags */

export type PaGuidanceAnswers = {
  monthlyVolume: number | null;
  wantsFree: boolean;
  alreadyBank: boolean; // Qonto, Shine…
  alreadyAccounting: boolean; // Pennylane, Indy…
  purpose: "EMISSION" | "RECEPTION" | "BOTH";
};

export type PaSuggestion = {
  slug: string;
  name: string;
  reason: string;
};

const FALLBACK: PaSuggestion[] = [
  {
    slug: "qonto",
    name: "Qonto",
    reason: "Souvent gratuit / illimité pour TPE avec compte pro.",
  },
  {
    slug: "pennylane",
    name: "Pennylane",
    reason: "Fort pour PME déjà en compta collaborative.",
  },
  {
    slug: "indy",
    name: "Indy",
    reason: "Adapté indépendants / micro-entreprises.",
  },
];

export function suggestPlatforms(answers: PaGuidanceAnswers): PaSuggestion[] {
  const out: PaSuggestion[] = [];

  if (answers.wantsFree || (answers.monthlyVolume != null && answers.monthlyVolume < 50)) {
    out.push(FALLBACK[0]);
  }
  if (answers.alreadyBank) {
    out.push({
      slug: "qonto",
      name: "Qonto",
      reason: "Vous avez déjà un compte banque pro — PA intégrée possible.",
    });
    out.push({
      slug: "shine",
      name: "Shine",
      reason: "Alternative banque pro + facturation.",
    });
  }
  if (answers.alreadyAccounting) {
    out.push(FALLBACK[1]);
  }
  if (answers.purpose === "RECEPTION" && out.length === 0) {
    out.push({
      slug: "pennylane",
      name: "Pennylane",
      reason: "Bonne couverture réception + workflow comptable.",
    });
  }

  if (out.length === 0) {
    return FALLBACK;
  }

  // dédoublonner par slug
  const seen = new Set<string>();
  return out
    .filter((s) => {
      if (seen.has(s.slug)) return false;
      seen.add(s.slug);
      return true;
    })
    .slice(0, 3);
}

export const SOURCE_OPTIONS = [
  { id: "SHOPIFY", label: "Shopify", hint: "Commandes e-commerce" },
  { id: "WOOCOMMERCE", label: "WooCommerce", hint: "WordPress boutique" },
  { id: "WIX", label: "Wix", hint: "Site + boutique" },
  { id: "PRESTASHOP", label: "PrestaShop", hint: "Boutique FR" },
  { id: "GENERIC_HTTP", label: "API / ERP custom", hint: "Webhook ou HTTP" },
  { id: "MANUAL_UPLOAD", label: "Saisie / PDF", hint: "Sans connecteur" },
  { id: "API_PUSH", label: "Mon logiciel pousse vers InvoicePilot", hint: "API /v1" },
] as const;
