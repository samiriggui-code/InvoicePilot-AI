import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { IllustratedDialog } from "@/components/metronic/illustrated-dialog";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/fns/auth";
import { createCheckoutSession } from "@/fns/stripe-checkout";
import { planToId, type WorkspaceContext } from "@/lib/types";

/** Rappels essai + suspension (Metronic welcome / account-deactivated). */
export function TrialLifecycleDialogs({ workspace }: { workspace: WorkspaceContext }) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [suspendedOpen, setSuspendedOpen] = useState(false);

  const userId = workspace.user.id;
  const orgId = workspace.organization.id;
  const isDemo = workspace.organization.isDemo;
  const status = workspace.subscription?.status;
  const daysLeft = workspace.trialDaysLeft;

  useEffect(() => {
    if (isDemo) return;

    const expired =
      status === "UNPAID" || status === "PAST_DUE" || (status === "TRIALING" && daysLeft === 0);

    if (expired) {
      setSuspendedOpen(true);
      return;
    }

    if (status !== "TRIALING" || daysLeft == null || daysLeft <= 0) return;

    try {
      const key = `invoicepilot.trial-reminder.${userId}.${orgId}`;
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }

    setReminderOpen(true);
    toast.message(
      `Essai — ${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`,
      {
        description: "Activez votre abonnement avant la fin pour éviter la suspension.",
        action: {
          label: "Abonnement",
          onClick: () => {
            window.location.href = "/billing";
          },
        },
        duration: 8000,
      },
    );
  }, [isDemo, userId, orgId, status, daysLeft]);

  return (
    <>
      <TrialReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        days={daysLeft ?? 0}
      />
      <AccountSuspendedDialog
        open={suspendedOpen}
        workspace={workspace}
        onDismissLogout={() => setSuspendedOpen(false)}
      />
    </>
  );
}

function TrialReminderDialog({
  open,
  onOpenChange,
  days,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  days: number;
}) {
  return (
    <IllustratedDialog
      open={open}
      onOpenChange={onOpenChange}
      illustration={21}
      title={`Essai — ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`}
      description="Votre essai InvoicePilot se termine bientôt. Activez un plan pour conserver l’accès après J+14."
    >
      <Button asChild className="mb-2 min-w-[12rem]">
        <Link to="/billing/plans" onClick={() => onOpenChange(false)}>
          Voir les plans
        </Link>
      </Button>
      <button
        type="button"
        className="py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        onClick={() => onOpenChange(false)}
      >
        Continuer l’essai
      </button>
    </IllustratedDialog>
  );
}

function AccountSuspendedDialog({
  open,
  workspace,
  onDismissLogout,
}: {
  open: boolean;
  workspace: WorkspaceContext;
  onDismissLogout: () => void;
}) {
  const checkout = useServerFn(createCheckoutSession);
  const doLogout = useServerFn(logoutUser);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const planId = workspace.subscription ? planToId(workspace.subscription.plan) : "pro";

  async function activate() {
    setLoading(true);
    setError(null);
    try {
      const result = await checkout({ data: { planId } });
      if (result.error || !result.url) {
        setError(result.error ?? "Checkout indisponible");
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Impossible de démarrer le paiement.");
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoggingOut(true);
    try {
      await doLogout();
      onDismissLogout();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  }

  return (
    <IllustratedDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void disconnect();
      }}
      illustration={23}
      title="Compte suspendu"
      description="Votre essai de 14 jours est terminé. Sans paiement, l’accès est suspendu. Activez un abonnement pour reconnecter votre espace, sinon vous serez déconnecté."
      hideCloseButton
      onPointerDownOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={(e) => e.preventDefault()}
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <Button
        className="mb-2 min-w-[14rem]"
        disabled={loading || loggingOut}
        onClick={() => void activate()}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Payer et réactiver
      </Button>
      <Button
        variant="ghost"
        className="min-w-[14rem] text-muted-foreground"
        disabled={loading || loggingOut}
        asChild
      >
        <Link to="/billing/plans">Voir les plans</Link>
      </Button>
      <button
        type="button"
        className="mt-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        disabled={loading || loggingOut}
        onClick={() => void disconnect()}
      >
        {loggingOut ? "Déconnexion…" : "Se déconnecter"}
      </button>
    </IllustratedDialog>
  );
}
