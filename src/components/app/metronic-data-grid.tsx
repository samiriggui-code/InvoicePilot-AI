"use client";

import type { ColumnDef, Table } from "@tanstack/react-table";
import { Filter, Search, Settings2, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/reui/badge";
import {
  DataGrid,
  DataGridColumnVisibility,
  DataGridPagination,
  DataGridScrollArea,
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/reui/data-grid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardToolbar,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Layout Metronic saas-users — pinnable / movable / visibility / cell border. */
export const METRONIC_TABLE_LAYOUT = {
  columnsPinnable: true,
  columnsMovable: true,
  columnsVisibility: true,
  cellBorder: true,
} as const;

export const FR_PAGINATION_PROPS = {
  sizesLabel: "Afficher",
  sizesDescription: "par page",
  rowsPerPageLabel: "Lignes par page",
  info: "{from} – {to} sur {count}",
} as const;

export type DataGridFacetOption = {
  value: string;
  label: string;
  count?: number;
};

/** Colonne checkbox — pattern Metronic RowSelect. */
export function createRowSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 40,
  };
}

export function DataGridSearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  className = "w-40",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`ps-9 ${className}`}
      />
      {value.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={() => onChange("")}
          aria-label="Effacer la recherche"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

/** Filtre multi-checkbox style Metronic « Status ». */
export function DataGridFacetFilter({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: DataGridFacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(value: string, checked: boolean) {
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Filter className="size-4" />
          {title}
          {selected.length > 0 ? (
            <Badge variant="outline" size="sm">
              {selected.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="start">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Filtres</div>
          <div className="space-y-3">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`facet-${title}-${opt.value}`}
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(c) => toggle(opt.value, c === true)}
                />
                <Label
                  htmlFor={`facet-${title}-${opt.value}`}
                  className="flex grow items-center justify-between gap-1.5 font-normal"
                >
                  {opt.label}
                  {typeof opt.count === "number" ? (
                    <span className="text-muted-foreground">{opt.count}</span>
                  ) : null}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Tri unique style Metronic « Sort Order ». */
export function DataGridSortFilter({
  title = "Tri",
  value,
  options,
  onChange,
  defaultValue,
}: {
  title?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  defaultValue?: string;
}) {
  const showBadge = defaultValue ? value !== defaultValue : false;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Filter className="size-4" />
          {title}
          {showBadge ? (
            <Badge variant="outline" size="sm">
              {options.find((o) => o.value === value)?.label ?? value}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-3" align="start">
        <div className="space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Trier par</div>
          <div className="space-y-3">
            {options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2.5">
                <Checkbox
                  id={`sort-${opt.value}`}
                  checked={value === opt.value}
                  onCheckedChange={(c) => {
                    if (c === true) onChange(opt.value);
                  }}
                />
                <Label htmlFor={`sort-${opt.value}`} className="grow font-normal">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DataGridColumnsButton<TData>({ table }: { table: Table<TData> }) {
  return (
    <DataGridColumnVisibility
      table={table}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <Settings2 className="size-4" />
          Colonnes
        </Button>
      }
    />
  );
}

/** Bouton primaire « Filtres » Metronic — ouvre un popover custom. */
export function DataGridFiltersButton({
  activeCount = 0,
  children,
}: {
  activeCount?: number;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm">
          <SlidersHorizontal className="size-4" />
          Filtres
          {activeCount > 0 ? (
            <Badge size="sm" variant="secondary">
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        {children}
      </PopoverContent>
    </Popover>
  );
}

type MetronicShellProps<TData extends object> = {
  table: Table<TData>;
  recordCount: number;
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  /** Zone gauche : Search + facettes + tri (CardHeading). */
  heading: ReactNode;
  /** Zone droite : Filtres + Colonnes (+ extras). */
  toolbar?: ReactNode;
  /** Barre d’actions multi-sélection (sous le header). */
  selectionBar?: ReactNode;
  /** Contenu hors card (sheets, dialogs). */
  children?: ReactNode;
};

/**
 * Coque Metronic saas-users :
 * Search/facets à gauche · Filtres/Colonnes à droite · table scrollable · pagination.
 */
export function MetronicDataGridShell<TData extends object>({
  table,
  recordCount,
  emptyMessage,
  isLoading,
  onRowClick,
  heading,
  toolbar,
  selectionBar,
  children,
}: MetronicShellProps<TData>) {
  return (
    <>
      <DataGrid
        table={table}
        recordCount={recordCount}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        onRowClick={onRowClick}
        tableLayout={METRONIC_TABLE_LAYOUT}
      >
        <Card>
          <CardHeader>
            <CardHeading>
              <div className="flex flex-wrap items-center gap-2.5">{heading}</div>
            </CardHeading>
            <CardToolbar>{toolbar ?? <DataGridColumnsButton table={table} />}</CardToolbar>
          </CardHeader>
          {selectionBar}
          <CardTable>
            <DataGridScrollArea orientation="horizontal">
              <DataGridTable />
            </DataGridScrollArea>
          </CardTable>
          <CardFooter>
            <DataGridPagination {...FR_PAGINATION_PROPS} />
          </CardFooter>
        </Card>
      </DataGrid>
      {children}
    </>
  );
}

/** Barre multi-sélection — visible dès qu’au moins 1 ligne est cochée. */
export function DataGridSelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count <= 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/5 px-5 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="primary-light" size="sm">
          {count} sélectionné{count > 1 ? "s" : ""}
        </Badge>
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          Tout désélectionner
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
