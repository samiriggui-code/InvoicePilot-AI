import type { FaqItem } from "@/components/metronic/faq";

export type PageGuideId =
  | "dashboard"
  | "compliance"
  | "sources"
  | "clients"
  | "establishments"
  | "platforms"
  | "agent"
  | "emission"
  | "inbox"
  | "e-reporting"
  | "team"
  | "billing"
  | "settings"
  | "notifications";

export type PageGuideEngage = {
  title: string;
  description: string;
  moreTitle: string;
  moreUrl: string;
  illustration: number;
};

export type PageGuideContent = {
  /** Titre H1 / libellé menu. */
  title: string;
  /** Explication courte sous le titre (appellation). */
  blurb: string;
  faq: FaqItem[];
  /** Engage bas de page — absent pour équipe / abonnement (autres blocs). */
  engages?: [PageGuideEngage, PageGuideEngage];
};

/** Ordre navigation app — utilisé pour la FAQ landing. */
export const PAGE_GUIDE_ORDER: PageGuideId[] = [
  "dashboard",
  "compliance",
  "sources",
  "clients",
  "establishments",
  "platforms",
  "agent",
  "emission",
  "inbox",
  "e-reporting",
  "team",
  "billing",
  "settings",
  "notifications",
];

/**
 * Guides FAQ + blurbs — une entrée par page technique.
 * Explique : rôle de la page, cadre réforme 2026, prochaines actions.
 */
