import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Badge } from "@/components/reui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logoutUser } from "@/fns/auth";
import { acceptInviteSignup, acceptTeamInvite, getInviteByToken } from "@/fns/team";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Invitation — InvoicePilot AI" }] }),
  component: InviteAcceptPage,
});

type InviteView = {
  email: string;
  roleLabel: string;
  organizationName: string;
  inviterName: string;
  expiresAt: string;
  hasAccount: boolean;
  sessionEmail: string | null;
  sessionMatches: boolean;
};

function InviteAcceptPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const loadInvite = useServerFn(getInviteByToken);
  const accept = useServerFn(acceptTeamInvite);
  const signup = useServerFn(acceptInviteSignup);
  const logout = useServerFn(logoutUser);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteView | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      const res = await loadInvite({ data: { token } });
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInvite(res.invite);

      // Déjà connecté avec le bon e-mail → accepter automatiquement
      if (res.invite.sessionMatches) {
        setBusy(true);
        const accepted = await accept({ data: { token } });
        setBusy(false);
        if (accepted.success) {
          await navigate({ to: "/dashboard" });
          return;
        }
        if ("needsAuth" in accepted && accepted.needsAuth) {
          return;
        }
        setError(accepted.error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAcceptExisting() {
    setBusy(true);
    setError(null);
    const res = await accept({ data: { token } });
    setBusy(false);
    if (!res.success) {
      if ("needsAuth" in res && res.needsAuth) {
        await navigate({
          to: "/login",
          search: { redirect: `/invite/${token}`, email: invite?.email },
        });
        return;
      }
      setError(res.error);
      return;
    }
    await navigate({ to: "/dashboard" });
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Indiquez votre nom.");
      return;
    }
    if (password.length < 8) {
      setError("Mot de passe : 8 caractères minimum.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    const res = await signup({ data: { token, name, password } });
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    await navigate({ to: "/dashboard" });
  }

  async function handleSwitchAccount() {
    setBusy(true);
    await logout();
    setBusy(false);
    await navigate({
      to: "/login",
      search: { redirect: `/invite/${token}`, email: invite?.email },
    });
  }

  return (
    <AuthBrandedLayout>
      <div className="block w-full space-y-5 text-center">
        <div className="space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Invitation équipe</h1>
          <p className="text-sm text-muted-foreground">
            Créez votre compte et rejoignez l’organisation
          </p>
        </div>

        {loading || (invite?.sessionMatches && busy) ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            {invite?.sessionMatches ? (
              <p className="text-sm text-muted-foreground">Acceptation de l’invitation…</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {invite && !loading && !(invite.sessionMatches && busy) ? (
          <div className="space-y-4 text-left">
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{invite.inviterName}</strong> vous invite à
                rejoindre
              </p>
              <p className="text-lg font-semibold">{invite.organizationName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info-light" size="sm">
                  {invite.roleLabel}
                </Badge>
                <Badge variant="secondary" size="sm">
                  {invite.email}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Expire le{" "}
                {new Date(invite.expiresAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            {invite.sessionMatches ? (
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => void handleAcceptExisting()}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Accepter et rejoindre
              </Button>
            ) : invite.sessionEmail ? (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription>
                    Vous êtes connecté en tant que <strong>{invite.sessionEmail}</strong>.
                    L’invitation est destinée à <strong>{invite.email}</strong>.
                  </AlertDescription>
                </Alert>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleSwitchAccount()}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Se connecter avec {invite.email}
                </Button>
              </div>
            ) : invite.hasAccount ? (
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link to="/login" search={{ redirect: `/invite/${token}`, email: invite.email }}>
                    Se connecter pour rejoindre
                  </Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Un compte existe déjà pour {invite.email}
                </p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void handleCreateAccount(e)}>
                <p className="text-sm text-muted-foreground">
                  Créez votre mot de passe pour rejoindre{" "}
                  <strong className="text-foreground">{invite.organizationName}</strong>. Vous
                  n’avez pas besoin de créer une nouvelle entreprise.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">E-mail</Label>
                  <Input id="invite-email" type="email" value={invite.email} disabled readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Votre nom</Label>
                  <Input
                    id="invite-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Samir Dupont"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="invite-password"
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="8 caractères minimum"
                      className="pr-10"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 size-9"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                    >
                      {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password-confirm">Confirmer le mot de passe</Label>
                  <Input
                    id="invite-password-confirm"
                    type={passwordVisible ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Créer mon compte et rejoindre
                </Button>
              </form>
            )}
          </div>
        ) : null}

        {!loading && error && !invite ? (
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Retour à la connexion
            </Link>
          </p>
        ) : null}
      </div>
    </AuthBrandedLayout>
  );
}
