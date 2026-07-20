import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/types";
import { askComplianceAgent } from "@/fns/ai-agent";

const SUGGESTIONS = [
  "Quand dois-je émettre des factures électroniques ?",
  "Quelles sont les mentions obligatoires ?",
  "Qu'est-ce que le format Factur-X ?",
  "Comment fonctionnent les PDP agréées ?",
];

export function ChatInterface() {
  const askAgent = useServerFn(askComplianceAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis l'agent IA réglementaire d'InvoicePilot AI. Posez-moi vos questions sur la facturation électronique, la conformité fiscale ou l'intégration API.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const result = await askAgent({ data: { messages: updatedMessages } });
      setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
      setSource(result.source);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, une erreur est survenue. Veuillez réessayer.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    }
  }

  return (
    <Card className="flex h-[calc(100vh-12rem)] flex-col">
      <CardHeader className="shrink-0 border-b">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>Agent IA réglementaire</CardTitle>
            <CardDescription>
              Expert en facturation électronique française
              {source && (
                <span className="ml-2 text-xs">
                  · {source === "openai" ? "GPT-4o" : "Base de connaissances"}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "user" ? "bg-muted" : "bg-primary/10"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="size-4" />
                ) : (
                  <Bot className="size-4 text-primary" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="size-4 animate-spin text-primary" />
              </div>
              <div className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                Analyse en cours…
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 border-t px-6 py-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendMessage(s)}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question réglementaire…"
            className="min-h-[44px] resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-background/50 px-1 py-0.5 font-mono text-xs">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
