import { createServerFn } from "@tanstack/react-start";

export type AiRuntimeStatus = {
  enabled: boolean;
  online: boolean;
  model: string | null;
  baseUrlHost: string | null;
  latencyMs: number | null;
  checkedAt: string;
  error: string | null;
};

function hostFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] ?? null;
  }
}

/** Ping Ollama (LLM d'extraction) pour le badge page Analyse IA. */
export const getAiRuntimeStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiRuntimeStatus> => {
    const enabled =
      process.env.LLM_EXTRACT_ENABLED === "true" || process.env.LLM_EXTRACT_ENABLED === "1";
    const baseUrl = process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ?? null;
    const model = process.env.OLLAMA_MODEL ?? null;
    const checkedAt = new Date().toISOString();

    if (!enabled) {
      return {
        enabled: false,
        online: false,
        model,
        baseUrlHost: hostFromUrl(baseUrl ?? undefined),
        latencyMs: null,
        checkedAt,
        error: "LLM_EXTRACT_ENABLED désactivé",
      };
    }

    if (!baseUrl) {
      return {
        enabled: true,
        online: false,
        model,
        baseUrlHost: null,
        latencyMs: null,
        checkedAt,
        error: "OLLAMA_BASE_URL manquant",
      };
    }

    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - started;

      if (!res.ok) {
        return {
          enabled: true,
          online: false,
          model,
          baseUrlHost: hostFromUrl(baseUrl),
          latencyMs,
          checkedAt,
          error: `HTTP ${res.status}`,
        };
      }

      const data = (await res.json()) as {
        models?: { name?: string }[];
      };
      const names = (data.models ?? []).map((m) => m.name).filter(Boolean) as string[];
      const modelReady = model
        ? names.some(
            (n) => n === model || n.startsWith(`${model}:`) || n.startsWith(model.split(":")[0]!),
          )
        : names.length > 0;

      return {
        enabled: true,
        online: modelReady || names.length > 0,
        model,
        baseUrlHost: hostFromUrl(baseUrl),
        latencyMs,
        checkedAt,
        error: modelReady || names.length > 0 ? null : "Modèle Ollama introuvable",
      };
    } catch (err) {
      return {
        enabled: true,
        online: false,
        model,
        baseUrlHost: hostFromUrl(baseUrl),
        latencyMs: Date.now() - started,
        checkedAt,
        error: err instanceof Error ? err.message : "Ollama injoignable",
      };
    }
  },
);
