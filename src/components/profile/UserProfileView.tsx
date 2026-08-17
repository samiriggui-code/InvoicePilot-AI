import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Loader2, Pencil, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/reui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/fns/auth";
import { AVATAR_PRESETS, media, resolveUserAvatar } from "@/lib/media";
import { MEMBER_ROLE_LABELS } from "@/lib/team-roles";
import { planLabel, type WorkspaceContext } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Profil utilisateur — style Metronic account/home/user-profile. */
export function UserProfileView({ workspace }: { workspace: WorkspaceContext }) {
  const router = useRouter();
  const saveProfile = useServerFn(updateProfile);
  const [name, setName] = useState(workspace.user.name);
  const [avatarKey, setAvatarKey] = useState<string | null>(workspace.user.avatarKey);
  const [saving, setSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  useEffect(() => {
    setName(workspace.user.name);
    setAvatarKey(workspace.user.avatarKey);
  }, [workspace.user.name, workspace.user.avatarKey]);

  const initials = (name || workspace.user.email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const orgLabel = workspace.organization.tradeName ?? workspace.organization.legalName;
  const role = workspace.organization.role;
  const plan = workspace.subscription?.plan;
  const previewSrc = resolveUserAvatar({
    email: workspace.user.email,
    avatarKey,
  });

  const dirty =
    name.trim() !== workspace.user.name || avatarKey !== (workspace.user.avatarKey ?? null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await saveProfile({ data: { name, avatarKey } });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("Profil mis à jour");
    await router.invalidate();
  }

  return (
    <div className="grid gap-5 lg:gap-7">
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={(e) => void handleSave(e)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <Avatar className="size-20 ring-2 ring-border">
                  <AvatarImage src={previewSrc} alt={name} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      title="Changer l’avatar"
                      className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Choisir un avatar</DialogTitle>
                      <DialogDescription>
                        Sélectionnez une photo dans la galerie Metronic, ou laissez l’avatar
                        automatique basé sur votre e-mail.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid max-h-80 grid-cols-6 gap-2 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 sm:grid-cols-8">
                      <button
                        type="button"
                        title="Automatique (e-mail)"
                        onClick={() => {
                          setAvatarKey(null);
                          setAvatarDialogOpen(false);
                        }}
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-full border-2 transition-all",
                          avatarKey === null
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent opacity-80 hover:opacity-100",
                        )}
                      >
                        <img
                          src={resolveUserAvatar({
                            email: workspace.user.email,
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
                          onClick={() => {
                            setAvatarKey(key);
                            setAvatarDialogOpen(false);
                          }}
                          className={cn(
                            "aspect-square overflow-hidden rounded-full border-2 transition-all",
                            avatarKey === key
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
                  </DialogContent>
                </Dialog>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-muted-foreground">Avatar</Label>
                <p className="text-xs text-muted-foreground">
                  {avatarKey
                    ? "Photo personnalisée choisie."
                    : "Avatar automatique basé sur votre e-mail."}{" "}
                  Cliquez sur le crayon pour en changer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Label htmlFor="profile-name" className="w-full max-w-32 text-muted-foreground">
                Nom
              </Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="max-w-md grow"
                autoComplete="name"
                required
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Label className="w-full max-w-32 text-muted-foreground">E-mail</Label>
              <div className="max-w-md grow text-sm">{workspace.user.email}</div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Label className="w-full max-w-32 text-muted-foreground">Organisation</Label>
              <div className="max-w-md grow text-sm">{orgLabel}</div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Label className="w-full max-w-32 text-muted-foreground">Rôle</Label>
              <Badge variant="info-light" size="sm">
                {MEMBER_ROLE_LABELS[role]}
              </Badge>
            </div>
            {plan ? (
              <div className="flex flex-wrap items-center gap-4">
                <Label className="w-full max-w-32 text-muted-foreground">Offre</Label>
                <div className="text-sm">
                  {planLabel(plan)}
                  {workspace.subscription?.status === "TRIALING" ? " · Essai" : ""}
                </div>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !dirty}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres de base</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Mot de passe</p>
                <p className="text-xs text-muted-foreground">
                  Réinitialisation via « Mot de passe oublié » sur l’écran de connexion.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/forgot-password">Modifier</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Double authentification</p>
                <p className="text-xs text-muted-foreground">Temporairement désactivée en démo.</p>
              </div>
            </div>
            <Badge variant="secondary" size="sm">
              Off
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Organisation, clés API et thème → Paramètres.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to="/settings">Ouvrir les paramètres</Link>
          </Button>
        </CardFooter>
      </Card>

      {canManageTeamHint(role) ? (
        <Card>
          <CardHeader>
            <CardTitle>Gestion des membres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              En tant que {MEMBER_ROLE_LABELS[role].toLowerCase()}, vous pouvez archiver ou
              supprimer l’accès d’un collègue depuis la page Utilisateurs.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/team">Gérer l’équipe</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function canManageTeamHint(role: WorkspaceContext["organization"]["role"]) {
  return role === "OWNER" || role === "ADMIN";
}
