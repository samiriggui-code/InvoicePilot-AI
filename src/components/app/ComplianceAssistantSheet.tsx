import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, Scale, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { askComplianceAgent } from "@/fns/ai-agent";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const TOPICS = [
  {
    label: "1er septembre 2026",
    prompt:
      "Que dois-je faire avant le 1er septembre 2026 pour la facturation électronique, et où dans InvoicePilot ?",
  },
  {
    label: "Calendrier 2026 / 2027",
    prompt: "Quelles sont mes échéances de facturation électronique selon la taille d'entreprise ?",
  },
  {
    label: "Mentions 2026",
    prompt: "Quelles sont les 4 nouvelles mentions obligatoires en 2026 ?",
  },
  {
    label: "Plateforme agréée",
    prompt: "Qu'est-ce qu'une plateforme agréée (PA) et pourquoi InvoicePilot n'en est pas une ?",
  },
  { label: "Factur-X / UBL", prompt: "Quelle différence entre Factur-X, UBL et CII ?" },
  {
    label: "E-reporting",
    prompt: "Quand dois-je faire du e-reporting de transaction ou de paiement ?",
  },
  {
    label: "Parcours dans l'app",
    prompt:
      "Quel parcours suivi dans InvoicePilot pour préparer mes factures (Sources, Analyse, Émission, Réception) ?",
  },
] as const;

type AssistantSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ComplianceAssistantSheet({ open, onOpenChange }: AssistantSheetProps) {
  const askAgent = useServerFn(askComplianceAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Assistant réglementaire InvoicePilot — **base de connaissances** e-facture (1er septembre 2026/2027) + parcours app.\n\nJe réponds même si l’IA locale est indisponible. Je m’appuie sur le calendrier légal, les mentions 2026, les formats EN 16931 et le rôle des PA. Je vous oriente vers Conformité, Sources, Analyse, Émission ou Réception — **je n’exécute aucune action**.\n\n**Ceci n’est pas un conseil fiscal.** En cas de doute : expert-comptable ou **0 806 807 807**.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [open, messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const result = await askAgent({ data: { messages: updated } });
      setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
      setSource(result.source);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Impossible de répondre pour le moment. Réessayez, ou contactez votre expert-comptable / **0 806 807 807**.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        style={{ top: "1.25rem", right: "1.25rem", bottom: "1.25rem", left: "auto" }}
        className="flex h-auto w-full flex-col gap-0 overflow-hidden rounded-xl border-0 p-0 shadow-2xl sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b border-border/60 bg-muted/25 px-5 py-4 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <Scale className="size-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base">Assistant réglementaire</SheetTitle>
              <SheetDescription className="text-xs">
                Législation e-facture · PA · e-reporting
                {source === "ollama"
                  ? " · Ollama"
                  : source === "openai"
                    ? " · OpenAI"
                    : source === "knowledge-base"
                      ? " · base locale"
                      : ""}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <ScrollArea className="flex-1 px-5 py-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/70 bg-muted/40 text-foreground",
                    )}
                  >
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Consultation de la base réglementaire…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {messages.length <= 1 && (
            <div className="space-y-2 border-t border-border/50 px-5 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <BookOpen className="size-3" />
                Sujets fréquents
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => void sendMessage(t.prompt)}
                    className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className="border-t border-border/60 bg-background p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex. Suis-je concerné par le e-reporting B2C ?"
                className="min-h-[44px] flex-1 resize-none text-sm"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(input);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="shrink-0 self-end"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
              Sources : réforme LF 2024 art. 91 · CGI · impots.gouv.fr. Ne remplace pas un conseil
              professionnel.
            </p>
          </form>
        </div>
      </SheetContent>
    </Sheet>
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
            <code key={i} className="rounded bg-background/60 px-1 py-0.5 font-mono text-[11px]">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
