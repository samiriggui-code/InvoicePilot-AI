/**
 * Base de connaissances e-facture FR — stockée dans le repo (pas de LLM).
 * Utilisée par l’assistant réglementaire en priorité / fallback si Ollama timeout.
 *
 * Sources de référence (publiques) : LF 2024 art. 91, economie.gouv.fr, impots.gouv.fr,
 * norme EN 16931. Ne constitue pas un conseil fiscal.
 */

export type ComplianceKbArticle = {
  id: string;
  title: string;
  /** Mots-clés pour le matching (minuscules, sans accents idéalement aussi en variantes) */
  keywords: string[];
  /** Réponse markdown prête à afficher */
  answer: string;
  /** Poids relatif (défaut 1) */
  weight?: number;
};

const DISCLAIMER =
  "\n\n*Sources : LF 2024 art. 91 · economie.gouv.fr / impots.gouv.fr. Pas un conseil fiscal — expert-comptable ou **0 806 807 807**.*";

export const COMPLIANCE_KB_ARTICLES: ComplianceKbArticle[] = [
  {
    id: "calendrier-septembre",
    title: "Calendrier 1er septembre 2026 / 2027",
    weight: 1.4,
    keywords: [
      "calendrier",
      "échéance",
      "echeance",
      "date",
      "quand",
      "septembre",
      "1er sept",
      "1 septembre",
      "2026",
      "2027",
      "délai",
      "delai",
      "obligation",
      "concerné",
      "concerne",
    ],
    answer: `**Calendrier légal (loi de finances 2024, art. 91) :**

| Date | Qui | Obligation |
|------|-----|------------|
| **1er septembre 2026** | **Toutes** les entreprises assujetties TVA | Pouvoir **recevoir** des e-factures + avoir choisi une **PA** |
| **1er septembre 2026** | **GE / ETI** | **Émettre** en électronique + **e-reporting** |
| **1er septembre 2027** | **PME / TPE / micro** (y compris auto-entrepreneurs) | **Émettre** + **e-reporting** |

Avant le 1er septembre 2026, préparez au minimum : PA, réception, SIREN clients, mentions 2026, formats structurés.

**Dans InvoicePilot :** **Conformité** (score / compte à rebours) → **Plateforme agréée** → **Clients** → **Sources → Analyse IA → Émission**.${DISCLAIMER}`,
  },
  {
    id: "reception",
    title: "Réception e-factures",
    weight: 1.2,
    keywords: [
      "réception",
      "reception",
      "recevoir",
      "inbox",
      "fournisseur",
      "achat",
      "achats",
      "incoming",
    ],
    answer: `**Réception (achats) :**

À partir du **1er septembre 2026**, **toutes** les entreprises assujetties TVA doivent pouvoir **recevoir** des factures électroniques via une **plateforme agréée (PA)**.

Ce n’est pas la même chose que l’émission : même une micro-entreprise doit être prête à recevoir dès 2026.

**Dans InvoicePilot :** menu **Réception** (\`/inbox\`).

Si un PDF a un **émetteur ≠ votre SIREN**, ce n’est pas une vente « Sources » : orientez-vous vers **Réception** (achat) ou remplacez le document.${DISCLAIMER}`,
  },
  {
    id: "emission",
    title: "Émission e-factures B2B",
    weight: 1.1,
    keywords: [
      "émission",
      "emission",
      "émettre",
      "emettre",
      "envoyer",
      "déposer",
      "deposer",
      "vente",
      "ventes",
      "b2b",
    ],
    answer: `**Émission (e-invoicing B2B) :**

Les factures entre assujettis établis en France doivent circuler en format structuré (**Factur-X / UBL / CII**) **via une PA**.

- **GE / ETI** : obligation d’émettre dès le **1er septembre 2026**.
- **PME / micro** : dès le **1er septembre 2027**.

Le PDF envoyé par e-mail **seul** ne suffit plus pour le B2B domestique.

**Dans InvoicePilot :** **Sources** (PDF de vos ventes) → **Analyse IA** → **Émission** (\`/invoices\`) → dépôt via votre PA.${DISCLAIMER}`,
  },
  {
    id: "pa-pdp",
    title: "Plateforme agréée (PA / ex-PDP)",
    weight: 1.3,
    keywords: [
      "pa",
      "pdp",
      "plateforme",
      "agréé",
      "agree",
      "agréée",
      "immatricul",
      "partenaire",
      "qonto",
      "pennylane",
    ],
    answer: `**Plateforme agréée (PA, anciennement PDP) :**

Seul canal habilité pour **échanger** les e-factures B2B. Opérateur privé **immatriculé** DGFiP, interopérabilité obligatoire entre PA.

Une entreprise peut avoir une ou plusieurs PA (ventes / achats / par établissement).

**InvoicePilot AI = solution compatible** (pas une PA) : on prépare / valide / orchestre, la **transmission légale** passe par votre PA.

**Dans l’app :** page **Plateforme agréée** (\`/platforms\`).${DISCLAIMER}`,
  },
  {
    id: "ppf",
    title: "PPF / Portail public",
    keywords: ["ppf", "portail public", "chorus", "annuaire"],
    answer: `**PPF (Portail Public de Facturation) :**

Le PPF ne propose **pas** un échange gratuit généralisé de factures comme un « e-mail d’État ». Il sert notamment d’**annuaire** et de concentrateur de données vers la DGFiP.

L’échange B2B se fait via les **plateformes agréées (PA)**.

Annuaire utile : facturation.chorus-pro.gouv.fr (SIREN/SIRET, PA de réception).${DISCLAIMER}`,
  },
  {
    id: "formats",
    title: "Formats Factur-X / UBL / CII",
    weight: 1.2,
    keywords: [
      "factur-x",
      "facturx",
      "ubl",
      "cii",
      "format",
      "formats",
      "en 16931",
      "xml",
      "pdf/a",
    ],
    answer: `**Formats acceptés (norme EN 16931) :**

1. **Factur-X** — PDF/A-3 + XML CII (souvent recommandé : lisible + structuré)
2. **UBL 2.1**
3. **CII**

InvoicePilot vise ces formats avant dépôt sur une PA.

**Dans l’app :** contrôles dans **Analyse IA**, puis **Émission**.${DISCLAIMER}`,
  },
  {
    id: "mentions-2026",
    title: "Mentions obligatoires 2026",
    weight: 1.3,
    keywords: [
      "mention",
      "mentions",
      "obligatoire",
      "obligatoires",
      "siren",
      "siret",
      "catégorie",
      "categorie",
      "débits",
      "debits",
      "livraison",
      "40 €",
      "40€",
      "indemnité",
      "indemnite",
    ],
    answer: `**4 nouvelles mentions 2026 (souvent bloquantes à l’émission) :**

1. **SIREN du client** (acheteur)
2. **Catégorie d’opération** : biens / services / mixte
3. Option **TVA d’après les débits** si applicable
4. **Adresse de livraison** si différente de la facturation

**Mentions générales** toujours requises : n° unique, date, identité vendeur/acheteur, TVA, lignes, totaux, conditions de paiement, pénalités de retard, indemnité forfaitaire **40 €**, etc.

**Dans InvoicePilot :** fiches **Clients** (SIREN) + **Analyse IA** (contrôles).${DISCLAIMER}`,
  },
  {
    id: "e-reporting",
    title: "E-reporting",
    weight: 1.2,
    keywords: [
      "e-reporting",
      "ereporting",
      "reporting",
      "b2c",
      "particulier",
      "export",
      "étranger",
      "etranger",
      "intra",
      "paiement",
      "encaissement",
    ],
    answer: `**E-reporting (distinct de l’e-facture B2B) :**

- **Transaction** : ventes vers particuliers (B2C), non-assujettis, ou certains flux internationaux.
- **Paiement** : encaissements lorsque la TVA est exigible à l’encaissement.

Les données remontent à l’administration **via votre PA**.

Ce n’est **pas** la page Réception (inbox fournisseurs).

**Dans InvoicePilot :** menu **E-reporting** (\`/e-reporting\`).${DISCLAIMER}`,
  },
  {
    id: "trois-volets",
    title: "Les 3 volets de la réforme",
    keywords: ["volet", "volets", "réforme", "reforme", "e-invoicing", "einvoicing"],
    answer: `**Trois volets de la réforme :**

1. **E-invoicing** — factures B2B entre assujettis FR (formats structurés via PA).
2. **E-reporting de transaction** — ventes hors e-invoicing (ex. B2C).
3. **E-reporting de paiement** — encaissements selon règles de TVA.

InvoicePilot couvre la préparation / validation et l’orchestration vers votre PA.${DISCLAIMER}`,
  },
  {
    id: "micro-ae",
    title: "Micro / auto-entrepreneur",
    keywords: [
      "micro",
      "auto-entrepreneur",
      "autoentrepreneur",
      "ae",
      "tpe",
      "pme",
      "franchise",
      "293",
    ],
    answer: `**Micro-entreprises & auto-entrepreneurs :**

- **Réception** : concernés dès le **1er septembre 2026** (comme tout le monde).
- **Émission + e-reporting** : en principe au **1er septembre 2027**.

Franchise en base (art. 293 B CGI) : vous restez concernés par la réforme. Mention typique : *« TVA non applicable, art. 293 B du CGI »*.

**Dans InvoicePilot :** renseignez la **taille** d’entreprise dans **Paramètres** pour le bon calendrier.${DISCLAIMER}`,
  },
  {
    id: "solution-compatible",
    title: "Solution compatible vs PA",
    keywords: [
      "compatible",
      "invoicepilot",
      "logiciel",
      "pas une pa",
      "immatriculé",
      "immatriculee",
    ],
    answer: `**InvoicePilot AI = solution compatible :**

Nous ne sommes **pas** une plateforme agréée. Nous aidons à :
- préparer des factures conformes (données, mentions, formats),
- contrôler avant envoi,
- vous guider dans le parcours,
- vous connecter à **votre** PA pour la transmission.

La responsabilité du canal légal d’échange reste celle de la **PA** immatriculée.${DISCLAIMER}`,
  },
  {
    id: "parcours-app",
    title: "Parcours dans InvoicePilot",
    weight: 1.25,
    keywords: [
      "parcours",
      "où",
      "ou aller",
      "comment",
      "dans l'app",
      "dans mon",
      "que dois",
      "faire",
      "commencer",
      "préparer",
      "preparer",
      "menu",
      "écran",
      "ecran",
    ],
    answer: `**Parcours recommandé (guidance — aucune action automatique) :**

1. **Paramètres** — SIREN organisation + taille (GE/ETI vs PME).
2. **Plateforme agréée** — brancher votre PA.
3. **Clients** — SIREN acheteurs (mention 2026).
4. **Mes sources** — PDF de **vos ventes** (émetteur = votre SIREN).
5. **Analyse IA** — corriger les blocages.
6. **Émission** (B2B) ou **E-reporting** (B2C / export).
7. **Réception** — factures **fournisseurs**.
8. **Conformité** — score et checklist 1er septembre.

Je **guide** uniquement : je n’importe pas, n’analyse pas et n’émets pas à votre place.${DISCLAIMER}`,
  },
  {
    id: "siren-tenant",
    title: "Émetteur ≠ SIREN organisation",
    keywords: [
      "émetteur",
      "emetteur",
      "hors tenant",
      "mauvais siren",
      "autre entreprise",
      "mismatch",
      "n'appartient",
      "appartient pas",
    ],
    answer: `**Émetteur du PDF ≠ SIREN de votre organisation :**

Ce document n’est **pas** une vente à traiter dans Sources / Émission pour votre tenant.

- Facture **fournisseur** (on vous facture) → **Réception** (\`/inbox\`).
- Mauvais fichier → remplacer / supprimer dans **Sources**.
- Bonne vente mais mauvais compte → vérifier le **SIREN** dans **Paramètres**.

InvoicePilot **n’enregistre pas** les données métier (client, lignes…) dans ce cas.${DISCLAIMER}`,
  },
  {
    id: "sanctions-risques",
    title: "Risques / non-conformité",
    keywords: ["sanction", "amende", "risque", "pénalité", "penalite", "non conforme", "retard"],
    answer: `**Risques liés à la non-préparation :**

Sans PA / sans capacité de réception / sans formats adaptés, vous risquez de ne plus pouvoir échanger normalement avec vos clients/fournisseurs assujettis, et d’exposer votre entreprise à des frictions opérationnelles et un suivi administratif.

Les montants d’amendes et cas particuliers relèvent d’une analyse **au cas par cas** : demandez à votre **expert-comptable** ou au **0 806 807 807**.

**Dans InvoicePilot :** suivez le score **Conformité** et branchez une PA dès que possible.${DISCLAIMER}`,
  },
  {
    id: "greeting",
    title: "Accueil",
    weight: 0.5,
    keywords: ["allo", "salut", "bonjour", "hello", "hi", "hey", " merc ", "merci", "test"],
    answer: `Bonjour — assistant réglementaire InvoicePilot.

Je réponds à partir d’une **base de connaissances** sur la facturation électronique (1er septembre 2026/2027, PA, mentions, formats, parcours app).

Exemples : *« Que faire avant le 1er septembre ? »*, *« C’est quoi une PA ? »*, *« Où faire mon e-reporting ? »*.

Je **guide** seulement — je n’exécute aucune action.${DISCLAIMER}`,
  },
];

