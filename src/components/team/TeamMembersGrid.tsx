"use client";

import { Link } from "@tanstack/react-router";
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
import { Archive, ArchiveRestore, Eye, Loader2, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/reui/badge";
import { DataGridColumnHeader } from "@/components/reui/data-grid";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  archiveTeamMember,
  listTeamMembers,
  removeTeamMember,
  restoreTeamMember,
  updateTeamMemberRole,
  type TeamMemberRow,
} from "@/fns/team";
import { resolveUserAvatar } from "@/lib/media";
import { MEMBER_ROLE_LABELS, INVITABLE_ROLES } from "@/lib/team-roles";
import type { MemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleBadge: Record<
  MemberRole,
  "default" | "success-light" | "warning-light" | "secondary" | "info-light"
> = {
  OWNER: "default",
  ADMIN: "info-light",
  ACCOUNTANT: "warning-light",
  COLLABORATOR: "secondary",
};

type PendingAction = { type: "archive" | "remove"; member: TeamMemberRow } | null;

export function TeamMembersGrid({ refreshKey }: { refreshKey?: number }) {
  const list = useServerFn(listTeamMembers);
  const updateRole = useServerFn(updateTeamMemberRole);
  const remove = useServerFn(removeTeamMember);
  const archive = useServerFn(archiveTeamMember);
  const restore = useServerFn(restoreTeamMember);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("name-asc");

  async function reload() {
    setLoading(true);
    try {
      const data = await list();
      setMembers(data.members);
      setCanManage(data.canManage);
      if (data.error) toast.error(data.error);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger les membres.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function confirmPending() {
    if (!pending) return;
    const { type, member } = pending;
    setBusyId(member.membershipId);
    setPending(null);
    const res =
      type === "archive"
        ? await archive({ data: { membershipId: member.membershipId } })
        : await remove({ data: { membershipId: member.membershipId } });
    setBusyId(null);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success(type === "archive" ? "Membre archivé" : "Membre supprimé de l’organisation");
    void reload();
  }

  const roleCounts = useMemo(() => {
    return members.reduce(
      (acc, row) => {
        acc[row.role] = (acc[row.role] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [members]);

  const statusCounts = useMemo(() => {
    let active = 0;
    let archived = 0;
    for (const m of members) {
      if (m.archivedAt) archived++;
      else active++;
    }
    return { active, archived };
  }, [members]);

  const filteredData = useMemo(() => {
    let filtered = members;

    if (selectedRoles.length > 0) {
      filtered = filtered.filter((r) => selectedRoles.includes(r.role));
    }
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => {
        const key = r.archivedAt ? "archived" : "active";
        return selectedStatuses.includes(key);
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) => (r.name ?? "").toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortOrder === "created-desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "name-desc") {
        return (b.name || b.email).localeCompare(a.name || a.email, "fr");
      }
      return (a.name || a.email).localeCompare(b.name || b.email, "fr");
    });

    return filtered;
  }, [members, searchQuery, selectedRoles, selectedStatuses, sortOrder]);

  const columns = useMemo<ColumnDef<TeamMemberRow>[]>(
    () => [
      createRowSelectColumn<TeamMemberRow>(),
      {
        accessorKey: "name",
        header: ({ column }) => <DataGridColumnHeader title="Membre" column={column} />,
        cell: ({ row }) => {
          const m = row.original;
          const label = m.name || m.email;
          return (
            <Link
              to="/team/members/$membershipId"
              params={{ membershipId: m.membershipId }}
              className={cn(
                "flex items-center gap-2.5 rounded-md outline-none transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring",
                m.archivedAt && "opacity-60",
              )}
            >
              <Avatar className="size-8">
                <AvatarImage
                  src={resolveUserAvatar({
                    email: m.email,
                    avatarKey: m.avatarKey,
                  })}
                  alt=""
                />
                <AvatarFallback>{label.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground underline-offset-2 hover:underline">
                  {label}
                </p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
            </Link>
          );
        },
        size: 260,
      },
      {
        accessorKey: "role",
        header: ({ column }) => <DataGridColumnHeader title="Rôle" column={column} />,
        cell: ({ row }) => {
          const m = row.original;
          if (!canManage || m.role === "OWNER" || m.isSelf || m.archivedAt) {
            return (
              <Badge variant={roleBadge[m.role]} size="sm">
                {MEMBER_ROLE_LABELS[m.role]}
              </Badge>
            );
          }
          return (
            <Select
              value={m.role}
              disabled={busyId === m.membershipId}
              onValueChange={(value) => {
                void (async () => {
                  setBusyId(m.membershipId);
                  const res = await updateRole({
                    data: { membershipId: m.membershipId, role: value as MemberRole },
                  });
                  setBusyId(null);
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Rôle mis à jour");
                  void reload();
                })();
              }}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVITABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        size: 180,
      },
      {
        id: "status",
        header: ({ column }) => <DataGridColumnHeader title="Statut" column={column} />,
        cell: ({ row }) =>
          row.original.archivedAt ? (
            <Badge variant="warning-light" size="sm">
              Archivé
            </Badge>
          ) : (
            <Badge variant="success-light" size="sm">
              Actif
            </Badge>
          ),
        size: 100,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataGridColumnHeader title="Ajouté le" column={column} />,
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        size: 140,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const m = row.original;
          const busy = busyId === m.membershipId;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button variant="ghost" size="icon" className="size-8" title="Voir le profil" asChild>
                <Link to="/team/members/$membershipId" params={{ membershipId: m.membershipId }}>
                  <Eye className="size-4" />
                </Link>
              </Button>
              {canManage && m.role !== "OWNER" && !m.isSelf ? (
                <>
                  {m.archivedAt ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Restaurer l’accès"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusyId(m.membershipId);
                          const res = await restore({ data: { membershipId: m.membershipId } });
                          setBusyId(null);
                          if (!res.success) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Membre restauré");
                          void reload();
                        })();
                      }}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArchiveRestore className="size-4" />
                      )}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Archiver (désactiver l’accès)"
                      disabled={busy}
                      onClick={() => setPending({ type: "archive", member: m })}
                    >
                      <Archive className="size-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    title="Supprimer définitivement de l’organisation"
                    disabled={busy}
                    onClick={() => setPending({ type: "remove", member: m })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
        size: 120,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, busyId],
  );

  const table = useReactTable({
    columns,
    data: filteredData,
    pageCount: Math.ceil((filteredData.length || 0) / pagination.pageSize),
    getRowId: (row) => row.membershipId,
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

  const activeCount = members.filter((m) => !m.archivedAt).length;
  const advancedFilterCount =
    selectedRoles.length +
    selectedStatuses.length +
    (searchQuery ? 1 : 0) +
    (sortOrder !== "name-asc" ? 1 : 0);

  return (
    <>
      <MetronicDataGridShell
        table={table}
        recordCount={filteredData.length}
        isLoading={loading}
        emptyMessage="Aucun membre dans cette organisation."
        heading={
          <>
            <DataGridSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher membre…"
              className="w-48"
            />
            <DataGridFacetFilter
              title="Rôle"
              selected={selectedRoles}
              onChange={setSelectedRoles}
              options={Object.entries(roleCounts).map(([value, count]) => ({
                value,
                label: MEMBER_ROLE_LABELS[value as MemberRole] ?? value,
                count,
              }))}
            />
            <DataGridFacetFilter
              title="Statut"
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              options={[
                { value: "active", label: "Actif", count: statusCounts.active },
                { value: "archived", label: "Archivé", count: statusCounts.archived },
              ]}
            />
            <DataGridSortFilter
              title="Tri"
              value={sortOrder}
              defaultValue="name-asc"
              onChange={setSortOrder}
              options={[
                { value: "name-asc", label: "Nom A→Z" },
                { value: "name-desc", label: "Nom Z→A" },
                { value: "created-desc", label: "Plus récents" },
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
                      setSelectedRoles([]);
                      setSelectedStatuses([]);
                      setSortOrder("name-asc");
                    }}
                  >
                    Réinitialiser
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    Membres de l’organisation — rôles et accès.
                  </p>
                )}
              </div>
            </DataGridFiltersButton>
            <DataGridColumnsButton table={table} />
            <Badge variant="secondary" size="sm">
              {activeCount} actif{activeCount > 1 ? "s" : ""}
              {members.length > activeCount
                ? ` · ${members.length - activeCount} archivé${members.length - activeCount > 1 ? "s" : ""}`
                : ""}
            </Badge>
          </>
        }
      />

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === "archive" ? "Archiver ce membre ?" : "Supprimer ce membre ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.type === "archive" ? (
                <>
                  <strong>{pending.member.name || pending.member.email}</strong> perdra l’accès à
                  cette organisation. Vous pourrez le restaurer plus tard.
                </>
              ) : pending ? (
                <>
                  <strong>{pending.member.name || pending.member.email}</strong> sera retiré
                  définitivement de l’organisation. Son compte utilisateur n’est pas effacé s’il
                  appartient à d’autres dossiers.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={
                pending?.type === "remove"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => void confirmPending()}
            >
              {pending?.type === "archive" ? "Archiver" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
