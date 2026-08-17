/** Étapes affichées pendant l’analyse (landing + sheet facture). */
export const ANALYSIS_PROGRESS_STEPS = [
  "PDF reçu · isolation du tenant et contrôle d'accès",
  "Lecture du document · extraction du texte exploitable",
  "IA en cours · identification client, dates et montants",
  "SIRET client vérifié",
  "TVA intracommunautaire validée",
  "Mentions obligatoires 2026 contrôlées",
  "Heuristique métier · détection des écarts résiduels",
  "Préparation des corrections avant Factur-X / PA",
] as const;

export type AnalysisProgressStep = (typeof ANALYSIS_PROGRESS_STEPS)[number];
