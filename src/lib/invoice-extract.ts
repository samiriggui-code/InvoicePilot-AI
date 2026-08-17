/**
 * Premier jet — extraction facture source (PDF texte → JSON) + suggestions de remédiation.
 * LLM (Ollama / OpenAI) si dispo, sinon heuristiques. Les contrôles 2026 restent déterministes.
 */

import { computeLineTotals } from "@/lib/invoice-validation";
import { inferTransactionType, type TransactionType } from "@/lib/transaction-type";

export type ExtractedLine = {
  description: string;
  quantity: number;
  unitPriceHt: number;
  vatRate: number;
};

export type ExtractedEstablishment = {
  siret: string;
  label: string | null;
  addressLine1: string | null;
  postalCode: string | null;
  city: string | null;
  isHeadOffice: boolean;
};

export type ExtractedInvoiceDraft = {
  number: string | null;
  issueDate: string | null;
  serviceDate: string | null;
  currency: string;
  /** Émetteur / vendeur — doit correspondre à l’org (SIREN) pour une vente */
  sellerLegalName: string | null;
  sellerSiren: string | null;
  buyerLegalName: string | null;
  buyerSiren: string | null;
  /** SIRET acheteur (établissement facturé) — 14 chiffres */
  buyerSiret: string | null;
  buyerEmail: string | null;
  buyerAddressLine1: string | null;
  buyerPostal: string | null;
  buyerCity: string | null;
  /** Établissements détectés pour le même SIREN acheteur */
  buyerEstablishments: ExtractedEstablishment[];
  operationCategory: "GOODS" | "SERVICES" | "MIXED" | null;
  transactionType: TransactionType | null;
  lines: ExtractedLine[];
  subtotalHt: number | null;
  totalVat: number | null;
  totalTtc: number | null;
  confidence: number;
  notes: string[];
};

export type RemediationTip = {
  code: string;
  title: string;
  detail: string;
  action: string;
};

const EMPTY_DRAFT: ExtractedInvoiceDraft = {
  number: null,
  issueDate: null,
  serviceDate: null,
  currency: "EUR",
  sellerLegalName: null,
  sellerSiren: null,
  buyerLegalName: null,
  buyerEmail: null,
  buyerSiren: null,
  buyerSiret: null,
  buyerAddressLine1: null,
  buyerPostal: null,
  buyerCity: null,
  buyerEstablishments: [],
  operationCategory: null,
  transactionType: null,
  lines: [],
  subtotalHt: null,
  totalVat: null,
  totalTtc: null,
  confidence: 0,
  notes: [],
};

function clampRate(n: number) {
  if (![0, 2.1, 5.5, 10, 20].includes(n)) {
    if (n > 15) return 20;
    if (n > 7) return 10;
    if (n > 3) return 5.5;
    return 0;
  }
  return n;
}

