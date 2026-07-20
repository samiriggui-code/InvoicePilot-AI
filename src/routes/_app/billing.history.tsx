import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import {
  BillingHistoryGrid,
  type BillingInvoiceRow,
} from "@/components/billing/BillingHistoryGrid";
import { Button } from "@/components/ui/button";
import { listStripeBillingInvoices } from "@/fns/stripe-billing";

export const Route = createFileRoute("/_app/billing/history")({
  head: () => ({ meta: [{ title: "Historique facturation — InvoicePilot AI" }] }),
  component: BillingHistoryPage,
});

function BillingHistoryPage() {
  const listFn = useServerFn(listStripeBillingInvoices);
  const [rows, setRows] = useState<BillingInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await listFn();
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listFn]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Historique de facturation</h2>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Chargement des factures Stripe…"
              : "Factures d’abonnement Stripe uniquement — aucune ligne fictive."}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/billing">
            <ArrowLeft className="size-4" />
            Vue d’ensemble
          </Link>
        </Button>
      </div>
      <BillingHistoryGrid rows={rows} />
    </div>
  );
}
