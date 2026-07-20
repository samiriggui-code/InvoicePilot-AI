import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClient } from "@/fns/clients";
import { searchCompanies, type CompanyLookupHit } from "@/fns/company-lookup";

export const Route = createFileRoute("/_app/clients/new")({
  head: () => ({ meta: [{ title: "Nouveau client — InvoicePilot AI" }] }),
  component: NewClientPage,
});

function NewClientPage() {
  const navigate = useNavigate();
  const searchFn = useServerFn(searchCompanies);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<CompanyLookupHit[]>([]);
  const [form, setForm] = useState({
    clientKind: "B2B" as "B2B" | "B2C" | "EXPORT" | "INTRA_EU",
    legalName: "",
    siren: "",
    siret: "",
    vatNumber: "",
    email: "",
    phone: "",
    billingLine1: "",
    billingPostal: "",
    billingCity: "",
    billingCountry: "FR",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function applyHit(hit: CompanyLookupHit) {
    if (!hit.active) {
      setError("Entreprise inactive — choisissez une fiche active.");
      return;
    }
    setForm((f) => ({
      ...f,
      legalName: hit.legalName,
      siren: hit.siren,
      siret: hit.siret ?? "",
      vatNumber: hit.vatNumber ?? "",
      billingLine1: hit.billingLine1 ?? f.billingLine1,
      billingPostal: hit.billingPostal ?? f.billingPostal,
      billingCity: hit.billingCity ?? f.billingCity,
    }));
    setHits([]);
    setError(null);
  }

  async function handleSearch() {
    setSearching(true);
    setError(null);
    try {
      const res = await searchFn({
        data: { query: form.legalName || form.siren },
      });
      if (res.error) setError(res.error);
      setHits(res.hits);
      if (!res.error && res.hits.length === 0) {
        setError("Aucune entreprise trouvée.");
      }
    } catch {
      setError("Recherche impossible.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createClient({ data: form });
      if (!result.success) {
        setError(result.error ?? "Erreur");
        setLoading(false);
        return;
      }
      await navigate({ to: "/clients" });
    } catch {
      setError("Impossible de créer le client.");
      setLoading(false);
    }
  }

  return (
    <AppPageShell className="max-w-2xl">
      <AppPageHero
        eyebrow="Pilotage · Clients"
        title="Nouveau client"
        description="Fiche acheteur (SIREN) pour l’émission — retour à l’annuaire ensuite."
        actions={[{ label: "← Clients", to: "/clients", variant: "outline" }]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>
            B2B (SIREN) pour e-invoicing · B2C / export pour e-reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label>Type de client *</Label>
              <RadioGroup
                value={form.clientKind}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    clientKind: v as typeof f.clientKind,
                    billingCountry: v === "EXPORT" ? "US" : v === "INTRA_EU" ? "DE" : "FR",
                  }))
                }
                className="grid gap-2 sm:grid-cols-2"
              >
                {[
                  ["B2B", "Entreprise B2B (SIREN)"],
                  ["B2C", "Particulier B2C"],
                  ["EXPORT", "Export hors UE"],
                  ["INTRA_EU", "Client UE"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 p-3 has-[:checked]:border-primary"
                  >
                    <RadioGroupItem value={value} />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Raison sociale *</Label>
              <div className="flex gap-2">
                <Input
                  id="legalName"
                  value={form.legalName}
                  onChange={(e) => set("legalName", e.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 gap-1.5"
                  disabled={searching}
                  onClick={() => void handleSearch()}
                >
                  {searching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Chercher
                </Button>
              </div>
            </div>

            {hits.length > 0 ? (
              <ul className="space-y-2 rounded-lg border border-border/70 p-2">
                {hits.map((hit) => (
                  <li
                    key={hit.siren}
                    className="flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium">{hit.legalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {hit.siren} · {hit.statusLabel}
                        {hit.billingCity ? ` · ${hit.billingCity}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!hit.active}
                      onClick={() => applyHit(hit)}
                    >
                      Appliquer
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siren">
                  SIREN {form.clientKind === "B2B" ? "*" : "(optionnel)"}
                </Label>
                <Input
                  id="siren"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="123456789"
                  required={form.clientKind === "B2B"}
                  value={form.siren}
                  onChange={(e) => set("siren", e.target.value.replace(/\D/g, "").slice(0, 9))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  inputMode="numeric"
                  maxLength={14}
                  value={form.siret}
                  onChange={(e) => set("siret", e.target.value.replace(/\D/g, "").slice(0, 14))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
                <Input
                  id="vatNumber"
                  value={form.vatNumber}
                  onChange={(e) => set("vatNumber", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingLine1">Adresse de facturation</Label>
              <Input
                id="billingLine1"
                value={form.billingLine1}
                onChange={(e) => set("billingLine1", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingPostal">Code postal</Label>
                <Input
                  id="billingPostal"
                  value={form.billingPostal}
                  onChange={(e) => set("billingPostal", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCity">Ville</Label>
                <Input
                  id="billingCity"
                  value={form.billingCity}
                  onChange={(e) => set("billingCity", e.target.value)}
                />
              </div>
            </div>

            {form.clientKind !== "B2B" ? (
              <div className="space-y-2">
                <Label htmlFor="billingCountry">Pays (code ISO)</Label>
                <Input
                  id="billingCountry"
                  maxLength={2}
                  value={form.billingCountry}
                  onChange={(e) => set("billingCountry", e.target.value.toUpperCase().slice(0, 2))}
                />
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Enregistrer
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/clients">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppPageShell>
  );
}
