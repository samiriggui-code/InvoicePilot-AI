import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePasswordReset, verifyPasswordResetTokenFn } from "@/fns/password-reset";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [{ title: "Nouveau mot de passe — InvoicePilot AI" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const verifyToken = useServerFn(verifyPasswordResetTokenFn);
  const completeReset = useServerFn(completePasswordReset);

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setError("Lien de réinitialisation manquant ou invalide.");
      return;
    }

    verifyToken({ data: { token } })
      .then((result) => {
        if (result.valid) {
          setTokenValid(true);
          setEmail(result.email);
        } else {
          setError(
            "Ce lien a expiré ou n'est plus valide. Demandez une nouvelle réinitialisation.",
          );
        }
      })
      .catch(() => {
        setError("Impossible de vérifier le lien. Réessayez plus tard.");
      })
      .finally(() => setVerifying(false));
  }, [token, verifyToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const result = await completeReset({ data: { token, password } });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setSuccess(result.message);
      setTimeout(() => {
        void navigate({ to: "/login" });
      }, 2500);
    } catch {
      setError("La réinitialisation a échoué. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandedLayout>
      <div className="block w-full space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
          {email && tokenValid ? (
            <p className="text-sm text-muted-foreground">
              Compte : <span className="font-medium text-foreground">{email}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choisissez un mot de passe sécurisé pour votre compte.
            </p>
          )}
        </div>

        {verifying && (
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !verifying && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {tokenValid && !success && !verifying && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Réinitialiser le mot de passe
            </Button>
          </form>
        )}

        {!verifying && (
          <div className="flex flex-col gap-2">
            {error && (
              <Button variant="outline" className="w-full" asChild>
                <Link to="/forgot-password">Demander un nouveau lien</Link>
              </Button>
            )}
            <Button variant="ghost" className="w-full" asChild>
              <Link to="/login">Retour à la connexion</Link>
            </Button>
          </div>
        )}
      </div>
    </AuthBrandedLayout>
  );
}
