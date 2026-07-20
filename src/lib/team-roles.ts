import type { MemberRole } from "@/lib/types";

export type { MemberRole };

export const MEMBER_ROLE_LABELS: Record<MemberRole, string> = {
  OWNER: "Propriétaire",
  ADMIN: "Administrateur",
  ACCOUNTANT: "Comptable",
  COLLABORATOR: "Collaborateur",
};

export const INVITABLE_ROLES: MemberRole[] = ["ADMIN", "ACCOUNTANT", "COLLABORATOR"];

export function canManageTeam(role: MemberRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/** Matrice permissions produit — alignée sur MemberRole Prisma. */
export type PermissionKey =
  | "team_manage"
  | "billing"
  | "settings"
  | "sources"
  | "platforms"
  | "invoices_emit"
  | "invoices_receive"
  | "e_reporting"
  | "api_keys"
  | "ai_agent";

export const PERMISSION_META: Record<PermissionKey, { title: string; description: string }> = {
  team_manage: {
    title: "Gestion des utilisateurs",
    description: "Inviter, modifier les rôles et retirer des membres de l’organisation.",
  },
  billing: {
    title: "Abonnement & facturation",
    description: "Voir et modifier le plan Stripe de l’organisation.",
  },
  settings: {
    title: "Paramètres organisation",
    description: "Profil société, SIREN, préférences du compte.",
  },
  sources: {
    title: "Sources (Shopify, Woo…)",
    description: "Connecter et synchroniser les canaux d’émission.",
  },
  platforms: {
    title: "Plateformes agréées (PA)",
    description: "Configurer le pont vers la PA et les sandboxes.",
  },
  invoices_emit: {
    title: "Émission de factures",
    description: "Créer, corriger et transmettre les factures clients.",
  },
  invoices_receive: {
    title: "Réception / Inbox",
    description: "Traiter les factures fournisseurs reçues via la PA.",
  },
  e_reporting: {
    title: "E-reporting",
    description: "Consulter et préparer les déclarations e-reporting.",
  },
  api_keys: {
    title: "Clés API",
    description: "Créer et révoquer les clés API de l’organisation.",
  },
  ai_agent: {
    title: "Analyse IA",
    description: "Utiliser l’assistant et l’analyse documentaire.",
  },
};

export const ROLE_PERMISSIONS: Record<MemberRole, Record<PermissionKey, boolean>> = {
  OWNER: {
    team_manage: true,
    billing: true,
    settings: true,
    sources: true,
    platforms: true,
    invoices_emit: true,
    invoices_receive: true,
    e_reporting: true,
    api_keys: true,
    ai_agent: true,
  },
  ADMIN: {
    team_manage: true,
    billing: true,
    settings: true,
    sources: true,
    platforms: true,
    invoices_emit: true,
    invoices_receive: true,
    e_reporting: true,
    api_keys: true,
    ai_agent: true,
  },
  ACCOUNTANT: {
    team_manage: false,
    billing: false,
    settings: false,
    sources: false,
    platforms: false,
    invoices_emit: true,
    invoices_receive: true,
    e_reporting: true,
    api_keys: false,
    ai_agent: true,
  },
  COLLABORATOR: {
    team_manage: false,
    billing: false,
    settings: false,
    sources: false,
    platforms: false,
    invoices_emit: true,
    invoices_receive: true,
    e_reporting: false,
    api_keys: false,
    ai_agent: true,
  },
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  OWNER:
    "Contrôle total de l’organisation, facturation et utilisateurs. Un seul propriétaire recommandé.",
  ADMIN:
    "Gère l’équipe, les connexions sources/PA et les paramètres — sans pouvoir supprimer le propriétaire.",
  ACCOUNTANT: "Accès aux flux factures, réception et e-reporting pour la conformité comptable.",
  COLLABORATOR:
    "Travaille sur l’émission et la réception au quotidien, sans accès admin ni abonnement.",
};
