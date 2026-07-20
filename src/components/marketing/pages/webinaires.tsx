import { Clock, MonitorPlay, Users } from "lucide-react";

import {
  CtaBand,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const sessions = [
  {
    title: "Choisir et immatriculer une PA",
    audience: "DSI & dirigeants",
    duration: "60 min",
    status: "Inscription ouverte",
  },
  {
    title: "Mentions 2026 et contrôles bloquants",
    audience: "Cabinets & crédit managers",
    duration: "45 min",
    status: "Sur demande",
  },
  {
    title: "API éditeurs : sandbox → production",
    audience: "Product & intégrateurs",
    duration: "75 min",
    status: "Sur demande",
  },
];

export function WebinairesPage() {
  return (
    <MarketingPage>
      <PageHero
        eyebrow="Ressources"
        title="Webinaires cabinets & DSI"
        description="Sessions live pour préparer 2026 sans confusion PA / solution compatible. Replay selon session."
        actions={
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <a href="/contact">Demander une session</a>
          </Button>
        }
      />

      <Section>
        <SectionHeader
          title="Catalogue"
          description="Public : associés de cabinets, DSI PME, product managers éditeurs."
        />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <div
              key={s.title}
              className="flex flex-col rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MonitorPlay className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold tracking-tight">{s.title}</h3>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {s.audience}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {s.duration}
                </span>
              </div>
              <Badge variant="secondary" className="mt-4 w-fit">
                {s.status}
              </Badge>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Réservez une session pour votre équipe"
        description="Indiquez la taille du groupe et le thème prioritaire via Contact."
        primary={{ label: "Nous contacter", href: "/contact" }}
        secondary={{ label: "Guide réforme", href: "/guide-reforme-2026" }}
      />
    </MarketingPage>
  );
}
