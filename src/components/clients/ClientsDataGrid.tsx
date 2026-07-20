"use client";

import { useRouter } from "@tanstack/react-router";
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
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
import { deleteClient, type ClientListItem } from "@/fns/clients";

function isComplete(row: ClientListItem) {
  return Boolean(row.siren && row.billingLine1 && row.city);
}

export function ClientsDataGrid({
  rows,
  onOpenClient,
  onEditClient,
}: {
  rows: ClientListItem[];
  onOpenClient: (client: ClientListItem) => void;
  onEditClient: (client: ClientListItem) => void;
}) {
  const router = useRouter();
  const deleteFn = useServerFn(deleteClient);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompleteness, setSelectedCompleteness] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("name-asc");

  const [deleteTarget, setDeleteTarget] = useState<ClientListItem | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const completenessCounts = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    for (const row of rows) {
      if (isComplete(row)) complete++;
      else incomplete++;
    }
    return { complete, incomplete };
  }, [rows]);

  const filteredData = useMemo(() => {
    let filtered = rows;

    if (selectedCompleteness.length > 0) {
      filtered = filtered.filter((r) => {
        const key = isComplete(r) ? "complete" : "incomplete";
        return selectedCompleteness.includes(key);
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const qSiren = searchQuery.replace(/\s/g, "");
      filtered = filtered.filter(
        (r) =>
          r.legalName.toLowerCase().includes(q) ||
          (r.siren ?? "").includes(qSiren) ||
          (r.city ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q) ||
          (r.phone ?? "").toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortOrder === "invoices-desc") return b.invoiceCount - a.invoiceCount;
      if (sortOrder === "name-desc") return b.legalName.localeCompare(a.legalName, "fr");
      return a.legalName.localeCompare(b.legalName, "fr");
    });

    return filtered;
  }, [rows, searchQuery, selectedCompleteness, sortOrder]);

  const incomplete = rows.filter((r) => !isComplete(r)).length;
  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const selectedCount = selectedIds.length;

  const columns = useMemo<ColumnDef<ClientListItem>[]>(
    () => [
      createRowSelectColumn<ClientListItem>(),
      {
        accessorKey: "legalName",
        header: ({ column }) => <DataGridColumnHeader title="Client" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={(e) => {
              e.stopPropagation();
              onOpenClient(row.original);
            }}
          >
            <p className="truncate font-medium text-primary underline-offset-2 hover:underline">
              {row.original.legalName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.original.email ?? row.original.phone ?? "Contact —"}
            </p>
          </button>
        ),
        size: 220,
      },
      {
        accessorKey: "siren",
        header: ({ column }) => <DataGridColumnHeader title="SIREN" column={column} />,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.siren ?? "—"}</span>
        ),
        size: 120,
      },
      {
        accessorKey: "city",
        header: ({ column }) => <DataGridColumnHeader title="Ville" column={column} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {[row.original.billingPostal, row.original.city].filter(Boolean).join(" ") || "—"}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: "invoiceCount",
        header: ({ column }) => <DataGridColumnHeader title="Factures" column={column} />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.invoiceCount}</span>,
        size: 90,
      },
      {
        id: "status",
        header: ({ column }) => <DataGridColumnHeader title="Fiche" column={column} />,
        cell: ({ row }) => {
          const complete = isComplete(row.original);
          return (
            <Badge variant={complete ? "success-light" : "warning-light"} size="sm">
              {complete ? "Complète" : "À compléter"}
            </Badge>
          );
        },
        size: 120,
      },
      {
        id: "actions",
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader title="Actions" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => onEditClient(row.original)}>
              <Pencil className="size-3.5" />
              Éditer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setConfirmText("");
                setDeleteError(null);
                setBulkDelete(false);
                setDeleteTarget(row.original);
              }}
            >
              <Trash2 className="size-3.5" />
              Supprimer
            </Button>
          </div>
        ),
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
        size: 220,
      },
    ],
    [onEditClient, onOpenClient],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData.length || 0) / pagination.pageSize),
    getRowId: (row) => row.id,
    state: { pagination, sorting, rowSelection },
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
    selectedCompleteness.length + (searchQuery ? 1 : 0) + (sortOrder !== "name-asc" ? 1 : 0);

  async function runDelete(ids: string[]) {
    setDeleteBusy(true);
    setDeleteError(null);
    let ok = 0;
    let fail = 0;
    let deletedInvoices = 0;
    for (const id of ids) {
      const res = await deleteFn({ data: { id, confirmText } });
      if (res.success) {
        ok++;
        deletedInvoices += res.deletedInvoices ?? 0;
      } else {
        fail++;
        setDeleteError(res.error ?? "Suppression refusée.");
      }
    }
    setDeleteBusy(false);
    if (ok > 0) {
      toast.success(
        deletedInvoices > 0
          ? `${ok} client(s) supprimé(s) · ${deletedInvoices} facture(s) liée(s) retirée(s).`
          : `${ok} client(s) supprimé(s).`,
      );
      setDeleteTarget(null);
      setBulkDelete(false);
      setConfirmText("");
      setRowSelection({});
      await router.invalidate();
    }
    if (fail > 0 && ok === 0) {
      toast.error("Suppression impossible.");
    }
  }

  return (
    <>
      <MetronicDataGridShell
        table={table}
        recordCount={filteredData.length}
        emptyMessage="Aucun client. Créez une fiche ou importez des factures depuis Sources."
        heading={
          <>
            <DataGridSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher client…"
              className="w-48"
            />
            <DataGridFacetFilter
              title="Fiche"
              selected={selectedCompleteness}
              onChange={setSelectedCompleteness}
              options={[
                {
                  value: "complete",
                  label: "Complète",
                  count: completenessCounts.complete,
                },
                {
                  value: "incomplete",
                  label: "À compléter",
                  count: completenessCounts.incomplete,
                },
              ]}
            />
            <DataGridSortFilter
              title="Tri"
              value={sortOrder}
              defaultValue="name-asc"
              onChange={setSortOrder}
              options={[
                { value: "name-asc", label: "Nom A→Z" },
                { value: "name-desc", label: "Nom Z→A" },
                { value: "invoices-desc", label: "Factures ↓" },
              ]}
            />
          </>
        }
        toolbar={
          <>
            <DataGridFiltersButton activeCount={advancedFilterCount}>
              <div className="space-y-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Filtres actifs</p>
                {advancedFilterCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCompleteness([]);
                      setSortOrder("name-asc");
                    }}
                  >
                    Réinitialiser
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    Identité acheteur (SIREN, adresse) — base pour la correction IA.
                  </p>
                )}
              </div>
            </DataGridFiltersButton>
            <DataGridColumnsButton table={table} />
            <Badge variant="secondary" size="sm">
              {rows.length} client(s)
            </Badge>
            {incomplete > 0 ? (
              <Badge variant="warning-light" size="sm">
                {incomplete} à compléter
              </Badge>
            ) : null}
          </>
        }
        selectionBar={
          <DataGridSelectionBar count={selectedCount} onClear={() => setRowSelection({})}>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteBusy || selectedCount === 0}
              onClick={() => {
                setConfirmText("");
                setDeleteError(null);
                setDeleteTarget(null);
                setBulkDelete(true);
              }}
            >
              <Trash2 className="size-3.5" />
              Supprimer ({selectedCount})
            </Button>
          </DataGridSelectionBar>
        }
      />

      <AlertDialog
        open={Boolean(deleteTarget) || bulkDelete}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setBulkDelete(false);
            setConfirmText("");
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkDelete ? `Supprimer ${selectedCount} client(s) ?` : "Supprimer ce client ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Les factures sources liées (non transmises) seront aussi
              supprimées. Saisissez <strong>SUPPRIMER</strong>
              {deleteTarget
                ? ` pour confirmer la suppression de ${deleteTarget.legalName}`
                : bulkDelete
                  ? ` pour confirmer ${selectedCount} client(s)`
                  : ""}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="client-confirm-delete">Confirmation</Label>
            <Input
              id="client-confirm-delete"
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
              onClick={() =>
                void runDelete(bulkDelete ? selectedIds : deleteTarget ? [deleteTarget.id] : [])
              }
            >
              {deleteBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
