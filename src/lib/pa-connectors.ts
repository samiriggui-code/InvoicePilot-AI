import { sandboxPaConnector } from "@/api/connectors/pa/sandbox";
import type { PaConnector } from "@/api/connectors/pa/types";
import { parseCredentialsMode } from "@/lib/pa-partners";

const REGISTRY: Record<string, PaConnector> = {
  sandbox: sandboxPaConnector,
};

/** Résout le connecteur PA selon credentialsRef org (sandbox d’abord). */
export function resolvePaConnector(credentialsRef: string | null | undefined): PaConnector {
  const mode = parseCredentialsMode(credentialsRef);
  if (mode === "sandbox" || mode === "apikey") {
    return REGISTRY.sandbox;
  }
  return REGISTRY.sandbox;
}
