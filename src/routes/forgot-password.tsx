import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/fns/password-reset";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Mot de passe oublié — InvoicePilot AI" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const requestReset = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDevResetUrl(null);
    setLoading(true);

    try {
      const result = await requestReset({ data: { email } });
      setSuccess(result.message);
      if (result.devResetUrl) setDevResetUrl(result.devResetUrl);
    } catch {
      setError("Impossible d'envoyer la demande. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandedLayout>
      <form onSubmit={handleSubmit} className="block w-full space-y-5">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            Saisissez votre e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>

        {error && (
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

        {devResetUrl && (
          <Alert>
            <AlertDescription className="space-y-2 text-sm">
              <p className="font-medium">Mode développement — lien de réinitialisation :</p>
              <a
                href={devResetUrl}
                className="break-all font-mono text-xs text-primary hover:underline"
              >
                Ouvrir la page de nouveau mot de passe
              </a>
            </AlertDescription>
          </Alert>
        )}

        {!success && (
          <>
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Envoyer le lien de réinitialisation
            </Button>
          </>
        )}

        <Link
          to="/login"
          className="flex items-center justify-center gap-2.5 text-sm font-semibold text-foreground hover:text-primary"
        >
          <ArrowLeft className="size-3.5 opacity-70" />
          Retour à la connexion
        </Link>
      </form>
    </AuthBrandedLayout>
  );
}
