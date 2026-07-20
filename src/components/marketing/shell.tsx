import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { LANDING_CONTAINER, LANDING_HERO_TEXT, LANDING_SECTION_TITLE } from "@/lib/landing-layout";
import { cn } from "@/lib/utils";

/** Aligné 1:1 sur la landing : Hero / Features / Pricing / Cta. */
const container = LANDING_CONTAINER;
const sectionY = "py-20 sm:py-28";

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function MarketingPage({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** Hero de page — titres CENTRÉS comme le Hero landing. */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.55_0.19_267/0.12),transparent)]" />
      <div className="pointer-events-none absolute -right-32 top-20 size-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 bottom-0 size-72 rounded-full bg-accent/40 blur-3xl" />

      <div className={cn("relative", container, sectionY)}>
        <div className={LANDING_HERO_TEXT}>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{description}</p>
          {actions ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Section({
  id,
  className,
  children,
  muted,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn("border-t border-border/60", sectionY, muted && "bg-muted/30", className)}
    >
      <div className={container}>{children}</div>
    </section>
  );
}

/** Headers de section — CENTRÉS par défaut (comme Features / Pricing). */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn(align === "center" && LANDING_SECTION_TITLE)}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      ) : null}
      <h2 className={cn("text-3xl font-bold tracking-tight sm:text-4xl", eyebrow && "mt-3")}>
        {title}
      </h2>
      {description ? <p className="mt-4 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

export function FeatureCards({
  items,
  columns = 3,
}: {
  items: {
    icon: LucideIcon;
    title: string;
    description: string;
    color?: string;
  }[];
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "mt-16 grid gap-6",
        columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div
          key={item.title}
          className="group rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
        >
          <div
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-lg",
              item.color ?? "bg-primary/10 text-primary",
            )}
          >
            <item.icon className="size-5" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

export function StatStrip({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border/80 bg-card p-6 text-center transition-shadow hover:shadow-lg hover:shadow-primary/5"
        >
          <p className="text-3xl font-bold tracking-tight text-foreground">{item.value}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

export function Timeline({ items }: { items: { date: string; title: string; body: string }[] }) {
  return (
    <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li
          key={`${item.date}-${item.title}`}
          className="rounded-xl border border-border/80 bg-card p-6 transition-shadow hover:shadow-lg hover:shadow-primary/5"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">{item.date}</p>
          <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function SplitPanel({
  left,
  right,
  reverse,
}: {
  left: ReactNode;
  right: ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid items-start gap-10 lg:grid-cols-2 lg:gap-16",
        reverse && "lg:[&>*:first-child]:order-2",
      )}
    >
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

export function CtaBand({
  title,
  description,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string; external?: boolean };
}) {
  return (
    <section className={sectionY}>
      <div className={container}>
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(1_0_0/0.1),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              {title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">{description}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto" asChild>
                <a
                  href={primary.href}
                  {...(isExternalHref(primary.href) ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {primary.label}
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              {secondary ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
                  asChild
                >
                  <a
                    href={secondary.href}
                    {...(secondary.external || isExternalHref(secondary.href)
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {secondary.label}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Pages légales — même largeur que Features / Pricing (container max-w-6xl). */
export function LegalShell({
  title,
  updated,
  intro,
  articles,
  related,
}: {
  title: string;
  updated: string;
  intro: string;
  articles: { id: string; title: string; body: ReactNode }[];
  related?: { label: string; href: string }[];
}) {
  return (
    <MarketingPage>
      <PageHero eyebrow="Légal" title={title} description={`${intro} Mis à jour : ${updated}.`} />

      <section className={cn("border-t border-border/60 bg-muted/30", sectionY)}>
        <div className={container}>
          <div className={cn(LANDING_SECTION_TITLE, "mb-12")}>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Sommaire</p>
            <nav className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {articles.map((a) => (
                <a
                  key={a.id}
                  href={`#${a.id}`}
                  className="rounded-lg border border-border/80 bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  {a.title}
                </a>
              ))}
            </nav>
            {related && related.length > 0 ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Voir aussi</span>
                {related.map((r) => (
                  <a
                    key={r.href}
                    href={r.href}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {articles.map((a) => (
              <section
                key={a.id}
                id={a.id}
                className="scroll-mt-28 space-y-4 rounded-xl border border-border/80 bg-card p-6 sm:p-8"
              >
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{a.title}</h2>
                <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground md:text-base [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-foreground">
                  {a.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </MarketingPage>
  );
}
