import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LANDING_CONTAINER, LANDING_SECTION_TITLE } from "@/lib/landing-layout";

const plans = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "29",
    description: "Pour les indépendants et TPE qui démarrent la conformité.",
    features: [
      "50 factures / mois",
      "Validation Factur-X",
      "1 connecteur",
      "Agent IA (50 questions/mois)",
      "Tableau de bord basique",
    ],
    cta: "Essai 14 jours — s’inscrire",
    highlighted: false,
    action: "signup" as const,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "79",
    description: "Pour les PME avec un volume de facturation régulier.",
    features: [
      "500 factures / mois",
      "Validation Factur-X & UBL",
      "5 connecteurs",
      "Agent IA illimité",
      "Intégration PDP",
      "Détection d'erreurs avancée",
      "Tableau de bord complet",
    ],
    cta: "Essai 14 jours — s’inscrire",
    highlighted: true,
    action: "signup" as const,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "199",
    description: "Pour les entreprises et éditeurs de logiciels.",
    features: [
      "Factures illimitées",
      "API complète",
      "Connecteurs illimités",
      "SLA 99,9 %",
      "Support prioritaire",
      "Multi-entités",
      "Rapports d'audit",
      "Webhooks & SDK",
    ],
    cta: "Contacter les ventes",
    highlighted: false,
    action: "contact" as const,
  },
];

const otherOffers = [
  {
    title: "Licences API",
    description:
      "Intégrez la conformité facture directement dans votre logiciel. Tarification au volume, documentation complète et sandbox gratuite.",
    badge: "Éditeurs de logiciels",
    href: "/licences-api",
  },
  {
    title: "Offre Cabinets comptables",
    description:
      "Gérez la conformité de tous vos clients depuis un tableau de bord multi-dossiers. Tarifs dégressifs à partir de 10 dossiers.",
    badge: "Experts-comptables",
    href: "/cabinets-comptables",
  },
];

export function Pricing() {
  return (
    <section id="tarifs" className="border-t border-border/60 bg-muted/30 py-20 sm:py-28">
      <div className={LANDING_CONTAINER}>
        <div className={LANDING_SECTION_TITLE}>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Tarifs</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Un plan pour chaque besoin
          </h2>
          <p className="mt-4 text-muted-foreground">
            14 jours d’essai à l’inscription — sans carte. L’abonnement Stripe se fait ensuite dans
            l’app (Paramètres → Facturation).
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border p-8 ${
                plan.highlighted
                  ? "border-primary bg-card shadow-xl shadow-primary/10"
                  : "border-border/80 bg-card"
              }`}
            >
              {plan.highlighted ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Le plus populaire
                </Badge>
              ) : null}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price} €</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              {plan.action === "signup" ? (
                <Button
                  className="mt-8 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  asChild
                >
                  <Link to="/signup">{plan.cta}</Link>
                </Button>
              ) : (
                <Button className="mt-8 w-full" variant="outline" asChild>
                  <a href="mailto:contact@invoicepilot.ai">{plan.cta}</a>
                </Button>
              )}
            </div>
          ))}
        </div>

        <div id="cabinets" className="mt-20 grid gap-6 sm:grid-cols-2">
          {otherOffers.map((offer) => (
            <div key={offer.title} className="rounded-xl border border-border/80 bg-card p-8">
              <Badge variant="secondary" className="mb-4">
                {offer.badge}
              </Badge>
              <h3 className="text-xl font-semibold">{offer.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {offer.description}
              </p>
              <Button variant="link" className="mt-4 h-auto p-0 text-primary" asChild>
                <a href={offer.href}>En savoir plus →</a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
