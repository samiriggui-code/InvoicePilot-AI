import { useServerFn } from "@tanstack/react-start";
import { Building2, Code2, Loader2, Mail, MessageSquare } from "lucide-react";
import { useState } from "react";

import {
  FeatureCards,
  MarketingPage,
  PageHero,
  Section,
  SectionHeader,
} from "@/components/marketing/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactForm } from "@/fns/contact";
import { getDocsUrl } from "@/lib/docs-url";

export function ContactPage() {
  const submit = useServerFn(submitContactForm);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submit({
        data: {
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          subject: String(fd.get("subject") ?? ""),
          message: String(fd.get("message") ?? ""),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(true);
    } catch {
      setError("Envoi impossible. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketingPage>
      <PageHero
        eyebrow="Entreprise"
        title="Contact"
        description="API, cabinets, partenariats PA — une seule porte d’entrée. Pas de conseil fiscal personnalisé : pour le réglementaire hors produit, le 0 806 807 807 reste le numéro national."
      />

      <Section>
        <SectionHeader
          eyebrow="Sujets"
          title="Comment pouvons-nous vous aider ?"
          description="Décrivez votre contexte (SIREN, taille, PA envisagée, volume API). Réponse sous 2 jours ouvrés en phase démo."
        />
        <FeatureCards
          columns={3}
          items={[
            {
              icon: Building2,
              title: "Cabinets & PME",
              description: "Essai, onboarding multi-dossiers, choix PA.",
            },
            {
              icon: Code2,
              title: "Licences API",
              description: "Volume sandbox → production, SLA éditeur.",
            },
            {
              icon: MessageSquare,
              title: "Partenariats PA",
              description: "Credentials, mapping émission / réception.",
            },
          ]}
        />
      </Section>

      <Section muted>
        <SectionHeader
          title="Écrivez-nous"
          description="Le message est enregistré et envoyé par e-mail (Mailpit en local, SMTP en production)."
        />
        <div className="mt-16 grid gap-6 lg:grid-cols-5">
          <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 lg:col-span-3">
            {sent ? (
              <div className="py-8 text-center">
                <p className="text-lg font-semibold">Message envoyé</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Un accusé de réception vous a été adressé. Notre équipe revient sous 2 jours
                  ouvrés.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <a href="/signup">Essai gratuit</a>
                  </Button>
                  <Button variant="outline" onClick={() => setSent(false)}>
                    Nouveau message
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4 text-left" onSubmit={(e) => void onSubmit(e)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input id="name" name="name" required placeholder="Marie Dupont" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail pro</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="marie@cabinet.fr"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet</Label>
                  <Input
                    id="subject"
                    name="subject"
                    required
                    placeholder="Licence API / offre cabinet / partenariat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    minLength={10}
                    placeholder="Contexte, volume, échéance…"
                  />
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="submit" className="w-full sm:w-auto" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Envoyer
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-col justify-center gap-6 rounded-xl border border-border/80 bg-card p-6 sm:p-8 lg:col-span-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Coordonnées
              </p>
              <div className="mt-4 flex items-center gap-2 font-medium text-foreground">
                <Mail className="size-4 text-primary" />
                contact@invoicepilot.ai
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Réponse sous 2 jours ouvrés en phase démo.
              </p>
            </div>
            <div className="border-t border-border/60 pt-6 text-sm text-muted-foreground">
              Développeurs :{" "}
              <a
                href={getDocsUrl()}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary hover:underline"
              >
                documentation Mintlify
              </a>
              <br />
              Clé démo{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">ip_sandbox_demo</code>
            </div>
          </div>
        </div>
      </Section>
    </MarketingPage>
  );
}
