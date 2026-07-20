import { Badge } from "@/components/ui/badge";
import {
  CtaBand,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { cn } from "@/lib/utils";

/** Version affichée — alignée sur le cycle produit 2026. */
export const APP_VERSION = "0.9.0";
export const APP_VERSION_LABEL = "2026.07 — Socle conformité";

type ProgressStatus = "live" | "beta" | "catalog" | "planned";

const STATUS_LABEL: Record<ProgressStatus, { label: string; className: string }> = {
  live: {
    label: "Disponible",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  beta: {
    label: "Beta / sandbox",
    className: "bg-amber-500/10 text-amber-800 dark:text-amber-400",
  },
  catalog: {
    label: "Au catalogue",
    className: "bg-primary/10 text-primary",
  },
  planned: {
    label: "À venir",
    className: "bg-muted text-muted-foreground",
  },
};

const VERSIONS = [
  {
    version: "0.9.0",
    date: "Juillet 2026",
    title: "Socle conformité & parcours réforme",
    current: true,
    items: [
      "Parcours Sources → Analyse IA → Clients → Émission / Réception PA → E-reporting",
      "Diagnostic conformité (taille, échéances, score)",
      "Analyse IA + heuristique locale, référentiel clients",
      "Catalogue PA + branchement sandbox selon connecteur",
      "FAQ produit, pages marketing, docs Mintlify",
    ],
  },
  {
    version: "0.8.0",
    date: "Juin 2026",
    title: "Flux ventes & file d’analyse",
    items: [
      "Upload PDF / tickets + sync Shopify / WooCommerce",
      "File Mon analyse IA (Passé / Bloqué / À analyser)",
      "Premiers lots e-reporting (génération période)",
    ],
  },
  {
    version: "0.7.0",
    date: "Mai 2026",
    title: "Fondation multi-tenant",
    items: [
      "Organisations isolées, équipe, abonnement essai",
      "Inscription multi-étapes (identité légale + profil réforme)",
      "Tableau de bord modules & couverture",
    ],
  },
];

const SOURCES: {
  name: string;
  status: ProgressStatus;
  note: string;
}[] = [
  {
    name: "PDF / tickets (upload)",
    status: "live",
    note: "Entrée manuelle — toujours disponible.",
  },
  {
    name: "Shopify",
    status: "live",
    note: "Sync commandes → ventes dans Sources.",
  },
  {
    name: "WooCommerce",
    status: "live",
    note: "Sync boutique WordPress.",
  },
  {
    name: "PrestaShop",
    status: "catalog",
    note: "Listé au catalogue — connecteur natif en préparation.",
  },
  {
    name: "Wix",
    status: "catalog",
    note: "Listé au catalogue — connecteur natif en préparation.",
  },
  {
    name: "Amazon / Cdiscount",
    status: "planned",
    note: "Pas de connecteur natif : export PDF puis upload.",
  },
  {
    name: "API / ERP custom",
    status: "beta",
    note: "Poussée depuis un logiciel tiers (licence éditeur).",
  },
];

const PAS: {
  name: string;
  status: ProgressStatus;
  note: string;
}[] = [
  {
    name: "Catalogue PA DGFiP",
    status: "live",
    note: "Déclaration d’une PA par dossier (identité métier).",
  },
  {
    name: "Qonto",
    status: "beta",
    note: "Canal sandbox / PAaaS — dépôt réel selon credentials.",
  },
  {
    name: "Seqino, B2Brouter, SUPER PDP…",
    status: "beta",
    note: "PA API-first : branchement sandbox selon portail partenaire.",
  },
  {
    name: "Pennylane, Indy, Shine, Sage…",
    status: "catalog",
    note: "Sélectionnables ; canal API selon maturité éditeur.",
  },
  {
    name: "Credentials production PA",
    status: "planned",
    note: "Go-live production après validation partenaire.",
  },
  {
    name: "Réception fournisseurs (inbox)",
    status: "beta",
    note: "Flux depuis la PA branchée — dépend du canal réception.",
  },
];

function StatusBadge({ status }: { status: ProgressStatus }) {
  const meta = STATUS_LABEL[status];
  return (
    <Badge variant="secondary" className={cn("font-medium", meta.className)}>
      {meta.label}
    </Badge>
  );
}

function ProgressGrid({
  items,
}: {
  items: { name: string; status: ProgressStatus; note: string }[];
}) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.name}
          className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-5 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">{item.name}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.note}</p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}

export function ChangelogPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Produit"
        title="Changelog & versioning"
        description={`Version courante ${APP_VERSION} (${APP_VERSION_LABEL}). Chronologie des livraisons et état d’avancement des sources et des plateformes agréées — transparent, sans fausse promesse.`}
      />

      <Section>
        <SectionHeader
          eyebrow="Version"
          title={`InvoicePilot AI ${APP_VERSION}`}
          description="SemVer produit : 0.x = construction active avant généralisation septembre 2026."
        />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Badge className="px-3 py-1 text-sm">v{APP_VERSION}</Badge>
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {APP_VERSION_LABEL}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700 dark:text-emerald-400"
          >
            En production (essai)
          </Badge>
        </div>
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Chronologie"
          title="Historique des versions"
          description="Du socle multi-tenant au parcours réforme complet."
        />
        <ol className="relative mt-16 space-y-0 border-l border-border/80 pl-8 sm:ml-4">
          {VERSIONS.map((v) => (
            <li key={v.version} className="relative pb-12 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[2.15rem] top-1.5 size-3 rounded-full ring-4",
                  v.current ? "bg-primary ring-primary/20" : "bg-muted-foreground/40 ring-muted",
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                  v{v.version} · {v.date}
                </p>
                {v.current ? (
                  <Badge className="text-[10px] uppercase tracking-wider">Courante</Badge>
                ) : null}
              </div>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">{v.title}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {v.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Sources"
          title="État d’avancement des intégrations sources"
          description="D’où entrent vos ventes dans InvoicePilot — Mes sources."
        />
        <ProgressGrid items={SOURCES} />
      </Section>

      <Section muted>
        <SectionHeader
          eyebrow="Plateformes agréées"
          title="État d’avancement des PA"
          description="Déclaration, sandbox, puis production — InvoicePilot orchestre ; la PA dépose."
        />
        <ProgressGrid items={PAS} />
      </Section>

      <CtaBand
        title="Suivre les prochaines versions"
        description="Essai Pro 14 jours — même socle que cette chronologie."
        primary={{ label: "Créer un compte", href: "/signup" }}
        secondary={{ label: "FAQ produit", href: "/faq" }}
      />
    </MarketingPage>
  );
}
