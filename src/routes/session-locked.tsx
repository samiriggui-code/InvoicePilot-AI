import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useState } from "react";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSessionLockInfo, logoutUser, unlockSession } from "@/fns/auth";
import { resolveUserAvatar } from "@/lib/media";

export const Route = createFileRoute("/session-locked")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const { locked, user } = await getSessionLockInfo();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: search.redirect } });
    }
    if (!locked) {
      throw redirect({ href: search.redirect ?? "/dashboard" });
    }
    return { user };
  },
  head: () => ({
    meta: [{ title: "Session verrouillée — InvoicePilot AI" }],
  }),
  component: SessionLockedPage,
});

function SessionLockedPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { user } = Route.useRouteContext();
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const initials = (user.name || user.email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarSrc = resolveUserAvatar({ email: user.email, avatarKey: user.avatarKey });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await unlockSession({ data: { password } });
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      await navigate({ href: redirectTo ?? "/dashboard" });
    } catch {
      setError("Impossible de déverrouiller. Réessayez.");
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutUser();
    await navigate({ to: "/login" });
  }

  return (
    <AuthBrandedLayout>
      <form onSubmit={handleSubmit} className="block w-full space-y-5">
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          <Avatar className="size-16">
            <AvatarImage src={avatarSrc} alt={user.name} />
            <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight">
              <Lock className="size-5 text-muted-foreground" />
              Session verrouillée
            </h1>
            <p className="text-sm text-muted-foreground">
              {user.name} — ressaisissez votre mot de passe pour continuer.
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              className="pr-10"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 size-9 hover:bg-transparent"
              onClick={() => setPasswordVisible(!passwordVisible)}
              aria-label={passwordVisible ? "Masquer" : "Afficher"}
            >
              {passwordVisible ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading || !password}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Déverrouillage…
            </span>
          ) : (
            "Déverrouiller"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Ce n’est pas vous ?{" "}
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="text-sm font-semibold text-foreground hover:text-primary"
          >
            Se déconnecter
          </button>
        </p>
      </form>
    </AuthBrandedLayout>
  );
}
