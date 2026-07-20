import { Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, MoveLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  clearPending2FA,
  getPending2FA,
  maskEmail,
  resend2FA,
  setPending2FA,
  verify2FA,
} from "@/fns/auth";
import { media, toAbsoluteUrl } from "@/lib/media";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 37;

export function TwoFactorForm() {
  const navigate = useNavigate();
  const [pending, setPendingState] = useState(getPending2FA());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [demoCode, setDemoCode] = useState<string | null>(pending?.devCode ?? null);

  useEffect(() => {
    const current = getPending2FA();
    if (!current) {
      void navigate({ to: "/login" });
      return;
    }
    setPendingState(current);
    setDemoCode(current.devCode ?? null);
  }, [navigate]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const handleResend = useCallback(async () => {
    if (resendIn > 0 || isResending || !pending) return;
    setIsResending(true);
    setError(null);

    try {
      const result = await resend2FA({ data: { challengeId: pending.challengeId } });
      if (!result.success || !result.challengeId) {
        setError("Impossible de renvoyer le code. Reconnectez-vous.");
        setIsResending(false);
        return;
      }

      const nextPending = {
        ...pending,
        challengeId: result.challengeId,
        devCode: result.devCode,
      };
      setPending2FA(nextPending);
      setPendingState(nextPending);
      if (result.devCode) setDemoCode(result.devCode);
      setResendIn(RESEND_SECONDS);
      setCode("");
    } catch {
      setError("Impossible de renvoyer le code.");
    } finally {
      setIsResending(false);
    }
  }, [isResending, pending, resendIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;

    if (code.length !== OTP_LENGTH) {
      setError("Saisissez les 6 chiffres du code.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verify2FA({
        data: {
          challengeId: pending.challengeId,
          code,
          rememberMe: pending.rememberMe,
        },
      });

      if ("error" in result) {
        setError(result.error);
        setIsVerifying(false);
        return;
      }

      clearPending2FA();
      await navigate({ href: pending.redirect ?? "/dashboard" });
    } catch {
      setError("Vérification impossible. Réessayez.");
    } finally {
      setIsVerifying(false);
    }
  }

  if (!pending) return null;

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      <img src={toAbsoluteUrl(media.illustration(34))} className="mb-2 h-20 dark:hidden" alt="" />
      <img
        src={toAbsoluteUrl(media.illustration(34, true))}
        className="mb-2 hidden h-20 dark:block"
        alt=""
      />

      <div className="mb-2 text-center">
        <h1 className="mb-5 text-lg font-medium text-foreground">Vérification en deux étapes</h1>
        <div className="flex flex-col">
          <span className="mb-1.5 text-sm text-secondary-foreground">
            Saisissez le code à 6 chiffres envoyé à
          </span>
          <span className="text-sm font-medium text-foreground">{maskEmail(pending.email)}</span>
        </div>
      </div>

      {demoCode && (
        <Alert>
          <AlertDescription className="text-sm">
            Code de vérification (e-mail non configuré) :{" "}
            <span className="font-mono font-semibold tracking-widest">{demoCode}</span>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <InputOTP
          maxLength={OTP_LENGTH}
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          containerClassName="gap-1.5"
        >
          <InputOTPGroup className="gap-1.5">
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="size-10 shrink-0 rounded-md border border-input px-0 text-center text-base shadow-sm"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      <div className="mb-2 flex items-center justify-center gap-1.5 text-sm text-secondary-foreground">
        {resendIn > 0 ? (
          <span>Code non reçu ? ({resendIn}s)</span>
        ) : (
          <>
            <span>Code non reçu ?</span>
            <button
              type="button"
              className="font-semibold text-foreground hover:text-primary disabled:opacity-50"
              disabled={isResending}
              onClick={() => void handleResend()}
            >
              {isResending ? "Envoi…" : "Renvoyer"}
            </button>
          </>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isVerifying || code.length !== OTP_LENGTH}>
        {isVerifying ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Vérification…
          </span>
        ) : (
          "Continuer"
        )}
      </Button>

      <Link
        to="/login"
        className="flex items-center justify-center gap-2.5 text-sm font-semibold text-foreground hover:text-primary"
      >
        <MoveLeft className="size-3.5 opacity-70" />
        Retour à la connexion
      </Link>
    </form>
  );
}
