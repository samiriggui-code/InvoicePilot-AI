import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyCompanyToClient, searchCompanies, type CompanyLookupHit } from "@/fns/company-lookup";
import { getInvoiceDetail, remediateInvoice, type InvoiceDetail } from "@/fns/invoice-remediation";
import { cn } from "@/lib/utils";

type LineDraft = {
  key: string;
  description: string;
  quantity: string;
  unitPriceHt: string;
  vatRate: string;
};

function toLineDrafts(detail: InvoiceDetail): LineDraft[] {
  if (detail.lines.length === 0) {
    return [
      {
        key: crypto.randomUUID(),
        description: "",
        quantity: "1",
        unitPriceHt: "0",
        vatRate: "20",
      },
    ];
  }
  return detail.lines.map((l) => ({
    key: l.id,
    description: l.description,
    quantity: String(l.quantity),
    unitPriceHt: String(l.unitPriceHt),
    vatRate: String(l.vatRate),
  }));
}

function syncFromDetail(detail: InvoiceDetail) {
  return {
    buyerSiren: detail.buyerSiren ?? "",
    companyQuery: detail.client?.legalName ?? "",
    operationCategory: (detail.operationCategory ?? "SERVICES") as "GOODS" | "SERVICES" | "MIXED",
    issueDate: detail.issueDate ?? "",
    serviceDate: detail.serviceDate ?? "",
    deliveryDiffers: detail.deliveryDiffers,
    deliveryLine1: detail.deliveryLine1 ?? "",
    deliveryPostal: detail.deliveryPostal ?? "",
    deliveryCity: detail.deliveryCity ?? "",
    lines: toLineDrafts(detail),
  };
}

