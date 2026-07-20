import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Check,
  CreditCard,
  Download,
  EllipsisVertical,
  Loader2,
  ScrollText,
  SquarePlus,
} from "lucide-react";
import { useState } from "react";

import { Help } from "@/components/metronic/help";
import { Badge } from "@/components/reui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HexagonBadge } from "@/components/ui/hexagon-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createCheckoutSession } from "@/fns/stripe-checkout";
import { planLabel, planToId, type PlanId, type WorkspaceContext } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_PRICES: Record<PlanId, number> = {
  starter: 29,
  pro: 79,
  enterprise: 199,
};

function formatFrDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BillingEnterpriseView({ workspace }: { workspace: WorkspaceContext }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-7">
      <div className="col-span-1 lg:col-span-2">
        <UpgradeBanner workspace={workspace} />
      </div>
      <div className="col-span-1 lg:col-span-2">
        <PlanProfileCard workspace={workspace} />
      </div>
      <div className="col-span-1 flex">
        <LatestPaymentCard workspace={workspace} />
      </div>
      <div className="col-span-1 flex">
        <NextPaymentCard workspace={workspace} />
      </div>
      <div className="col-span-1 flex">
        <PaymentMethodsCard workspace={workspace} />
      </div>
      <div className="col-span-1">
        <BillingInvoicingCard />
      </div>
      <div className="col-span-1 lg:col-span-2">
        <Help />
      </div>
    </div>
  );
}

