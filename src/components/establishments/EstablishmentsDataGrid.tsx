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
import { deleteEstablishment, type EstablishmentListItem } from "@/fns/establishments";

export function EstablishmentsDataGrid({
  rows,
  onOpen,
  onEdit,
}: {
  rows: EstablishmentListItem[];
  onOpen: (row: EstablishmentListItem) => void;
  onEdit: (row: EstablishmentListItem) => void;
}) {
  const router = useRouter();
  const deleteFn = useServerFn(deleteEstablishment);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("label-asc");
  const [deleteTarget, setDeleteTarget] = useState<EstablishmentListItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const kindCounts = useMemo(() => {
    let head = 0;
    let other = 0;
    for (const r of rows) {
      if (r.isHeadOffice) head += 1;
      else other += 1;
    }
    return { head, other };
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.siret.includes(q.replace(/\s/g, "")) ||
          (r.label ?? "").toLowerCase().includes(q) ||
          (r.city ?? "").toLowerCase().includes(q),
      );
    }
    if (selectedKind.length) {
      list = list.filter((r) => {
        const kind = r.isHeadOffice ? "head" : "site";
        return selectedKind.includes(kind);
      });
    }
    list.sort((a, b) => {
      if (sortOrder === "siret-asc") return a.siret.localeCompare(b.siret);
      if (sortOrder === "city-asc") return (a.city ?? "").localeCompare(b.city ?? "");
      return (a.label ?? a.siret).localeCompare(b.label ?? b.siret);
    });
    return list;
  }, [rows, searchQuery, selectedKind, sortOrder]);

  const columns = useMemo<ColumnDef<EstablishmentListItem>[]>(
    () => [
      createRowSelectColumn<EstablishmentListItem>(),
      {
        accessorKey: "label",
        id: "label",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Établissement" />,
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left font-medium text-foreground hover:underline"
            onClick={() => onOpen(row.original)}
          >
            {row.original.label?.trim() || "Établissement"}
            {row.original.isHeadOffice ? (
              <Badge variant="secondary" size="sm" className="ml-2">
                Siège
              </Badge>
            ) : null}
          </button>
        ),
        size: 220,
        meta: { headerTitle: "Établissement" },
      },
      {
        accessorKey: "siret",
        id: "siret",
        header: ({ column }) => <DataGridColumnHeader column={column} title="SIRET" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums">{row.original.siret}</span>
        ),
        size: 160,
        meta: { headerTitle: "SIRET" },
      },
      {
        id: "city",
        accessorFn: (r) => [r.postalCode, r.city].filter(Boolean).join(" ") || "—",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Ville" />,
        cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue())}</span>,
        size: 160,
        meta: { headerTitle: "Ville" },
      },
      {
        accessorKey: "invoiceCount",
        id: "invoices",
        header: ({ column }) => <DataGridColumnHeader column={column} title="Factures" />,
        cell: ({ row }) => row.original.invoiceCount,
        size: 90,
        meta: { headerTitle: "Factures" },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => onEdit(row.original)}
              title="Modifier"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-destructive"
              disabled={row.original.isHeadOffice}
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(row.original);
              }}
              title="Supprimer"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        size: 100,
        enableHiding: false,
        meta: { headerTitle: "Actions" },
      },
    ],
    [onEdit, onOpen],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination, sorting, rowSelection },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
    enableRowSelection: true,
  });

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
  const filterCount = selectedKind.length + (searchQuery ? 1 : 0);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await deleteFn({ data: { id: deleteTarget.id } });
      if ("error" in res) {
        setDeleteError(res.error);
        return;
      }
      toast.success("Établissement supprimé");
      setDeleteTarget(null);
      await router.invalidate();
    } catch {
      setDeleteError("Suppression impossible.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <MetronicDataGridShell
        table={table}
        recordCount={filtered.length}
        emptyMessage="Aucun établissement. Ajoutez vos SIRET (même SIREN)."
        heading={
          <>
            <DataGridSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher SIRET, label, ville…"
              className="w-56"
            />
            <DataGridFacetFilter
              title="Type"
              options={[
                { label: "Siège", value: "head", count: kindCounts.head },
                {
                  label: "Autres sites",
                  value: "site",
                  count: kindCounts.other,
                },
              ]}
              selected={selectedKind}
              onChange={setSelectedKind}
            />
            <DataGridSortFilter
              title="Tri"
              value={sortOrder}
              defaultValue="label-asc"
              onChange={setSortOrder}
              options={[
                { label: "Label A→Z", value: "label-asc" },
                { label: "SIRET", value: "siret-asc" },
                { label: "Ville", value: "city-asc" },
              ]}
            />
          </>
        }
        toolbar={
          <>
            <DataGridFiltersButton activeCount={filterCount}>
              <div className="space-y-3 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Filtres actifs</p>
                {filterCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedKind([]);
                    }}
                  >
                    Réinitialiser
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    SIRET sous votre SIREN — sites d’émission.
                  </p>
                )}
              </div>
            </DataGridFiltersButton>
            <DataGridColumnsButton table={table} />
            <Badge variant="secondary" size="sm">
              {rows.length} site(s)
            </Badge>
          </>
        }
        selectionBar={
          <DataGridSelectionBar count={selectedIds.length} onClear={() => setRowSelection({})}>
            <span className="text-muted-foreground">Sélection</span>
          </DataGridSelectionBar>
        }
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet établissement ?</AlertDialogTitle>
            <AlertDialogDescription>
              SIRET {deleteTarget?.siret}
              {deleteTarget?.label ? ` — ${deleteTarget.label}` : ""}. Action irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void confirmDelete()}
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
