import { AlertTriangle, Bot, LayoutDashboard, Link2, Plug, ShieldCheck } from "lucide-react";

import { LANDING_CONTAINER, LANDING_SECTION_TITLE } from "@/lib/landing-layout";

const features = [
  {
    icon: ShieldCheck,
    title: "API de conformité",
    description:
      "Validez chaque facture contre les normes Factur-X, UBL et les exigences de la réforme 2026 avant transmission.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Link2,
    title: "Plateformes agréées",
    description:
      "Connectez-vous aux PDP (Plateformes de Dématérialisation Partenaires) agréées par l'État pour l'émission et la réception.",
    color: "text-[oklch(0.55_0.15_200)] bg-[oklch(0.55_0.15_200/0.1)]",
  },
  {
    icon: Bot,
    title: "Agent IA réglementaire",
    description:
      "Posez vos questions sur la TVA, les mentions obligatoires, les délais — obtenez des réponses sourcées et à jour.",
    color: "text-[oklch(0.55_0.18_300)] bg-[oklch(0.55_0.18_300/0.1)]",
  },
  {
    icon: AlertTriangle,
    title: "Détection d'erreurs",
    description:
      "Bloquez les factures non conformes avant émission : SIRET invalide, TVA incorrecte, mentions manquantes, format erroné.",
    color: "text-[oklch(0.65_0.2_50)] bg-[oklch(0.65_0.2_50/0.1)]",
  },
  {
    icon: LayoutDashboard,
    title: "Tableau de bord conformité",
    description:
      "Suivez votre taux de conformité, l'historique des validations et les alertes en temps réel depuis un seul écran.",
    color: "text-[oklch(0.5_0.15_160)] bg-[oklch(0.5_0.15_160/0.1)]",
  },
  {
    icon: Plug,
    title: "Connecteurs natifs",
    description:
      "Synchronisez vos factures depuis Shopify, WooCommerce, Stripe, Odoo, Dolibarr, Sage et bien d'autres outils.",
    color: "text-[oklch(0.5_0.12_30)] bg-[oklch(0.5_0.12_30/0.1)]",
  },
];

export function Features() {
  return (
    <section id="fonctionnalites" className="border-t border-border/60 bg-muted/30 py-20 sm:py-28">
      <div className={LANDING_CONTAINER}>
        <div className={LANDING_SECTION_TITLE}>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Fonctionnalités
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Tout pour être conforme, sans complexité
          </h2>
          <p className="mt-4 text-muted-foreground">
            Une plateforme complète pour anticiper la réforme de la facturation électronique et
            sécuriser chaque émission.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div
                className={`inline-flex size-11 items-center justify-center rounded-lg ${feature.color}`}
              >
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
