import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";
import { Fragment, useState } from "react";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { createCheckoutSession } from "@/fns/stripe-checkout";
import { type PlanId, type WorkspaceContext, planToId } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_PRICES: Record<PlanId, { month: number; year: number }> = {
  starter: { month: 29, year: 290 },
  pro: { month: 79, year: 790 },
  enterprise: { month: 199, year: 1990 },
};

const PLAN_META: Record<PlanId, { title: string; description: string }> = {
  starter: {
    title: "Starter",
    description: "Indépendants et TPE qui démarrent la conformité.",
  },
  pro: {
    title: "Pro",
    description: "PME avec volume régulier et plusieurs connecteurs.",
  },
  enterprise: {
    title: "Enterprise",
    description: "Éditeurs, multi-entités et volumes élevés.",
  },
};

type FeatureRow = {
  title: string;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
};

const FEATURE_ROWS: FeatureRow[] = [
  { title: "Factures / mois", starter: "50", pro: "500", enterprise: "Illimité" },
  { title: "Sources (Shopify, Woo…)", starter: "1", pro: "5", enterprise: "Illimité" },
  { title: "Formats Factur-X / UBL", starter: true, pro: true, enterprise: true },
  {
    title: "Pont vers PA",
    starter: "Sandbox",
    pro: "Sandbox + partenaire",
    enterprise: "Multi-PA",
  },
  {
    title: "Analyse IA documents",
    starter: "50 req / mois",
    pro: "Illimité",
    enterprise: "Illimité + prioritaire",
  },
  { title: "Clés API live", starter: false, pro: true, enterprise: true },
  { title: "E-reporting", starter: false, pro: true, enterprise: true },
  {
    title: "Support",
    starter: "E-mail",
    pro: "E-mail + chat",
    enterprise: "Prioritaire",
  },
];

function featureCell(value: string | boolean) {
  if (typeof value === "boolean") {
    return value ? <Check className="size-5 text-emerald-500" /> : null;
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

/** Grille comparative — Metronic account/billing/plans */
export function BillingPlansTable({ workspace }: { workspace: WorkspaceContext }) {
  const checkout = useServerFn(createCheckoutSession);
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentId = workspace.subscription ? planToId(workspace.subscription.plan) : null;

  async function upgrade(planId: PlanId) {
    setLoading(planId);
    setError(null);
    try {
      const result = await checkout({ data: { planId } });
      if (result.error || !result.url) {
        setError(result.error ?? "Checkout indisponible");
        setLoading(null);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Impossible de démarrer le checkout.");
      setLoading(null);
    }
  }

  const planIds: PlanId[] = ["starter", "pro", "enterprise"];
  const featureCount = FEATURE_ROWS.length;

  function renderHeader(planId: PlanId) {
    const meta = PLAN_META[planId];
    const price = annual ? Math.round(PLAN_PRICES[planId].year / 12) : PLAN_PRICES[planId].month;
    const isCurrent = currentId === planId;

    return (
      <Fragment>
        {isCurrent ? (
          <Badge
            variant="success-light"
            size="sm"
            className="absolute start-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            Plan actuel
          </Badge>
        ) : null}
        <h3 className="pb-2 text-lg font-medium">{meta.title}</h3>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
        <div className="flex items-end gap-1.5 py-4">
          <span className="text-2xl font-semibold leading-none tabular-nums">{price} €</span>
          <span className="text-xs text-muted-foreground">/ mois</span>
        </div>
        {annual ? (
          <p className="mb-3 text-[11px] text-muted-foreground">
            Facturé {PLAN_PRICES[planId].year} € / an
          </p>
        ) : (
          <div className="mb-3 h-4" />
        )}
        <Button
          className="w-full justify-center"
          variant={isCurrent ? "outline" : planId === "pro" ? "default" : "secondary"}
          disabled={loading !== null || isCurrent}
          onClick={() => void upgrade(planId)}
        >
          {loading === planId ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isCurrent ? (
            "Actuel"
          ) : (
            "Choisir"
          )}
        </Button>
      </Fragment>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="overflow-x-auto">
        <Table
          noWrapper
          className={cn(
            "mt-3 min-w-[900px] table-fixed border-separate border-spacing-0 rounded-xl",
            "[&_tr:nth-of-type(2)>td]:border-t",
            "ltr:[&_tr:nth-of-type(2)>td:first-child]:rounded-tl-xl",
            "ltr:[&_tr:nth-of-type(2)>td:last-child]:rounded-tr-xl",
            `ltr:[&_tr:nth-of-type(${featureCount + 1})>td:first-child]:rounded-bl-xl`,
            `ltr:[&_tr:nth-of-type(${featureCount + 1})>td:last-child]:rounded-br-xl`,
          )}
        >
          <TableBody>
            <TableRow className="*:border-border hover:bg-transparent [&:has(td):hover]:bg-transparent">
              <TableCell className="border-b-0! p-5! pb-6! pt-7! align-bottom">
                <div className="flex items-center gap-2">
                  <Switch id="billing-annual" checked={annual} onCheckedChange={setAnnual} />
                  <Label htmlFor="billing-annual" className="text-sm font-normal">
                    Affichage annuel
                  </Label>
                </div>
              </TableCell>
              {planIds.map((planId, i) => (
                <TableCell
                  key={planId}
                  className={cn(
                    "relative! border-b-0! border-t p-5! pt-7! align-top",
                    "ltr:border-l",
                    planId === "pro" && "bg-muted/40",
                    i === planIds.length - 1 && "ltr:rounded-tr-xl border-e",
                    i === 0 && "ltr:rounded-tl-xl",
                  )}
                >
                  {renderHeader(planId)}
                </TableCell>
              ))}
            </TableRow>
            {FEATURE_ROWS.map((row) => (
              <TableRow key={row.title} className="*:border-border hover:bg-transparent">
                <TableCell className="border-b border-s px-5! py-3.5!">
                  <span className="text-sm font-medium leading-none">{row.title}</span>
                </TableCell>
                <TableCell className="border-b border-s bg-muted/20 px-5! py-3.5!">
                  {featureCell(row.starter)}
                </TableCell>
                <TableCell className="border-b border-s bg-muted/40 px-5! py-3.5!">
                  {featureCell(row.pro)}
                </TableCell>
                <TableCell className="border-b border-s border-e px-5! py-3.5!">
                  {featureCell(row.enterprise)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