function UpgradeBanner({ workspace }: { workspace: WorkspaceContext }) {
  const checkout = useServerFn(createCheckoutSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sub = workspace.subscription;
  const isTrial = sub?.status === "TRIALING";
  const days = workspace.trialDaysLeft;

  async function upgrade() {
    setLoading(true);
    setError(null);
    const planId = sub ? planToId(sub.plan) : "pro";
    try {
      const result = await checkout({
        data: { planId: planId === "starter" ? "pro" : planId },
      });
      if (result.error || !result.url) {
        setError(result.error ?? "Checkout indisponible");
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Impossible de démarrer le checkout.");
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-xl">
      <div
        className={cn(
          "flex grow flex-col items-stretch justify-between gap-5 bg-[length:680px] bg-[center_right_-6rem] bg-no-repeat p-5 sm:flex-row sm:items-center",
          "bg-gradient-to-r from-sky-50 via-sky-50/40 to-transparent dark:from-sky-950/50 dark:via-sky-950/20",
        )}
      >
        <div className="flex items-center gap-4">
          <HexagonBadge
            stroke="stroke-sky-200 dark:stroke-sky-900"
            fill="fill-sky-50 dark:fill-sky-950/40"
            size="size-[50px]"
            badge={<ScrollText className="size-5 text-sky-400" />}
          />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-base font-medium text-foreground">
                {isTrial
                  ? "Passez à un abonnement InvoicePilot actif"
                  : "Gérez votre abonnement InvoicePilot"}
              </p>
              {isTrial && days != null ? (
                <Badge variant="destructive-light" size="sm">
                  Essai — {days} j restants
                </Badge>
              ) : null}
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              InvoicePilot analyse, corrige et transmet vers votre PA. L’abonnement SaaS (Stripe)
              est indépendant de votre plateforme agréée DGFiP.
            </p>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button variant="ghost" asChild>
            <Link to="/billing/plans">Voir les plans</Link>
          </Button>
          <Button disabled={loading} onClick={() => void upgrade()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {isTrial ? "Activer maintenant" : "Changer de plan"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PlanProfileCard({ workspace }: { workspace: WorkspaceContext }) {
  const sub = workspace.subscription;
  const planId = sub ? planToId(sub.plan) : null;
  const price = planId ? PLAN_PRICES[planId] : null;

  const stats = [
    {
      total:
        sub?.status === "TRIALING"
          ? "Essai"
          : sub?.status === "ACTIVE"
            ? "Actif"
            : (sub?.status ?? "—"),
      description: "Statut",
    },
    {
      total: planId ? planLabel(sub!.plan) : "—",
      description: "Plan",
    },
    {
      total: price != null ? `${price} €` : "—",
      description: "Prix / mois",
    },
    {
      total: formatFrDate(sub?.currentPeriodEnd ?? sub?.trialEndsAt),
      description: sub?.status === "TRIALING" ? "Fin d’essai" : "Prochaine échéance",
    },
  ];

  return (
    <Card>
      <CardContent className="py-7">
        <div className="flex flex-wrap gap-7">
          <div className="flex size-[140px] shrink-0 flex-col items-center justify-center gap-3 rounded-xl bg-muted/50 ring-1 ring-border">
            <img src="/media/brand-logos/cloud-one.svg" alt="" className="size-[70px]" />
            <span className="text-sm font-semibold">InvoicePilot</span>
          </div>
          <div className="flex min-w-0 grow flex-col gap-5 lg:gap-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {planId ? `Plan ${planLabel(sub!.plan)}` : "Aucun plan"}
                  </h2>
                  {sub?.status === "TRIALING" ? (
                    <Badge variant="warning-light">Essai 14 j</Badge>
                  ) : sub?.status === "ACTIVE" ? (
                    <Badge variant="success-light">Mensuel</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Abonnement SaaS — comparez les offres ou consultez l’historique.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button variant="outline" asChild>
                  <Link to="/billing/history">Historique</Link>
                </Button>
                <Button asChild>
                  <Link to="/billing/plans">Comparer les plans</Link>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:gap-5">
              {stats.map((s) => (
                <div
                  key={s.description}
                  className="flex flex-col gap-1.5 rounded-md border border-dashed border-border px-2.5 py-2"
                >
                  <span className="text-sm font-medium leading-none">{s.total}</span>
                  <span className="text-xs text-muted-foreground">{s.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LatestPaymentCard({ workspace }: { workspace: WorkspaceContext }) {
  const sub = workspace.subscription;
  const planId = sub ? planToId(sub.plan) : null;
  const rows = [
    { label: "Type de plan", value: planId ? planLabel(sub!.plan) : "—" },
    {
      label: "Date de paiement",
      value: sub?.status === "ACTIVE" ? formatFrDate(sub.currentPeriodEnd) : "Aucun paiement",
    },
    {
      label: "Carte utilisée",
      value: sub?.status === "ACTIVE" ? "Stripe Checkout" : "—",
      logo: sub?.status === "ACTIVE",
    },
    {
      label: "Montant",
      value: planId ? `${PLAN_PRICES[planId]} €` : "—",
    },
  ];

  return (
    <Card className="grow">
      <CardHeader>
        <CardTitle>Dernier paiement</CardTitle>
        <CardToolbar>
          <Button variant="outline" size="sm" disabled>
            <Download className="size-4" />
            Télécharger PDF
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="p-0 pb-3 pt-4">
        <Table>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className="border-0 hover:bg-transparent">
                <TableCell className="min-w-36 py-2 pe-6 pb-5 text-sm text-muted-foreground">
                  {row.label}
                </TableCell>
                <TableCell className="py-2 text-sm font-medium">
                  <span className="inline-flex items-center gap-2.5">
                    {row.logo ? (
                      <img src="/media/brand-logos/visa.svg" alt="" className="w-10 shrink-0" />
                    ) : null}
                    {row.value}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NextPaymentCard({ workspace }: { workspace: WorkspaceContext }) {
  const sub = workspace.subscription;
  const due = sub?.currentPeriodEnd ?? sub?.trialEndsAt ?? null;

  return (
    <Card className="grow">
      <CardHeader>
        <CardTitle>Prochain paiement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-4">
            <div className="flex items-center gap-3.5">
              <HexagonBadge
                stroke="stroke-orange-200 dark:stroke-orange-950"
                fill="fill-orange-50 dark:fill-orange-950/30"
                size="size-[50px]"
                badge={<CalendarDays className="size-5 text-orange-400" />}
              />
              <div className="flex flex-col">
                <p className="text-sm font-medium">{formatFrDate(due)}</p>
                <p className="text-sm text-muted-foreground">
                  {sub?.status === "TRIALING" ? "Fin d’essai" : "Échéance"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-full border-emerald-200 bg-emerald-100 dark:border-emerald-950 dark:bg-emerald-950/30"
              tabIndex={-1}
            >
              <Check className="size-4 text-emerald-600" />
            </Button>
          </div>
          <div className="place-self-end">
            <Button asChild>
              <Link to="/billing/plans">Gérer le plan</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodsCard({ workspace }: { workspace: WorkspaceContext }) {
  const name = workspace.user.name || "Titulaire";
  const linked = Boolean(workspace.subscription?.stripeLinked);
  const active = workspace.subscription?.status === "ACTIVE";

  return (
    <Card className="grow">
      <CardHeader>
        <CardTitle>Moyens de paiement</CardTitle>
        <CardToolbar>
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing/plans">
              <SquarePlus className="size-4" />
              Ajouter
            </Link>
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="pb-7">
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-4">
            <div className="flex items-center gap-3.5">
              {linked ? (
                <img src="/media/brand-logos/visa.svg" alt="" className="w-10 shrink-0" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-md border border-border bg-background">
                  <CreditCard className="size-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col">
                <p className="mb-px text-sm font-medium">{name}</p>
                <span className="text-sm text-muted-foreground">
                  {linked
                    ? active
                      ? "Carte enregistrée via Stripe — abonnement actif"
                      : "Carte enregistrée via Stripe — essai en cours"
                    : "Aucune carte — activez un plan pour en ajouter une"}
                </span>
              </div>
            </div>
            {linked ? (
              <Badge variant="success-light" size="sm">
                {active ? "Principal" : "Liée"}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const PREVIEW_INVOICES = [
  {
    number: "En attente du 1er paiement",
    date: "—",
    amount: "—",
    label: "À venir",
    tone: "warning-light" as const,
  },
];

function BillingInvoicingCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Facturation</CardTitle>
        <CardToolbar>
          <Button variant="outline" size="sm" asChild>
            <Link to="/billing/history">
              <Download className="size-4" />
              Historique
            </Link>
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardTable className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="h-10 min-w-[12rem]">Facture</TableHead>
              <TableHead className="h-10 min-w-16 text-end">Statut</TableHead>
              <TableHead className="h-10 min-w-28 text-end">Date</TableHead>
              <TableHead className="h-10 min-w-16 text-end">Montant</TableHead>
              <TableHead className="h-10 w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {PREVIEW_INVOICES.map((inv) => (
              <TableRow key={inv.number}>
                <TableCell className="text-sm">{inv.number}</TableCell>
                <TableCell className="text-end">
                  <Badge variant={inv.tone} size="sm">
                    {inv.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-end text-sm">{inv.date}</TableCell>
                <TableCell className="text-end text-sm">{inv.amount}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="size-8" disabled>
                    <EllipsisVertical className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardTable>
      <CardFooter className="justify-center">
        <Button variant="link" className="h-auto p-0 text-sm underline-offset-4" asChild>
          <Link to="/billing/history">Voir tous les paiements</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
