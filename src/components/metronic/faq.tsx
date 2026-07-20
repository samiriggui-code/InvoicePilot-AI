import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type FaqItem = {
  title: string;
  text: string;
};

const DEFAULT_ITEMS: FaqItem[] = [
  {
    title: "Comment est déterminé le prix de chaque plan ?",
    text: "Starter, Pro et Enterprise couvrent des volumes de factures, de sources et de connecteurs PA différents. Le prix affiché est hors taxes, facturé mensuellement via Stripe (ou annuellement si vous choisissez l’affichage annuel).",
  },
  {
    title: "Quels moyens de paiement sont acceptés ?",
    text: "Le paiement passe par Stripe Checkout (carte bancaire). Aucune carte n’est demandée pendant l’essai de 14 jours.",
  },
  {
    title: "Y a-t-il des frais cachés ?",
    text: "Non. L’abonnement InvoicePilot est distinct des éventuels frais de votre plateforme agréée (PA). Vous ne payez que le plan SaaS choisi.",
  },
  {
    title: "Y a-t-il une réduction annuelle ?",
    text: "L’affichage annuel montre le prix mensuel équivalent sur base d’un engagement annuel. Activez le toggle « Affichage annuel » sur la page Plans.",
  },
  {
    title: "Que se passe-t-il à la fin de l’essai ?",
    text: "Sans paiement, le compte passe en suspension. Vous pouvez réactiver à tout moment depuis Abonnement en choisissant un plan.",
  },
  {
    title: "Puis-je changer de plan plus tard ?",
    text: "Oui. Depuis Comparer les plans, choisissez une offre supérieure ou inférieure ; Stripe gère le checkout.",
  },
];

/** FAQ abonnement — Metronic `partials/common/faq`. */
export function Faq({ items = DEFAULT_ITEMS }: { items?: FaqItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>FAQ</CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        <Accordion type="single" collapsible>
          {items.map((item, index) => (
            <AccordionItem key={item.title} value={`item-${index}`}>
              <AccordionTrigger>{item.title}</AccordionTrigger>
              <AccordionContent>{item.text}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
