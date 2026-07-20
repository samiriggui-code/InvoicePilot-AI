import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/reui/badge";
import { media, toAbsoluteUrl } from "@/lib/media";

/** Contenu 404 — Metronic `errors/error-404` (sans layout). */
export function Error404() {
  return (
    <>
      <div className="mb-10">
        <img
          src={toAbsoluteUrl(media.illustration(19))}
          className="mx-auto max-h-[160px] dark:hidden"
          alt=""
        />
        <img
          src={toAbsoluteUrl(media.illustration(19, true))}
          className="mx-auto hidden max-h-[160px] dark:block"
          alt=""
        />
      </div>

      <Badge variant="primary-light" className="mb-3">
        Erreur 404
      </Badge>

      <h3 className="mb-2 text-center text-2xl font-semibold text-foreground">Page introuvable</h3>

      <p className="mb-10 max-w-md text-center text-base text-muted-foreground">
        La page demandée n’existe pas. Vérifiez l’URL ou{" "}
        <Link to="/" className="font-medium text-primary hover:underline">
          retournez à l’accueil
        </Link>
        .
      </p>
    </>
  );
}
