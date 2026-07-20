import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { useMemo, useState } from "react";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPending2FA, signupUser } from "@/fns/auth";
import { SOURCE_OPTIONS, suggestPlatforms } from "@/lib/pa-guidance";
import {
  computeReformDeadlines,
  formatDeadlineFr,
  sirenLooksValid,
  SIZE_LABELS,
  VAT_LABELS,
  type CompanySize,
  type VatRegime,
} from "@/lib/reform-2026";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): { invite?: string; email?: string } => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  beforeLoad: ({ search }) => {
    // Les invitations ont un parcours dédié (compte + rejoindre l’org, sans créer d’entreprise)
    if (search.invite) {
      throw redirect({
        to: "/invite/$token",
        params: { token: search.invite },
      });
    }
  },
  head: () => ({
    meta: [{ title: "Essai gratuit — InvoicePilot AI" }],
  }),
  component: SignupPage,
});

const STEPS = [
  { id: 1, title: "Compte", hint: "Accès" },
  { id: 2, title: "Entreprise", hint: "SIREN" },
  { id: 3, title: "Réforme", hint: "Obligations" },
  { id: 4, title: "Sources", hint: "D’où viennent les factures" },
  { id: 5, title: "PA", hint: "Plateforme agréée" },
  { id: 6, title: "Offre", hint: "Essai / plan" },
] as const;

