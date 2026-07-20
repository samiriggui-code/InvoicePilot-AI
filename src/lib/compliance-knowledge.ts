export const COMPLIANCE_KNOWLEDGE = `
# Facturation électronique France — cadre réglementaire (2026)

## Positionnement
InvoicePilot AI est une **solution compatible** (logiciel non immatriculé).
La transmission des factures B2B passe **obligatoirement** par une **plateforme agréée (PA)**, anciennement appelée PDP.
Le PPF (Portail Public de Facturation) ne propose **pas** d'échange gratuit de factures : il sert d'annuaire et de concentrateur de données vers la DGFiP.

## Calendrier (loi de finances 2024, art. 91)
- **1er septembre 2026** : toutes les entreprises assujetties TVA doivent pouvoir **recevoir** des e-factures et avoir choisi une PA.
- **1er septembre 2026** : **GE et ETI** doivent **émettre** en électronique + e-reporting.
- **1er septembre 2027** : **PME, TPE, micro-entreprises** (y compris auto-entrepreneurs) doivent émettre + e-reporting.

## Trois volets
1. **E-invoicing** : factures B2B entre assujettis établis en France (formats structurés via PA).
2. **E-reporting de transaction** : ventes B2C / non-assujettis / opérateurs étrangers.
3. **E-reporting de paiement** : encaissements lorsque la TVA est exigible à l'encaissement.

## Formats (norme EN 16931)
- **Factur-X** : PDF/A-3 + XML CII (recommandé, lisible + structuré)
- **UBL 2.1**
- **CII**

Le PDF envoyé par e-mail **seul** n'est plus conforme pour le B2B domestique.

## Mentions obligatoires générales
Numéro unique séquentiel, date d'émission, identité vendeur/acheteur (SIREN/SIRET), TVA, lignes (qté, PU HT, taux), totaux, conditions de paiement, pénalités de retard, indemnité forfaitaire **40 €**.

## 4 nouvelles mentions 2026 (bloquantes)
1. SIREN du client
2. Catégorie d'opération : biens / services / mixte
3. Option « paiement de la taxe d'après les débits » le cas échéant
4. Adresse de livraison si différente de la facturation

## Plateforme agréée (PA)
Opérateur privé immatriculé DGFiP. Une entreprise peut avoir une ou plusieurs PA (ventes / achats / par SIRET).
Interopérabilité obligatoire entre PA. InvoicePilot se connecte aux PA via API (solution compatible).

## Annuaire
facturation.chorus-pro.gouv.fr — recherche SIREN/SIRET, PA de réception, adresse électronique de facturation.

## Assistance
Numéro national : **0 806 807 807**.
En cas d'incertitude : orienter vers un expert-comptable. Les réponses de l'assistant ne constituent pas un conseil fiscal.
`;

export function getKnowledgeBasedAnswer(question: string): string {
  const q = question.toLowerCase();

  if (
    q.includes("date") ||
    q.includes("calendrier") ||
    q.includes("quand") ||
    q.includes("échéance") ||
    q.includes("2026") ||
    q.includes("2027")
  ) {
    return `**Calendrier légal (LF 2024 art. 91) :**

- **1er septembre 2026** — réception e-factures pour **toutes** les entreprises assujetties TVA + choix d'une PA.
- **1er septembre 2026** — émission + e-reporting pour **GE / ETI**.
- **1er septembre 2027** — émission + e-reporting pour **PME / micro** (y compris AE).

Le PDF par e-mail ne sera plus conforme pour le B2B FR.

*Source : economie.gouv.fr / impots.gouv.fr. Pas un conseil fiscal — 0 806 807 807.*`;
  }

  if (q.includes("factur-x") || q.includes("format") || q.includes("ubl") || q.includes("cii")) {
    return `**Formats acceptés (EN 16931) :**

1. **Factur-X** — PDF/A-3 + XML CII (recommandé)
2. **UBL 2.1**
3. **CII**

InvoicePilot valide ces formats avant dépôt sur une **plateforme agréée**. Nous ne sommes pas une PA : nous sommes une solution compatible.`;
  }

  if (
    q.includes("mention") ||
    q.includes("obligatoire") ||
    q.includes("2026") ||
    q.includes("siren")
  ) {
    return `**4 mentions obligatoires 2026 (bloquantes à l'émission) :**

1. **SIREN du client**
2. **Catégorie d'opération** (biens / services / mixte)
3. Option **TVA d'après les débits** si applicable
4. **Adresse de livraison** si ≠ facturation

Plus les mentions générales (n°, dates, identité, TVA, 40 € d'indemnité forfaitaire, etc.).`;
  }

  if (
    q.includes("pdp") ||
    q.includes("plateforme") ||
    q.includes("agréé") ||
    q.includes(" pa") ||
    q.includes("compatible")
  ) {
    return `**Plateforme agréée (PA, ex-PDP) :**

Seul canal habilité pour échanger les e-factures B2B. Immatriculation DGFiP, interopérabilité obligatoire.

**InvoicePilot AI = solution compatible** : nous produisons / validons les factures et les **transmettons via une ou plusieurs PA** partenaires. Nous ne sommes **pas** une PA.

Le PPF ne fait plus d'échange gratuit de factures (annuaire + concentrateur).`;
  }

  if (q.includes("reporting") || q.includes("b2c") || q.includes("étranger")) {
    return `**E-reporting :**

- **Transaction** : ventes vers particuliers (B2C), non-assujettis ou opérateurs étrangers (hors e-invoicing).
- **Paiement** : encaissements si TVA exigible à l'encaissement (prestations sans option débits).

Les données sont transmises à l'administration **via votre PA**.`;
  }

  if (q.includes("tva") || q.includes("franchise") || q.includes("293")) {
    return `**TVA & franchise en base :**

Les micro-entrepreneurs en franchise (art. 293 B CGI) sont **concernés** par la réforme (réception et, à terme, émission).

Mention typique : *« TVA non applicable, art. 293 B du CGI »*.

L'option « taxe d'après les débits » est une des 4 mentions 2026 si vous l'avez choisie.`;
  }

  return `Je n'ai pas d'extrait précis pour cette question dans la base locale.

**Pistes :** calendrier 2026/2027, mentions 2026, Factur-X/UBL, PA vs solution compatible, e-reporting.

Pour un cas particulier : **expert-comptable** ou assistance nationale **0 806 807 807**.
Ceci ne constitue pas un conseil fiscal.`;
}
