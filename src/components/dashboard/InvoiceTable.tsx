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
import { FileText } from "lucide-react";

import { AppEmptyState } from "@/components/app/AppEmptyState";
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
import { emptyIllustrations } from "@/lib/media";
import type { DashboardData } from "@/lib/types";

type InvoiceRow = DashboardData["recentInvoices"][number];

const statusConfig = {
  valid: { label: "Conforme", variant: "success-light" as const },
  blocked: { label: "Bloquée", variant: "destructive-light" as const },
  pending: { label: "En attente", variant: "warning-light" as const },
};

export function InvoiceTable({ invoices }: { invoices: DashboardData["recentInvoices"] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
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
          statusConfig[r.status].label.toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [invoices, searchQuery, selectedStatuses, sortOrder]);

  const columns = useMemo<ColumnDef<InvoiceRow>[]>(
    () => [
      createRowSelectColumn<InvoiceRow>(),
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="N° Facture" column={column} />,
        cell: ({ row }) => (
          <Link
            to="/invoices/$id"
            params={{ id: row.original.id }}
            className="font-mono text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.number}
          </Link>
        ),
        size: 140,
      },
      {
        accessorKey: "client",
        header: ({ column }) => <DataGridColumnHeader title="Client" column={column} />,
        size: 200,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataGridColumnHeader title="Montant" column={column} />,
        cell: ({ row }) => (
          <span className="tabular-nums">
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
        accessorKey: "date",
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString("fr-FR"),
        size: 120,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) => {
          const cfg = statusConfig[row.original.status];
          return (
            <Badge variant={cfg.variant} size="sm">
              {cfg.label}
            </Badge>
          );
        },
        size: 120,
      },
      {
        id: "signal",
        header: ({ column }) => <DataGridColumnHeader title="Signal" column={column} />,
        cell: ({ row }) => {
          const signal = row.original.errors?.length
            ? row.original.errors[0]
            : row.original.status === "valid"
              ? "Prête PA"
              : "—";
          return (
            <span className="block max-w-[220px] truncate text-muted-foreground">{signal}</span>
          );
        },
        size: 220,
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
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Flux de facturation</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Dernières émissions — statut avant / après contrôles 2026
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/invoices">Ouvrir le cycle de vie</Link>
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="p-6">
          <AppEmptyState
            icon={FileText}
            illustrationSrc={emptyIllustrations.invoices}
            title="Aucune facture pour le moment"
            description="Créez une facture : mentions 2026, Factur-X, puis transmission via votre PA."
            actions={[{ label: "Nouvelle facture", to: "/invoices/new" }]}
          />
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <MetronicDataGridShell
            table={table}
            recordCount={filteredData.length}
            emptyMessage="Aucune facture ne correspond aux filtres."
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
                    label: statusConfig[value as InvoiceRow["status"]].label,
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
                        Filtrez par statut, client ou numéro de facture.
                      </p>
                    )}
                  </div>
                </DataGridFiltersButton>
                <DataGridColumnsButton table={table} />
              </>
            }
          />
        </div>
      )}
    </section>
  );
}
