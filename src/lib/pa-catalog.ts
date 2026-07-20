import { getPaPartnerMeta } from "@/lib/pa-partners";
import { PA_LOGO_FILES } from "@/lib/pa-logos.generated";
import { media } from "@/lib/media";

export type PaCatalogEntry = {
  slug: string;
  name: string;
  logoUrl: string;
  capability: ReturnType<typeof getPaPartnerMeta>["capability"];
  canTransmit: boolean;
  apiMaturity: ReturnType<typeof getPaPartnerMeta>["apiMaturity"];
  authHint: string;
  docsUrl?: string;
};

/** PA mises en avant (TPE / connues) — le reste reste cherchable. */
export const PA_FEATURED_SLUGS = [
  "qonto",
  "pennylane",
  "indy",
  "tiime",
  "shine",
  "sellsy",
  "axonaut",
  "abby",
  "dougs",
  "sage",
  "cegid",
  "odoo",
  "seqino",
  "b2brouter",
  "yooz",
  "lucca",
  "flowie",
  "spendesk",
  "agicap",
  "iopole",
  "esker",
  "basware",
  "fulll",
  "dext",
] as const;

const DISPLAY_NAMES: Record<string, string> = {
  qonto: "Qonto",
  pennylane: "Pennylane",
  indy: "Indy",
  tiime: "Tiime",
  shine: "Shine",
  sellsy: "Sellsy",
  axonaut: "Axonaut",
  abby: "Abby",
  dougs: "Dougs",
  sage: "Sage",
  cegid: "Cegid",
  odoo: "Odoo",
  seqino: "Seqino",
  b2brouter: "B2Brouter",
  yooz: "Yooz",
  lucca: "Lucca",
  flowie: "Flowie",
  spendesk: "Spendesk",
  agicap: "Agicap",
  iopole: "Iopole",
  esker: "Esker",
  basware: "Basware",
  fulll: "Fulll",
  dext: "Dext",
  "chorus-pro": "Chorus Pro",
};

function titleFromSlug(slug: string): string {
  if (DISPLAY_NAMES[slug]) return DISPLAY_NAMES[slug]!;
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Catalogue UI — logos téléchargés + capacité API connue. */
export function listPaCatalog(): PaCatalogEntry[] {
  return (Object.keys(PA_LOGO_FILES) as (keyof typeof PA_LOGO_FILES)[])
    .map((slug) => {
      const meta = getPaPartnerMeta(slug);
      return {
        slug,
        name: titleFromSlug(slug),
        logoUrl: media.paLogo(PA_LOGO_FILES[slug]),
        capability: meta.capability,
        canTransmit: meta.canTransmit,
        apiMaturity: meta.apiMaturity,
        authHint: meta.authHint,
        docsUrl: meta.docsUrl,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function searchPaCatalog(query: string, limit = 48): PaCatalogEntry[] {
  const all = listPaCatalog();
  const q = query.trim().toLowerCase();
  if (!q) {
    const featured = PA_FEATURED_SLUGS.map((s) => all.find((e) => e.slug === s)).filter(
      Boolean,
    ) as PaCatalogEntry[];
    const featuredSet = new Set<string>(PA_FEATURED_SLUGS);
    const rest = all.filter((e) => !featuredSet.has(e.slug));
    return [...featured, ...rest].slice(0, limit);
  }
  return all.filter((e) => e.name.toLowerCase().includes(q) || e.slug.includes(q)).slice(0, limit);
}
