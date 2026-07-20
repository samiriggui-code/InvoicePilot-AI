"use client";

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
import { Download } from "lucide-react";

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

export type BillingInvoiceRow = {
  id: string;
  invoice: string;
  label: string;
  status: "warning-light" | "success-light" | "destructive-light" | "secondary";
  date: string;
  dueDate: string;
  amount: string;
};

/** Historique Stripe réel uniquement — jamais de lignes fictives. */
export function BillingHistoryGrid({ rows = [] }: { rows?: BillingInvoiceRow[] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  const statusCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.label] = (acc[row.label] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [rows]);

  const filteredData = useMemo(() => {
    let filtered = rows;

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => selectedStatuses.includes(r.label));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.invoice.toLowerCase().includes(q) ||
          r.amount.toLowerCase().includes(q) ||
          r.label.toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [rows, searchQuery, selectedStatuses, sortOrder]);

  const columns = useMemo<ColumnDef<BillingInvoiceRow>[]>(
    () => [
      createRowSelectColumn<BillingInvoiceRow>(),
      {
        accessorKey: "invoice",
        header: ({ column }) => <DataGridColumnHeader title="Facture" column={column} />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.invoice}</span>
        ),
        size: 220,
      },
      {
        accessorKey: "label",
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) => (
          <Badge variant={row.original.status} size="sm">
            {row.original.label}
          </Badge>
        ),
        size: 140,
      },
      {
        accessorKey: "date",
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        size: 160,
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => <DataGridColumnHeader title="Échéance" column={column} />,
        size: 160,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataGridColumnHeader title="Montant" column={column} />,
        cell: ({ row }) => <span className="tabular-nums">{row.original.amount}</span>,
        meta: { cellClassName: "text-end", headerClassName: "text-end" },
        size: 120,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: () => (
          <Button variant="link" size="sm" className="h-auto p-0 underline-offset-4" disabled>
            Télécharger
          </Button>
        ),
        size: 110,
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
      emptyMessage="Aucune facture Stripe pour le moment. L’historique apparaîtra après un paiement réel."
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
              label: value,
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
                  Historique de facturation Stripe — données réelles uniquement.
                </p>
              )}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
          <Button variant="outline" size="sm" disabled={filteredData.length === 0}>
            <Download className="size-4" />
            Télécharger PDF
          </Button>
        </>
      }
    />
  );
}
