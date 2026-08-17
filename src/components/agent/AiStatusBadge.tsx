import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/reui/badge";
import { getAiRuntimeStatus, type AiRuntimeStatus } from "@/fns/ai-status";
import { cn } from "@/lib/utils";

type Props = {
  /** True pendant une analyse facture en cours. */
  analyzing?: boolean;
  className?: string;
  pollMs?: number;
};

/**
 * Badge état IA (Ollama) : Up / Down / En analyse.
 * Affiché sur la page Mon analyse IA.
 */
export function AiStatusBadge({ analyzing = false, className, pollMs = 15000 }: Props) {
  const statusFn = useServerFn(getAiRuntimeStatus);
  const [status, setStatus] = useState<AiRuntimeStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    let failStreak = 0;

    async function refresh() {
      try {
        const next = await statusFn();
        if (cancelled) return;
        failStreak = 0;
        setStatus(next);
      } catch {
        if (cancelled) return;
        failStreak += 1;
        setStatus({
          enabled: true,
          online: false,
          model: null,
          baseUrlHost: null,
          latencyMs: null,
          checkedAt: new Date().toISOString(),
          error:
            failStreak >= 2
              ? "Session Vite obsolète — rechargez la page (Ctrl+Shift+R)"
              : "Statut IA indisponible",
        });
        // Après restart HMR : IDs server-fn invalides → arrêter le poll pour éviter le spam logs
        if (failStreak >= 2) {
          window.clearInterval(id);
        }
      }
    }

    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [statusFn, pollMs]);

  const loading = status == null;
  const online = Boolean(status?.online);
  const model = status?.model ?? "LLM";

  let label = "IA · …";
  let variant:
    "secondary" | "success-light" | "destructive-light" | "warning-light" | "info-light" =
    "secondary";
  let pulse = false;

  if (analyzing) {
    label = "IA · En analyse";
    variant = "info-light";
    pulse = true;
  } else if (loading) {
    label = "IA · Vérif…";
    variant = "secondary";
  } else if (!status?.enabled) {
    label = "IA · Off";
    variant = "secondary";
  } else if (online) {
    label = `IA · Up`;
    variant = "success-light";
  } else {
    label = "IA · Down";
    variant = "destructive-light";
  }

  const titleParts = [
    status?.enabled === false ? "Extraction LLM désactivée" : null,
    status?.model ? `Modèle ${status.model}` : null,
    status?.baseUrlHost ? `Hôte ${status.baseUrlHost}` : null,
    status?.latencyMs != null ? `${status.latencyMs} ms` : null,
    status?.error ? status.error : null,
    analyzing ? "Analyse facture en cours" : null,
  ].filter(Boolean);

  return (
    <Badge
      variant={variant}
      size="sm"
      radius="full"
      className={cn("gap-1.5 font-semibold tracking-wide", className)}
      title={titleParts.join(" · ") || model}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          analyzing
            ? "bg-sky-500 animate-pulse"
            : online && !loading
              ? "bg-emerald-500"
              : loading
                ? "bg-muted-foreground/50"
                : "bg-red-500",
          pulse && "animate-pulse",
        )}
        aria-hidden
      />
      {analyzing || loading ? <Loader2 className="size-3 animate-spin" /> : null}
      {label}
    </Badge>
  );
}
