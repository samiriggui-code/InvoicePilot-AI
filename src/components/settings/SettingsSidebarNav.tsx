/** Uniquement des réglages — pas de navigation produit. */
export type SettingsNavItem = {
  title: string;
  target: string;
};

export const SETTINGS_NAV: SettingsNavItem[] = [
  { title: "Profil", target: "settings_profile" },
  { title: "Organisation", target: "settings_organization" },
  { title: "Sécurité", target: "settings_security" },
  { title: "Clés API", target: "settings_api_keys" },
  { title: "Apparence", target: "settings_appearance" },
  { title: "Notifications", target: "settings_notifications" },
];
