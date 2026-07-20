import { createFileRoute } from "@tanstack/react-router";

import { Connectors } from "@/components/landing/Connectors";
import { Cta } from "@/components/landing/Cta";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PaLogosStrip } from "@/components/landing/PaLogosStrip";
import { Pricing } from "@/components/landing/Pricing";

export const Route = createFileRoute("/_marketing/")({
  head: () => ({
    meta: [
      { title: "InvoicePilot AI — Conformité facture pilotée par l'IA" },
      {
        name: "description",
        content:
          "Plateforme de conformité facture : API, intégration PDP, agent IA réglementaire, détection d'erreurs et connecteurs Shopify, Odoo, Sage.",
      },
      { property: "og:title", content: "InvoicePilot AI — Conformité facture pilotée par l'IA" },
      {
        property: "og:description",
        content:
          "Sécurisez votre chaîne de facturation avant la réforme 2026. Validation, PDP agréées, agent IA et connecteurs natifs.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <>
      <Hero />
      <PaLogosStrip />
      <HowItWorks />
      <Features />
      <Connectors />
      <Pricing />
      <Cta />
    </>
  );
}