export const PAGE_GUIDES: Record<PageGuideId, PageGuideContent> = {
  dashboard: {
    title: "Mon tableau de bord",
    blurb:
      "Cockpit de votre dossier : volumes, modules branchés et prochaines actions pour la réforme.",
    faq: [
      {
        title: "À quoi sert le tableau de bord ?",
        text: "Vue d’ensemble de votre préparation réforme : volumes, erreurs fréquentes, modules couverts (Sources, Analyse, PA, Émission) et alertes d’échéances. Ce n’est pas un outil de dépôt fiscal — c’est votre cockpit opérationnel.",
      },
      {
        title: "Que prévoit la loi (réforme 2026) ?",
        text: "Progressivement, les entreprises assujetties doivent recevoir puis émettre des factures électroniques via une plateforme agréée (PA), et déclarer certains flux via l’e-reporting. Les dates dépendent de la taille (GE / ETI / PME / micro).",
      },
      {
        title: "Que faire en priorité ?",
        text: "1) Compléter le diagnostic Conformité. 2) Brancher Sources et la plateforme. 3) Analyser puis émettre. Les cartes « couverture modules » et alertes calendrier indiquent les trous.",
      },
      {
        title: "InvoicePilot est-il une PA ?",
        text: "Non. Nous sommes une solution compatible : on prépare, valide et orchestre. L’échange avec l’administration passe par la PA que vous choisissez.",
      },
    ],
    engages: [
      {
        title: "Diagnostic conformité",
        description:
          "Taille, TVA, B2C / export → échéances personnalisées et score de préparation.",
        moreTitle: "Ouvrir Conformité",
        moreUrl: "/compliance",
        illustration: 5,
      },
      {
        title: "Brancher les flux",
        description: "Sources pour récupérer les ventes, la plateforme pour émettre et déposer.",
        moreTitle: "Ouvrir Sources",
        moreUrl: "/integrations",
        illustration: 1,
      },
    ],
  },

  compliance: {
    title: "Ma conformité",
    blurb:
      "Votre profil fiscal et vos dates d’obligation : réception, émission et e-reporting selon votre taille.",
    faq: [
      {
        title: "À quoi sert cette page ?",
        text: "Enregistrer votre profil fiscal/opérationnel (taille, TVA, B2C, export) pour calculer vos échéances réforme, le besoin d’e-reporting, et un score de préparation (Sources + PA + jalons).",
      },
      {
        title: "Que prévoit la loi ?",
        text: "Obligation progressive de réception puis d’émission d’e-factures, et d’e-reporting pour certains flux (B2C, international…). Les calendriers DGFiP diffèrent selon GE, ETI, PME et micro-entreprises.",
      },
      {
        title: "Pourquoi mettre à jour le diagnostic ?",
        text: "Un mauvais profil = mauvaises dates et mauvais conseils. B2C ou export activent typiquement l’e-reporting ; la taille fixe l’année d’émission obligatoire.",
      },
      {
        title: "Le score remplace-t-il un conseil fiscal ?",
        text: "Non. C’est un indicateur produit pour prioriser Sources, PA et flux. Pour un conseil personnalisé, adressez-vous à votre expert-comptable ou au 0 806 807 807 (info réforme).",
      },
    ],
    engages: [
      {
        title: "Sources & PA",
        description: "Sans canaux branchés, le score reste bas même si le diagnostic est rempli.",
        moreTitle: "Ouvrir Sources",
        moreUrl: "/integrations",
        illustration: 1,
      },
      {
        title: "E-reporting",
        description:
          "Si B2C / export : préparez les lots périodiques après avoir connecté la plateforme.",
        moreTitle: "Ouvrir E-reporting",
        moreUrl: "/e-reporting",
        illustration: 10,
      },
    ],
  },

  sources: {
    title: "Mes sources",
    blurb:
      "Entrée du flux : PDF / boutique → puis Analyse IA → Émission (B2B) ou E-reporting (B2C).",
    faq: [
      {
        title: "À quoi sert Sources ?",
        text: "Faire entrer vos ventes dans InvoicePilot : upload PDF / tickets, sync Shopify ou WooCommerce. Sans ventes en base, Analyse IA, Émission et e-reporting restent vides.",
      },
      {
        title: "Que prévoit la loi ?",
        text: "La réforme impose des factures structurées (Factur-X / UBL…) et des flux vers une PA. Les données doivent être fiables (SIREN, montants, mentions). Sources est l’entrée de ces données métier.",
      },
      {
        title: "PDF, site marchand, Amazon / Cdiscount ?",
        text: "PDF et tickets : upload manuel. Sites : Shopify / WooCommerce disponibles. Marketplaces (Amazon, Cdiscount…) : pas encore de connecteur natif — exportez en PDF puis uploadez. PrestaShop / Wix : au catalogue « bientôt ».",
      },
      {
        title: "Pourquoi une confirmation pour déconnecter ?",
        text: "Couper une source ou retirer du catalogue est destructif pour le canal (pas pour les factures déjà importées). La saisie DECONNECTER évite les clics accidentels.",
      },
    ],
    engages: [
      {
        title: "Analyser les imports",
        description:
          "Après sync ou upload : N° = PDF · Analyser = file Analyse IA (jamais d’émission directe ici).",
        moreTitle: "Ouvrir Analyse IA",
        moreUrl: "/agent",
        illustration: 10,
      },
      {
        title: "Référentiel clients",
        description: "Les acheteurs extraits alimentent Clients — base de vérité SIREN / adresse.",
        moreTitle: "Ouvrir Clients",
        moreUrl: "/clients",
        illustration: 5,
      },
    ],
  },

  clients: {
    title: "Mes clients",
    blurb:
      "Annuaire des acheteurs (SIREN, adresse, contact) pour fiabiliser vos factures avant émission.",
    faq: [
      {
        title: "À quoi sert Clients ?",
        text: "Référentiel des acheteurs de votre entreprise (SIREN, adresse, contact). Ces fiches aident l’IA et la validation à détecter les écarts sur les factures avant émission PA.",
      },
      {
        title: "Que prévoit la loi ?",
        text: "En B2B domestique, le SIREN de l’acheteur figure parmi les mentions attendues pour l’e-facture 2026. Une fiche client incomplète bloque souvent le passage « Passé » en Analyse IA.",
      },
      {
        title: "D’où viennent les clients ?",
        text: "Création manuelle, recherche annuaire entreprises, ou extraction depuis les factures importées (Sources / Analyse IA). Ce n’est plus la liste des factures analysées — c’est l’annuaire.",
      },
      {
        title: "Comment modifier ou supprimer ?",
        text: "Cliquez une ligne → fiche vue / édition. Suppression protégée (confirmation) et refusée s’il reste des factures liées.",
      },
    ],
    engages: [
      {
        title: "Importer des ventes",
        description:
          "Sans factures Sources, le référentiel reste manuel. Sync boutique ou PDF pour enrichir.",
        moreTitle: "Ouvrir Sources",
        moreUrl: "/integrations",
        illustration: 1,
      },
      {
        title: "Corriger via Analyse IA",
        description:
          "Les écarts SIREN / adresse se traitent en Analyse IA puis sur la fiche client.",
        moreTitle: "Ouvrir Analyse IA",
        moreUrl: "/agent",
        illustration: 10,
      },
    ],
  },

  establishments: {
    title: "Mes établissements",
    blurb: "Sites (SIRET) de votre entreprise sous le même SIREN — sièges et agences d’émission.",
    faq: [
      {
        title: "À quoi servent les établissements ?",
        text: "Un compte InvoicePilot = un SIREN. Les établissements sont vos SIRET (siège, agences). Vous émettez depuis le bon site sans créer un compte par magasin.",
      },
      {
        title: "SIREN vs SIRET ?",
        text: "SIREN = l’entreprise (9 chiffres). SIRET = un établissement (14 chiffres, SIREN + NIC). Tous vos SIRET doivent commencer par votre SIREN.",
      },
      {
        title: "Lien avec les clients ?",
        text: "Les clients ont aussi des établissements (SIRET acheteur) enrichis par l’Analyse IA. Cette page ne liste que vos sites vendeur.",
      },
    ],
    engages: [
      {
        title: "Fiches clients",
        description:
          "Acheteurs et leurs SIRET d’établissement se gèrent côté Clients / Analyse IA.",
        moreTitle: "Ouvrir Clients",
        moreUrl: "/clients",
        illustration: 2,
      },
      {
        title: "Paramètres entreprise",
        description:
          "SIREN org et infos légales restent dans Paramètres ; le siège se synchronise ici.",
        moreTitle: "Ouvrir Paramètres",
        moreUrl: "/settings",
        illustration: 8,
      },
    ],
  },

  platforms: {
    title: "Ma plateforme agréée",
    blurb:
      "Choisir et brancher votre PA (canal API). Les factures se gèrent dans Émission, Réception et E-reporting — pas ici.",
    faq: [
      {
        title: "À quoi sert cette page ?",
        text: "Configurer la plateforme agréée unique de votre organisation : déclaration, credentials API, test de connexion. Ce n’est pas le registre des factures.",
      },
      {
        title: "Où sont mes factures alors ?",
        text: "Émission B2B → Mon émission PA. Achats → Ma réception PA. B2C / export → Mon e-reporting. Cette page ne fait que le branchement technique de la PA.",
      },
      {
        title: "Déclarer ou brancher ?",
        text: "Déclarer = noter quelle PA vous utilisez. Brancher = enregistrer l’API pour que InvoicePilot puisse transmettre. Sans branchement, les dépôts restent bloqués ailleurs.",
      },
      {
        title: "Que prévoit la loi ?",
        text: "Les flux e-facture et e-reporting transitent par des plateformes agréées. InvoicePilot n’est pas une PA : elle orchestre ; la PA dépose.",
      },
    ],
    engages: [
      {
        title: "Émission B2B",
        description:
          "Une fois le canal prêt, déposez les factures validées depuis le registre d’émission.",
        moreTitle: "Ouvrir Mon émission PA",
        moreUrl: "/invoices",
        illustration: 11,
      },
      {
        title: "Réception & e-reporting",
        description: "Achats entrants et lots B2C/export utilisent la même PA branchée ici.",
        moreTitle: "Ouvrir Ma réception PA",
        moreUrl: "/inbox",
        illustration: 10,
      },
    ],
  },

  agent: {
    title: "Mon analyse IA",
    blurb:
      "Segmente et contrôle vos factures sources : Passé → Émission (B2B) ou E-reporting (B2C) · Bloqué → corriger.",
    faq: [
      {
        title: "À quoi sert Analyse IA ?",
        text: "File unique : analyser (extraction + contrôles), classer B2B / B2C, verdict Passé / Bloqué / À analyser, puis dispatch vers Émission PA ou E-reporting.",
      },
      {
        title: "Que prévoit la loi ?",
        text: "Mentions obligatoires, identification SIREN (B2B), cohérence des montants. B2C / export passent par l’e-reporting périodique, pas l’e-facture B2B.",
      },
      {
        title: "Relancer / Analyser — que se passe-t-il ?",
        text: "Extraction si besoin, mise en forme, validation, score et verdict. Passé B2B → Émission · Passé B2C → E-reporting.",
      },
      {
        title: "Lien avec Clients ?",
        text: "L’extraction peut créer ou rattacher un acheteur. Le référentiel Clients sert ensuite de base de vérité pour les prochaines analyses.",
      },
    ],
    engages: [
      {
        title: "Alimenter la file",
        description: "Uploadez ou synchronisez d’abord dans Sources.",
        moreTitle: "Ouvrir Sources",
        moreUrl: "/integrations",
        illustration: 1,
      },
      {
        title: "Dispatch des passées",
        description:
          "B2B → Émission PA · B2C / export → E-reporting. Cliquez le N° pour voir la cible.",
        moreTitle: "Ouvrir Émission PA",
        moreUrl: "/invoices",
        illustration: 11,
      },
    ],
  },

  emission: {
    title: "Mon émission PA",
    blurb: "Dépôt de vos factures validées vers votre plateforme agréée — pas un e-mail au client.",
    faq: [
      {
        title: "À quoi sert cette page ?",
        text: "Émission vers votre plateforme agréée (PA) : après Analyse et mise en forme, vous déposez ici. Ce n’est pas un e-mail au client — c’est le canal réseau e-facture.",
      },
      {
        title: "Vers où part la facture ?",
        text: "Vers la plateforme agréée (PA) choisie dans Ma plateforme agréée. Elle relaie ensuite vers le réseau public / l’acheteur. InvoicePilot prépare ; la PA dépose.",
      },
      {
        title: "Que prévoit la loi ?",
        text: "Selon votre taille, l’émission d’e-factures B2B domestiques doit passer par une plateforme agréée. Format structuré, mentions, cycle de vie (dépôt, rejet…).",
      },
      {
        title: "Pourquoi ma liste est vide ?",
        text: "Il faut des factures analysées et validées (pas seulement un PDF uploadé). Sources → Analyse → Passé → ici.",
      },
    ],
    engages: [
      {
        title: "Analyse",
        description: "Passez les factures au vert avant l’envoi vers la plateforme.",
        moreTitle: "Ouvrir Analyse",
        moreUrl: "/agent",
        illustration: 10,
      },
      {
        title: "Plateforme agréée",
        description: "Sans PA branchée, pas de dépôt réseau.",
        moreTitle: "Ouvrir Ma plateforme agréée",
        moreUrl: "/platforms",
        illustration: 5,
      },
    ],
  },

  inbox: {
    title: "Ma réception PA",
    blurb: "Factures fournisseurs reçues via votre PA — à approuver ou refuser côté métier.",
    faq: [
      {
        title: "À quoi sert cette page ?",
        text: "Réception depuis votre plateforme agréée (PA) : factures fournisseurs qui arrivent par le réseau e-facture. Approuver ou refuser côté métier.",
      },
      {
        title: "D’où viennent les factures ?",
        text: "Depuis votre plateforme (pas depuis Sources). Les fournisseurs émettent via leur PA ; vous recevez via la vôtre.",
      },
      {
        title: "Que prévoit la loi ?",
        text: "La réception d’e-factures est souvent l’obligation la plus proche selon le calendrier. Sans plateforme branchée en réception, la boîte reste vide.",
      },
      {
        title: "Approuver = payer ?",
        text: "Non. Approuver / refuser enregistre le traitement métier. Le paiement reste dans votre compta / banque.",
      },
    ],
    engages: [
      {
        title: "Configurer la plateforme",
        description: "La réception dépend du canal plateforme (réception ou les deux).",
        moreTitle: "Ouvrir Ma plateforme agréée",
        moreUrl: "/platforms",
        illustration: 5,
      },
      {
        title: "Conformité",
        description: "Vérifiez vos dates de réception obligatoires selon la taille.",
        moreTitle: "Ouvrir Conformité",
        moreUrl: "/compliance",
        illustration: 1,
      },
    ],
  },

  "e-reporting": {
    title: "Mon e-reporting",
    blurb:
      "Lots périodiques (B2C, export…) préparés ici et transmis via votre PA — déclaration sortante, pas de réception.",
    faq: [
      {
        title: "C’est quoi l’e-reporting ?",
        text: "Un résumé périodique de certaines ventes (B2C, export, hors e-facture B2B) déposé à l’administration via votre PA. Ce n’est pas une facture envoyée à un client — c’est un lot pour l’État.",
      },
      {
        title: "Y a-t-il une réception e-reporting ?",
        text: "Non. L’e-reporting n’a pas d’inbox ni d’approbation acheteur. La « réception PA » (Ma réception) concerne uniquement les factures fournisseurs reçues via le réseau.",
      },
      {
        title: "Qui est concerné ?",
        text: "Les entreprises avec des ventes aux particuliers, à l’export, ou sans SIREN acheteur. Le diagnostic Conformité indique si le volet est recommandé.",
      },
      {
        title: "Que vois-je avant l’envoi ?",
        text: "La liste des factures éligibles de la période (après Sources / Analyse IA), puis le lot avec toutes les lignes dans un sheet — avant « Transmettre via PA ».",
      },
      {
        title: "D’où vient l’historique des lots ?",
        text: "Chaque ligne est un lot créé avec « Générer / Actualiser le lot ». Le bouton agrège les ventes B2C / export / intra-UE déjà dans InvoicePilot pour la période.",
      },
      {
        title: "Comment transmettre un lot ?",
        text: "1) Brancher la PA. 2) Générer le lot. 3) Ouvrir « Voir le lot » pour contrôler. 4) Transmettre via PA.",
      },
      {
        title: "Pourquoi j’ai besoin d’une PA ?",
        text: "L’e-reporting se dépose via une plateforme agréée. InvoicePilot prépare le lot ; la PA porte l’échange.",
      },
    ],
    engages: [
      {
        title: "Récupérer les ventes",
        description:
          "PDF, tickets, Shopify, WooCommerce — dans Sources. Sans ventes en base, le lot reste vide.",
        moreTitle: "Ouvrir Sources",
        moreUrl: "/integrations",
        illustration: 1,
      },
      {
        title: "Brancher la plateforme agréée",
        description: "Sans PA branchée, le lot reste « PA requise ». La PA dépose l’e-reporting.",
        moreTitle: "Ouvrir Ma plateforme agréée",
        moreUrl: "/platforms",
        illustration: 5,
      },
    ],
  },

  team: {
    title: "Mon équipe",
    blurb: "Membres et rôles de votre organisation — chaque dossier client reste isolé.",
    faq: [
      {
        title: "Qui peut inviter des membres ?",
        text: "Uniquement le propriétaire et les administrateurs de votre organisation. Les invitations et membres d’autres clients InvoicePilot sont invisibles.",
      },
      {
        title: "Que se passe-t-il si la personne n’a pas encore de compte ?",
        text: "Elle reçoit un e-mail avec un lien. Sur la page d’invitation, elle choisit un mot de passe, crée son compte et rejoint directement votre organisation.",
      },
      {
        title: "Puis-je donner accès à plusieurs entreprises ?",
        text: "Oui : un même utilisateur peut être membre de plusieurs organisations, chacune isolée. Le sélecteur d’organisation change de dossier actif.",
      },
    ],
  },

  billing: {
    title: "Mon abonnement",
    blurb:
      "Plan SaaS InvoicePilot (essai, facturation) — distinct des frais éventuels de votre PA.",
    faq: [
      {
        title: "Comment est déterminé le prix de chaque plan ?",
        text: "Starter, Pro et Enterprise couvrent des volumes de factures, de sources et de connecteurs PA différents. Le prix affiché est hors taxes.",
      },
      {
        title: "Y a-t-il des frais cachés ?",
        text: "Non. L’abonnement InvoicePilot est distinct des éventuels frais de votre plateforme agréée (PA). Vous ne payez que le plan SaaS choisi.",
      },
      {
        title: "Que se passe-t-il à la fin de l’essai ?",
        text: "Sans paiement, le compte passe en suspension. Vous pouvez réactiver à tout moment depuis Abonnement en choisissant un plan.",
      },
      {
        title: "Puis-je changer de plan plus tard ?",
        text: "Oui. Depuis Comparer les plans, choisissez une offre supérieure ou inférieure.",
      },
    ],
  },

  settings: {
    title: "Mes paramètres",
    blurb: "Identité du dossier, sécurité, préférences d’affichage et notifications.",
    faq: [
      {
        title: "À quoi servent les Paramètres ?",
        text: "Profil, organisation (SIREN, taille), sécurité (2FA), apparence et notifications. Ce n’est pas le flux réforme — c’est la configuration du dossier.",
      },
      {
        title: "Organisation vs plateforme ?",
        text: "Organisation = identité légale du dossier. Plateforme = plateforme agréée choisie pour les échanges. Les deux sont nécessaires mais distincts.",
      },
      {
        title: "Qui peut modifier ?",
        text: "Selon le rôle (propriétaire / admin / collaborateur). La facturation et les réglages sensibles sont en général réservés aux rôles élevés.",
      },
    ],
    engages: [
      {
        title: "Centre de notifications",
        description: "Alertes conformité, abonnement et parcours PA.",
        moreTitle: "Voir les notifications",
        moreUrl: "/notifications",
        illustration: 28,
      },
      {
        title: "Mon équipe",
        description: "Inviter un collaborateur sur le dossier.",
        moreTitle: "Gérer l’équipe",
        moreUrl: "/team",
        illustration: 23,
      },
    ],
  },

  notifications: {
    title: "Notifications",
    blurb:
      "Alertes et messages du parcours conformité — essai, PA, analyse IA, sécurité. Marquez comme lu ou ouvrez l’action liée.",
    faq: [
      {
        title: "Différence notification / alerte ?",
        text: "Les alertes (WARNING / ALERT) signalent une action requise (PA manquante, échéance). Les notifications INFO / SUCCESS informent sans bloquer.",
      },
      {
        title: "Où sont envoyés les e-mails ?",
        text: "Les e-mails transactionnels (invite, reset, contact) passent par SMTP (Mailpit en local). Ce centre regroupe les notifications in-app.",
      },
    ],
    engages: [
      {
        title: "Plateformes agréées",
        description: "Corrigez les alertes PA en branchant une plateforme agréée.",
        moreTitle: "Configurer une PA",
        moreUrl: "/platforms",
        illustration: 26,
      },
      {
        title: "Préférences compte",
        description: "Ajustez les canaux et le profil depuis les paramètres.",
        moreTitle: "Ouvrir les paramètres",
        moreUrl: "/settings",
        illustration: 29,
      },
    ],
  },
};

export function pageGuide(id: PageGuideId): PageGuideContent {
  return PAGE_GUIDES[id];
}

/** Sections FAQ publiques (landing) — même ordre que la nav app. */
export function getLandingFaqSections(): {
  id: PageGuideId;
  title: string;
  blurb: string;
  faq: FaqItem[];
}[] {
  return PAGE_GUIDE_ORDER.map((id) => {
    const g = PAGE_GUIDES[id];
    return { id, title: g.title, blurb: g.blurb, faq: g.faq };
  });
}
