import { createFileRoute } from "@tanstack/react-router";
import { Building2, FileCheck2, FileWarning, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { ClientsDataGrid } from "@/components/clients/ClientsDataGrid";
import { ClientSheet, type ClientSheetMode } from "@/components/clients/ClientSheet";
import { Badge } from "@/components/ui/badge";
import { listClients, type ClientListItem } from "@/fns/clients";
import { pageGuide } from "@/lib/page-guides";

export const Route = createFileRoute("/_app/clients")({
  head: () => ({ meta: [{ title: "Mes clients — InvoicePilot AI" }] }),
  loader: () => listClients(),
  component: ClientsPage,
});

function ClientsPage() {
  const clients = Route.useLoaderData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<ClientSheetMode>("view");
  const [selected, setSelected] = useState<ClientListItem | null>(null);

  useEffect(() => {
    if (!selected) return;
    const fresh = clients.find((c) => c.id === selected.id);
    if (fresh) setSelected(fresh);
    else if (sheetMode !== "create") {
      setSheetOpen(false);
      setSelected(null);
    }
  }, [clients, selected?.id, sheetMode]);

  const incomplete = clients.filter((c) => !c.siren || !c.billingLine1 || !c.city).length;
  const complete = clients.length - incomplete;
  const withInvoices = clients.filter((c) => c.invoiceCount > 0).length;

  const openClient = useCallback((client: ClientListItem) => {
    setSelected(client);
    setSheetMode("view");
    setSheetOpen(true);
  }, []);

  const editClient = useCallback((client: ClientListItem) => {
    setSelected(client);
    setSheetMode("edit");
    setSheetOpen(true);
  }, []);

  function openCreate() {
    setSelected(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Configurer · Clients"
        title="Mes clients"
        description={pageGuide("clients").blurb}
        actions={[
          {
            label: "Nouveau client",
            icon: Plus,
            onClick: openCreate,
          },
        ]}
        meta={
          <>
            <Badge variant="secondary">{clients.length} client(s)</Badge>
            {incomplete > 0 ? <Badge variant="outline">{incomplete} à compléter</Badge> : null}
          </>
        }
        kpis={[
          {
            label: "Clients",
            value: String(clients.length),
            hint: "Référentiel actif",
            icon: Users,
          },
          {
            label: "Avec factures",
            value: String(withInvoices),
            hint: "Liés aux ventes",
            icon: Building2,
          },
          {
            label: "Fiches complètes",
            value: String(complete),
            hint: "SIREN + adresse",
            icon: FileCheck2,
          },
          {
            label: "À compléter",
            value: String(incomplete),
            hint: incomplete > 0 ? "SIREN / adresse" : "Tout complet",
            icon: FileWarning,
            alert: incomplete > 0,
          },
        ]}
      />

      <ClientsDataGrid rows={clients} onOpenClient={openClient} onEditClient={editClient} />

      <ClientSheet
        open={sheetOpen}
        mode={sheetMode}
        client={selected}
        onOpenChange={setSheetOpen}
        onModeChange={setSheetMode}
      />

      <PageGuide page="clients" />
    </AppPageShell>
  );
}
