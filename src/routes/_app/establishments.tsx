import { createFileRoute } from "@tanstack/react-router";
import { Building2, MapPin, Plus, Store } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { EstablishmentsDataGrid } from "@/components/establishments/EstablishmentsDataGrid";
import {
  EstablishmentSheet,
  type EstablishmentSheetMode,
} from "@/components/establishments/EstablishmentSheet";
import { Badge } from "@/components/ui/badge";
import { listEstablishments, type EstablishmentListItem } from "@/fns/establishments";
import { pageGuide } from "@/lib/page-guides";

export const Route = createFileRoute("/_app/establishments")({
  head: () => ({ meta: [{ title: "Mes établissements — InvoicePilot AI" }] }),
  loader: () => listEstablishments(),
  component: EstablishmentsPage,
});

function EstablishmentsPage() {
  const rows = Route.useLoaderData();
  const { workspace } = Route.useRouteContext();
  const orgSiren = workspace.organization.siren;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<EstablishmentSheetMode>("view");
  const [selected, setSelected] = useState<EstablishmentListItem | null>(null);

  useEffect(() => {
    if (!selected) return;
    const fresh = rows.find((r) => r.id === selected.id);
    if (fresh) setSelected(fresh);
    else if (sheetMode !== "create") {
      setSheetOpen(false);
      setSelected(null);
    }
  }, [rows, selected?.id, sheetMode]);

  const headCount = rows.filter((r) => r.isHeadOffice).length;
  const withAddress = rows.filter((r) => r.addressLine1 && r.city).length;
  const withInvoices = rows.filter((r) => r.invoiceCount > 0).length;

  const openRow = useCallback((row: EstablishmentListItem) => {
    setSelected(row);
    setSheetMode("view");
    setSheetOpen(true);
  }, []);

  const editRow = useCallback((row: EstablishmentListItem) => {
    setSelected(row);
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
        eyebrow="Configurer · Établissements"
        title="Mes établissements"
        description={pageGuide("establishments").blurb}
        actions={[
          {
            label: "Nouvel établissement",
            icon: Plus,
            onClick: openCreate,
          },
        ]}
        meta={
          <>
            <Badge variant="secondary">SIREN {orgSiren}</Badge>
            <Badge variant="outline">{rows.length} site(s)</Badge>
          </>
        }
        kpis={[
          {
            label: "Établissements",
            value: String(rows.length),
            hint: "SIRET sous votre SIREN",
            icon: Store,
          },
          {
            label: "Siège",
            value: String(headCount),
            hint: headCount === 1 ? "Défini" : "À désigner",
            icon: Building2,
          },
          {
            label: "Avec adresse",
            value: String(withAddress),
            hint: "Complets pour émission",
            icon: MapPin,
          },
          {
            label: "Utilisés",
            value: String(withInvoices),
            hint: "Liés à des ventes",
            icon: Building2,
          },
        ]}
      />

      <EstablishmentsDataGrid rows={rows} onOpen={openRow} onEdit={editRow} />

      <EstablishmentSheet
        open={sheetOpen}
        mode={sheetMode}
        row={selected}
        orgSiren={orgSiren}
        onOpenChange={setSheetOpen}
        onModeChange={setSheetMode}
      />

      <PageGuide page="establishments" />
    </AppPageShell>
  );
}
