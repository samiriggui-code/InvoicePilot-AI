import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createRowSelectColumn,
  DataGridColumnsButton,
  DataGridFacetFilter,
  DataGridFiltersButton,
  DataGridSearchInput,
  DataGridSelectionBar,
  DataGridSortFilter,
  MetronicDataGridShell,
} from "@/components/app/metronic-data-grid";
import { Badge } from "@/components/reui/badge";
import { DataGridColumnHeader } from "@/components/reui/data-grid";
import { InvoicePdfViewerSheet } from "@/components/sources/InvoicePdfViewerSheet";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  deleteSourceInvoice,
  deleteSourceInvoices,
  updateSourceInvoice,
} from "@/fns/source-invoices";
import { analyzeInvoiceDocument } from "@/fns/analyze-invoice";

export type SourceImportRow = {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: string;
  issueDate: string | null;
  sourceSystem: string | null;
  format: string | null;
  hasPdf?: boolean;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Chargée",
  VALIDATING: "En analyse",
  BLOCKED: "Bloquée",
  VALIDATED: "Prête",
  TRANSMITTING: "Transmission",
  TRANSMITTED: "Transmise",
  RECEIVED: "Reçue",
  REJECTED: "Rejetée",
  REFUSED: "Refusée",
  APPROVED: "Approuvée",
  PAID: "Payée",
  ARCHIVED: "Archivée",
};

const statusVariant: Record<
  string,
  "secondary" | "success-light" | "warning-light" | "destructive-light" | "info-light"
> = {
  DRAFT: "secondary",
  BLOCKED: "destructive-light",
  REJECTED: "destructive-light",
  REFUSED: "destructive-light",
  VALIDATED: "success-light",
  TRANSMITTED: "success-light",
  PAID: "success-light",
  APPROVED: "success-light",
  VALIDATING: "warning-light",
  TRANSMITTING: "warning-light",
  RECEIVED: "info-light",
  ARCHIVED: "secondary",
};

const sourceLabels: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  manual_upload: "PDF",
  "pa-inbox": "PA inbox",
};

import { PA_NETWORK_STATUSES } from "@/lib/invoice-lifecycle-rules";

const DELETE_LOCKED = new Set<string>(PA_NETWORK_STATUSES);
const EDIT_LOCKED = new Set<string>(PA_NETWORK_STATUSES);

function actionLabel(status: string) {
  if (status === "BLOCKED" || status === "REJECTED") return "Corriger";
  if (status === "VALIDATING" || status === "VALIDATED" || status === "TRANSMITTING") {
    return "Voir Analyse";
  }
  return "Analyser";
}

