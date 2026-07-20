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
import { Loader2, Radio, Send } from "lucide-react";
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
import type { EReportingCandidate, EReportingListItem } from "@/fns/e-reporting";
import { toast } from "sonner";

const LOT_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  ready: "Prêt à déposer",
  pending_pa: "PA requise",
  submitted: "Déposé PA",
  transmitted: "Transmis",
  rejected: "Rejeté PA",
};

const LOT_STATUS_VARIANT: Record<
  string,
  "secondary" | "default" | "outline" | "destructive" | "success-light" | "warning-light"
> = {
  draft: "outline",
  ready: "default",
  pending_pa: "destructive",
  submitted: "default",
  transmitted: "success-light",
  rejected: "destructive",
};

export function EReportingCandidatesDataGrid({
  candidates,
  busy,
  currentLotId,
  onGenerate,
}: {
  candidates: EReportingCandidate[];
  busy: "gen" | "tx" | null;
  currentLotId: string | null;
  onGenerate: () => void;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "issueDate", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAnalyzed, setSelectedAnalyzed] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  const typeCounts = useMemo(() => {
    return candidates.reduce(
      (acc, row) => {
        acc[row.transactionType] = (acc[row.transactionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [candidates]);

  const analyzedCounts = useMemo(() => {
    let yes = 0;
    let no = 0;
    for (const c of candidates) {
      if (c.analyzed) yes++;
      else no++;
    }
    return { yes, no };
  }, [candidates]);

  const filteredData = useMemo(() => {
    let filtered = candidates;

    if (selectedTypes.length > 0) {
      filtered = filtered.filter((r) => selectedTypes.includes(r.transactionType));
    }
    if (selectedAnalyzed.length > 0) {
      filtered = filtered.filter((r) => {
        const key = r.analyzed ? "yes" : "no";
        return selectedAnalyzed.includes(key);
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          r.client.toLowerCase().includes(q) ||
          r.transactionLabel.toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [candidates, searchQuery, selectedTypes, selectedAnalyzed, sortOrder]);

  const columns = useMemo<ColumnDef<EReportingCandidate>[]>(
    () => [
      createRowSelectColumn<EReportingCandidate>(),
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="N° Facture" column={column} />,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.number}</span>
        ),
        size: 140,
      },
      {
        accessorKey: "client",
        header: ({ column }) => <DataGridColumnHeader title="Client" column={column} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.original.client}</span>
            <span className="text-xs text-muted-foreground">{row.original.transactionLabel}</span>
          </div>
        ),
        size: 200,
      },
      {
        accessorKey: "transactionType",
        header: ({ column }) => <DataGridColumnHeader title="Flux" column={column} />,
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {row.original.transactionLabel}
          </Badge>
        ),
        size: 120,
      },
      {
        accessorKey: "totalTtc",
        header: ({ column }) => <DataGridColumnHeader title="TTC" column={column} />,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.totalTtc.toLocaleString("fr-FR", {
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
        size: 120,
      },
      {
        id: "analyzed",
        accessorFn: (row) => row.analyzed,
        header: ({ column }) => <DataGridColumnHeader title="IA" column={column} />,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.analyzed ? (
              <Badge variant="success-light" size="sm">
                Analysée IA
              </Badge>
            ) : (
              <Badge variant="warning-light" size="sm">
                Non analysée
              </Badge>
            )}
            {row.original.inCurrentLot ? (
              <Badge variant="secondary" size="sm">
                Dans le lot
              </Badge>
            ) : null}
          </div>
        ),
        size: 160,
      },
    ],
    [],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData.length || 0) / pagination.pageSize),
    getRowId: (row) => row.invoiceId,
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
    selectedTypes.length +
    selectedAnalyzed.length +
    (searchQuery ? 1 : 0) +
    (sortOrder !== "latest" ? 1 : 0);

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      emptyMessage="Aucune facture e-reporting. Sources → Analyse IA (B2C / export / intra-UE)."
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher facture…"
            className="w-48"
          />
          <DataGridFacetFilter
            title="Flux"
            selected={selectedTypes}
            onChange={setSelectedTypes}
            options={Object.entries(typeCounts).map(([value, count]) => {
              const label =
                candidates.find((c) => c.transactionType === value)?.transactionLabel ?? value;
              return { value, label, count };
            })}
          />
          <DataGridFacetFilter
            title="IA"
            selected={selectedAnalyzed}
            onChange={setSelectedAnalyzed}
            options={[
              { value: "yes", label: "Analysée", count: analyzedCounts.yes },
              { value: "no", label: "Non analysée", count: analyzedCounts.no },
            ]}
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
                    setSelectedTypes([]);
                    setSelectedAnalyzed([]);
                    setSortOrder("latest");
                  }}
                >
                  Réinitialiser
                </Button>
              ) : (
                <p className="text-muted-foreground">Recherche, Flux, IA et Tri dans la barre.</p>
              )}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
          <Button size="sm" className="gap-2" disabled={busy !== null} onClick={onGenerate}>
            {busy === "gen" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Radio className="size-4" />
            )}
            {currentLotId ? "Actualiser le lot" : "Générer le lot"}
          </Button>
        </>
      }
    />
  );
}

