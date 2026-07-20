"use client";

import { Link } from "@tanstack/react-router";
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
import { useMemo, useState } from "react";

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
import type { ClientPipelineInvoice } from "@/fns/clients";

const verdictLabel: Record<ClientPipelineInvoice["verdict"], string> = {
  PASSE: "Passé",
  BLOQUE: "Bloqué",
  A_VALIDER: "À valider",
};

const verdictVariant: Record<
  ClientPipelineInvoice["verdict"],
  "success-light" | "destructive-light" | "warning-light"
> = {
  PASSE: "success-light",
  BLOQUE: "destructive-light",
  A_VALIDER: "warning-light",
};

export function ClientPipelineDataGrid({ rows }: { rows: ClientPipelineInvoice[] }) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("amount-desc");

  const verdictCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.verdict] = (acc[row.verdict] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [rows]);

  const filteredData = useMemo(() => {
    let filtered = rows;

    if (selectedVerdicts.length > 0) {
      filtered = filtered.filter((r) => selectedVerdicts.includes(r.verdict));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          (r.clientSiren ?? "").includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortOrder === "amount-asc") return a.amount - b.amount;
      if (sortOrder === "score-desc") return (b.score ?? 0) - (a.score ?? 0);
      return b.amount - a.amount;
    });

    return filtered;
  }, [rows, searchQuery, selectedVerdicts, sortOrder]);

  const passed = rows.filter((r) => r.verdict === "PASSE").length;
  const blocked = rows.filter((r) => r.verdict === "BLOQUE").length;

  const columns = useMemo<ColumnDef<ClientPipelineInvoice>[]>(
    () => [
      createRowSelectColumn<ClientPipelineInvoice>(),
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="Facture" column={column} />,
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
        accessorKey: "clientName",
        header: ({ column }) => <DataGridColumnHeader title="Acheteur" column={column} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.clientName}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {row.original.clientSiren ?? "SIREN —"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataGridColumnHeader title="TTC" column={column} />,
        cell: ({ row }) =>
          row.original.amount.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          }),
      },
      {
        accessorKey: "score",
        header: ({ column }) => <DataGridColumnHeader title="Score" column={column} />,
        cell: ({ row }) =>
          row.original.score != null ? (
            <span className="tabular-nums text-muted-foreground">
              {Math.round(row.original.score)} %
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "verdict",
        header: ({ column }) => <DataGridColumnHeader title="Verdict" column={column} />,
        cell: ({ row }) => (
          <Badge variant={verdictVariant[row.original.verdict]} size="sm">
            {verdictLabel[row.original.verdict]}
            {row.original.blockingCount > 0 ? ` · ${row.original.blockingCount}` : ""}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const v = row.original.verdict;
          return (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                {v === "PASSE" ? (
                  <Link to="/invoices/$id" params={{ id: row.original.id }}>
                    Émission →
                  </Link>
                ) : (
                  <Link to="/invoices/$id" params={{ id: row.original.id }}>
                    Corriger →
                  </Link>
                )}
              </Button>
            </div>
          );
        },
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
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
    selectedVerdicts.length + (searchQuery ? 1 : 0) + (sortOrder !== "amount-desc" ? 1 : 0);

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      emptyMessage="Aucune facture analysée. Lancez une Analyse IA depuis Sources."
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher facture…"
            className="w-48"
          />
          <DataGridFacetFilter
            title="Verdict"
            selected={selectedVerdicts}
            onChange={setSelectedVerdicts}
            options={Object.entries(verdictCounts).map(([value, count]) => ({
              value,
              label: verdictLabel[value as ClientPipelineInvoice["verdict"]] ?? value,
              count,
            }))}
          />
          <DataGridSortFilter
            title="Tri"
            value={sortOrder}
            defaultValue="amount-desc"
            onChange={setSortOrder}
            options={[
              { value: "amount-desc", label: "Montant ↓" },
              { value: "amount-asc", label: "Montant ↑" },
              { value: "score-desc", label: "Score ↓" },
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
                    setSelectedVerdicts([]);
                    setSortOrder("amount-desc");
                  }}
                >
                  Réinitialiser
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  Factures après Analyse IA — Passé → Émission, Bloqué → corriger.
                </p>
              )}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
          <Badge variant="success-light" size="sm">
            {passed} passé(s)
          </Badge>
          <Badge variant="destructive-light" size="sm">
            {blocked} bloqué(s)
          </Badge>
        </>
      }
    />
  );
}
