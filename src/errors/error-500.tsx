import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { media, toAbsoluteUrl } from "@/lib/media";

/** Contenu 500 — Metronic `errors/error-500` (sans layout). */
export function Error500({
  detail,
  onRetry,
}: {
  detail?: string;
  onRetry?: () => void;
} = {}) {
  return (
    <>
      <div className="mb-10">
        <img
          src={toAbsoluteUrl(media.illustration(20))}
          className="mx-auto max-h-[160px] dark:hidden"
          alt=""
        />
        <img
          src={toAbsoluteUrl(media.illustration(20, true))}
          className="mx-auto hidden max-h-[160px] dark:block"
          alt=""
        />
      </div>

      <Badge variant="destructive-light" className="mb-3">
        Erreur 500
      </Badge>

      <h3 className="mb-2 text-center text-2xl font-semibold text-foreground">Erreur serveur</h3>

      <p className="mb-4 max-w-md text-center text-base text-muted-foreground">
        Une erreur est survenue. Réessayez plus tard ou contactez le support.
      </p>

      {detail ? (
        <p className="mb-6 max-w-lg rounded-md border border-border/60 bg-muted/40 p-3 text-left font-mono text-[11px] text-muted-foreground">
          {detail}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button type="button" onClick={onRetry}>
            Réessayer
          </Button>
        ) : null}
        <Button variant={onRetry ? "outline" : "default"} asChild>
          <Link to="/">Retour à l’accueil</Link>
        </Button>
      </div>
    </>
  );
}
