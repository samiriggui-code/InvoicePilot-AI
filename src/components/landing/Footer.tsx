import { AppLogo } from "@/components/app/AppLogo";
import { getDocsUrl } from "@/lib/docs-url";

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Produit: [
    { label: "Fonctionnalités", href: "/fonctionnalites" },
    { label: "Intégrations", href: "/#integrations" },
    { label: "API", href: getDocsUrl() },
    { label: "Tarifs", href: "/#tarifs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Analyse IA", href: "/analyse-ia" },
  ],
  Ressources: [
    { label: "FAQ produit", href: "/faq" },
    { label: "Documentation", href: getDocsUrl() },
    { label: "Guide réforme 2026", href: "/guide-reforme-2026" },
    { label: "Blog", href: "/blog" },
    { label: "Webinaires", href: "/webinaires" },
    { label: "Status", href: "/status" },
  ],
  Entreprise: [
    { label: "À propos", href: "/a-propos" },
    { label: "Cabinets comptables", href: "/cabinets-comptables" },
    { label: "Licences", href: "/licences-api" },
    { label: "Partenaires", href: "/partenaires" },
    { label: "Contact", href: "/contact" },
  ],
  Légal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "CGU", href: "/cgu" },
    { label: "Confidentialité", href: "/politique-confidentialite" },
    { label: "RGPD", href: "/rgpd" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-[oklch(0.17_0.004_285)] text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <AppLogo onDark imgClassName="h-7" />
            <p className="mt-4 text-sm leading-relaxed">
              Solution compatible de conformité facture pour anticiper la réforme 2026 — pas une
              plateforme agréée.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white">{category}</h4>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors hover:text-white"
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm">© 2026 InvoicePilot AI. Tous droits réservés.</p>
          <p className="text-sm">Fait en France 🇫🇷</p>
        </div>
      </div>
    </footer>
  );
}
