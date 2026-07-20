import { Engage } from "@/components/metronic/engage";
import { media, toAbsoluteUrl } from "@/lib/media";

/** Bloc aide bas de page — Metronic `partials/common/help`. */
export function Help({
  helpUrl = "/billing/plans",
  supportUrl = "mailto:support@invoicepilot.ai",
}: {
  helpUrl?: string;
  supportUrl?: string;
} = {}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-7">
      <Engage
        title="Des questions ?"
        description="Consultez les plans et l’historique pour gérer facturation, paiements et abonnement Stripe."
        image={
          <>
            <img
              src={toAbsoluteUrl(media.illustration(2))}
              className="max-h-[150px] dark:hidden"
              alt=""
            />
            <img
              src={toAbsoluteUrl(media.illustration(2, true))}
              className="hidden max-h-[150px] dark:block"
              alt=""
            />
          </>
        }
        more={{ title: "Voir les plans", url: helpUrl }}
      />
      <Engage
        title="Contacter le support"
        description="Besoin d’aide ? Notre équipe répond sur l’abonnement, le pont PA et la conformité."
        image={
          <>
            <img
              src={toAbsoluteUrl(media.illustration(4))}
              className="max-h-[150px] dark:hidden"
              alt=""
            />
            <img
              src={toAbsoluteUrl(media.illustration(4, true))}
              className="hidden max-h-[150px] dark:block"
              alt=""
            />
          </>
        }
        more={{
          title: "Contacter le support",
          url: supportUrl,
          external: supportUrl.startsWith("http") || supportUrl.startsWith("mailto:"),
        }}
      />
    </div>
  );
}
