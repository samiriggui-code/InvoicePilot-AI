import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BillingPlansTable } from "@/components/billing/BillingPlans";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from "@/components/ui/card";

export const Route = createFileRoute("/_app/billing/plans")({
  head: () => ({ meta: [{ title: "Plans — InvoicePilot AI" }] }),
  component: BillingPlansPage,
});

function BillingPlansPage() {
  const { workspace } = Route.useRouteContext();

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Comparer les plans</CardTitle>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Starter, Pro, Enterprise — paiement via Stripe Checkout.
            </p>
          </div>
          <CardToolbar>
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing">
                <ArrowLeft className="size-4" />
                Vue d’ensemble
              </Link>
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardContent className="pt-2">
          <BillingPlansTable workspace={workspace} />
        </CardContent>
      </Card>
    </div>
  );
}