type PaPurpose = "EMISSION" | "RECEPTION" | "BOTH";
type PlanIntent = "STARTER" | "PRO" | "ENTERPRISE";

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalName, setLegalName] = useState("");
  const [siren, setSiren] = useState("");
  const [siret, setSiret] = useState("");
  const [companySize, setCompanySize] = useState<CompanySize>("PME");
  const [vatRegime, setVatRegime] = useState<VatRegime>("STANDARD");
  const [hasB2c, setHasB2c] = useState(false);
  const [hasForeign, setHasForeign] = useState(false);
  const [hasPublic, setHasPublic] = useState(false);

  const [sources, setSources] = useState<string[]>(["MANUAL_UPLOAD"]);
  const [monthlyVolume, setMonthlyVolume] = useState("50");

  const [hasExistingPa, setHasExistingPa] = useState(false);
  const [needsPaGuidance, setNeedsPaGuidance] = useState(true);
  const [preferredPaSlug, setPreferredPaSlug] = useState("");
  const [paPurpose, setPaPurpose] = useState<PaPurpose>("BOTH");
  const [wantsFreePa, setWantsFreePa] = useState(true);
  const [alreadyBank, setAlreadyBank] = useState(false);
  const [alreadyAccounting, setAlreadyAccounting] = useState(false);

  const [intendedPlan, setIntendedPlan] = useState<PlanIntent>("PRO");
  const [wantsCheckoutNow, setWantsCheckoutNow] = useState(false);
  const [acceptCompatible, setAcceptCompatible] = useState(false);

  const deadlines = useMemo(() => computeReformDeadlines(companySize), [companySize]);
  const volumeNum = Number.parseInt(monthlyVolume, 10);
  const suggestions = useMemo(
    () =>
      suggestPlatforms({
        monthlyVolume: Number.isFinite(volumeNum) ? volumeNum : null,
        wantsFree: wantsFreePa,
        alreadyBank,
        alreadyAccounting,
        purpose: paPurpose,
      }),
    [volumeNum, wantsFreePa, alreadyBank, alreadyAccounting, paPurpose],
  );

  function toggleSource(id: string) {
    // PDF = filet de secours obligatoire
    if (id === "MANUAL_UPLOAD") return;
    setSources((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!name.trim()) return "Indiquez votre nom.";
      if (!email.trim() || !email.includes("@")) return "Email professionnel requis.";
      if (password.length < 8) return "Mot de passe : 8 caractères minimum.";
    }
    if (s === 2) {
      if (!legalName.trim()) return "Raison sociale obligatoire.";
      if (!sirenLooksValid(siren)) return "SIREN obligatoire (9 chiffres) — mention 2026.";
      if (siret && siret.replace(/\s/g, "").length !== 14) {
        return "SIRET : 14 chiffres si renseigné.";
      }
    }
    if (s === 4 && sources.length === 0) {
      return "Choisissez au moins une source de factures.";
    }
    if (s === 5) {
      if (hasExistingPa && !preferredPaSlug.trim()) {
        return "Indiquez le nom / slug de votre PA (ex. qonto, pennylane).";
      }
      if (!hasExistingPa && needsPaGuidance && !preferredPaSlug) {
        return "Sélectionnez une PA recommandée ou indiquez celle que vous préférez.";
      }
    }
    if (s === 6 && !acceptCompatible) {
      return "Vous devez confirmer que InvoicePilot est une solution compatible (pas une PA).";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step === 2 && !legalName) setLegalName(name);
    setStep((x) => Math.min(6, x + 1));
  }

  async function handleSubmit() {
    const err = validateStep(6);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signupUser({
        data: {
          name,
          email,
          password,
          legalName,
          siren,
          siret: siret || undefined,
          companySize,
          vatRegime,
          hasB2cClients: hasB2c,
          hasForeignClients: hasForeign,
          hasPublicSector: hasPublic,
          bridge: {
            hasExistingPa,
            needsPaGuidance: !hasExistingPa,
            preferredPlatformSlug: preferredPaSlug.trim().toLowerCase() || undefined,
            paPurpose,
            sourceProviders: sources.includes("MANUAL_UPLOAD")
              ? sources
              : ["MANUAL_UPLOAD", ...sources],
            monthlyInvoiceVolume: Number.isFinite(volumeNum) ? volumeNum : undefined,
            intendedPlan,
            wantsCheckoutNow,
          },
        },
      });

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.challenge) {
        setPending2FA({
          challengeId: result.challenge.challengeId,
          email: result.challenge.email,
          name: result.challenge.name,
          redirect: wantsCheckoutNow ? "/dashboard" : "/integrations",
          devCode: result.challenge.devCode,
        });
        await navigate({ to: "/2fa" });
        return;
      }

      if (wantsCheckoutNow) {
        await navigate({ to: "/dashboard" });
      } else {
        await navigate({ to: "/integrations" });
      }
    } catch {
      setError("Impossible de créer le compte. Réessayez.");
      setLoading(false);
    }
  }

  return (
    <AuthBrandedLayout>
      <div className="block w-full space-y-5">
        <div className="space-y-1 pb-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Créer mon compte</h1>
          <p className="text-sm text-muted-foreground">
            Essai Pro 14 jours — Sources → analyse → dépôt PA
          </p>
        </div>

        <ol className="grid grid-cols-6 gap-1">
          {STEPS.map((s) => (
            <li
              key={s.id}
              className={cn(
                "rounded-lg border px-0.5 py-1.5 text-center",
                step === s.id
                  ? "border-primary/40 bg-primary/5"
                  : step > s.id
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/70",
              )}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                {s.id}
              </p>
              <p className="truncate text-[10px] font-medium">{s.title}</p>
            </li>
          ))}
        </ol>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Votre nom" htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Samir Dupont"
                autoComplete="name"
              />
            </Field>
            <Field label="Email professionnel" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.fr"
                autoComplete="email"
              />
            </Field>
            <Field label="Mot de passe" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                >
                  {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Votre entreprise = vendeur sur les factures. Le SIREN de vos clients se renseigne
              facture par facture.
            </p>
            <Field label="Raison sociale" htmlFor="legalName">
              <Input
                id="legalName"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Dupont Conseil SAS"
              />
            </Field>
            <Field label="SIREN (9 chiffres) *" htmlFor="siren">
              <Input
                id="siren"
                value={siren}
                onChange={(e) => setSiren(e.target.value)}
                placeholder="123456789"
                inputMode="numeric"
                maxLength={9}
              />
            </Field>
            <Field label="SIRET (optionnel)" htmlFor="siret">
              <Input
                id="siret"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                placeholder="12345678900012"
                inputMode="numeric"
                maxLength={14}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="Taille d'entreprise" htmlFor="size">
              <select
                id="size"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value as CompanySize)}
              >
                {(Object.keys(SIZE_LABELS) as CompanySize[]).map((k) => (
                  <option key={k} value={k}>
                    {SIZE_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Régime TVA" htmlFor="vat">
              <select
                id="vat"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={vatRegime}
                onChange={(e) => setVatRegime(e.target.value as VatRegime)}
              >
                {(Object.keys(VAT_LABELS) as VatRegime[]).map((k) => (
                  <option key={k} value={k}>
                    {VAT_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="space-y-2.5 rounded-lg border border-border/70 p-3">
              <p className="text-xs font-medium text-muted-foreground">Typologie clients</p>
              <CheckRow
                id="b2c"
                checked={hasB2c}
                onChange={setHasB2c}
                label="Particuliers (B2C) — e-reporting"
              />
              <CheckRow
                id="foreign"
                checked={hasForeign}
                onChange={setHasForeign}
                label="Clients étrangers — e-reporting"
              />
              <CheckRow
                id="public"
                checked={hasPublic}
                onChange={setHasPublic}
                label="Secteur public (Chorus Pro)"
              />
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p>
                Réception : <strong>{formatDeadlineFr(deadlines.mustReceiveBy)}</strong>
              </p>
              <p className="mt-1">
                Émission : <strong>{formatDeadlineFr(deadlines.mustEmitBy)}</strong>
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Où vivent vos factures / commandes aujourd’hui ? InvoicePilot les récupère, les met
              aux normes, puis les pousse vers votre PA. <strong>Saisie / PDF</strong> reste
              toujours actif — secours si une API boutique ne se connecte pas.
            </p>
            <div className="grid gap-2">
              {SOURCE_OPTIONS.map((opt) => {
                const locked = opt.id === "MANUAL_UPLOAD";
                const checked = locked || sources.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
                      locked ? "cursor-default" : "cursor-pointer",
                      checked ? "border-primary/40 bg-primary/5" : "border-border/70",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={locked}
                      onCheckedChange={() => toggleSource(opt.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">
                        {opt.label}
                        {locked ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Secours
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {locked
                          ? "Toujours activé — dépôt PDF si Shopify / Woo / site indisponible"
                          : opt.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Field label="Volume mensuel estimé (factures)" htmlFor="volume">
              <Input
                id="volume"
                type="number"
                min={1}
                value={monthlyVolume}
                onChange={(e) => setMonthlyVolume(e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Une PA immatriculée DGFiP est obligatoire pour émettre et recevoir. InvoicePilot n’est
              pas une PA — on se branche sur celle que vous choisissez.
            </p>
            <Field label="Besoin" htmlFor="purpose">
              <select
                id="purpose"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={paPurpose}
                onChange={(e) => setPaPurpose(e.target.value as PaPurpose)}
              >
                <option value="BOTH">Émission et réception</option>
                <option value="EMISSION">Émission seulement</option>
                <option value="RECEPTION">Réception seulement</option>
              </select>
            </Field>
            <CheckRow
              id="hasPa"
              checked={hasExistingPa}
              onChange={(v) => {
                setHasExistingPa(v);
                setNeedsPaGuidance(!v);
              }}
              label="J’ai déjà choisi / souscrit une PA"
            />
            {hasExistingPa ? (
              <Field label="Nom ou slug de votre PA" htmlFor="paSlug">
                <Input
                  id="paSlug"
                  value={preferredPaSlug}
                  onChange={(e) => setPreferredPaSlug(e.target.value)}
                  placeholder="ex. qonto, pennylane, indy"
                />
              </Field>
            ) : (
              <div className="space-y-3">
                <CheckRow
                  id="freePa"
                  checked={wantsFreePa}
                  onChange={setWantsFreePa}
                  label="Je préfère une offre gratuite / TPE"
                />
                <CheckRow
                  id="bank"
                  checked={alreadyBank}
                  onChange={setAlreadyBank}
                  label="J’ai déjà un compte banque pro (Qonto, Shine…)"
                />
                <CheckRow
                  id="acc"
                  checked={alreadyAccounting}
                  onChange={setAlreadyAccounting}
                  label="Je suis déjà sur un outil compta (Pennylane, Indy…)"
                />
                <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
                <div className="grid gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setPreferredPaSlug(s.slug)}
                      className={cn(
                        "rounded-lg border p-3 text-left text-sm transition-colors",
                        preferredPaSlug === s.slug
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/70 hover:bg-muted/40",
                      )}
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{s.reason}</span>
                    </button>
                  ))}
                </div>
                <Field label="Ou saisie libre (slug)" htmlFor="paFree">
                  <Input
                    id="paFree"
                    value={preferredPaSlug}
                    onChange={(e) => setPreferredPaSlug(e.target.value)}
                    placeholder="slug PA"
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-1.5">
              <p>
                <span className="text-muted-foreground">Compte : </span>
                {name} · {email}
              </p>
              <p>
                <span className="text-muted-foreground">Entreprise : </span>
                {legalName} · SIREN {siren}
              </p>
              <p>
                <span className="text-muted-foreground">Sources : </span>
                {sources
                  .map((id) => SOURCE_OPTIONS.find((o) => o.id === id)?.label ?? id)
                  .join(", ")}{" "}
                · ~{monthlyVolume}/mois
              </p>
              <p>
                <span className="text-muted-foreground">PA : </span>
                {preferredPaSlug
                  ? preferredPaSlug.charAt(0).toUpperCase() + preferredPaSlug.slice(1)
                  : "à connecter"}{" "}
                ·{" "}
                {paPurpose === "BOTH"
                  ? "Émission & réception"
                  : paPurpose === "EMISSION"
                    ? "Émission"
                    : "Réception"}
              </p>
            </div>

            <Field label="Plan cible" htmlFor="plan">
              <select
                id="plan"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={intendedPlan}
                onChange={(e) => setIntendedPlan(e.target.value as PlanIntent)}
              >
                <option value="STARTER">Starter — 29 €/mois</option>
                <option value="PRO">Pro — 79 €/mois (essai 14 j)</option>
                <option value="ENTERPRISE">Enterprise — 199 €/mois</option>
              </select>
            </Field>
            <CheckRow
              id="payNow"
              checked={wantsCheckoutNow}
              onChange={setWantsCheckoutNow}
              label="Je veux payer maintenant (Stripe) après l’inscription"
            />

            <Alert>
              <Shield className="size-4" />
              <AlertDescription className="text-xs leading-relaxed">
                InvoicePilot est une <strong>solution compatible</strong> : analyse, correction,
                stockage et pont vers votre PA. Pas une plateforme agréée.
              </AlertDescription>
            </Alert>
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={acceptCompatible}
                onCheckedChange={(v) => setAcceptCompatible(v === true)}
                className="mt-0.5"
              />
              <span>
                Je comprends le rôle de solution compatible et j&apos;accepte les{" "}
                <a href="/cgu" className="text-primary hover:underline">
                  CGU
                </a>
                .
              </span>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" />
              Retour
            </Button>
          )}
          {step < 6 ? (
            <Button type="button" className="flex-1" onClick={next}>
              Continuer
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1"
              disabled={loading}
              onClick={() => void handleSubmit()}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {wantsCheckoutNow ? "Créer mon compte" : "Démarrer l’essai · brancher mes sources"}
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-sm font-semibold text-foreground hover:text-primary">
            Se connecter
          </Link>
        </p>
      </div>
    </AuthBrandedLayout>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <span>{label}</span>
    </label>
  );
}