/** Corpus texte pour prompt LLM (si OLLAMA_CHAT_ENABLED). */
export const COMPLIANCE_KNOWLEDGE = COMPLIANCE_KB_ARTICLES.map(
  (a) => `## ${a.title}\n${a.answer.replace(DISCLAIMER, "").trim()}`,
).join("\n\n");

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9€\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score simple mots-clés → meilleur article (fallback offline). */
export function getKnowledgeBasedAnswer(question: string): string {
  const q = normalize(question);
  if (!q) {
    return (
      COMPLIANCE_KB_ARTICLES.find((a) => a.id === "greeting")?.answer ??
      "Posez une question sur la facturation électronique."
    );
  }

  // Salutations / tests très courts
  if (/^(allo|salut|bonjour|hello|hi|hey|test|ok|merci)[\s!?.]*$/i.test(q)) {
    return COMPLIANCE_KB_ARTICLES.find((a) => a.id === "greeting")!.answer;
  }

  let best: { article: ComplianceKbArticle; score: number } | null = null;

  for (const article of COMPLIANCE_KB_ARTICLES) {
    const weight = article.weight ?? 1;
    let score = 0;
    for (const kw of article.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (q.includes(k)) score += k.length >= 6 ? 2.5 : 1.5;
      for (const token of k.split(" ")) {
        if (token.length >= 4 && q.split(" ").includes(token)) score += 0.8;
      }
    }
    score *= weight;
    if (!best || score > best.score) best = { article, score };
  }

  if (!best || best.score < 1.2) {
    return `Je n’ai pas d’extrait exact pour cette formulation dans la base locale.

**Sujets couverts :** calendrier 1er septembre 2026/2027 · réception · émission · PA · Factur-X/UBL · mentions 2026 · e-reporting · parcours InvoicePilot · micro/AE.

Reformulez (ex. *« calendrier septembre 2026 »*) ou contactez un **expert-comptable** / **0 806 807 807**.

Ceci ne constitue pas un conseil fiscal.`;
  }

  return best.article.answer;
}

/** Liste des titres (debug / UI éventuelle). */
export function listComplianceKbTopics(): { id: string; title: string }[] {
  return COMPLIANCE_KB_ARTICLES.filter((a) => a.id !== "greeting").map((a) => ({
    id: a.id,
    title: a.title,
  }));
}