function normalizeDraft(raw: Partial<ExtractedInvoiceDraft>): ExtractedInvoiceDraft {
  const lines = (raw.lines ?? [])
    .map((l) => ({
      description: String(l.description ?? "").trim() || "Ligne",
      quantity: Number(l.quantity) > 0 ? Number(l.quantity) : 1,
      unitPriceHt: Math.max(0, Number(l.unitPriceHt) || 0),
      vatRate: clampRate(Number(l.vatRate) || 20),
    }))
    .filter((l) => l.description);

  let subtotalHt = 0;
  let totalVat = 0;
  for (const line of lines) {
    const t = computeLineTotals(line);
    subtotalHt += t.lineTotalHt;
    totalVat += t.lineVat;
  }
  subtotalHt = Math.round(subtotalHt * 100) / 100;
  totalVat = Math.round(totalVat * 100) / 100;
  const totalTtc = Math.round((subtotalHt + totalVat) * 100) / 100;

  const siren = raw.buyerSiren?.replace(/\D/g, "").slice(0, 9) || null;
  const sellerSirenRaw = raw.sellerSiren?.replace(/\D/g, "") || null;
  const sellerSiren =
    sellerSirenRaw && sellerSirenRaw.length >= 9 ? sellerSirenRaw.slice(0, 9) : null;
  const buyerSiretRaw = raw.buyerSiret?.replace(/\D/g, "") || null;
  let buyerSiret = buyerSiretRaw && buyerSiretRaw.length === 14 ? buyerSiretRaw : null;
  if (!buyerSiret && buyerSiretRaw && buyerSiretRaw.length >= 14) {
    buyerSiret = buyerSiretRaw.slice(0, 14);
  }
  // Si SIRET acheteur fourni sans SIREN → dériver
  const buyerSiren =
    siren && siren.length === 9 ? siren : buyerSiret ? buyerSiret.slice(0, 9) : null;

  const buyerEstablishments: ExtractedEstablishment[] = [];
  const seen = new Set<string>();
  for (const est of raw.buyerEstablishments ?? []) {
    const s = String(est.siret ?? "")
      .replace(/\D/g, "")
      .slice(0, 14);
    if (s.length !== 14) continue;
    if (buyerSiren && s.slice(0, 9) !== buyerSiren) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    buyerEstablishments.push({
      siret: s,
      label: est.label?.trim() || null,
      addressLine1: est.addressLine1?.trim() || null,
      postalCode: est.postalCode?.trim() || null,
      city: est.city?.trim() || null,
      isHeadOffice: Boolean(est.isHeadOffice),
    });
  }
  if (buyerSiret && !seen.has(buyerSiret)) {
    buyerEstablishments.unshift({
      siret: buyerSiret,
      label: null,
      addressLine1: raw.buyerAddressLine1?.trim() || null,
      postalCode: raw.buyerPostal?.trim() || null,
      city: raw.buyerCity?.trim() || null,
      isHeadOffice: false,
    });
  }

  return {
    number: raw.number?.trim() || null,
    issueDate: raw.issueDate?.slice(0, 10) || null,
    serviceDate: raw.serviceDate?.slice(0, 10) || raw.issueDate?.slice(0, 10) || null,
    currency: raw.currency?.trim() || "EUR",
    sellerLegalName: raw.sellerLegalName?.trim() || null,
    sellerSiren,
    buyerLegalName: raw.buyerLegalName?.trim() || null,
    buyerSiren,
    buyerSiret,
    buyerEmail: raw.buyerEmail?.trim() || null,
    buyerAddressLine1: raw.buyerAddressLine1?.trim() || null,
    buyerPostal: raw.buyerPostal?.trim() || null,
    buyerCity: raw.buyerCity?.trim() || null,
    buyerEstablishments,
    operationCategory: raw.operationCategory ?? null,
    transactionType:
      raw.transactionType ??
      inferTransactionType({
        buyerSiren,
        billingCountry: "FR",
      }),
    lines,
    subtotalHt: raw.subtotalHt ?? (lines.length ? subtotalHt : null),
    totalVat: raw.totalVat ?? (lines.length ? totalVat : null),
    totalTtc: raw.totalTtc ?? (lines.length ? totalTtc : null),
    confidence: Math.min(1, Math.max(0, Number(raw.confidence) || 0)),
    notes: raw.notes ?? [],
  };
}