export function HumanRemediationForm({
  invoiceId,
  refreshKey = 0,
  onSaved,
}: {
  invoiceId: string;
  /** Incrémenter après une analyse pour recharger la fiche */
  refreshKey?: number;
  onSaved?: (detail: InvoiceDetail) => void;
}) {
  const detailFn = useServerFn(getInvoiceDetail);
  const remediateFn = useServerFn(remediateInvoice);
  const searchFn = useServerFn(searchCompanies);
  const applyCompanyFn = useServerFn(applyCompanyToClient);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [buyerSiren, setBuyerSiren] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyHits, setCompanyHits] = useState<CompanyLookupHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [operationCategory, setOperationCategory] = useState<"GOODS" | "SERVICES" | "MIXED">(
    "SERVICES",
  );
  const [issueDate, setIssueDate] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [deliveryDiffers, setDeliveryDiffers] = useState(false);
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryPostal, setDeliveryPostal] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setCompanyHits([]);
      try {
        const d = await detailFn({ data: { invoiceId } });
        if (cancelled) return;
        if (!d) {
          setDetail(null);
          setError("Facture introuvable.");
          return;
        }
        setDetail(d);
        const s = syncFromDetail(d);
        setBuyerSiren(s.buyerSiren);
        setCompanyQuery(s.companyQuery);
        setOperationCategory(s.operationCategory);
        setIssueDate(s.issueDate);
        setServiceDate(s.serviceDate);
        setDeliveryDiffers(s.deliveryDiffers);
        setDeliveryLine1(s.deliveryLine1);
        setDeliveryPostal(s.deliveryPostal);
        setDeliveryCity(s.deliveryCity);
        setLines(s.lines);
      } catch {
        if (!cancelled) setError("Impossible de charger la fiche.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailFn, invoiceId, refreshKey]);

  const blocking = useMemo(() => detail?.validations.filter((v) => v.blocking) ?? [], [detail]);
  const warnings = useMemo(() => detail?.validations.filter((v) => !v.blocking) ?? [], [detail]);
  const errorCodes = useMemo(
    () => new Set([...blocking, ...warnings].map((v) => v.code)),
    [blocking, warnings],
  );

  const canEdit =
    detail?.direction === "SALE" &&
    detail &&
    !["TRANSMITTING", "TRANSMITTED", "PAID", "ARCHIVED"].includes(detail.status);
  const isReady = detail?.status === "VALIDATED" && blocking.length === 0;

  function highlight(code: string) {
    return errorCodes.has(code);
  }

  async function searchCompany() {
    setSearching(true);
    setError(null);
    try {
      const res = await searchFn({
        data: { query: companyQuery || detail?.client?.legalName || "" },
      });
      if (res.error) setError(res.error);
      setCompanyHits(res.hits);
      if (!res.error && res.hits.length === 0) {
        setError("Aucune entreprise trouvée — affinez le nom ou le SIREN.");
      }
    } catch {
      setError("Recherche entreprise impossible.");
    } finally {
      setSearching(false);
    }
  }

  async function applyCompany(hit: CompanyLookupHit) {
    if (!hit.active) {
      setError("Entreprise inactive — choisissez une fiche active.");
      return;
    }
    setApplyingId(hit.siren);
    setError(null);
    setSuccess(null);
    try {
      const applied = await applyCompanyFn({
        data: {
          invoiceId,
          counterpartyId: detail?.client?.id,
          company: hit,
        },
      });
      if (!applied.success) {
        setError(applied.error ?? "Impossible d’appliquer la fiche.");
        return;
      }
      setBuyerSiren(hit.siren);
      setCompanyQuery(hit.legalName);
      setCompanyHits([]);
      await save(false, hit.siren);
    } catch {
      setError("Application de la fiche impossible.");
    } finally {
      setApplyingId(null);
    }
  }

  async function save(markReady: boolean, sirenOverride?: string) {
    if (!detail || !canEdit) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const parsedLines = lines.map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity.replace(",", ".")),
        unitPriceHt: Number(l.unitPriceHt.replace(",", ".")),
        vatRate: Number(l.vatRate.replace(",", ".")),
      }));

      const result = await remediateFn({
        data: {
          invoiceId,
          buyerSiren: (sirenOverride ?? buyerSiren).replace(/\s/g, ""),
          operationCategory,
          issueDate: issueDate || undefined,
          serviceDate: serviceDate || undefined,
          deliveryDiffers,
          deliveryLine1: deliveryDiffers ? deliveryLine1 : undefined,
          deliveryPostal: deliveryDiffers ? deliveryPostal : undefined,
          deliveryCity: deliveryDiffers ? deliveryCity : undefined,
          lines: parsedLines,
          markReady,
        },
      });

      if (!result.success || !result.detail) {
        setError(result.error ?? "Correction impossible.");
        if (result.detail) {
          setDetail(result.detail);
          onSaved?.(result.detail);
        }
        return;
      }

      setDetail(result.detail);
      const s = syncFromDetail(result.detail);
      setBuyerSiren(s.buyerSiren);
      setCompanyQuery(s.companyQuery);
      setLines(s.lines);
      onSaved?.(result.detail);

      setSuccess(
        result.status === "VALIDATED"
          ? "Mentions OK — facture prête pour Émission / Factur-X."
          : result.status === "BLOCKED"
            ? "Enregistré — des blocages restent à lever."
            : "Corrections enregistrées.",
      );
    } catch {
      setError("Impossible d’enregistrer les corrections.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Chargement de la fiche à corriger…
        </CardContent>
      </Card>
    );
  }

  if (!detail) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          {error ?? "Facture introuvable."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Correction humaine</CardTitle>
          <CardDescription>
            Vous validez les données. Les règles 2026 décident de la conformité — pas l’IA.
          </CardDescription>
        </CardHeading>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              isReady
                ? "success-light"
                : blocking.length > 0
                  ? "destructive-light"
                  : "warning-light"
            }
            size="sm"
          >
            {isReady ? "Prête" : blocking.length > 0 ? `${blocking.length} blocage(s)` : "À revoir"}
          </Badge>
          {detail.client?.legalName ? (
            <Badge variant="secondary" size="sm">
              {detail.client.legalName}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {(blocking.length > 0 || warnings.length > 0) && (
          <ul className="space-y-1.5 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs">
            {blocking.map((v) => (
              <li key={v.id} className="text-destructive">
                <span className="font-medium">{v.code}</span> — {v.message}
              </li>
            ))}
            {warnings.map((v) => (
              <li key={v.id} className="text-amber-800 dark:text-amber-200">
                <span className="font-medium">{v.code}</span> — {v.message}
              </li>
            ))}
          </ul>
        )}

        {!canEdit ? (
          <p className="text-sm text-muted-foreground">
            Cette facture n’est plus modifiable à ce stade.
          </p>
        ) : (
          <>
            <div
              className={cn(
                "space-y-3 rounded-lg border p-3",
                highlight("BUYER_SIREN_2026")
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border/70",
              )}
            >
              <Label htmlFor="buyer-siren">Acheteur — SIREN</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="buyer-siren"
                  value={buyerSiren}
                  onChange={(e) => setBuyerSiren(e.target.value)}
                  placeholder="9 chiffres"
                  className="font-mono sm:max-w-[11rem]"
                  maxLength={14}
                />
                <Input
                  value={companyQuery}
                  onChange={(e) => setCompanyQuery(e.target.value)}
                  placeholder="Raison sociale ou SIREN"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  disabled={searching}
                  onClick={() => void searchCompany()}
                >
                  {searching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Annuaire
                </Button>
              </div>
              {companyHits.length > 0 ? (
                <ul className="divide-y divide-border rounded-md border border-border/70 text-sm">
                  {companyHits.map((hit) => (
                    <li
                      key={hit.siren}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">{hit.legalName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {hit.siren}
                          {hit.billingCity ? ` · ${hit.billingCity}` : ""}
                          {!hit.active ? " · inactive" : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={applyingId === hit.siren || !hit.active}
                        onClick={() => void applyCompany(hit)}
                      >
                        {applyingId === hit.siren ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Appliquer"
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "space-y-1.5 rounded-lg border p-3",
                  highlight("ISSUE_DATE")
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/70",
                )}
              >
                <Label htmlFor="issue-date">Date d’émission</Label>
                <Input
                  id="issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div
                className={cn(
                  "space-y-1.5 rounded-lg border p-3",
                  highlight("SERVICE_DATE")
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-border/70",
                )}
              >
                <Label htmlFor="service-date">Date vente / prestation</Label>
                <Input
                  id="service-date"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>
            </div>

            <div
              className={cn(
                "space-y-1.5 rounded-lg border p-3",
                highlight("OPERATION_CATEGORY_2026")
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border/70",
              )}
            >
              <Label htmlFor="op-cat">Catégorie d’opération</Label>
              <select
                id="op-cat"
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={operationCategory}
                onChange={(e) =>
                  setOperationCategory(e.target.value as "GOODS" | "SERVICES" | "MIXED")
                }
              >
                <option value="GOODS">Biens</option>
                <option value="SERVICES">Services</option>
                <option value="MIXED">Mixte</option>
              </select>
            </div>

            <div
              className={cn(
                "space-y-3 rounded-lg border p-3",
                highlight("NO_LINES") || highlight("LINE_DESC") || highlight("LINE_QTY")
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border/70",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <Label>Lignes</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    setLines((prev) => [
                      ...prev,
                      {
                        key: crypto.randomUUID(),
                        description: "",
                        quantity: "1",
                        unitPriceHt: "0",
                        vatRate: "20",
                      },
                    ])
                  }
                >
                  <Plus className="size-3.5" />
                  Ligne
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="grid gap-2 rounded-md border border-border/50 bg-background p-2 sm:grid-cols-[1fr_4.5rem_5.5rem_4.5rem_auto]"
                  >
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, description: e.target.value } : l,
                          ),
                        )
                      }
                      placeholder={`Ligne ${index + 1} — dénomination`}
                    />
                    <Input
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, quantity: e.target.value } : l,
                          ),
                        )
                      }
                      placeholder="Qté"
                      inputMode="decimal"
                    />
                    <Input
                      value={line.unitPriceHt}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === index ? { ...l, unitPriceHt: e.target.value } : l,
                          ),
                        )
                      }
                      placeholder="PU HT"
                      inputMode="decimal"
                    />
                    <Input
                      value={line.vatRate}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) => (i === index ? { ...l, vatRate: e.target.value } : l)),
                        )
                      }
                      placeholder="TVA %"
                      inputMode="decimal"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      disabled={lines.length <= 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Supprimer la ligne"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "space-y-3 rounded-lg border p-3",
                highlight("DELIVERY_ADDRESS_2026")
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border/70",
              )}
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deliveryDiffers}
                  onChange={(e) => setDeliveryDiffers(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                Adresse de livraison différente
              </label>
              {deliveryDiffers ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    className="sm:col-span-3"
                    value={deliveryLine1}
                    onChange={(e) => setDeliveryLine1(e.target.value)}
                    placeholder="Adresse"
                  />
                  <Input
                    value={deliveryPostal}
                    onChange={(e) => setDeliveryPostal(e.target.value)}
                    placeholder="CP"
                  />
                  <Input
                    className="sm:col-span-2"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="Ville"
                  />
                </div>
              ) : null}
            </div>
          </>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            {success}
          </p>
        ) : null}

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void save(false)}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save(true)}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Valider (règles 2026)
            </Button>
            {isReady ? (
              <Button type="button" className="ms-auto" asChild>
                {["B2C", "EXPORT", "INTRA_EU"].includes(detail.transactionType) ? (
                  <Link to="/e-reporting">Vers E-reporting →</Link>
                ) : (
                  <Link to="/invoices/$id" params={{ id: invoiceId }}>
                    Vers Émission →
                  </Link>
                )}
              </Button>
            ) : (
              <p className="ms-auto text-xs text-muted-foreground">
                Dispatch débloqué uniquement si plus aucun blocage.
              </p>
            )}
          </div>
        ) : isReady ? (
          <div className="border-t border-border/60 pt-4">
            <Button asChild>
              {["B2C", "EXPORT", "INTRA_EU"].includes(detail.transactionType) ? (
                <Link to="/e-reporting">Vers E-reporting →</Link>
              ) : (
                <Link to="/invoices/$id" params={{ id: invoiceId }}>
                  Vers Émission →
                </Link>
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
