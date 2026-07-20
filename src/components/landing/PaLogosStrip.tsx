import { PaLogo } from "@/components/app/PaLogo";
import { Button } from "@/components/ui/button";
import { LANDING_CONTAINER, LANDING_SECTION_TITLE } from "@/lib/landing-layout";
import { PA_LOGO_FILES } from "@/lib/pa-logos.generated";

/** Showcase curated PA marks on the landing (full pack lives in /media/pa-logos). */
const SHOWCASE = [
  "pennylane",
  "qonto",
  "indy",
  "tiime",
  "shine",
  "sellsy",
  "axonaut",
  "sage",
  "cegid",
  "odoo",
  "seqino",
  "b2brouter",
  "yooz",
  "basware",
  "esker",
  "lucca",
  "dougs",
  "abby",
  "flowie",
  "spendesk",
  "agicap",
  "iopole",
  "generix-group",
  "chorus-pro",
] as const;

const LABELS: Record<string, string> = {
  pennylane: "Pennylane",
  qonto: "Qonto",
  indy: "Indy",
  tiime: "Tiime",
  shine: "Shine",
  sellsy: "Sellsy",
  axonaut: "Axonaut",
  sage: "Sage",
  cegid: "Cegid",
  odoo: "Odoo",
  seqino: "Seqino",
  b2brouter: "B2Brouter",
  yooz: "Yooz",
  basware: "Basware",
  esker: "Esker",
  lucca: "Lucca",
  dougs: "Dougs",
  abby: "Abby",
  flowie: "Flowie",
  spendesk: "Spendesk",
  agicap: "Agicap",
  iopole: "Iopole",
  "generix-group": "Generix",
  "chorus-pro": "Chorus Pro",
};

export function PaLogosStrip() {
  const logos = SHOWCASE.filter((slug) => slug in PA_LOGO_FILES || slug === "chorus-pro");
  const total = Object.keys(PA_LOGO_FILES).length;

  return (
    <section className="border-y border-border/60 bg-background py-16 sm:py-20">
      <div className={LANDING_CONTAINER}>
        <div className={LANDING_SECTION_TITLE}>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Plateformes agréées DGFiP
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Compatible avec le réseau des PA
          </h2>
          <p className="mt-4 text-muted-foreground">
            InvoicePilot est une Solution Compatible : on prépare vos Factur-X, puis on route vers
            votre PA. {total} marques référencées dans l’app (icônes issues des sites officiels).
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {logos.map((slug) => (
            <li
              key={slug}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/40 px-2 py-4"
            >
              {slug === "chorus-pro" ? (
                <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background p-2 shadow-xs">
                  <img src="/media/flags/france.svg" alt="Chorus Pro" className="size-7" />
                </div>
              ) : (
                <PaLogo slug={slug} name={LABELS[slug] ?? slug} />
              )}
              <span className="text-center text-[11px] font-medium text-muted-foreground">
                {LABELS[slug] ?? slug}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-2">
          <Button asChild variant="outline">
            <a href="/signup">Choisir / déclarer ma PA</a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Liste officielle :{" "}
            <a
              href="https://www.impots.gouv.fr/je-consulte-la-liste-des-plateformes-agreees"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              impots.gouv.fr
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
