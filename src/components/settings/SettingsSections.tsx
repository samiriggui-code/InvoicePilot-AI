import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeyListItem } from "@/fns/api-keys";
import { createCheckoutSession } from "@/fns/stripe-checkout";
import { getDocsUrl } from "@/lib/docs-url";
import { media, resolveUserAvatar } from "@/lib/media";
import { planLabel, planToId, type PlanId, type WorkspaceContext } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizeLabels: Record<string, string> = {
  MICRO: "Micro / AE",
  PME: "PME",
  ETI: "ETI",
  GE: "Grande entreprise",
};

const vatLabels: Record<string, string> = {
  STANDARD: "Assujetti (standard)",
  FRANCHISE_BASE: "Franchise en base",
  EXEMPT: "Exonéré",
};

const PLAN_PRICES: Record<PlanId, number> = {
  starter: 29,
  pro: 79,
  enterprise: 199,
};

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="min-w-0">
      <div className="mb-5 max-w-xl">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="max-w-2xl space-y-4">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[11rem_1fr] sm:items-center sm:gap-4">
      <Label className="text-muted-foreground">{label}</Label>
      <div className="min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

/** Profil utilisateur connecté */
export function ProfileSection({ workspace }: { workspace: WorkspaceContext }) {
  const initials = workspace.user.name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Section
      id="settings_profile"
      title="Profil"
      description="Identité de votre compte (login). Distinct de l’organisation facturante."
    >
      <FieldRow label="Photo">
        <Avatar className="size-12">
          <AvatarImage
            src={resolveUserAvatar({
              email: workspace.user.email,
              avatarKey: workspace.user.avatarKey,
            })}
            alt={workspace.user.name}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </FieldRow>
      <FieldRow label="Nom">{workspace.user.name}</FieldRow>
      <FieldRow label="E-mail">{workspace.user.email}</FieldRow>
      <FieldRow label="Rôle">
        <Badge variant="secondary">{workspace.organization.role}</Badge>
      </FieldRow>
      <p className="text-xs text-muted-foreground">
        Pour changer votre photo ou votre nom, ouvrez{" "}
        <a href="/profile" className="font-medium text-primary hover:underline">
          Mon profil
        </a>
        .
      </p>
    </Section>
  );
}

/** Entreprise / tenant SaaS */
export function OrganizationSection({ workspace }: { workspace: WorkspaceContext }) {
  const org = workspace.organization;
  return (
    <Section
      id="settings_organization"
      title="Organisation"
      description="Entreprise vendeur (SIREN sur vos factures). Ce n’est pas le SIREN de vos clients."
    >
      <FieldRow label="Raison sociale">{org.legalName}</FieldRow>
      {org.tradeName ? <FieldRow label="Nom commercial">{org.tradeName}</FieldRow> : null}
      <FieldRow label="SIREN">
        <span className="inline-flex items-center gap-1.5 font-mono">
          <img src={media.flag("france")} alt="" className="size-3.5 rounded-[2px]" />
          {org.siren}
        </span>
      </FieldRow>
      {org.siret ? (
        <FieldRow label="SIRET">
          <span className="font-mono">{org.siret}</span>
        </FieldRow>
      ) : null}
      <FieldRow label="Taille">{sizeLabels[org.size] ?? org.size}</FieldRow>
      <FieldRow label="Régime TVA">{vatLabels[org.vatRegime] ?? org.vatRegime}</FieldRow>
      {org.complianceScore != null ? (
        <FieldRow label="Score conformité">{org.complianceScore} %</FieldRow>
      ) : null}
    </Section>
  );
}

export function SecuritySection() {
  return (
    <Section
      id="settings_security"
      title="Sécurité"
      description="Accès au compte et authentification."
    >
      <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/20 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium">Mot de passe</p>
          <p className="mt-1 text-muted-foreground">
            Réinitialisation via « Mot de passe oublié » sur l’écran de connexion.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 px-4 py-3">
        <div>
          <p className="text-sm font-medium">Double authentification (e-mail)</p>
          <p className="text-xs text-muted-foreground">
            Temporairement désactivée en démo — réactivation prévue avant prod.
          </p>
        </div>
        <Badge variant="outline">Off (démo)</Badge>
      </div>
    </Section>
  );
}

