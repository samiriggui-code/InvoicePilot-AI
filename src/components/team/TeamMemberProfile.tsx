import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Activity,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Check,
  Loader2,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/reui/badge";
import {
  DataGrid,
  DataGridContainer,
  DataGridPagination,
  DataGridTable,
} from "@/components/reui/data-grid";
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  archiveTeamMember,
  getTeamMember,
  removeTeamMember,
  restoreTeamMember,
  updateTeamMemberAvatar,
  updateTeamMemberRole,
} from "@/fns/team";
import { AVATAR_PRESETS, media, resolveUserAvatar } from "@/lib/media";
import {
  INVITABLE_ROLES,
  MEMBER_ROLE_LABELS,
  PERMISSION_META,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from "@/lib/team-roles";
import type { MemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";

type MemberDetail = {
  membershipId: string;
  userId: string;
  email: string;
  name: string | null;
  avatarKey: string | null;
  emailVerified: boolean;
  role: MemberRole;
  roleLabel: string;
  createdAt: string;
  archivedAt: string | null;
  userCreatedAt: string;
  lastSignInAt: string | null;
  isSelf: boolean;
};

type ActivityItem = {
  id: string;
  action: string;
  label: string;
  createdAt: string;
};

const roleBadge: Record<
  MemberRole,
  "default" | "success-light" | "warning-light" | "secondary" | "info-light"
> = {
  OWNER: "default",
  ADMIN: "info-light",
  ACCOUNTANT: "warning-light",
  COLLABORATOR: "secondary",
};

/** Fiche membre — style admin (Profile / Roles / Activity logs). */
export function TeamMemberProfile({ membershipId }: { membershipId: string }) {
  const navigate = useNavigate();
  const load = useServerFn(getTeamMember);
  const updateRole = useServerFn(updateTeamMemberRole);
  const updateAvatar = useServerFn(updateTeamMemberAvatar);
  const archive = useServerFn(archiveTeamMember);
  const restore = useServerFn(restoreTeamMember);
  const remove = useServerFn(removeTeamMember);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [draftAvatarKey, setDraftAvatarKey] = useState<string | null>(null);
  const [tab, setTab] = useState("profile");

  async function reload() {
    setLoading(true);
    setError(null);
    const res = await load({ data: { membershipId } });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setMember(null);
      return;
    }
    setMember(res.member);
    setCanManage(res.canManage);
    setOrgName(res.organizationName);
    setActivity(res.activity);
    setDraftAvatarKey(res.member.avatarKey);
    setEditingAvatar(false);
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [membershipId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !member) {
    return (
      <Card className="w-full">
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">{error ?? "Membre introuvable."}</p>
          <Button variant="outline" asChild>
            <Link to="/team">Retour aux membres</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const label = member.name || member.email;
  const initials = label
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const canEditRole = canManage && !member.isSelf && member.role !== "OWNER" && !member.archivedAt;
  const canEditAvatar =
    (member.isSelf || (canManage && member.role !== "OWNER")) && !member.archivedAt;
  const canActOnMember = canManage && !member.isSelf && member.role !== "OWNER";
  const permissions = ROLE_PERMISSIONS[member.role];
  const permissionKeys = Object.keys(PERMISSION_META) as PermissionKey[];

  async function saveAvatar() {
    if (!member) return;
    setBusy(true);
    const res = await updateAvatar({
      data: { membershipId: member.membershipId, avatarKey: draftAvatarKey },
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Avatar mis à jour");
    setEditingAvatar(false);
    void reload();
  }

  return (
    <div className="grid w-full gap-6">
      <div className="flex w-full flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Accueil / Utilisateurs / <span className="text-foreground">{label}</span>
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Utilisateur</h2>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/team">
            <ArrowLeft className="size-4" />
            Retour aux membres
          </Link>
        </Button>
      </div>

      <div className="flex w-full flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
        <Avatar className="size-14 ring-2 ring-border">
          <AvatarImage
            src={resolveUserAvatar({
              email: member.email,
              avatarKey: member.avatarKey,
            })}
            alt={label}
          />
          <AvatarFallback className="text-base">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-lg font-semibold">{label}</p>
          <p className="truncate text-sm text-muted-foreground">{member.email}</p>
          <code className="inline-block rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {member.userId}
          </code>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={roleBadge[member.role]} size="sm">
            {member.roleLabel}
          </Badge>
          {member.archivedAt ? (
            <Badge variant="warning-light" size="sm">
              Archivé
            </Badge>
          ) : (
            <Badge variant="success-light" size="sm">
              Actif
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full gap-5">
        <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="profile"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-1 pb-2.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <UserRound className="size-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-1 pb-2.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Shield className="size-4" />
            Rôles
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-1 pb-2.5 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            <Activity className="size-4" />
            Activity logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0 w-full space-y-5">
          {canEditAvatar ? (
            <Card className="w-full">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">Avatar</CardTitle>
                  <CardDescription>
                    {member.isSelf
                      ? "Choisissez une photo Metronic pour votre compte."
                      : "L’administrateur peut définir l’avatar de ce collaborateur."}
                  </CardDescription>
                </div>
                {!editingAvatar ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraftAvatarKey(member.avatarKey);
                      setEditingAvatar(true);
                    }}
                  >
                    Modifier l’avatar
                  </Button>
                ) : null}
              </CardHeader>
              {editingAvatar ? (
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="size-16 ring-2 ring-border">
                      <AvatarImage
                        src={resolveUserAvatar({
                          email: member.email,
                          avatarKey: draftAvatarKey,
                        })}
                        alt={label}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-muted-foreground">
                      Aperçu — cliquez une vignette puis enregistrez.
                    </p>
                  </div>
                  <div className="grid max-h-52 grid-cols-6 gap-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
                    <button
                      type="button"
                      title="Automatique (e-mail)"
                      onClick={() => setDraftAvatarKey(null)}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-full border-2 transition-all",
                        draftAvatarKey === null
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent opacity-80 hover:opacity-100",
                      )}
                    >
                      <img
                        src={resolveUserAvatar({
                          email: member.email,
                          avatarKey: null,
                        })}
                        alt="Auto"
                        className="size-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-background/80 py-0.5 text-center text-[8px] font-medium">
                        Auto
                      </span>
                    </button>
                    {AVATAR_PRESETS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        title={key}
                        onClick={() => setDraftAvatarKey(key)}
                        className={cn(
                          "aspect-square overflow-hidden rounded-full border-2 transition-all",
                          draftAvatarKey === key
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent opacity-80 hover:opacity-100",
                        )}
                      >
                        <img
                          src={media.avatarByKey(key)}
                          alt={key}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </CardContent>
              ) : null}
              {editingAvatar ? (
                <CardFooter className="gap-2 border-t border-border">
                  <Button
                    size="sm"
                    disabled={busy || draftAvatarKey === (member.avatarKey ?? null)}
                    onClick={() => void saveAvatar()}
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                    Enregistrer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      setDraftAvatarKey(member.avatarKey);
                      setEditingAvatar(false);
                    }}
                  >
                    Annuler
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          ) : null}

          <Card className="w-full">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <DetailRow label="Nom complet" value={label} />
              <DetailRow
                label="Adresse e-mail"
                value={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {member.email}
                    {member.emailVerified ? (
                      <Badge variant="success-light" size="sm">
                        Vérifié
                      </Badge>
                    ) : (
                      <Badge variant="warning-light" size="sm">
                        Non vérifié
                      </Badge>
                    )}
                  </span>
                }
              />
              <DetailRow
                label="Rôle"
                value={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <Badge variant={roleBadge[member.role]} size="sm">
                      {member.roleLabel}
                    </Badge>
                    <Badge variant="secondary" size="sm">
                      {orgName}
                    </Badge>
                  </span>
                }
              />
              <DetailRow
                label="Statut"
                value={
                  member.archivedAt ? (
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className="size-2 rounded-full bg-amber-500" />
                      Archivé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      Actif
                    </span>
                  )
                }
              />
              <DetailRow
                label="Dernière connexion"
                value={
                  member.lastSignInAt
                    ? new Date(member.lastSignInAt).toLocaleString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Jamais"
                }
              />
              <DetailRow
                label="Membre depuis"
                value={new Date(member.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              />
            </CardContent>
            <CardFooter className="gap-2 border-t border-border">
              {canEditRole ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTab("roles");
                    setEditingRole(true);
                  }}
                >
                  Modifier le rôle
                </Button>
              ) : null}
              {member.isSelf ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">Éditer mon profil</Link>
                </Button>
              ) : null}
            </CardFooter>
          </Card>

          {canActOnMember ? (
            <div className="w-full space-y-3">
              <h3 className="text-sm font-semibold text-destructive">Zone sensible</h3>
              <Card className="w-full border-destructive/25">
                <CardHeader>
                  <CardTitle className="text-base">Accès à l’organisation</CardTitle>
                  <CardDescription>
                    Archiver désactive l’accès (réversible). Supprimer retire le membre de {orgName}{" "}
                    — le compte n’est pas effacé s’il a d’autres dossiers.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex flex-wrap gap-2">
                  {member.archivedAt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          const res = await restore({
                            data: { membershipId: member.membershipId },
                          });
                          setBusy(false);
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
                      Restaurer
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        void (async () => {
                          setBusy(true);
                          const res = await archive({
                            data: { membershipId: member.membershipId },
                          });
                          setBusy(false);
                          if (!res.success) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Membre archivé");
                          void reload();
                        })();
                      }}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                      Archiver
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => setConfirmRemove(true)}
                  >
                    <Trash2 className="size-4" />
                    Supprimer le membre
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="roles" className="mt-0 w-full space-y-5">
          <div className="grid w-full gap-5 lg:grid-cols-2">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">Rôle actuel</CardTitle>
                <CardDescription>{ROLE_DESCRIPTIONS[member.role]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={roleBadge[member.role]} size="sm">
                    {member.roleLabel}
                  </Badge>
                  {member.isSelf ? (
                    <span className="text-xs text-muted-foreground">
                      Vous ne pouvez pas modifier votre propre rôle ici.
                    </span>
                  ) : null}
                </div>

                {canEditRole && editingRole ? (
                  <div className="max-w-sm space-y-2">
                    <Label htmlFor="member-role">Changer le rôle</Label>
                    <Select
                      value={member.role}
                      disabled={busy}
                      onValueChange={(value) => {
                        void (async () => {
                          setBusy(true);
                          const res = await updateRole({
                            data: {
                              membershipId: member.membershipId,
                              role: value as MemberRole,
                            },
                          });
                          setBusy(false);
                          if (!res.success) {
                            toast.error(res.error);
                            return;
                          }
                          toast.success("Rôle mis à jour");
                          setEditingRole(false);
                          void reload();
                        })();
                      }}
                    >
                      <SelectTrigger id="member-role">
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
                  </div>
                ) : canEditRole ? (
                  <Button variant="outline" size="sm" onClick={() => setEditingRole(true)}>
                    Modifier le rôle
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base">Permissions du rôle</CardTitle>
                <CardDescription>Aperçu des accès liés à « {member.roleLabel} ».</CardDescription>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                {permissionKeys.map((key) => {
                  const allowed = permissions[key];
                  const meta = PERMISSION_META[key];
                  return (
                    <div
                      key={key}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{meta.title}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                          allowed
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {allowed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 w-full">
          <MemberActivityDataGrid rows={activity} orgName={orgName} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retirera <strong>{label}</strong> de {orgName}. Elle ne peut pas être
              annulée facilement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  const res = await remove({
                    data: { membershipId: member.membershipId },
                  });
                  setBusy(false);
                  setConfirmRemove(false);
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Membre retiré");
                  await navigate({ to: "/team" });
                })();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberActivityDataGrid({ rows, orgName }: { rows: ActivityItem[]; orgName: string }) {
  const columns = useMemo<ColumnDef<ActivityItem>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        size: 180,
      },
      {
        accessorKey: "label",
        header: "Événement",
        cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
        size: 320,
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => (
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {row.original.action}
          </code>
        ),
        size: 240,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: {
      pagination: { pageSize: 10 },
      sorting: [{ id: "createdAt", desc: true }],
    },
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      emptyMessage="Aucune activité enregistrée pour le moment."
      tableLayout={{ cellBorder: true }}
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Activity logs</CardTitle>
          <CardToolbar>
            <Badge variant="secondary" size="sm">
              {rows.length} événement{rows.length > 1 ? "s" : ""} · {orgName}
            </Badge>
          </CardToolbar>
        </CardHeader>
        <CardTable>
          <DataGridContainer border={false}>
            <DataGridTable />
          </DataGridContainer>
        </CardTable>
        <CardFooter>
          <DataGridPagination
            sizesLabel="Afficher"
            sizesDescription="par page"
            rowsPerPageLabel="Lignes par page"
            info="{from} – {to} sur {count}"
          />
        </CardFooter>
      </Card>
    </DataGrid>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:items-center sm:gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="min-w-0 text-sm text-foreground">{value}</div>
    </div>
  );
}
