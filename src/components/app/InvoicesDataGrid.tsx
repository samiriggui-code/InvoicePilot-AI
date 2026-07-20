"use client";

import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

import {
  createRowSelectColumn,
  DataGridColumnsButton,
  DataGridFacetFilter,
  DataGridFiltersButton,
  DataGridSearchInput,
  DataGridSortFilter,
  MetronicDataGridShell,
} from "@/components/app/metronic-data-grid";
import { Badge } from "@/components/reui/badge";
import { DataGridColumnHeader } from "@/components/reui/data-grid";
import { Button } from "@/components/ui/button";
import type { InvoiceListItem } from "@/fns/invoices";

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  VALIDATING: "Validation",
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

function actionLabel(status: string) {
  if (status === "REJECTED") return "Voir rejet";
  if (status === "VALIDATED") return "Émettre PA";
  if (status === "TRANSMITTED") return "Voir émission";
  return "Ouvrir";
}

/** Datatable Émission PA — N° et actions → fiche émission (pas le sheet Analyse). */
export function InvoicesDataGrid({ invoices }: { invoices: InvoiceListItem[] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "issueDate", desc: true }]);
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
          r.number.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q) ||
          (statusLabels[r.status] ?? r.status).toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [invoices, searchQuery, selectedStatuses, sortOrder]);

  const columns = useMemo<ColumnDef<InvoiceListItem>[]>(
    () => [
      createRowSelectColumn<InvoiceListItem>(),
      {
        id: "client",
        accessorFn: (row) => row.client,
        header: ({ column }) => <DataGridColumnHeader title="Client" column={column} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <Link
              to="/invoices/$id"
              params={{ id: row.original.id }}
              className="truncate font-medium text-primary underline-offset-2 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.client}
            </Link>
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.original.number}
            </span>
          </div>
        ),
        size: 220,
      },
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="N°" column={column} />,
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.number}</span>,
        size: 130,
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
        size: 110,
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
          <div className="flex flex-wrap gap-1">
            <Badge variant={statusVariant[row.original.status] ?? "secondary"} size="sm">
              {statusLabels[row.original.status] ?? row.original.status}
            </Badge>
            {row.original.format ? (
              <Badge variant="outline" size="sm">
                {row.original.format}
              </Badge>
            ) : null}
          </div>
        ),
        size: 160,
      },
      {
        id: "actions",
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader title="Actions" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="outline" asChild>
              <Link to="/invoices/$id" params={{ id: row.original.id }}>
                {actionLabel(row.original.status)}
              </Link>
            </Button>
          </div>
        ),
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
        size: 160,
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

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      emptyMessage="Aucune facture prête. Passez par Analyse IA jusqu’au statut Passé (B2B)."
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher émission…"
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
                <p className="text-muted-foreground">
                  Utilisez la recherche et les filtres Statut / Tri ci-dessus.
                </p>
              )}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
        </>
      }
    />
  );
}