/** Heuristique locale — utile sans clé API / PDF pauvre. */
export function extractInvoiceHeuristic(text: string): ExtractedInvoiceDraft {
  if (!text.trim()) {
    return {
      ...EMPTY_DRAFT,
      notes: ["Aucun texte extractible (PDF scanné ? OCR à venir)."],
      confidence: 0,
    };
  }

  const sirenMatch =
    text.match(/\b(?:SIREN|Siren)\s*[:\s]?\s*(\d{3}\s?\d{3}\s?\d{3})\b/i) ??
    text.match(/\b(\d{3}\s\d{3}\s\d{3})\b/) ??
    text.match(/\b(\d{9})\b/);
  const siren = sirenMatch?.[1]?.replace(/\s/g, "") ?? null;

  const buyerSiretMatch =
    text.match(
      /(?:Client|Facturé\s+à|Acheteur|Buyer)[\s\S]{0,200}?(?:SIRET|Siret)\s*[:\s]*([0-9\s]{14,17})/i,
    ) ?? text.match(/(?:SIRET|Siret)\s*(?:client|acheteur)?\s*[:\s]*([0-9\s]{14,17})/i);
  const buyerSiretCandidate = buyerSiretMatch?.[1]?.replace(/\D/g, "").slice(0, 14) ?? null;
  const buyerSiret =
    buyerSiretCandidate && buyerSiretCandidate.length === 14 ? buyerSiretCandidate : null;
  const buyerSirenFromSiret = buyerSiret?.slice(0, 9) ?? null;
  const effectiveBuyerSiren = siren && siren.length === 9 ? siren : buyerSirenFromSiret;

  const dateMatch =
    text.match(
      /(?:Date(?:\s+d['’]?émission)?|Émise\s+le|Facture\s+du)\s*[:\s]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
    ) ?? text.match(/\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4})\b/);
  let issueDate: string | null = null;
  if (dateMatch?.[1]) {
    const p = dateMatch[1].split(/[/.-]/);
    if (p.length === 3) {
      const [d, m, y] = p;
      const year = y!.length === 2 ? `20${y}` : y!;
      issueDate = `${year}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    }
  }

  const numberMatch =
    text.match(/(?:Facture|Invoice|N[°o]|Numéro)\s*[:\s#]*([A-Z0-9][A-Z0-9/-]{2,})/i) ?? null;

  const ttcMatch = text.match(/(?:Total\s*TTC|Net\s*à\s*payer)\s*[:\s]*([\d\s]+[,.]\d{2})\s*€?/i);
  const htMatch = text.match(/(?:Total\s*HT|Sous[- ]total\s*HT)\s*[:\s]*([\d\s]+[,.]\d{2})\s*€?/i);
  const parseAmount = (s?: string) => (s ? Number(s.replace(/\s/g, "").replace(",", ".")) : null);

  const totalTtc = parseAmount(ttcMatch?.[1]);
  const subtotalHt = parseAmount(htMatch?.[1]);

  const clientMatch =
    text.match(/(?:Client|Facturé\s+à|Bill\s+to|À\s+l['’]attention\s+de)\s*[:\s]*\n?\s*(.+)/i) ??
    null;
  let buyerLegalName = clientMatch?.[1]?.trim().slice(0, 120) || null;

  const looksConsumer =
    /\b(particulier|consommateur|ticket|kiosque|kiosk|sur\s*place|surplace|caisse|ticket\s*de\s*caisse|tpe)\b/i.test(
      text,
    ) ||
    (!effectiveBuyerSiren &&
      /\b(mode\s*:\s*surplace|client\s+kiosque|raclette|menu)\b/i.test(text));

  // Pays acheteur (heuristique légère)
  const countryMatch = text.match(/\b(?:Pays|Country|Billing\s+country)\s*[:\s]*([A-Z]{2})\b/i);
  const billingCountry = (countryMatch?.[1] ?? "FR").toUpperCase();

  const transactionType: TransactionType =
    effectiveBuyerSiren && effectiveBuyerSiren.length === 9 && !looksConsumer
      ? "B2B_DOMESTIC"
      : inferTransactionType({
          isConsumer: looksConsumer || !effectiveBuyerSiren,
          buyerSiren:
            effectiveBuyerSiren && effectiveBuyerSiren.length === 9 ? effectiveBuyerSiren : null,
          billingCountry,
        });

  if (!buyerLegalName && looksConsumer) {
    buyerLegalName = "Client particulier";
  }

  const lines: ExtractedLine[] = [];
  if (subtotalHt != null && subtotalHt > 0) {
    lines.push({
      description: "Prestation / article (extrait PDF — à vérifier)",
      quantity: 1,
      unitPriceHt: Math.round(subtotalHt * 100) / 100,
      vatRate: 20,
    });
  } else if (totalTtc != null && totalTtc > 0) {
    const ht = Math.round((totalTtc / 1.2) * 100) / 100;
    lines.push({
      description: "Prestation / article (extrait PDF — à vérifier)",
      quantity: 1,
      unitPriceHt: ht,
      vatRate: 20,
    });
  }

  // Émetteur : SIREN/SIRET près de « SIRET », « RCS », en-tête — le 1er candidat ≠ acheteur
  const sellerIdMatch =
    text.match(/(?:SIRET|SIREN|N[°o]?\s*(?:SIRET|SIREN)|RCS)\s*[:\s]*([0-9\s]{9,17})/i) ??
    text.match(/\b([0-9]{14})\b/);
  const sellerDigits = sellerIdMatch?.[1]?.replace(/\D/g, "") ?? "";
  const sellerSiren = sellerDigits.length >= 9 ? sellerDigits.slice(0, 9) : null;
  const sellerNameMatch = text.match(
    /(?:Émetteur|Emetteur|Vendeur|Seller|Fournisseur|From)\s*[:\s]*([^\n]{3,80})/i,
  );

  return normalizeDraft({
    number: numberMatch?.[1] ?? null,
    issueDate,
    serviceDate: issueDate,
    sellerLegalName: sellerNameMatch?.[1]?.trim() || null,
    sellerSiren:
      sellerSiren && (!effectiveBuyerSiren || sellerSiren !== effectiveBuyerSiren)
        ? sellerSiren
        : null,
    buyerLegalName,
    buyerSiren:
      effectiveBuyerSiren && effectiveBuyerSiren.length === 9 && !looksConsumer
        ? effectiveBuyerSiren
        : null,
    buyerSiret: buyerSiret && !looksConsumer ? buyerSiret : null,
    operationCategory: "SERVICES",
    transactionType,
    lines,
    confidence: lines.length ? (looksConsumer || effectiveBuyerSiren ? 0.58 : 0.4) : 0.15,
    notes: [
      looksConsumer
        ? "Heuristique : flux particulier / ticket → B2C (e-reporting)."
        : effectiveBuyerSiren
          ? "Heuristique : SIREN/SIRET acheteur détecté → B2B (émission PA)."
          : "Heuristique locale — vérifier type de transaction.",
      "Extraction heuristique (sans LLM ou en secours).",
      "Vérifiez lignes, SIREN émetteur / acheteur, SIRET établissement et montants.",
    ],
  });
}

async function callLlmJson(system: string, user: string): Promise<string | null> {
  const ollamaBase = process.env.OLLAMA_BASE_URL;
  if (ollamaBase) {
    try {
      const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
      const timeoutMs = Number(process.env.OLLAMA_EXTRACT_TIMEOUT_MS ?? 25000);
      const res = await fetch(`${ollamaBase.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          options: { temperature: 0.1, num_predict: 1200 },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { message?: { content?: string } };
        if (data.message?.content) return data.message.content;
      } else {
        console.error("Ollama extract HTTP", res.status, await res.text());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Ollama extract failed/timeout — fallback heuristique:", msg);
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  // Skip placeholders / truncated keys (avoids noisy 401 spam in logs)
  if (!apiKey || apiKey.length < 20 || !apiKey.startsWith("sk-")) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model: process.env.OPENAI_EXTRACT_MODEL ?? "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      console.error("OpenAI extract error:", await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("OpenAI extract failed:", err);
    return null;
  }
}

const EXTRACT_SYSTEM = `Tu extrais une facture française en JSON strict pour InvoicePilot (conformité 2026 / PA).
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown.
Schéma:
{
  "number": string|null,
  "issueDate": "YYYY-MM-DD"|null,
  "serviceDate": "YYYY-MM-DD"|null,
  "currency": "EUR",
  "sellerLegalName": string|null,
  "sellerSiren": "9 chiffres (SIREN, pas SIRET entier)"|null,
  "buyerLegalName": string|null,
  "buyerSiren": "9 chiffres"|null,
  "buyerSiret": "14 chiffres établissement acheteur"|null,
  "buyerEmail": string|null,
  "buyerAddressLine1": string|null,
  "buyerPostal": string|null,
  "buyerCity": string|null,
  "buyerEstablishments": [{"siret":"14 chiffres","label":string|null,"addressLine1":string|null,"postalCode":string|null,"city":string|null,"isHeadOffice":boolean}],
  "operationCategory": "GOODS"|"SERVICES"|"MIXED"|null,
  "transactionType": "B2B_DOMESTIC"|"B2C"|"EXPORT"|"INTRA_EU"|null,
  "lines": [{"description": string, "quantity": number, "unitPriceHt": number, "vatRate": number}],
  "subtotalHt": number|null,
  "totalVat": number|null,
  "totalTtc": number|null,
  "confidence": number,
  "notes": string[]
}
Règles: montants en EUR; unitPriceHt hors taxe; vatRate 0|5.5|10|20; ne jamais inventer un SIREN/SIRET; si doute null + note.
sellerSiren = SIREN de l’émetteur (9 premiers chiffres du SIRET si seul le SIRET est présent).
buyerSiret = établissement facturé (14 chiffres) ; buyerSiren = 9 premiers du SIRET si besoin.
buyerEstablishments = tous les SIRET du même SIREN acheteur visibles sur le document (siège + sites).
transactionType: B2B_DOMESTIC si SIREN acheteur FR entreprise; B2C si particulier sans SIREN; EXPORT si client hors UE; INTRA_EU si client UE sans SIREN FR.`;

export async function extractInvoiceFromText(
  text: string,
  opts?: { sellerName?: string | null },
): Promise<{ draft: ExtractedInvoiceDraft; source: "llm" | "heuristic" }> {
  const clipped = text.slice(0, 12000);
  if (!clipped.trim()) {
    return { draft: extractInvoiceHeuristic(""), source: "heuristic" };
  }

  // LLM réservé au VPS (Ollama) — localement : heuristique uniquement sauf opt-in explicite
  const llmEnabled =
    process.env.LLM_EXTRACT_ENABLED === "true" || process.env.LLM_EXTRACT_ENABLED === "1";

  if (llmEnabled) {
    const user = `Texte facture (extrait):\n---\n${clipped}\n---\nVendeur probable: ${opts?.sellerName ?? "inconnu"}`;
    const raw = await callLlmJson(EXTRACT_SYSTEM, user);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ExtractedInvoiceDraft>;
        const draft = normalizeDraft({
          ...parsed,
          confidence: parsed.confidence ?? 0.7,
          notes: [...(parsed.notes ?? []), "Extraction LLM — à valider avant Factur-X / PA."],
        });
        if (draft.lines.length > 0 || draft.buyerLegalName || draft.buyerSiren) {
          return { draft, source: "llm" };
        }
      } catch (err) {
        console.error("LLM JSON parse failed:", err);
      }
    }
  }

  return { draft: extractInvoiceHeuristic(clipped), source: "heuristic" };
}

export function buildRemediationTips(
  draft: ExtractedInvoiceDraft,
  blockingCodes: string[],
): RemediationTip[] {
  const tips: RemediationTip[] = [];

  if (blockingCodes.includes("SELLER_SIREN_MISMATCH")) {
    // Hors tenant : un seul tip métier — pas d’incitation à « corriger » acheteur / lignes
    return [
      {
        code: "SELLER_SIREN_MISMATCH",
        title: "Émetteur hors tenant — données non enregistrées",
        detail:
          "Le SIREN émetteur du PDF ≠ votre organisation. Aucun client, ligne ni établissement n’a été écrit. Les ventes Sources / Émission doivent être sous votre SIREN (plusieurs SIRET OK).",
        action:
          "1) Facture fournisseur → Réception PA (/inbox). 2) Mauvais PDF → remplacer/supprimer en Sources. 3) Bonne vente, mauvais compte → vérifier SIREN org (Paramètres).",
      },
    ];
  }
  if (blockingCodes.includes("SELLER_NAME_MISMATCH")) {
    tips.push({
      code: "SELLER_NAME_MISMATCH",
      title: "Nom émetteur à vérifier",
      detail: "SIREN OK mais raison sociale émetteur divergente.",
      action: "Vérifier le libellé sur le PDF vs Paramètres entreprise.",
    });
  }
  if (!draft.buyerSiren || blockingCodes.includes("BUYER_SIREN_2026")) {
    if (draft.transactionType === "B2B_DOMESTIC" || !draft.transactionType) {
      tips.push({
        code: "BUYER_SIREN_2026",
        title: "SIREN acheteur manquant",
        detail: "Mention obligatoire 2026 pour le B2B domestique.",
        action: "Renseigner le SIREN sur la fiche Acheteur ou via l’annuaire entreprises.",
      });
    }
  }
  if (!draft.buyerLegalName) {
    tips.push({
      code: "BUYER_NAME",
      title: "Raison sociale acheteur",
      detail: "Impossible d’identifier clairement le client sur le PDF.",
      action: "Sélectionner / créer l’acheteur dans Acheteurs.",
    });
  }
  if (!draft.issueDate || blockingCodes.includes("ISSUE_DATE")) {
    tips.push({
      code: "ISSUE_DATE",
      title: "Date d’émission",
      detail: "Date d’émission absente ou illisible.",
      action: "Compléter la date sur la fiche facture (Émission).",
    });
  }
  if (!draft.operationCategory || blockingCodes.includes("OPERATION_CATEGORY_2026")) {
    tips.push({
      code: "OPERATION_CATEGORY_2026",
      title: "Catégorie d’opération",
      detail: "Biens / services / mixte requis pour 2026.",
      action: "Choisir la catégorie sur la fiche facture.",
    });
  }
  if (!draft.lines.length || blockingCodes.includes("NO_LINES")) {
    tips.push({
      code: "NO_LINES",
      title: "Lignes de facture",
      detail: "Aucune ligne exploitable extraite.",
      action: "Saisir les lignes HT / TVA manuellement, puis relancer l’analyse.",
    });
  } else if (draft.lines.some((l) => l.unitPriceHt <= 0)) {
    tips.push({
      code: "LINE_AMOUNT",
      title: "Montants lignes",
      detail: "Certaines lignes ont un montant HT à 0.",
      action: "Corriger les prix unitaires avant génération Factur-X.",
    });
  }
  if (draft.confidence < 0.5) {
    tips.push({
      code: "LOW_CONFIDENCE",
      title: "Confiance extraction faible",
      detail: "PDF partiellement lisible ou structure atypique.",
      action: "Revue humaine obligatoire avant dépôt PA.",
    });
  }

  return tips;
}
