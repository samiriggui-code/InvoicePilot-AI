import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FilePlus2, FileText, Hash } from "lucide-react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { InvoicesDataGrid } from "@/components/app/InvoicesDataGrid";
import { Badge } from "@/components/ui/badge";
import { listEmissionInvoices } from "@/fns/invoices";
import { pageGuide } from "@/lib/page-guides";

export const Route = createFileRoute("/_app/invoices/")({
  head: () => ({ meta: [{ title: "Mon émission PA — InvoicePilot AI" }] }),
  loader: () => listEmissionInvoices(),
  component: InvoicesIndexPage,
});

function InvoicesIndexPage() {
  const invoices = Route.useLoaderData();
  const blocked = invoices.filter((i) =>
    ["BLOCKED", "REJECTED", "REFUSED"].includes(i.status),
  ).length;
  const ready = invoices.filter((i) =>
    ["VALIDATED", "TRANSMITTING", "TRANSMITTED", "RECEIVED", "APPROVED", "PAID"].includes(i.status),
  ).length;
  const drafts = invoices.filter((i) => ["DRAFT", "VALIDATING"].includes(i.status)).length;
  const caTtc = invoices
    .filter((i) =>
      ["VALIDATED", "TRANSMITTING", "TRANSMITTED", "RECEIVED", "APPROVED", "PAID"].includes(
        i.status,
      ),
    )
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Flux · Émission PA"
        title="Mon émission PA"
        description={pageGuide("emission").blurb}
        actions={[{ label: "Nouvelle facture", to: "/invoices/new", icon: FilePlus2 }]}
        meta={
          <>
            <Badge variant="secondary">{invoices.length} au total</Badge>
            <Badge variant="outline">{ready} prêtes</Badge>
            {blocked > 0 ? <Badge variant="destructive">{blocked} bloquée(s)</Badge> : null}
          </>
        }
        kpis={[
          {
            label: "Registre",
            value: String(invoices.length),
            hint: "File d’émission PA",
            icon: Hash,
          },
          {
            label: "Prêtes",
            value: String(ready),
            hint: "Validées / transmises",
            icon: CheckCircle2,
          },
          {
            label: "Bloquées",
            value: String(blocked),
            hint: blocked > 0 ? "À corriger avant émission" : "File saine",
            icon: AlertTriangle,
            alert: blocked > 0,
          },
          {
            label: "TTC prêtes",
            value: caTtc.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }),
            hint: drafts > 0 ? `${drafts} en revue` : "Pipeline émission PA",
            icon: FileText,
          },
        ]}
      />

      {/* Même pattern que Réception : datatable pleine largeur sous le hero */}
      <InvoicesDataGrid invoices={invoices} />

      {invoices.length > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          Besoin d’aide sur un rejet ?{" "}
          <Link to="/compliance" className="font-medium text-primary hover:underline">
            Voir la checklist conformité
          </Link>
        </p>
      ) : null}

      <PageGuide page="emission" />
    </AppPageShell>
  );
}
