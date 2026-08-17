import { createServerFn } from "@tanstack/react-start";
import { COMPLIANCE_KNOWLEDGE, getKnowledgeBasedAnswer } from "@/lib/compliance-knowledge";
import type { ChatMessage } from "@/lib/types";

/**
 * Chat réglementaire = base locale (instantané, pas d’hallucination).
 * Ollama optionnel : OLLAMA_CHAT_ENABLED=true (souvent trop lent via tunnel SSH).
 * L’extract facture reste sur OLLAMA + LLM_EXTRACT_ENABLED.
 */
const SYSTEM_PROMPT = `Tu es l'assistant réglementaire d'InvoicePilot AI (solution compatible, PAS une PA).
Réponds en français, court, markdown. Guide vers les écrans app. N'exécute aucune action.
N'invente pas. Pas un conseil fiscal — 0 806 807 807.

${COMPLIANCE_KNOWLEDGE.slice(0, 2200)}`;

function chatLlmEnabled(): boolean {
  return process.env.OLLAMA_CHAT_ENABLED === "true" || process.env.OLLAMA_CHAT_ENABLED === "1";
}

async function callOllama(messages: ChatMessage[]): Promise<string | null> {
  const base = process.env.OLLAMA_BASE_URL;
  if (!base || !chatLlmEnabled()) return null;
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
  const timeoutMs = Number(process.env.OLLAMA_CHAT_TIMEOUT_MS ?? 8000);

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        stream: false,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        options: { temperature: 0.2, num_predict: 400 },
      }),
    });

    if (!response.ok) {
      console.error("Ollama chat HTTP", response.status);
      return null;
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() || null;
  } catch (err) {
    console.error("Ollama chat failed/timeout:", err instanceof Error ? err.message : err);
    return null;
  }
}

export const askComplianceAgent = createServerFn({ method: "POST" })
  .validator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data }) => {
    const { messages } = data;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUserMessage) {
      return {
        content:
          "Posez-moi une question sur la conformité facture ou le parcours dans InvoicePilot.",
        source: "fallback" as const,
      };
    }

    const kb = getKnowledgeBasedAnswer(lastUserMessage.content);

    // Défaut : base locale (rapide). Ollama seulement si OLLAMA_CHAT_ENABLED=true.
    if (!chatLlmEnabled()) {
      return { content: kb, source: "knowledge-base" as const };
    }

    const recent = messages.filter((m) => m.role !== "system").slice(-6);
    const ollamaResponse = await callOllama(recent);
    if (ollamaResponse) {
      return { content: ollamaResponse, source: "ollama" as const };
    }

    return { content: kb, source: "knowledge-base" as const };
  });
