import { Activity, CheckCircle2, Server } from "lucide-react";

import { MarketingPage, PageHero, Section, SectionHeader } from "@/components/marketing/shell";
import { Badge } from "@/components/ui/badge";
import { getDocsUrl } from "@/lib/docs-url";

const services = [
  {
    name: "App SaaS (Vite / TanStack)",
    detail: "Interface produit — port 8081 en local",
    status: "operational" as const,
  },
  {
    name: "API sandbox /api/v1",
    detail: "validate · emit · score · webhooks",
    status: "operational" as const,
  },
  {
    name: "Documentation Mintlify",
    detail: "apps/docs — npm run docs:dev · port 3004",
    status: "operational" as const,
    href: getDocsUrl(),
  },
  {
    name: "Auth / 2FA e-mail",
    detail: "Sessions et codes de vérification",
    status: "operational" as const,
  },
  {
    name: "Stripe (abonnements)",
    detail: "Operational si clés configurées",
    status: "degraded" as const,
  },
];

const statusLabel = {
  operational: {
    label: "Operational",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  degraded: {
    label: "Config-dependent",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
};

export function StatusPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Ressources"
        title="Status des services"
        description="Disponibilité de l’environnement de développement InvoicePilot AI. En production, cette page sera reliée à un monitoring public."
      />

      <Section>
        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-5 py-4 text-center sm:justify-start sm:text-left">
          <Activity className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-semibold">Tous les systèmes critiques opérationnels</p>
            <p className="text-sm text-muted-foreground">
              Dernière vérification manuelle — phase construction produit
            </p>
          </div>
        </div>

        <div className="mt-16">
          <SectionHeader title="Composants" />
        </div>
        <div className="mt-16 space-y-3">
          {services.map((s) => {
            const st = statusLabel[s.status];
            return (
              <div
                key={s.name}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3 text-left">
                  <Server className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {s.href ? (
                        <a
                          href={s.href}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          {s.name}
                        </a>
                      ) : (
                        s.name
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={st.className}>
                  <CheckCircle2 className="mr-1 size-3.5" />
                  {st.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </Section>
    </MarketingPage>
  );
}