export function EReportingLotsDataGrid({
  entries,
  busy,
  onOpen,
  onTransmit,
  onGenerate,
  currentLotId,
}: {
  entries: EReportingListItem[];
  busy: "gen" | "tx" | null;
  onOpen: (entryId: string) => void;
  onTransmit: (entryId: string) => void;
  onGenerate?: () => void;
  currentLotId?: string | null;
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([{ id: "periodStart", desc: true }]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  const statusCounts = useMemo(() => {
    return entries.reduce(
      (acc, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [entries]);

  const filteredData = useMemo(() => {
    let filtered = entries;

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => selectedStatuses.includes(r.status));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.paReference ?? "").toLowerCase().includes(q) ||
          r.linesPreview.some((l) => l.number.toLowerCase().includes(q)) ||
          LOT_STATUS_LABEL[r.status]?.toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = new Date(a.periodStart).getTime();
      const db = new Date(b.periodStart).getTime();
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [entries, searchQuery, selectedStatuses, sortOrder]);

  const columns = useMemo<ColumnDef<EReportingListItem>[]>(
    () => [
      createRowSelectColumn<EReportingListItem>(),
      {
        id: "period",
        accessorFn: (row) => row.periodStart,
        header: ({ column }) => <DataGridColumnHeader title="Période" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            className="min-w-0 text-left"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(row.original.id);
            }}
          >
            <p className="text-sm font-medium text-primary underline-offset-2 hover:underline">
              {new Date(row.original.periodStart + "T12:00:00").toLocaleDateString("fr-FR")} →{" "}
              {new Date(row.original.periodEnd + "T12:00:00").toLocaleDateString("fr-FR")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.original.lineCount} ligne(s)
              {row.original.paReference ? ` · réf. ${row.original.paReference}` : ""}
            </p>
          </button>
        ),
        size: 240,
      },
      {
        accessorKey: "lineCount",
        header: ({ column }) => <DataGridColumnHeader title="Lignes" column={column} />,
        cell: ({ row }) =>
          row.original.linesPreview.length > 0 ? (
            <span className="truncate text-xs text-muted-foreground">
              {row.original.linesPreview.map((l) => l.number).join(" · ")}
              {row.original.lineCount > row.original.linesPreview.length ? " …" : ""}
            </span>
          ) : (
            <span className="text-xs text-amber-700 dark:text-amber-400">Lot vide</span>
          ),
        size: 200,
      },
      {
        accessorKey: "totalTtc",
        header: ({ column }) => <DataGridColumnHeader title="TTC" column={column} />,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.totalTtc.toLocaleString("fr-FR", {
              style: "currency",
              currency: "EUR",
            })}
          </span>
        ),
        meta: { cellClassName: "text-end", headerClassName: "text-end" },
        size: 110,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) => (
          <Badge variant={LOT_STATUS_VARIANT[row.original.status] ?? "outline"} size="sm">
            {LOT_STATUS_LABEL[row.original.status] ?? row.original.status}
          </Badge>
        ),
        size: 130,
      },
      {
        id: "actions",
        enableSorting: false,
        header: ({ column }) => <DataGridColumnHeader title="Actions" column={column} />,
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div
              className="flex flex-wrap justify-end gap-1"
              onClick={(ev) => ev.stopPropagation()}
            >
              <Button size="sm" variant="outline" onClick={() => onOpen(e.id)}>
                Voir le lot
              </Button>
              {!e.transmittedAt && e.lineCount > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={busy !== null}
                  onClick={() => onTransmit(e.id)}
                >
                  {busy === "tx" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                  Transmettre
                </Button>
              ) : null}
            </div>
          );
        },
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
        size: 220,
      },
    ],
    [busy, onOpen, onTransmit],
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

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const selectedCount = selectedIds.length;
  const selectedSendable = useMemo(
    () => entries.filter((e) => selectedIds.includes(e.id) && !e.transmittedAt && e.lineCount > 0),
    [entries, selectedIds],
  );

  function handleBulkTransmit() {
    if (selectedSendable.length === 0) {
      toast.error("Sélectionnez des lots non transmis avec des lignes.");
      return;
    }
    for (const e of selectedSendable) {
      onTransmit(e.id);
    }
    setRowSelection({});
  }

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      emptyMessage="Aucun lot. Générez un lot depuis les factures éligibles."
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher e-reporting…"
            className="w-48"
          />
          <DataGridFacetFilter
            title="Statut"
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            options={Object.entries(statusCounts).map(([value, count]) => ({
              value,
              label: LOT_STATUS_LABEL[value] ?? value,
              count,
            }))}
          />
          <DataGridSortFilter
            title="Tri"
            value={sortOrder}
            defaultValue="latest"
            onChange={setSortOrder}
            options={[
              { value: "latest", label: "Plus récents" },
              { value: "oldest", label: "Plus anciens" },
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
          {onGenerate ? (
            <Button size="sm" className="gap-2" disabled={busy !== null} onClick={onGenerate}>
              {busy === "gen" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Radio className="size-4" />
              )}
              {currentLotId ? "Actualiser le lot" : "Générer le lot"}
            </Button>
          ) : null}
        </>
      }
      selectionBar={
        <DataGridSelectionBar count={selectedCount} onClear={() => setRowSelection({})}>
          <Button
            size="sm"
            disabled={busy !== null || selectedSendable.length === 0}
            onClick={handleBulkTransmit}
          >
            {busy === "tx" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Transmettre ({selectedSendable.length}/{selectedCount})
          </Button>
        </DataGridSelectionBar>
      }
    />
  );
}