export function BillingSection({ workspace }: { workspace: WorkspaceContext }) {
  const checkout = useServerFn(createCheckoutSession);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sub = workspace.subscription;
  const currentId = sub ? planToId(sub.plan) : null;

  async function upgrade(planId: PlanId) {
    setLoading(planId);
    setError(null);
    try {
      const result = await checkout({ data: { planId } });
      if (result.error || !result.url) {
        setError(result.error ?? "Checkout indisponible");
        setLoading(null);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Impossible de démarrer le checkout.");
      setLoading(null);
    }
  }

  return (
    <Section
      id="billing_plans"
      title="Choisir ou changer de plan"
      description="Abonnement SaaS InvoicePilot (Stripe) — indépendant de votre plateforme agréée (PA)."
    >
      {sub ? (
        <FieldRow label="Plan actuel">
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-medium">{planLabel(sub.plan)}</span>
            <Badge variant="secondary">{sub.status}</Badge>
            {workspace.trialDaysLeft != null && sub.status === "TRIALING" ? (
              <span className="text-muted-foreground">· {workspace.trialDaysLeft} j d’essai</span>
            ) : null}
          </span>
        </FieldRow>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun abonnement.</p>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {(["starter", "pro", "enterprise"] as PlanId[]).map((planId) => {
          const current = currentId === planId;
          return (
            <button
              key={planId}
              type="button"
              disabled={loading !== null}
              onClick={() => void upgrade(planId)}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors disabled:opacity-60",
                current ? "border-primary/40 bg-primary/5" : "border-border/70 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold capitalize">{planId}</p>
                {loading === planId ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <CreditCard className="size-4 text-muted-foreground" />
                )}
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight">
                {PLAN_PRICES[planId]} €
                <span className="text-sm font-normal text-muted-foreground"> /mois</span>
              </p>
              {current ? (
                <Badge variant="secondary" className="mt-3 text-[10px]">
                  Actuel
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

export function ApiKeysSection({ workspace }: { workspace: WorkspaceContext }) {
  const listFn = useServerFn(listApiKeys);
  const createFn = useServerFn(createApiKey);
  const revokeFn = useServerFn(revokeApiKey);

  const [keys, setKeys] = useState<ApiKeyListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Production");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setKeys(await listFn());
      } finally {
        setLoading(false);
      }
    })();
  }, [listFn]);

  async function onCreate() {
    setCreating(true);
    setError(null);
    setRawKey(null);
    try {
      const res = await createFn({ data: { name } });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setRawKey(res.rawKey);
      setKeys((prev) => [res.key, ...(prev ?? []).filter((k) => k.id !== res.key.id)]);
    } catch {
      setError("Création impossible.");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    await revokeFn({ data: { id } });
    setKeys((prev) =>
      (prev ?? []).map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)),
    );
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const plan = workspace.subscription?.plan ?? "STARTER";

  return (
    <Section
      id="settings_api_keys"
      title="Clés API"
      description="Pour brancher un ERP / CMS sur InvoicePilot (pont validate → remediate → render → emit)."
    >
      <p className="text-sm text-muted-foreground">
        Créez une clé live pour brancher un ERP / CMS.{" "}
        <a
          href={getDocsUrl()}
          className="font-medium text-primary hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Documentation API
        </a>
        {" · "}
        Plan {planLabel(plan)}
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rawKey ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium">Copiez la clé maintenant — elle ne sera plus affichée.</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={rawKey} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => void copy(rawKey)}>
              {copied ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <Label htmlFor="key-name">Nom</Label>
          <Input
            id="key-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ERP / éditeur…"
          />
        </div>
        <Button
          type="button"
          disabled={creating}
          onClick={() => void onCreate()}
          className="gap-1.5"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Créer une clé live
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/70">
          {(keys ?? []).length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              Aucune clé live — créez-en une ci-dessus.
            </li>
          ) : (
            (keys ?? []).map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{k.keyPrefix}…</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={k.revokedAt ? "outline" : "secondary"}>
                    {k.revokedAt ? "Révoquée" : "Active"}
                  </Badge>
                  {!k.revokedAt ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void onRevoke(k.id)}
                    >
                      Révoquer
                    </Button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </Section>
  );
}

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const options: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Clair", icon: Sun },
    { id: "dark", label: "Sombre", icon: Moon },
  ];

  return (
    <Section id="settings_appearance" title="Apparence" description="Thème de l’interface.">
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
              theme === opt.id
                ? "border-primary/40 bg-primary/5"
                : "border-border/70 hover:bg-muted/30",
            )}
          >
            <opt.icon className="size-4 text-muted-foreground" />
            {opt.label}
          </button>
        ))}
      </div>
    </Section>
  );
}

export function NotificationsSection({ workspace }: { workspace: WorkspaceContext }) {
  const channels = [
    {
      title: "E-mail",
      description: workspace.user.email,
      defaultOn: true,
    },
    {
      title: "Factures bloquées",
      description: "Quand un contrôle mentions 2026 bloque une émission",
      defaultOn: true,
    },
    {
      title: "Abonnement",
      description: "Fin d’essai, paiement échoué, renouvellement",
      defaultOn: true,
    },
    {
      title: "Réception PA",
      description: "Nouvelle facture fournisseur dans l’inbox",
      defaultOn: true,
    },
  ];

  return (
    <Section
      id="settings_notifications"
      title="Notifications"
      description="Ce que InvoicePilot peut vous envoyer (préférences locales pour l’instant)."
    >
      <ul className="divide-y divide-border/60 rounded-lg border border-border/70">
        {channels.map((ch) => (
          <li key={ch.title} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{ch.title}</p>
              <p className="text-xs text-muted-foreground">{ch.description}</p>
            </div>
            <Switch defaultChecked={ch.defaultOn} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
