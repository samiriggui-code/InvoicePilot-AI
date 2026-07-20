import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createInvoice, getInvoiceFormOptions } from "@/fns/invoices";
import { computeLineTotals, type InvoiceLineInput } from "@/lib/invoice-validation";
import {
  clientMatchesTransactionType,
  isEReportingTransaction,
  TRANSACTION_TYPE_HINTS,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/transaction-type";

export const Route = createFileRoute("/_app/invoices/new")({
  head: () => ({ meta: [{ title: "Nouvelle facture — InvoicePilot AI" }] }),
  loader: () => getInvoiceFormOptions(),
  component: NewInvoicePage,
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function NewInvoicePage() {
  const options = Route.useLoaderData();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<{ message: string; blocking: boolean }[]>([]);

  const [counterpartyId, setCounterpartyId] = useState(options?.clients[0]?.id ?? "");
  const [transactionType, setTransactionType] = useState<TransactionType>("B2B_DOMESTIC");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [serviceDate, setServiceDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [operationCategory, setOperationCategory] = useState<"GOODS" | "SERVICES" | "MIXED">(
    "SERVICES",
  );
  const [vatOnDebitsOption, setVatOnDebitsOption] = useState(false);
  const [deliveryDiffers, setDeliveryDiffers] = useState(false);
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [franchiseVatMention, setFranchiseVatMention] = useState(
    options?.organization.vatRegime === "FRANCHISE_BASE",
  );
  const [lines, setLines] = useState<InvoiceLineInput[]>([
    { description: "", quantity: 1, unitPriceHt: 0, vatRate: 20 },
  ]);

  const totals = useMemo(() => {
    let ht = 0;
    let vat = 0;
    for (const line of lines) {
      const t = computeLineTotals(line);
      ht += t.lineTotalHt;
      vat += t.lineVat;
    }
    return {
      ht: Math.round(ht * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      ttc: Math.round((ht + vat) * 100) / 100,
    };
  }, [lines]);

  const eligibleClients = useMemo(
    () =>
      options?.clients.filter((c) =>
        clientMatchesTransactionType(
          {
            isConsumer: c.isConsumer,
            siren: c.siren,
            billingCountry: c.billingCountry,
            defaultTransactionType: c.defaultTransactionType,
          },
          transactionType,
        ),
      ) ?? [],
    [options?.clients, transactionType],
  );

  if (!options) {
    return (
      <AppPageShell className="max-w-none w-full">
        <p className="text-muted-foreground">Session expirée.</p>
      </AppPageShell>
    );
  }

  if (options.clients.length === 0) {
    return (
      <AppPageShell className="max-w-none w-full">
        <AppPageHero
          title="Nouvelle facture"
          description="Ajoutez d'abord un client (B2B avec SIREN ou particulier B2C)."
          actions={[{ label: "Créer un client", to: "/clients/new" }]}
        />
      </AppPageShell>
    );
  }

  const selectedClient =
    eligibleClients.find((c) => c.id === counterpartyId) ?? eligibleClients[0] ?? null;

  function updateLine(index: number, patch: Partial<InvoiceLineInput>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function submit(publish: boolean) {
    setLoading(publish ? "publish" : "draft");
    setError(null);
    setIssues([]);
    try {
      const result = await createInvoice({
        data: {
          counterpartyId: selectedClient?.id ?? counterpartyId,
          transactionType,
          issueDate,
          serviceDate,
          dueDate: dueDate || undefined,
          operationCategory,
          vatOnDebitsOption,
          deliveryDiffers,
          deliveryLine1: deliveryDiffers ? deliveryLine1 : undefined,
          deliveryPostal: deliveryDiffers ? deliveryPostal : undefined,
          deliveryCity: deliveryDiffers ? deliveryCity : undefined,
          franchiseVatMention,
          paymentTermsDays: 30,
          latePenaltyRate: 10.5,
          lines,
          publish,
        },
      });

      if (!result.success) {
        setError(result.error ?? "Erreur");
        setIssues(result.issues ?? []);
        setLoading(null);
        return;
      }

      if (result.id) {
        await navigate({ to: "/invoices/$id", params: { id: result.id } });
        return;
      }

      await navigate({ to: "/invoices" });
    } catch {
      setError("Impossible d'enregistrer la facture.");
      setLoading(null);
    }
  }

  const steps = [
    { step: 1, title: "Client", description: "Dates & tiers" },
    { step: 2, title: "Mentions", description: "Obligations 2026" },
    { step: 3, title: "Lignes", description: "Montants" },
  ] as const;

  return (
    <AppPageShell className="max-w-none w-full">
      <AppPageHero
        eyebrow="Flux · Émission PA"
        title="Nouvelle facture"
        description="Saisie manuelle de secours — enchaîne contrôles, Factur-X puis dépôt PA. Le parcours normal reste Sources → Analyse IA → Émission."
        actions={[{ label: "← Émission", to: "/invoices", variant: "outline" }]}
      />

      {(error || issues.length > 0) && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {issues.length > 0 && (
              <ul className="mt-2 list-disc pl-4 text-sm">
                {issues.map((i) => (
                  <li key={i.message}>
                    {i.blocking ? "⛔ " : "⚠ "}
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Stepper value={step} onValueChange={setStep} className="space-y-6">
        <StepperNav>
          {steps.map((item, index) => (
            <StepperItem
              key={item.step}
              step={item.step}
              completed={step > item.step}
              className="flex-1 items-start"
            >
              <StepperTrigger className="w-full flex-col gap-2 rounded-none border-b-2 border-transparent pb-3 data-[state=active]:border-primary">
                <StepperIndicator className="data-[state=completed]:bg-primary data-[state=active]:bg-primary">
                  {item.step}
                </StepperIndicator>
                <div className="text-center">
                  <StepperTitle>{item.title}</StepperTitle>
                  <StepperDescription className="max-sm:hidden">
                    {item.description}
                  </StepperDescription>
                </div>
              </StepperTrigger>
              {index < steps.length - 1 ? (
                <StepperSeparator className="absolute inset-x-0 top-3 left-[calc(50%+0.8rem+0.5rem)] -order-1 m-0 -translate-y-1/2 group-data-[orientation=horizontal]/stepper:w-[calc(100%-1.6rem-1rem)] group-data-[orientation=horizontal]/stepper:flex-none" />
              ) : null}
            </StepperItem>
          ))}
        </StepperNav>

        <StepperPanel>
          <StepperContent value={1} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client & dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Type de flux *</Label>
                  <RadioGroup
                    value={transactionType}
                    onValueChange={(v) => {
                      const next = v as TransactionType;
                      setTransactionType(next);
                      const match = options.clients.find((c) =>
                        clientMatchesTransactionType(
                          {
                            isConsumer: c.isConsumer,
                            siren: c.siren,
                            billingCountry: c.billingCountry,
                            defaultTransactionType: c.defaultTransactionType,
                          },
                          next,
                        ),
                      );
                      if (match) setCounterpartyId(match.id);
                    }}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {(["B2B_DOMESTIC", "B2C", "EXPORT", "INTRA_EU"] as TransactionType[]).map(
                      (type) => (
                        <label
                          key={type}
                          className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/60 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <RadioGroupItem value={type} className="mt-0.5" />
                          <span className="text-sm">
                            <span className="font-medium">{TRANSACTION_TYPE_LABELS[type]}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {TRANSACTION_TYPE_HINTS[type]}
                            </span>
                          </span>
                        </label>
                      ),
                    )}
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    {isEReportingTransaction(transactionType)
                      ? "→ Ce flux alimentera Mon e-reporting (lot périodique), pas l’e-invoicing B2B."
                      : "→ Ce flux passera par l’e-invoicing PA (Factur-X) vers le client entreprise."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Client *</Label>
                  {eligibleClients.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        Aucun client compatible avec ce flux.{" "}
                        <Link to="/clients/new" className="underline">
                          Créer un client {TRANSACTION_TYPE_LABELS[transactionType].toLowerCase()}
                        </Link>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedClient?.id ?? ""}
                      onChange={(e) => setCounterpartyId(e.target.value)}
                    >
                      {eligibleClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName}
                          {c.siren ? ` — ${c.siren}` : " — sans SIREN"}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Date d&apos;émission *</Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date prestation *</Label>
                    <Input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Échéance</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setStep(2)}>
                Continuer
              </Button>
            </div>
          </StepperContent>

          <StepperContent value={2} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mentions obligatoires 2026</CardTitle>
                <CardDescription>
                  {transactionType === "B2B_DOMESTIC"
                    ? "SIREN client repris du tiers · catégorie · TVA débits · livraison"
                    : "Catégorie · TVA · livraison — pas de SIREN requis (flux e-reporting)"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Catégorie d&apos;opération *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={operationCategory}
                    onChange={(e) =>
                      setOperationCategory(e.target.value as "GOODS" | "SERVICES" | "MIXED")
                    }
                  >
                    <option value="GOODS">Livraison de biens</option>
                    <option value="SERVICES">Prestation de services</option>
                    <option value="MIXED">Mixte</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={vatOnDebitsOption}
                    onCheckedChange={(v) => setVatOnDebitsOption(!!v)}
                  />
                  Option pour le paiement de la taxe d&apos;après les débits
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={franchiseVatMention}
                    onCheckedChange={(v) => setFranchiseVatMention(!!v)}
                  />
                  TVA non applicable, art. 293 B du CGI (franchise en base)
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={deliveryDiffers}
                    onCheckedChange={(v) => setDeliveryDiffers(!!v)}
                  />
                  Adresse de livraison différente de la facturation
                </label>

                {deliveryDiffers && (
                  <div className="grid gap-3 rounded-lg border border-border/60 p-3 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Adresse livraison *</Label>
                      <Input
                        value={deliveryLine1}
                        onChange={(e) => setDeliveryLine1(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CP</Label>
                      <Input
                        value={deliveryPostal}
                        onChange={(e) => setDeliveryPostal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ville *</Label>
                      <Input
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Continuer
              </Button>
            </div>
          </StepperContent>

          <StepperContent value={3} className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lignes</CardTitle>
                  <CardDescription>Quantité · prix HT · TVA</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLines((l) => [
                      ...l,
                      { description: "", quantity: 1, unitPriceHt: 0, vatRate: 20 },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Ligne
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-12"
                  >
                    <div className="space-y-1 sm:col-span-5">
                      <Label className="text-xs">Désignation</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(index, { description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Qté</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">P.U. HT</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPriceHt}
                        onChange={(e) => updateLine(index, { unitPriceHt: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">TVA %</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={line.vatRate}
                        onChange={(e) => updateLine(index, { vatRate: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={lines.length === 1}
                        onClick={() => setLines((l) => l.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-6 text-sm">
                  <span>
                    HT{" "}
                    <strong>
                      {totals.ht.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </strong>
                  </span>
                  <span>
                    TVA{" "}
                    <strong>
                      {totals.vat.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </strong>
                  </span>
                  <span>
                    TTC{" "}
                    <strong>
                      {totals.ttc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Retour
              </Button>
              <Button
                onClick={() => void submit(true)}
                disabled={loading !== null || !selectedClient}
              >
                {loading === "publish" ? <Loader2 className="size-4 animate-spin" /> : null}
                Valider &amp; numéroter
              </Button>
              <Button
                variant="outline"
                onClick={() => void submit(false)}
                disabled={loading !== null || !selectedClient}
              >
                {loading === "draft" ? <Loader2 className="size-4 animate-spin" /> : null}
                Enregistrer brouillon
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/invoices">Annuler</Link>
              </Button>
            </div>
          </StepperContent>
        </StepperPanel>
      </Stepper>
    </AppPageShell>
  );
}
