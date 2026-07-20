/** Public Metronic-style media under `/public/media`. */

/** Resolve public asset path (Metronic `toAbsoluteUrl` compatible). */
export function toAbsoluteUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

/** Avatars Metronic disponibles : 300-1 … 300-34 (+ blank). */
export const AVATAR_COUNT = 34;

export const AVATAR_PRESETS: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_, i) => `300-${i + 1}`,
);

export const media = {
  app: {
    logo: "/media/app/default-logo.svg",
    logoDark: "/media/app/default-logo-dark.svg",
    logoFull: "/media/app/logo-full.svg",
    logoFullDark: "/media/app/logo-full-dark.svg",
    logoPng: "/media/app/logo.png",
    logoPngDark: "/media/app/logo-dark.png",
    iconPng: "/media/app/icon.png",
    iconPngDark: "/media/app/icon-dark.png",
    mini: "/media/app/mini-logo.svg",
    miniPrimary: "/media/app/mini-logo-primary.svg",
    miniCircle: "/media/app/mini-logo-circle-primary.svg",
    miniCircleDark: "/media/app/mini-logo-circle-primary-dark.svg",
    authBg: "/media/app/auth-bg.png",
    authScreen: "/media/app/auth-screen.png",
    authScreenDark: "/media/app/auth-screen-dark.png",
    favicon: "/media/app/favicon.ico",
    favicon32: "/media/app/favicon-32x32.png",
    appleTouch: "/media/app/apple-touch-icon.png",
    og: "/media/app/og-image.png",
  },
  illustration: (n: number, dark = false) =>
    dark ? `/media/illustrations/${n}-dark.svg` : `/media/illustrations/${n}.svg`,
  avatar: (n: number) => `/media/avatars/300-${n}.png`,
  avatarByKey: (key: string) => `/media/avatars/${key}.png`,
  flag: (slug: string) => `/media/flags/${slug}.svg`,
  brand: (file: string) => `/media/brand-logos/${file}`,
  /** Icons PA DGFiP — `public/media/pa-logos/{slug}.{png|svg|…}` */
  paLogo: (file: string) => `/media/pa-logos/${file}`,
  fileType: (ext: string) => `/media/file-types/${ext}.svg`,
  placeholder: "/media/misc/placeholder.svg",
} as const;

export function isValidAvatarKey(key: string | null | undefined): key is string {
  if (!key) return false;
  return AVATAR_PRESETS.includes(key) || key === "blank";
}

/** Stable demo avatar 1–34 from an email / id. */
export function avatarForKey(key: string, max = AVATAR_COUNT): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const n = (Math.abs(hash) % max) + 1;
  return media.avatar(n);
}

/** Avatar choisi par l’utilisateur, sinon fallback déterministe sur l’e-mail. */
export function resolveUserAvatar(opts: { email: string; avatarKey?: string | null }): string {
  if (isValidAvatarKey(opts.avatarKey)) {
    return media.avatarByKey(opts.avatarKey);
  }
  return avatarForKey(opts.email);
}

/** Brand mark stand-ins for PA / integrations (legacy). Prefer `resolvePaLogoUrl`. */
export const platformBrandLogo: Record<string, string> = {
  "chorus-pro": media.flag("france"),
  pennylane: media.paLogo("pennylane.png"),
  qonto: media.paLogo("qonto.png"),
  indy: media.paLogo("indy.png"),
  shine: media.paLogo("shine.png"),
  yooz: media.paLogo("yooz.png"),
  basware: media.paLogo("basware.png"),
  seqino: media.paLogo("seqino.jpg"),
  b2brouter: media.paLogo("b2brouter.png"),
  odoo: media.paLogo("odoo.png"),
  sage: media.paLogo("sage.png"),
};

export const connectorLogos = {
  shopify: "shopify",
  woocommerce: "woocommerce",
  stripe: "stripe",
  odoo: "odoo",
  dolibarr: "dolibarr",
  sage: "sage",
  pennylane: "pennylane",
  quickbooks: "quickbooks",
  prestashop: "prestashop",
  hubspot: "hubspot",
  salesforce: "salesforce",
  "api-rest": "api-rest",
} as const;

export const emptyIllustrations = {
  invoices: media.illustration(11),
  clients: media.illustration(23),
  platforms: media.illustration(5),
  generic: media.illustration(1),
} as const;
