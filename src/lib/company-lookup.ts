/** Lookup entreprises FR via API Recherche d’entreprises (data.gouv) — facturation. */

export type CompanyLookupHit = {
  siren: string;
  siret: string | null;
  legalName: string;
  vatNumber: string | null;
  active: boolean;
  billingLine1: string | null;
  billingPostal: string | null;
  billingCity: string | null;
  billingCountry: string;
  nafCode: string | null;
  statusLabel: string;
};

type ApiResult = {
  siren?: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  sigle?: string | null;
  etat_administratif?: string;
  activite_principale?: string;
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    libelle_voie?: string;
    numero_voie?: string;
    type_voie?: string;
    complement_adresse?: string;
  };
  complements?: {
    liste_idcc?: string[];
  };
};

type ApiResponse = {
  results?: ApiResult[];
};

/** Clé TVA intracommunautaire FR à partir du SIREN. */
export function vatNumberFromSiren(siren: string): string | null {
  const s = siren.replace(/\s/g, "");
  if (!/^\d{9}$/.test(s)) return null;
  const key = (12 + 3 * (Number(s) % 97)) % 97;
  return `FR${String(key).padStart(2, "0")}${s}`;
}

function mapHit(r: ApiResult): CompanyLookupHit | null {
  const siren = (r.siren ?? "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(siren)) return null;

  const active = (r.etat_administratif ?? "A").toUpperCase() === "A";
  const siege = r.siege;
  const line1 =
    siege?.adresse?.trim() ||
    [siege?.numero_voie, siege?.type_voie, siege?.libelle_voie].filter(Boolean).join(" ").trim() ||
    null;

  return {
    siren,
    siret: siege?.siret?.replace(/\s/g, "").slice(0, 14) || null,
    legalName: (r.nom_complet || r.nom_raison_sociale || "").trim() || `SIREN ${siren}`,
    vatNumber: vatNumberFromSiren(siren),
    active,
    billingLine1: line1,
    billingPostal: siege?.code_postal ?? null,
    billingCity: siege?.libelle_commune ?? null,
    billingCountry: "FR",
    nafCode: r.activite_principale ?? null,
    statusLabel: active ? "Active" : "Cessée / inactive",
  };
}

/**
 * Recherche publique (pas de clé API).
 * @see https://recherche-entreprises.api.gouv.fr/docs/
 */
export async function searchFrenchCompanies(query: string, limit = 6): Promise<CompanyLookupHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://recherche-entreprises.api.gouv.fr/search");
  url.searchParams.set("q", q);
  url.searchParams.set("per_page", String(Math.min(10, Math.max(1, limit))));
  // Prioriser les sièges actifs quand possible
  url.searchParams.set("etat_administratif", "A");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Lookup entreprise indisponible (${res.status}).`);
  }

  const data = (await res.json()) as ApiResponse;
  const hits: CompanyLookupHit[] = [];
  for (const r of data.results ?? []) {
    const hit = mapHit(r);
    if (hit) hits.push(hit);
  }
  return hits.slice(0, limit);
}

/** Meilleure proposition pour enrichir un client à partir du nom (sync connecteur). */
export async function bestCompanyMatch(legalName: string): Promise<CompanyLookupHit | null> {
  const name = legalName.trim();
  if (name.length < 3) return null;
  try {
    const hits = await searchFrenchCompanies(name, 5);
    const active = hits.filter((h) => h.active);
    const pool = active.length > 0 ? active : hits;
    if (pool.length === 0) return null;

    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

    const target = norm(name);
    const scored = pool
      .map((h) => {
        const n = norm(h.legalName);
        let score = 0;
        if (n === target) score = 100;
        else if (n.includes(target) || target.includes(n)) score = 70;
        else score = 40;
        if (h.active) score += 10;
        return { h, score };
      })
      .sort((a, b) => b.score - a.score);

    // Ne prendre que si match raisonnable (évite faux positifs)
    if (scored[0].score < 70) return null;
    return scored[0].h;
  } catch {
    return null;
  }
}
