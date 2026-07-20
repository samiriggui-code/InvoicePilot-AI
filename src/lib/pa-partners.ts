/**
 * Vérité produit : InvoicePilot = Solution Compatible (pas une PA).
 *
 * Toutes les PA ont une interco PPF (agrément). Une API ouverte aux éditeurs
 * tiers n’est pas universelle — voir `pa-api-registry.ts`.
 *
 * UX : après choix d’une PA → sheet credentials (générique OAuth/clé, spécial Qonto).
 */

import { getPaApiRegistry, type PaApiMaturity } from "@/lib/pa-api-registry";

export type PaConnectCapability = "sandbox" | "partner_api" | "declare_only";

export type PaPartnerMeta = {
  slug: string;
  capability: PaConnectCapability;
  authHint: string;
  docsUrl?: string;
  canTransmit: boolean;
  apiMaturity: PaApiMaturity;
};

function maturityToCapability(m: PaApiMaturity): PaConnectCapability {
  if (m === "partner_docs" || m === "api_first" || m === "enterprise_partner") {
    return "partner_api";
  }
  // saas_user_api + unknown → on propose quand même le branchement credentials
  return "partner_api";
}

export const PA_PARTNER_META: Record<string, PaPartnerMeta> = {
  "invoicepilot-sandbox": {
    slug: "invoicepilot-sandbox",
    capability: "sandbox",
    authHint: "Aucun credential — simulation locale des flux PA.",
    canTransmit: true,
    apiMaturity: "unknown",
  },
};

export function getPaPartnerMeta(slug: string): PaPartnerMeta {
  if (slug === "invoicepilot-sandbox") return PA_PARTNER_META["invoicepilot-sandbox"]!;

  const reg = getPaApiRegistry(slug);
  const capability = maturityToCapability(reg.maturity);
  return {
    slug,
    capability,
    authHint: reg.authHint,
    docsUrl: reg.docsUrl,
    canTransmit: capability === "partner_api",
    apiMaturity: reg.maturity,
  };
}

/** credentialsRef : mode:sandbox | mode:declared | mode:apikey:<sha256> */
export function parseCredentialsMode(
  ref: string | null | undefined,
): "sandbox" | "declared" | "apikey" | "unknown" {
  if (!ref) return "unknown";
  if (ref === "demo-sandbox" || ref.startsWith("mode:sandbox")) return "sandbox";
  if (ref === "pending" || ref.startsWith("mode:declared")) return "declared";
  if (ref.startsWith("mode:apikey:")) return "apikey";
  return "unknown";
}

export function canConnectionTransmit(credentialsRef: string | null | undefined): boolean {
  const mode = parseCredentialsMode(credentialsRef);
  return mode === "sandbox" || mode === "apikey";
}
