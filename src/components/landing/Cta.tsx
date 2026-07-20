import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LANDING_CONTAINER } from "@/lib/landing-layout";

export function Cta() {
  return (
    <section className="py-20 sm:py-28">
      <div className={LANDING_CONTAINER}>
        <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(1_0_0/0.1),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Prêt pour la facturation électronique ?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Rejoignez les entreprises qui anticipent la réforme 2026. Essai gratuit, sans carte
              bancaire.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="secondary" className="w-full gap-2 sm:w-auto" asChild>
                <Link to="/signup">
                  Créer mon compte gratuit
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
                asChild
              >
                <Link to="/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
