import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/app/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocsUrl } from "@/lib/docs-url";
import { LANDING_CONTAINER, LANDING_SECTION_TITLE } from "@/lib/landing-layout";
import { cn } from "@/lib/utils";

const connectors = [
  { name: "Shopify", category: "E-commerce", logo: "shopify", href: "/connecteurs" },
  { name: "WooCommerce", category: "E-commerce", logo: "woocommerce", href: "/connecteurs" },
  { name: "Stripe", category: "Paiement", logo: "stripe", href: "/connecteurs" },
  { name: "Odoo", category: "ERP", logo: "odoo", href: "/connecteurs" },
  { name: "Dolibarr", category: "ERP", logo: "dolibarr", href: "/connecteurs" },
  { name: "Sage", category: "Comptabilité", logo: "sage", href: "/connecteurs" },
  { name: "Pennylane", category: "Comptabilité", logo: "pennylane", href: "/connecteurs" },
  { name: "QuickBooks", category: "Comptabilité", logo: "quickbooks", href: "/connecteurs" },
  { name: "PrestaShop", category: "E-commerce", logo: "prestashop", href: "/connecteurs" },
  { name: "HubSpot", category: "CRM", logo: "hubspot", href: "/connecteurs" },
  { name: "Salesforce", category: "CRM", logo: "salesforce", href: "/connecteurs" },
  { name: "API REST", category: "Développeur", logo: "api-rest", href: getDocsUrl() },
] as const;

const categories = ["Tous", "E-commerce", "ERP", "Comptabilité", "Paiement", "CRM", "Développeur"];

export function Connectors() {
  const [active, setActive] = useState("Tous");
  const filtered = useMemo(
    () => (active === "Tous" ? connectors : connectors.filter((c) => c.category === active)),
    [active],
  );

  return (
    <section id="integrations" className="bg-muted/30 py-20 sm:py-28">
      <div className={LANDING_CONTAINER}>
        <div className={LANDING_SECTION_TITLE}>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Intégrations
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Connectez vos outils en quelques clics
          </h2>
          <p className="mt-4 text-muted-foreground">
            Des connecteurs prêts à l&apos;emploi pour synchroniser automatiquement vos factures
            depuis votre stack existante — validation mentions 2026 puis routage vers votre PA.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button key={cat} type="button" onClick={() => setActive(cat)}>
              <Badge
                variant={active === cat ? "default" : "secondary"}
                className={cn("cursor-pointer px-3 py-1", active === cat && "shadow-xs")}
              >
                {cat}
              </Badge>
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map((connector) => (
            <a
              key={connector.name}
              href={connector.href}
              className="group flex flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex size-12 items-center justify-center rounded-lg bg-muted/80 p-2.5 ring-1 ring-border/50 transition-colors group-hover:bg-primary/5">
                <BrandLogo name={connector.logo} alt={connector.name} className="size-7" />
              </div>
              <p className="mt-3 text-sm font-medium tracking-tight">{connector.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{connector.category}</p>
            </a>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Button asChild>
            <a href="/connecteurs">Voir le hub connecteurs</a>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Besoin d&apos;un connecteur sur mesure ?{" "}
            <a
              href={getDocsUrl()}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Tester l&apos;API sandbox (Mintlify)
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