export function SourceImportsDataGrid({ rows }: { rows: SourceImportRow[] }) {
  const router = useRouter();
  const updateFn = useServerFn(updateSourceInvoice);
  const deleteFn = useServerFn(deleteSourceInvoice);
  const deleteBulkFn = useServerFn(deleteSourceInvoices);
  const analyzeFn = useServerFn(analyzeInvoiceDocument);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "issueDate", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  const [viewer, setViewer] = useState<{ id: string; number: string } | null>(null);
  const [editRow, setEditRow] = useState<SourceImportRow | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editIssueDate, setEditIssueDate] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

  const [deleteRow, setDeleteRow] = useState<SourceImportRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const statusCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [rows]);

  const sourceCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const key = row.sourceSystem ?? "";
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [rows]);

  const filteredData = useMemo(() => {
    let filtered = rows;

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => selectedStatuses.includes(r.status));
    }
    if (selectedSources.length > 0) {
      filtered = filtered.filter((r) => selectedSources.includes(r.sourceSystem ?? ""));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q) ||
          (r.sourceSystem ?? "").toLowerCase().includes(q) ||
          (statusLabels[r.status] ?? r.status).toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [rows, searchQuery, selectedStatuses, selectedSources, sortOrder]);

  function openEdit(row: SourceImportRow) {
    setEditRow(row);
    setEditNumber(row.number);
    setEditIssueDate(row.issueDate ?? "");
    setEditError(null);
  }

  function openDelete(row: SourceImportRow) {
    setDeleteRow(row);
    setConfirmText("");
    setDeleteError(null);
  }

  async function handleSaveEdit() {
    if (!editRow) return;
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await updateFn({
        data: {
          invoiceId: editRow.id,
          number: editNumber,
          issueDate: editIssueDate.trim() || null,
        },
      });
      if (!res.success) {
        setEditError(res.error ?? "Échec de la modification.");
        return;
      }
      toast.success("Facture mise à jour.");
      setEditRow(null);
      await router.invalidate();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteRow) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await deleteFn({
        data: { invoiceId: deleteRow.id, confirmText },
      });
      if (!res.success) {
        setDeleteError(res.error ?? "Suppression refusée.");
        return;
      }
      toast.success(`Facture ${deleteRow.number} supprimée.`);
      setDeleteRow(null);
      setConfirmText("");
      await router.invalidate();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const selectedCount = selectedIds.length;

  const columns = useMemo<ColumnDef<SourceImportRow>[]>(
    () => [
      createRowSelectColumn<SourceImportRow>(),
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="N° Facture" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setViewer({ id: row.original.id, number: row.original.number });
            }}
          >
            {row.original.number}
          </button>
        ),
        size: 140,
      },
      {
        accessorKey: "sourceSystem",
        header: ({ column }) => <DataGridColumnHeader title="Source" column={column} />,
        cell: ({ row }) => {
          const key = row.original.sourceSystem ?? "";
          return (
            <Badge variant="secondary" size="sm">
              {sourceLabels[key] ?? (key || "—")}
            </Badge>
          );
        },
        size: 120,
      },
      {
        accessorKey: "client",
        header: ({ column }) => <DataGridColumnHeader title="Client" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.client}</span>
            <span className="text-xs text-muted-foreground">{row.original.format ?? "PDF"}</span>
          </div>
        ),
        size: 200,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataGridColumnHeader title="TTC" column={column} />,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.amount.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        ),
        meta: { cellClassName: "text-end", headerClassName: "text-end" },
        size: 120,
      },
      {
        accessorKey: "issueDate",
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        cell: ({ row }) =>
          row.original.issueDate
            ? new Date(row.original.issueDate).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—",
        size: 130,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status] ?? "secondary"} size="sm">
            {statusLabels[row.original.status] ?? row.original.status}
          </Badge>
        ),
        size: 120,
      },
      {
        id: "actions",
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader title="Actions" column={column} />,
        cell: ({ row }) => {
          const canEdit = !EDIT_LOCKED.has(row.original.status);
          const canDelete = !DELETE_LOCKED.has(row.original.status);
          return (
            <div
              className="flex flex-wrap items-center justify-end gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="ghost"
                disabled={!canEdit}
                onClick={() => openEdit(row.original)}
              >
                <Pencil className="size-3.5" />
                Éditer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={!canDelete}
                onClick={() => openDelete(row.original)}
              >
                <Trash2 className="size-3.5" />
                Supprimer
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/agent" search={{ invoiceId: row.original.id }}>
                  <Sparkles className="size-3.5" />
                  {actionLabel(row.original.status)}
                </Link>
              </Button>
            </div>
          );
        },
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
        size: 320,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData.length || 0) / pagination.pageSize),
    getRowId: (row) => row.id,
    state: { pagination, sorting, rowSelection },
    columnResizeMode: "onChange",
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const advancedFilterCount =
    selectedStatuses.length + selectedSources.length + (searchQuery ? 1 : 0);

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await deleteBulkFn({
        data: { invoiceIds: selectedIds, confirmText },
      });
      if (!res.success) {
        setDeleteError(res.error ?? "Suppression refusée.");
        return;
      }
      toast.success(
        res.skipped > 0
          ? `${res.deleted} supprimée(s), ${res.skipped} ignorée(s) (déjà transmises).`
          : `${res.deleted} facture(s) supprimée(s).`,
      );
      setBulkDeleteOpen(false);
      setConfirmText("");
      setRowSelection({});
      await router.invalidate();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleBulkAnalyze() {
    if (selectedIds.length === 0 || deleteBusy) return;
    setDeleteBusy(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      try {
        const res = await analyzeFn({
          data: { invoiceId: id, applyExtraction: true },
        });
        if ("error" in res) fail++;
        else ok++;
      } catch {
        fail++;
      }
    }
    setDeleteBusy(false);
    setRowSelection({});
    if (ok > 0) {
      toast.success(`${ok} analyse(s) lancée(s).`);
      void router.navigate({ to: "/agent" });
    }
    if (fail > 0) toast.error(`${fail} échec(s) d’analyse.`);
    await router.invalidate();
  }

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      emptyMessage="Aucun PDF chargé. Utilisez « Charger des PDF » — les imports boutique n’apparaissent qu’après une vraie connexion API."
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher facture…"
            className="w-48"
          />
          <DataGridFacetFilter
            title="Statut"
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            options={Object.entries(statusCounts).map(([value, count]) => ({
              value,
              label: statusLabels[value] ?? value,
              count,
            }))}
          />
          <DataGridFacetFilter
            title="Source"
            selected={selectedSources}
            onChange={setSelectedSources}
            options={Object.entries(sourceCounts).map(([value, count]) => ({
              value,
              label: sourceLabels[value] ?? value,
              count,
            }))}
          />
          <DataGridSortFilter
            title="Tri"
            value={sortOrder}
            defaultValue="latest"
            onChange={setSortOrder}
            options={[
              { value: "latest", label: "Plus récentes" },
              { value: "oldest", label: "Plus anciennes" },
            ]}
          />
        </>
      }
      toolbar={
        <>
          <DataGridFiltersButton activeCount={advancedFilterCount}>
            <div className="space-y-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground">Filtres actifs</p>
              <p className="text-muted-foreground">
                Utilisez la recherche, Statut et Source dans la barre. Cliquez Colonnes pour
                afficher / masquer.
              </p>
              {advancedFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatuses([]);
                    setSelectedSources([]);
                    setSortOrder("latest");
                  }}
                >
                  Réinitialiser
                </Button>
              ) : null}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
          <Button size="sm" variant="outline" asChild>
            <Link to="/agent">Voir Analyse IA</Link>
          </Button>
        </>
      }
      selectionBar={
        <DataGridSelectionBar count={selectedCount} onClear={() => setRowSelection({})}>
          <Button
            size="sm"
            disabled={deleteBusy || selectedCount === 0}
            onClick={() => void handleBulkAnalyze()}
          >
            {deleteBusy && !bulkDeleteOpen ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Analyser ({selectedCount})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={deleteBusy || selectedCount === 0}
            onClick={() => {
              setConfirmText("");
              setDeleteError(null);
              setBulkDeleteOpen(true);
            }}
          >
            <Trash2 className="size-3.5" />
            Supprimer ({selectedCount})
          </Button>
        </DataGridSelectionBar>
      }
    >
      <InvoicePdfViewerSheet
        invoiceId={viewer?.id ?? null}
        invoiceNumber={viewer?.number}
        open={Boolean(viewer)}
        onOpenChange={(open) => {
          if (!open) setViewer(null);
        }}
      />

      <Sheet
        open={Boolean(editRow)}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Éditer la facture source</SheetTitle>
            <SheetDescription>
              {editRow ? `${editRow.number} · ${editRow.client}` : "Modifier le numéro et la date."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-edit-number">N° facture</Label>
              <Input
                id="source-edit-number"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-edit-date">Date d’émission</Label>
              <Input
                id="source-edit-date"
                type="date"
                value={editIssueDate}
                onChange={(e) => setEditIssueDate(e.target.value)}
              />
            </div>
            {editRow?.status === "ARCHIVED" || editRow?.status === "BLOCKED" ? (
              <p className="text-sm text-muted-foreground">
                Enregistrer repasse le statut à « Chargée » pour relancer l’analyse.
              </p>
            ) : null}
            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
          </div>
          <SheetFooter className="mt-8">
            <Button
              type="button"
              variant="outline"
              disabled={editBusy}
              onClick={() => setEditRow(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={editBusy || !editNumber.trim()}
              onClick={() => void handleSaveEdit()}
            >
              {editBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deleteRow) || bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRow(null);
            setBulkDeleteOpen(false);
            setConfirmText("");
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkDeleteOpen
                ? `Supprimer ${selectedCount} facture(s) source ?`
                : "Supprimer cette facture source ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Saisissez <strong>SUPPRIMER</strong> pour confirmer
              {bulkDeleteOpen
                ? ` la suppression de ${selectedCount} facture(s)`
                : deleteRow
                  ? ` la suppression de ${deleteRow.number}`
                  : ""}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="source-confirm-delete">Confirmation</Label>
            <Input
              id="source-confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              autoComplete="off"
            />
            {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteBusy || confirmText.trim().toUpperCase() !== "SUPPRIMER"}
              onClick={() => void (bulkDeleteOpen ? handleBulkDelete() : handleDelete())}
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MetronicDataGridShell>
  );
}
