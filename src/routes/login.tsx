import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Eye, EyeOff, Info, Loader2 } from "lucide-react";
import { useState } from "react";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, loginUser, setPending2FA } from "@/fns/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; email?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser();
    if (user) {
      const to = typeof search.redirect === "string" ? search.redirect : "/dashboard";
      throw redirect({ href: to });
    }
  },
  head: () => ({
    meta: [{ title: "Connexion — InvoicePilot AI" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo, email: emailFromSearch } = Route.useSearch();
  const [email, setEmail] = useState(emailFromSearch ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginUser({ data: { email, password, rememberMe } });

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.challenge) {
        setPending2FA({
          challengeId: result.challenge.challengeId,
          email: result.challenge.email,
          name: result.challenge.name,
          redirect: redirectTo ?? "/dashboard",
          devCode: result.challenge.devCode,
          rememberMe,
        });
        await navigate({ to: "/2fa" });
        return;
      }

      await navigate({ href: redirectTo ?? "/dashboard" });
    } catch {
      setError("Impossible de se connecter. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandedLayout>
      <form onSubmit={handleSubmit} className="block w-full space-y-5">
        <div className="space-y-1 pb-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="text-sm text-muted-foreground">
            Bienvenue — connectez-vous avec vos identifiants.
          </p>
        </div>

        <Alert>
          <Info className="size-4" />
          <AlertDescription className="text-sm">
            Le PDF par e-mail ne sera plus conforme au 1<sup>er</sup> septembre 2026. Préparez votre
            conformité Factur-X et connexion PA dès maintenant.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@entreprise.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <div className="relative">
            <Input
              id="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              className="pr-10"
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

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
            />
            <label htmlFor="remember" className="cursor-pointer text-sm font-normal">
              Se souvenir de moi
            </label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-foreground hover:text-primary"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Connexion…
            </span>
          ) : (
            "Se connecter"
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link to="/signup" className="text-sm font-semibold text-foreground hover:text-primary">
            Essai gratuit 14 jours
          </Link>
        </p>
      </form>
    </AuthBrandedLayout>
  );
}
