"use client";

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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createRowSelectColumn,
  DataGridColumnsButton,
  DataGridFacetFilter,
  DataGridFiltersButton,
  DataGridSearchInput,
  DataGridSortFilter,
  MetronicDataGridShell,
} from "@/components/app/metronic-data-grid";
import { KeenIcon } from "@/components/keenicons";
import { Badge } from "@/components/reui/badge";
import { DataGridColumnHeader } from "@/components/reui/data-grid";
import { Button } from "@/components/ui/button";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@/fns/notifications";
import { cn } from "@/lib/utils";

const severityBadge: Record<
  NotificationRow["severity"],
  "secondary" | "success-light" | "warning-light" | "destructive-light"
> = {
  INFO: "secondary",
  SUCCESS: "success-light",
  WARNING: "warning-light",
  ALERT: "destructive-light",
};

const severityLabel: Record<NotificationRow["severity"], string> = {
  INFO: "Info",
  SUCCESS: "Succès",
  WARNING: "Attention",
  ALERT: "Alerte",
};

const severityIcon: Record<NotificationRow["severity"], string> = {
  INFO: "information-2",
  SUCCESS: "check-circle",
  WARNING: "information",
  ALERT: "notification-status",
};

export function NotificationsDataGrid({
  alertsOnly = false,
  onChanged,
}: {
  alertsOnly?: boolean;
  /** Rafraîchir les KPI / badges après lecture. */
  onChanged?: () => void;
}) {
  const list = useServerFn(listNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [selectedReadState, setSelectedReadState] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("latest");

  async function reload() {
    setLoading(true);
    try {
      const data = await list({ data: { alertsOnly } });
      setItems(data.items);
      if (data.error) toast.error(data.error);
    } catch {
      toast.error("Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsOnly]);

  async function onMarkRead(id: string) {
    await markRead({ data: { id } });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    onChanged?.();
  }

  async function onMarkAll() {
    setBusy(true);
    try {
      await markAll({ data: { alertsOnly } });
      toast.success("Tout marqué comme lu.");
      await reload();
      onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  const severityCounts = useMemo(() => {
    return items.reduce(
      (acc, row) => {
        acc[row.severity] = (acc[row.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [items]);

  const readStateCounts = useMemo(() => {
    let unread = 0;
    let read = 0;
    for (const item of items) {
      if (item.readAt) read++;
      else unread++;
    }
    return { unread, read };
  }, [items]);

  const filteredData = useMemo(() => {
    let filtered = items;

    if (selectedSeverities.length > 0) {
      filtered = filtered.filter((r) => selectedSeverities.includes(r.severity));
    }
    if (selectedReadState.length > 0) {
      filtered = filtered.filter((r) => {
        const key = r.readAt ? "read" : "unread";
        return selectedReadState.includes(key);
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.body.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "oldest" ? da - db : db - da;
    });

    return filtered;
  }, [items, searchQuery, selectedSeverities, selectedReadState, sortOrder]);

  const columns = useMemo<ColumnDef<NotificationRow>[]>(
    () => [
      createRowSelectColumn<NotificationRow>(),
      {
        id: "status",
        header: () => <span className="sr-only">Lu</span>,
        size: 40,
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              row.original.readAt ? "bg-muted-foreground/30" : "bg-primary",
            )}
            title={row.original.readAt ? "Lu" : "Non lu"}
          />
        ),
      },
      {
        accessorKey: "severity",
        header: ({ column }) => <DataGridColumnHeader title="Type" column={column} />,
        size: 120,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <KeenIcon
              icon={severityIcon[row.original.severity]}
              className="text-base text-muted-foreground"
            />
            <Badge variant={severityBadge[row.original.severity]} size="sm">
              {severityLabel[row.original.severity]}
            </Badge>
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: ({ column }) => <DataGridColumnHeader title="Notification" column={column} />,
        cell: ({ row }) => (
          <div className="min-w-0 py-0.5">
            <p
              className={cn(
                "truncate text-sm",
                row.original.readAt ? "font-medium text-muted-foreground" : "font-semibold",
              )}
            >
              {row.original.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.original.body}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataGridColumnHeader title="Catégorie" column={column} />,
        size: 110,
        cell: ({ row }) => (
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.original.category}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataGridColumnHeader title="Date" column={column} />,
        size: 140,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {new Date(row.original.createdAt).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        size: 140,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            {!row.original.readAt ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => void onMarkRead(row.original.id)}
              >
                Lu
              </Button>
            ) : null}
            {row.original.href ? (
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" asChild>
                <a href={row.original.href}>{alertsOnly ? "Corriger" : "Ouvrir"}</a>
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [alertsOnly],
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

  const unread = items.filter((n) => !n.readAt).length;
  const advancedFilterCount =
    selectedSeverities.length +
    selectedReadState.length +
    (searchQuery ? 1 : 0) +
    (sortOrder !== "latest" ? 1 : 0);

  return (
    <MetronicDataGridShell
      table={table}
      recordCount={filteredData.length}
      isLoading={loading}
      emptyMessage={
        alertsOnly ? "Aucune alerte pour le moment." : "Aucune notification pour le moment."
      }
      heading={
        <>
          <DataGridSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher…"
            className="w-48"
          />
          <DataGridFacetFilter
            title="Type"
            selected={selectedSeverities}
            onChange={setSelectedSeverities}
            options={Object.entries(severityCounts).map(([value, count]) => ({
              value,
              label: severityLabel[value as NotificationRow["severity"]] ?? value,
              count,
            }))}
          />
          <DataGridFacetFilter
            title="Lecture"
            selected={selectedReadState}
            onChange={setSelectedReadState}
            options={[
              { value: "unread", label: "Non lu", count: readStateCounts.unread },
              { value: "read", label: "Lu", count: readStateCounts.read },
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
                    setSelectedSeverities([]);
                    setSelectedReadState([]);
                    setSortOrder("latest");
                  }}
                >
                  Réinitialiser
                </Button>
              ) : (
                <p className="text-muted-foreground">
                  {alertsOnly ? "Alertes" : "Notifications"}
                  {unread > 0 ? ` · ${unread} non lu${unread > 1 ? "s" : ""}` : ""}
                </p>
              )}
            </div>
          </DataGridFiltersButton>
          <DataGridColumnsButton table={table} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || unread === 0}
            onClick={() => void onMarkAll()}
          >
            Tout marquer comme lu
          </Button>
        </>
      }
    />
  );
}
