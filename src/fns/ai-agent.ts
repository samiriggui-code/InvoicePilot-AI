import { createServerFn } from "@tanstack/react-start";
import { COMPLIANCE_KNOWLEDGE, getKnowledgeBasedAnswer } from "@/lib/compliance-knowledge";
import type { ChatMessage } from "@/lib/types";

async function callOllama(messages: ChatMessage[]): Promise<string | null> {
  const base = process.env.OLLAMA_BASE_URL;
  if (!base) return null;
  const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";

  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: "system",
            content: `Tu es l'assistant réglementaire d'InvoicePilot AI (solution compatible de facturation électronique française).
Ton ton est professionnel, précis, juridique-accessible — jamais « robot fun » ni emoji.
Réponds en français, structuré (markdown court). Cite le cadre (calendrier, PA, mentions 2026) quand pertinent.
Rappelle que InvoicePilot n'est PAS une plateforme agréée : transmission via PA.
Disclaimer si besoin : ne constitue pas un conseil fiscal ; expert-comptable / 0 806 807 807.

Contexte réglementaire :

${COMPLIANCE_KNOWLEDGE}`,
          },
          ...messages,
        ],
        options: { temperature: 0.3, num_predict: 1000 },
      }),
    });

    if (!response.ok) {
      console.error("Ollama error:", await response.text());
      return null;
    }

    const data = (await response.json()) as {
      message?: { content?: string };
    };
    return data.message?.content ?? null;
  } catch (err) {
    console.error("Ollama unreachable:", err);
    return null;
  }
}

async function callOpenAI(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Tu es l'assistant réglementaire d'InvoicePilot AI (solution compatible de facturation électronique française).
Ton ton est professionnel, précis, juridique-accessible — jamais « robot fun » ni emoji.
Réponds en français, structuré (markdown court). Cite le cadre (calendrier, PA, mentions 2026) quand pertinent.
Rappelle que InvoicePilot n'est PAS une plateforme agréée : transmission via PA.
Disclaimer si besoin : ne constitue pas un conseil fiscal ; expert-comptable / 0 806 807 807.

Contexte réglementaire :

${COMPLIANCE_KNOWLEDGE}`,
        },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    console.error("OpenAI API error:", await response.text());
    return null;
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content ?? null;
}

export const askComplianceAgent = createServerFn({ method: "POST" })
  .validator((data: { messages: ChatMessage[] }) => data)
  .handler(async ({ data }) => {
    const { messages } = data;
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

    if (!lastUserMessage) {
      return {
        content: "Posez-moi une question sur la conformité facture.",
        source: "fallback" as const,
      };
    }

    // VPS self-host d'abord, puis OpenAI si clé présente
    const ollamaResponse = await callOllama(messages);
    if (ollamaResponse) {
      return { content: ollamaResponse, source: "ollama" as const };
    }

    const aiResponse = await callOpenAI(messages);
    if (aiResponse) {
      return { content: aiResponse, source: "openai" as const };
    }

    return {
      content: getKnowledgeBasedAnswer(lastUserMessage.content),
      source: "knowledge-base" as const,
    };
  });
