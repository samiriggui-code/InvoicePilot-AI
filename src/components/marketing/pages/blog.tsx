import { ArrowUpRight, CalendarDays, FileText } from "lucide-react";

import {
  CtaBand,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDocsUrl } from "@/lib/docs-url";

const posts = [
  {
    tag: "Réforme",
    title: "PA vs solution compatible : qui fait quoi en 2026 ?",
    excerpt: "Clarifier les rôles pour éviter de vendre (ou d’acheter) un faux statut d’échange.",
    href: "/guide-reforme-2026",
    date: "Juillet 2026",
  },
  {
    tag: "Technique",
    title: "Valider une facture via l’API sandbox en 5 minutes",
    excerpt: "Bearer ip_sandbox_demo, POST /invoices/validate, lecture du score et des checks.",
    href: getDocsUrl(),
    external: true,
    date: "Juillet 2026",
  },
  {
    tag: "Cabinets",
    title: "Checklist portefeuille avant le 1er septembre 2026",
    excerpt: "Qui reçoit déjà, qui doit choisir une PA, qui bloque encore sur SIREN client.",
    href: "/cabinets-comptables",
    date: "À paraître",
  },
];

export function BlogPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Ressources"
        title="Blog — veille réforme & intégrations"
        description="Articles longs en construction. En attendant, le guide opérationnel et la doc API couvrent le fond réglementaire et technique."
        actions={
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <a href="/guide-reforme-2026">Lire le guide 2026</a>
          </Button>
        }
      />

      <Section>
        <SectionHeader title="À lire maintenant" />
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {posts.map((post) => (
            <a
              key={post.title}
              href={post.href}
              target={post.external ? "_blank" : undefined}
              rel={post.external ? "noreferrer" : undefined}
              className="group flex flex-col rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="secondary">{post.tag}</Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {post.date}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold group-hover:text-primary">{post.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Ouvrir
                <ArrowUpRight className="size-3.5" />
              </span>
            </a>
          ))}
        </div>
      </Section>

      <Section muted>
        <SectionHeader
          title="Sujets prévus"
          description="Mapping Factur-X depuis Odoo / Shopify · retours PA · mises à jour DGFiP."
        />
        <div className="mt-16 flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-6" />
          </div>
          <Button variant="outline" asChild>
            <a href="/contact">Proposer un sujet</a>
          </Button>
        </div>
      </Section>

      <CtaBand
        title="Besoin du fond technique maintenant ?"
        description="Le playground Mintlify et le guide réforme sont stables."
        primary={{ label: "Documentation API", href: getDocsUrl() }}
        secondary={{ label: "Guide réforme", href: "/guide-reforme-2026" }}
      />
    </MarketingPage>
  );
}
