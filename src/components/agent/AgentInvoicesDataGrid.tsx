"use client";

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
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AnalysisResultSheet } from "@/components/agent/AnalysisResultSheet";
import { AiStatusBadge } from "@/components/agent/AiStatusBadge";
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
import { analyzeInvoiceDocument } from "@/fns/analyze-invoice";
import {
  listAnalysisQueue,
  type AnalysisQueueInvoice,
  type AnalysisQueueVerdict,
} from "@/fns/clients";

const verdictLabel: Record<AnalysisQueueVerdict, string> = {
  A_ANALYSER: "À analyser",
  PASSE: "Passé",
  BLOQUE: "Bloqué",
  A_VALIDER: "À valider",
};

const verdictVariant: Record<
  AnalysisQueueVerdict,
  "secondary" | "success-light" | "destructive-light" | "warning-light"
> = {
  A_ANALYSER: "secondary",
  PASSE: "success-light",
  BLOQUE: "destructive-light",
  A_VALIDER: "warning-light",
};

export function AgentInvoicesDataGrid({
  initialRows,
  autoAnalyzeId,
  onAnalyzingChange,
}: {
  initialRows: AnalysisQueueInvoice[];
  autoAnalyzeId?: string;
  onAnalyzingChange?: (analyzing: boolean) => void;
}) {
  const listFn = useServerFn(listAnalysisQueue);
  const analyzeFn = useServerFn(analyzeInvoiceDocument);
  const router = useRouter();

  const [rows, setRows] = useState(initialRows);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVerdicts, setSelectedVerdicts] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("amount-desc");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  useEffect(() => {
    onAnalyzingChange?.(Boolean(busyId));
  }, [busyId, onAnalyzingChange]);
  const autoDone = useRef(false);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  async function refresh() {
    const next = await listFn();
    setRows(next);
    await router.invalidate();
  }

  async function runAnalyze(invoiceId: string) {
    if (busyId) return;
    setBusyId(invoiceId);
    setError(null);
    try {
      const res = await Promise.race([
        analyzeFn({
          data: { invoiceId, applyExtraction: true },
        }),
        new Promise<{ error: string }>((resolve) =>
          setTimeout(
            () =>
              resolve({
                error:
                  "Analyse trop longue (timeout 60s). Ollama peut charger le modèle — réessayez, ou désactivez LLM_EXTRACT_ENABLED pour l’heuristique seule.",
              }),
            60_000,
          ),
        ),
      ]);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      await refresh();
      if (sheetId === invoiceId) setSheetKey((k) => k + 1);
    } catch {
      setError("Analyse impossible. Réessayez.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!autoAnalyzeId || autoDone.current) return;
    autoDone.current = true;
    setSheetId(autoAnalyzeId);
    void runAnalyze(autoAnalyzeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAnalyzeId]);

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
      if (sortOrder === "amount-desc") return b.amount - a.amount;
      if (sortOrder === "score-desc") return (b.score ?? 0) - (a.score ?? 0);
      return a.number.localeCompare(b.number, "fr");
    });

    return filtered;
  }, [rows, searchQuery, selectedVerdicts, sortOrder]);

  const pending = rows.filter((r) => r.verdict === "A_ANALYSER").length;
  const passed = rows.filter((r) => r.verdict === "PASSE").length;
  const blocked = rows.filter((r) => r.verdict === "BLOQUE").length;

  const columns = useMemo<ColumnDef<AnalysisQueueInvoice>[]>(
    () => [
      createRowSelectColumn<AnalysisQueueInvoice>(),
      {
        accessorKey: "number",
        header: ({ column }) => <DataGridColumnHeader title="Facture" column={column} />,
        cell: ({ row }) => (
          <button
            type="button"
            className="font-mono text-sm font-medium text-primary underline-offset-2 hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setSheetId(row.original.id);
            }}
          >
            {row.original.number}
          </button>
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
        accessorKey: "transactionType",
        header: ({ column }) => <DataGridColumnHeader title="Flux" column={column} />,
        cell: ({ row }) => {
          const t = row.original.transactionType;
          const ereporting = ["B2C", "EXPORT", "INTRA_EU"].includes(t);
          return (
            <Badge variant={ereporting ? "info-light" : "secondary"} size="sm">
              {ereporting ? (t === "B2C" ? "B2C → ER" : `${t} → ER`) : "B2B → PA"}
            </Badge>
          );
        },
        size: 110,
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
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) => (
          <Badge variant={verdictVariant[row.original.verdict]} size="sm">
            {verdictLabel[row.original.verdict]}
          </Badge>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const v = row.original.verdict;
          const id = row.original.id;
          const busy = busyId === id;
          return (
            <div className="flex justify-end gap-1">
              {v === "PASSE" ? (
                <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                  {["B2C", "EXPORT", "INTRA_EU"].includes(row.original.transactionType) ? (
                    <Link to="/e-reporting">E-reporting →</Link>
                  ) : (
                    <Link to="/invoices/$id" params={{ id }}>
                      Émission →
                    </Link>
                  )}
                </Button>
              ) : null}
              {v === "BLOQUE" || v === "A_VALIDER" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheetId(id);
                  }}
                >
                  Corriger
                </Button>
              ) : null}
              <Button
                size="sm"
                variant={v === "A_ANALYSER" ? "default" : "outline"}
                disabled={Boolean(busyId)}
                onClick={(e) => {
                  e.stopPropagation();
                  void runAnalyze(id);
                }}
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {v === "A_ANALYSER" ? "Analyser" : "Relancer"}
              </Button>
            </div>
          );
        },
        meta: { cellClassName: "text-end", headerClassName: "w-[1%]" },
        size: 200,
      },
    ],
    [busyId],
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

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  );
  const selectedCount = selectedIds.length;

  async function handleBulkAnalyze() {
    if (selectedIds.length === 0 || busyId) return;
    setBusyId("bulk");
    setError(null);
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
    setBusyId(null);
    setRowSelection({});
    await refresh();
    if (ok > 0) toast.success(`${ok} analyse(s) terminée(s).`);
    if (fail > 0) toast.error(`${fail} échec(s) d’analyse.`);
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <MetronicDataGridShell
        table={table}
        recordCount={filteredData.length}
        emptyMessage="Aucune facture. Chargez un PDF dans Sources, puis revenez ici."
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
              selected={selectedVerdicts}
              onChange={setSelectedVerdicts}
              options={Object.entries(verdictCounts).map(([value, count]) => ({
                value,
                label: verdictLabel[value as AnalysisQueueVerdict] ?? value,
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
                { value: "number-asc", label: "N° A→Z" },
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
                    Clic N° = résultat + chronologie · filtre Passé / Bloqué / À analyser.
                  </p>
                )}
              </div>
            </DataGridFiltersButton>
            <DataGridColumnsButton table={table} />
            <AiStatusBadge analyzing={Boolean(busyId)} />
            <Badge variant="secondary" size="sm">
              {pending} à analyser
            </Badge>
            <Badge variant="success-light" size="sm">
              {passed} passé(s)
            </Badge>
            <Badge variant="destructive-light" size="sm">
              {blocked} bloqué(s)
            </Badge>
            <Button size="sm" variant="outline" asChild>
              <Link to="/e-reporting">E-reporting</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/invoices">Émission</Link>
            </Button>
          </>
        }
        selectionBar={
          <DataGridSelectionBar count={selectedCount} onClear={() => setRowSelection({})}>
            <Button
              size="sm"
              disabled={Boolean(busyId) || selectedCount === 0}
              onClick={() => void handleBulkAnalyze()}
            >
              {busyId === "bulk" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Analyser ({selectedCount})
            </Button>
          </DataGridSelectionBar>
        }
      >
        <AnalysisResultSheet
          key={`${sheetId}-${sheetKey}`}
          invoiceId={sheetId}
          open={Boolean(sheetId)}
          onOpenChange={(open) => {
            if (!open) setSheetId(null);
          }}
          onAnalyze={(id) => void runAnalyze(id)}
          analyzing={busyId === sheetId}
        />
      </MetronicDataGridShell>
    </div>
  );
}
