"use client";

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
import { Check, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";

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
import { Button } from "@/components/ui/button";
import type { InboxInvoice } from "@/fns/pa-reception";
import { PA_STATUS_LABELS } from "@/lib/pa-status";
import type { PaTransmissionStatus } from "@prisma/client";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Reçue",
  APPROVED: "Approuvée",
  REFUSED: "Refusée",
  ARCHIVED: "Archivée",
};

const statusVariant: Record<
  string,
  "secondary" | "success-light" | "destructive-light" | "info-light" | "warning-light"
> = {
  RECEIVED: "info-light",
  APPROVED: "success-light",
  REFUSED: "destructive-light",
  ARCHIVED: "secondary",
};

export function ReceptionDataGrid({
  invoices,
  busy,
  onOpen,
  onImport,
  onReview,
}: {
  invoices: InboxInvoice[];
  busy: string | null;
  onOpen: (invoiceId: string) => void;
  onImport: (documentId: string) => void;
  onReview: (invoiceId: string, action: "approve" | "refuse") => void;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "receivedAt", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  const statusCounts = useMemo(() => {
    return invoices.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [invoices]);

  const filteredData = useMemo(() => {
    let filtered = invoices;

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => selectedStatuses.includes(r.status));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.number ?? "").toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          (r.supplierSiren ?? "").includes(q) ||
          (r.paReference ?? "").toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = new Date(a.receivedAt).getTime();
      const db = new Date(b.receivedAt).getTime();
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [invoices, searchQuery, selectedStatuses, sortOrder]);

  const columns = useMemo<ColumnDef<InboxInvoice>[]>(
    () => [
      createRowSelectColumn<InboxInvoice>(),
      {
        id: "supplier",
        accessorFn: (row) => row.supplierName,
        header: ({ column }) => <DataGridColumnHeader title="Fournisseur" column={column} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            {row.original.isImportable ? (
              <span className="truncate font-medium">{row.original.supplierName}</span>
            ) : (
              <button
                type="button"
                className="truncate text-left font-medium text-primary underline-offset-2 hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(row.original.id);
                }}
              >
                {row.original.supplierName}
              </button>
            )}
            <span className="font-mono text-[11px] text-muted-foreground">
              SIREN {row.original.supplierSiren ?? "—"}
            </span>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="N°" column={column} />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.number ?? "—"}</span>,
        size: 120,
      },
      {
        accessorKey: "amountTtc",
        header: ({ column }) => <DataGridColumnHeader title="TTC" column={column} />,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.amountTtc.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        ),
        meta: { cellClassName: "text-end", headerClassName: "text-end" },
        size: 110,
      },
      {
        accessorKey: "receivedAt",
        header: ({ column }) => <DataGridColumnHeader title="Reçue le" column={column} />,
        cell: ({ row }) =>
          new Date(row.original.receivedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        size: 130,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) => {
          const paLabel =
            row.original.paStatus && row.original.paStatus in PA_STATUS_LABELS
              ? PA_STATUS_LABELS[row.original.paStatus as PaTransmissionStatus]
              : row.original.paStatus;
          return (
            <div className="flex flex-wrap gap-1">
              <Badge variant={statusVariant[row.original.status] ?? "secondary"} size="sm">
                {STATUS_LABEL[row.original.status] ?? row.original.status}
              </Badge>
              {paLabel ? (
                <Badge variant="outline" size="sm">
                  PA · {paLabel}
                </Badge>
              ) : null}
              {row.original.hasStructuredPayload ? (
                <Badge variant="outline" size="sm">
                  Factur-X
                </Badge>
              ) : null}
            </div>
          );
        },
        size: 200,
      },
      {
        id: "actions",
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader title="Actions" column={column} />,
        cell: ({ row }) => {
          const inv = row.original;
          const isPendingDoc = inv.isImportable;
          return (
            <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              {isPendingDoc && inv.documentId ? (
                <Button
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={() => onImport(inv.documentId!)}
                >
                  {busy === "import-" + inv.documentId ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Importer
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onOpen(inv.id)}>
                  Voir réception
                </Button>
              )}
              {inv.status === "RECEIVED" && !isPendingDoc ? (
                <>
                  <Button
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() => onReview(inv.id, "approve")}
                  >
                    {busy === inv.id + "approve" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Approuver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(busy)}
                    onClick={() => onReview(inv.id, "refuse")}
                  >
                    {busy === inv.id + "refuse" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                    Refuser
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
        size: 280,
      },
    ],
    [busy, onImport, onOpen, onReview],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData.length || 0) / pagination.pageSize),
    getRowId: (row) => row.documentId ?? row.id,
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
    selectedStatuses.length + (searchQuery ? 1 : 0) + (sortOrder !== "latest" ? 1 : 0);

  const selectedRows = useMemo(
    () => invoices.filter((i) => rowSelection[i.documentId ?? i.id]),
    [invoices, rowSelection],
  );
  const selectedCount = selectedRows.length;
  const selectedPending = selectedRows.filter((i) => i.status === "RECEIVED" && !i.isImportable);

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      emptyMessage="Aucune facture reçue. Dès qu’une API PA livre des factures fournisseurs, elles apparaîtront ici."
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher réception…"
            className="w-48"
          />
          <DataGridFacetFilter
            title="Statut"
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            options={Object.entries(statusCounts).map(([value, count]) => ({
              value,
              label: STATUS_LABEL[value] ?? value,
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
              {advancedFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatuses([]);
                    setSortOrder("latest");
                  }}
                >
                  Réinitialiser
                </Button>
              ) : (
                <p className="text-muted-foreground">Recherche, Statut et Tri dans la barre.</p>
              )}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
        </>
      }
      selectionBar={
        <DataGridSelectionBar count={selectedCount} onClear={() => setRowSelection({})}>
          <Button
            size="sm"
            disabled={Boolean(busy) || selectedPending.length === 0}
            onClick={() => {
              if (selectedPending.length === 0) {
                toast.error("Sélectionnez des factures au statut « Reçue ».");
                return;
              }
              for (const inv of selectedPending) {
                onReview(inv.id, "approve");
              }
              setRowSelection({});
            }}
          >
            <Check className="size-3.5" />
            Approuver ({selectedPending.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={Boolean(busy) || selectedPending.length === 0}
            onClick={() => {
              if (selectedPending.length === 0) {
                toast.error("Sélectionnez des factures au statut « Reçue ».");
                return;
              }
              for (const inv of selectedPending) {
                onReview(inv.id, "refuse");
              }
              setRowSelection({});
            }}
          >
            <X className="size-3.5" />
            Refuser ({selectedPending.length})
          </Button>
        </DataGridSelectionBar>
      }
    />
  );
}
