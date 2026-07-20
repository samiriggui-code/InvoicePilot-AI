import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Radio,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  archiveInvoice,
  downloadArchiveArtifact,
  listInvoiceArchives,
} from "@/fns/invoice-archive";
import {
  getInvoiceDetail,
  remediateInvoice,
  renderFacturX,
  type InvoiceDetail,
} from "@/fns/invoice-remediation";
import { transmitInvoice } from "@/fns/pa-transmission";
import { PA_STATUS_LABELS } from "@/lib/pa-status";
import type { PaTransmissionStatus } from "@prisma/client";
import { applyCompanyToClient, searchCompanies, type CompanyLookupHit } from "@/fns/company-lookup";

export const Route = createFileRoute("/_app/invoices/$id")({
  head: () => ({ meta: [{ title: "Facture — InvoicePilot AI" }] }),
  loader: async ({ params }) => {
    const detail = await getInvoiceDetail({ data: { invoiceId: params.id } });
    if (!detail) throw notFound();
    if (detail.direction === "PURCHASE") {
      throw redirect({ to: "/inbox/$id", params: { id: params.id } });
    }
    return detail;
  },
  component: InvoiceDetailPage,
});

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  BLOCKED: "Bloquée",
  VALIDATED: "Prête",
  TRANSMITTING: "Transmission",
  TRANSMITTED: "Transmise",
  RECEIVED: "Reçue",
  REJECTED: "Rejetée",
  REFUSED: "Refusée",
  APPROVED: "Approuvée",
  PAID: "Payée",
  ARCHIVED: "Archivée",
};

function InvoiceDetailPage() {
  const initial = Route.useLoaderData();
  return <SaleEmissionDetail initial={initial} />;
}

function SaleEmissionDetail({ initial }: { initial: InvoiceDetail }) {
  const remediateFn = useServerFn(remediateInvoice);
  const facturxFn = useServerFn(renderFacturX);
  const detailFn = useServerFn(getInvoiceDetail);
  const transmitFn = useServerFn(transmitInvoice);
  const archiveFn = useServerFn(archiveInvoice);
  const listArchivesFn = useServerFn(listInvoiceArchives);
  const downloadArchiveFn = useServerFn(downloadArchiveArtifact);
  const searchFn = useServerFn(searchCompanies);
  const applyCompanyFn = useServerFn(applyCompanyToClient);

  const [detail, setDetail] = useState<InvoiceDetail>(initial);
  const [buyerSiren, setBuyerSiren] = useState(detail.buyerSiren ?? "");
  const [companyQuery, setCompanyQuery] = useState(detail.client?.legalName ?? "");
  const [companyHits, setCompanyHits] = useState<CompanyLookupHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [operationCategory, setOperationCategory] = useState<"GOODS" | "SERVICES" | "MIXED">(
    detail.operationCategory ?? "SERVICES",
  );
  const [issueDate, setIssueDate] = useState(detail.issueDate ?? "");
  const [serviceDate, setServiceDate] = useState(detail.serviceDate ?? "");
  const [deliveryDiffers, setDeliveryDiffers] = useState(detail.deliveryDiffers);
  const [deliveryLine1, setDeliveryLine1] = useState(detail.deliveryLine1 ?? "");
  const [deliveryPostal, setDeliveryPostal] = useState(detail.deliveryPostal ?? "");
  const [deliveryCity, setDeliveryCity] = useState(detail.deliveryCity ?? "");

  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [archives, setArchives] = useState<{ id: string; kind: string; filename: string }[]>([]);

  const lifecycle = detail.lifecycle ?? [];
  const blocking = useMemo(
    () => detail.validations.filter((v) => v.blocking),
    [detail.validations],
  );
  const warnings = useMemo(
    () => detail.validations.filter((v) => !v.blocking),
    [detail.validations],
  );
  const canEdit =
    detail.direction === "SALE" &&
    !["TRANSMITTING", "TRANSMITTED", "PAID", "ARCHIVED"].includes(detail.status);
  const isReady = detail.status === "VALIDATED";
  const isRejected = detail.status === "REJECTED";
  const canTransmit =
    detail.direction === "SALE" && isReady && blocking.length === 0 && detail.hasActivePa;
  const canArchive =
    detail.direction === "SALE" &&
    ["VALIDATED", "TRANSMITTED", "APPROVED", "PAID"].includes(detail.status) &&
    blocking.length === 0;

  const errorCodes = useMemo(
    () => new Set([...blocking, ...warnings].map((v) => v.code)),
    [blocking, warnings],
  );
  const needsSiren = errorCodes.has("BUYER_SIREN_2026");
  const needsIssueDate = errorCodes.has("ISSUE_DATE");
  const needsServiceDate = errorCodes.has("SERVICE_DATE");
  const needsCategory = errorCodes.has("OPERATION_CATEGORY_2026");
  const needsDelivery = errorCodes.has("DELIVERY_ADDRESS_2026");
  const needsLines =
    errorCodes.has("NO_LINES") || errorCodes.has("LINE_DESC") || errorCodes.has("LINE_QTY");
  const needsSellerSiren = errorCodes.has("SELLER_SIREN_PLACEHOLDER");
  const hasSpecificFixes =
    needsSiren ||
    needsIssueDate ||
    needsServiceDate ||
    needsCategory ||
    needsDelivery ||
    needsLines ||
    needsSellerSiren;
  /** Après rejet PA : formulaire ciblé SIREN (motif fréquent) + champs déjà en erreur */
  const showRejectSirenFix = isRejected && !needsSiren;

  async function searchCompany() {
    setSearching(true);
    setError(null);
    try {
      const res = await searchFn({
        data: { query: companyQuery || detail.client?.legalName || "" },
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
          invoiceId: detail.id,
          counterpartyId: detail.client?.id,
          company: hit,
        },
      });
      if (!applied.success) {
        setError(applied.error ?? "Impossible d’appliquer la fiche.");
        return;
      }
      setBuyerSiren(hit.siren);
      setCompanyHits([]);
      // Revalider mentions après enrichissement
      const result = await remediateFn({
        data: {
          invoiceId: detail.id,
          buyerSiren: hit.siren,
          operationCategory,
          issueDate: issueDate || undefined,
          serviceDate: serviceDate || undefined,
          deliveryDiffers,
          deliveryLine1: deliveryDiffers ? deliveryLine1 : undefined,
          deliveryPostal: deliveryDiffers ? deliveryPostal : undefined,
          deliveryCity: deliveryDiffers ? deliveryCity : undefined,
          markReady: true,
        },
      });
      if (result.detail) {
        setDetail(result.detail);
        setBuyerSiren(result.detail.buyerSiren ?? hit.siren);
      }
      setSuccess(
        result.status === "VALIDATED"
          ? `Fiche appliquée (${hit.siren}) — facture prête.`
          : `Fiche appliquée (${hit.siren}) et enregistrée en base.`,
      );
    } catch {
      setError("Application de la fiche impossible.");
    } finally {
      setApplyingId(null);
    }
  }

  async function save(markReady = true) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await remediateFn({
        data: {
          invoiceId: detail.id,
          buyerSiren: buyerSiren.replace(/\s/g, ""),
          operationCategory,
          issueDate: issueDate || undefined,
          serviceDate: serviceDate || undefined,
          deliveryDiffers,
          deliveryLine1: deliveryDiffers ? deliveryLine1 : undefined,
          deliveryPostal: deliveryDiffers ? deliveryPostal : undefined,
          deliveryCity: deliveryDiffers ? deliveryCity : undefined,
          markReady,
        },
      });
      if (!result.success || !result.detail) {
        setError(result.error ?? "Correction impossible.");
        if (result.detail) setDetail(result.detail);
        return;
      }
      setDetail(result.detail);
      setBuyerSiren(result.detail.buyerSiren ?? "");
      setSuccess(
        result.status === "VALIDATED"
          ? isRejected
            ? "Facture prête — vous pouvez renvoyer via la PA."
            : "Facture prête — Factur-X puis transmission PA."
          : result.status === "BLOCKED"
            ? "Corrections enregistrées — des blocages restent."
            : "Facture mise à jour.",
      );
    } catch {
      setError("Impossible d’enregistrer les corrections.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadFacturX() {
    setDownloading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await facturxFn({ data: { invoiceId: detail.id } });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPreview(result.summary);
      const blob = new Blob([result.xml], { type: "application/xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("Factur-X téléchargé.");
      const refreshed = await detailFn({ data: { invoiceId: detail.id } });
      if (refreshed) setDetail(refreshed);
    } catch {
      setError("Génération Factur-X impossible.");
    } finally {
      setDownloading(false);
    }
  }

  async function transmit() {
    setTransmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await transmitFn({
        data: { invoiceId: detail.id },
      });
      if (!result.success) {
        setError(result.error);
        if (result.detail) setDetail(result.detail);
        return;
      }
      setDetail(result.detail);
      setSuccess(result.message);
    } catch {
      setError("Transmission PA impossible.");
    } finally {
      setTransmitting(false);
    }
  }

  async function doArchive() {
    setArchiving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await archiveFn({ data: { invoiceId: detail.id } });
      if (!result.success) {
        setError(result.error);
        if (result.detail) setDetail(result.detail);
        return;
      }
      setDetail(result.detail);
      setSuccess(result.message);
      const arts = await listArchivesFn({ data: { invoiceId: detail.id } });
      setArchives(arts.map((a) => ({ id: a.id, kind: a.kind, filename: a.filename })));
    } catch {
      setError("Archivage impossible.");
    } finally {
      setArchiving(false);
    }
  }

  async function downloadArtifact(artifactId: string) {
    setError(null);
    const res = await downloadArchiveFn({ data: { artifactId } });
    if (!res.success) {
      setError(res.error);
      return;
    }
    const blob = new Blob([res.content], { type: `${res.mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const heroDescription =
    detail.direction === "PURCHASE"
      ? "Facture fournisseur reçue via votre PA — approuvez ou refusez depuis la réception."
      : detail.status === "ARCHIVED"
        ? "Facture archivée — Factur-X et journal des contrôles conservés."
        : detail.status === "BLOCKED"
          ? "Corrigez les mentions bloquantes, puis marquez la facture prête."
          : detail.status === "REJECTED"
            ? "Rejet PA — corrigez le motif, remettez prête, puis renvoyez."
            : detail.status === "TRANSMITTED"
              ? "Facture acceptée par la plateforme agréée."
              : isReady
                ? "Facture conforme — prête à transmettre via votre PA."
                : "Contrôlez les mentions 2026 avant émission.";

  return (
    <AppPageShell className="max-w-none w-full">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild className="-ms-2 gap-1.5 text-muted-foreground">
          <Link to="/invoices">
            <ArrowLeft className="size-3.5" />
            Factures
          </Link>
        </Button>
      </div>

      <AppPageHero
        eyebrow="Flux · Émission PA"
        title={detail.number ?? "Facture sans numéro"}
        description={heroDescription}
        meta={
          <>
            <Badge
              variant={
                detail.status === "BLOCKED" || detail.status === "REJECTED"
                  ? "destructive"
                  : "secondary"
              }
            >
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Badge>
            {detail.format ? <Badge variant="outline">{detail.format}</Badge> : null}
            {detail.platformName ? <Badge variant="outline">{detail.platformName}</Badge> : null}
            {detail.paReference ? (
              <Badge variant="outline" className="font-mono text-[10px]">
                {detail.paReference}
              </Badge>
            ) : null}
            {detail.paStatus ? (
              <Badge variant="outline" className="text-[10px]">
                PA ·{" "}
                {detail.paStatus in PA_STATUS_LABELS
                  ? PA_STATUS_LABELS[detail.paStatus as PaTransmissionStatus]
                  : detail.paStatus}
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">
              {detail.client?.legalName ?? "Sans client"}
              {" · "}
              {detail.totalTtc.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </span>
          </>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      {detail.paStatusMessage ? (
        <Alert>
          <Radio className="size-4" />
          <AlertTitle>Statut PA</AlertTitle>
          <AlertDescription>{detail.paStatusMessage}</AlertDescription>
        </Alert>
      ) : null}

      {isRejected && detail.rejectionReason ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Motif de rejet PA</AlertTitle>
          <AlertDescription>{detail.rejectionReason}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1 · Contrôles</CardTitle>
            <CardDescription>
              {blocking.length > 0
                ? `${blocking.length} blocage(s) à lever`
                : "Aucun blocage — éligible Factur-X / PA"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blocking.length === 0 && warnings.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                <ShieldCheck className="size-4 shrink-0" />
                Mentions 2026 OK
              </div>
            ) : null}
            {blocking.map((v) => {
              const fixId =
                v.code.startsWith("LINE_") || v.code === "NO_LINES" ? "fix-LINES" : `fix-${v.code}`;
              return (
                <div
                  key={v.id}
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm"
                >
                  <p className="font-medium text-destructive">{v.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {v.code}
                    {v.field ? ` · ${v.field}` : ""}
                  </p>
                  <button
                    type="button"
                    className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
                    onClick={() =>
                      document.getElementById(fixId)?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      })
                    }
                  >
                    Voir l’action →
                  </button>
                </div>
              );
            })}
            {warnings.map((v) => {
              const fixId = `fix-${v.code}`;
              return (
                <div
                  key={v.id}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm"
                >
                  <p className="font-medium text-amber-900 dark:text-amber-100">{v.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{v.code}</p>
                  <button
                    type="button"
                    className="mt-1.5 text-[11px] font-medium text-primary hover:underline"
                    onClick={() =>
                      document.getElementById(fixId)?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                      })
                    }
                  >
                    Voir l’action →
                  </button>
                </div>
              );
            })}

            <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <p>
                Vendeur : {detail.seller.legalName} (SIREN {detail.seller.siren})
              </p>
              <ul className="mt-2 space-y-1">
                {detail.lines.map((l) => (
                  <li key={l.id}>
                    {l.lineNumber}. {l.description} — {l.quantity} × {l.unitPriceHt} € HT
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2 · Corriger</CardTitle>
            <CardDescription>
              {hasSpecificFixes
                ? "Une action par code d’erreur — pas un formulaire fourre-tout."
                : isRejected
                  ? "Rejet PA — corrigez le motif puis remettez prête."
                  : "Aucun blocage — Factur-X / archivage / PA."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasSpecificFixes && !isRejected && canEdit ? (
              <p className="text-sm text-muted-foreground">
                Mentions OK. Vous pouvez marquer prête, générer le Factur-X ou transmettre.
              </p>
            ) : null}

            {needsSiren || showRejectSirenFix ? (
              <div
                id="fix-BUYER_SIREN_2026"
                className="space-y-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {needsSiren ? "BUYER_SIREN_2026" : "Rejet PA / SIREN client"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {needsSiren
                      ? "SIREN du client (acheteur) manquant — pas le vôtre. Recherche officielle puis appliquer."
                      : "Vérifiez le SIREN client (annuaire / rejet PA)."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={companyQuery}
                    onChange={(e) => setCompanyQuery(e.target.value)}
                    disabled={!canEdit || searching}
                    placeholder="Raison sociale ou SIREN…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchCompany();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!canEdit || searching}
                    onClick={() => void searchCompany()}
                    className="shrink-0 gap-1.5"
                  >
                    {searching ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    Chercher
                  </Button>
                </div>
                {companyHits.length > 0 ? (
                  <ul className="max-h-40 space-y-2 overflow-auto">
                    {companyHits.map((hit) => (
                      <li
                        key={hit.siren}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{hit.legalName}</p>
                          <p className="text-muted-foreground">
                            SIREN {hit.siren}
                            {hit.siret ? ` · ${hit.siret}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={!canEdit || !hit.active || applyingId === hit.siren}
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
                <div className="space-y-2">
                  <Label htmlFor="siren">Ou saisie manuelle SIREN</Label>
                  <Input
                    id="siren"
                    inputMode="numeric"
                    maxLength={9}
                    value={buyerSiren}
                    onChange={(e) => setBuyerSiren(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    disabled={!canEdit}
                    placeholder="9 chiffres"
                  />
                </div>
              </div>
            ) : null}

            {needsIssueDate ? (
              <div
                id="fix-ISSUE_DATE"
                className="space-y-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm font-medium">ISSUE_DATE</p>
                <p className="text-xs text-muted-foreground">Date d’émission manquante.</p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    disabled={!canEdit}
                    className="max-w-[12rem]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!canEdit}
                    onClick={() => setIssueDate(new Date().toISOString().slice(0, 10))}
                  >
                    Aujourd’hui
                  </Button>
                </div>
              </div>
            ) : null}

            {needsServiceDate ? (
              <div
                id="fix-SERVICE_DATE"
                className="space-y-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm font-medium">SERVICE_DATE</p>
                <p className="text-xs text-muted-foreground">
                  Date de vente / prestation manquante.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    disabled={!canEdit}
                    className="max-w-[12rem]"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={!canEdit}
                    onClick={() =>
                      setServiceDate(issueDate || new Date().toISOString().slice(0, 10))
                    }
                  >
                    = date d’émission / aujourd’hui
                  </Button>
                </div>
              </div>
            ) : null}

            {needsCategory ? (
              <div
                id="fix-OPERATION_CATEGORY_2026"
                className="space-y-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm font-medium">OPERATION_CATEGORY_2026</p>
                <p className="text-xs text-muted-foreground">
                  Catégorie d’opération obligatoire (mention 2026).
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["GOODS", "Biens"],
                      ["SERVICES", "Services"],
                      ["MIXED", "Mixte"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={operationCategory === value ? "default" : "outline"}
                      disabled={!canEdit}
                      onClick={() => setOperationCategory(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {needsDelivery ? (
              <div
                id="fix-DELIVERY_ADDRESS_2026"
                className="space-y-3 rounded-lg border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm font-medium">DELIVERY_ADDRESS_2026</p>
                <p className="text-xs text-muted-foreground">
                  Livraison différente cochée mais adresse incomplète — complétez ou décochez.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canEdit}
                    onClick={() => setDeliveryDiffers(false)}
                  >
                    Même adresse que facturation
                  </Button>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dl1">Adresse de livraison</Label>
                    <Input
                      id="dl1"
                      value={deliveryLine1}
                      onChange={(e) => {
                        setDeliveryDiffers(true);
                        setDeliveryLine1(e.target.value);
                      }}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dpostal">Code postal</Label>
                      <Input
                        id="dpostal"
                        value={deliveryPostal}
                        onChange={(e) => {
                          setDeliveryDiffers(true);
                          setDeliveryPostal(e.target.value);
                        }}
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dcity">Ville</Label>
                      <Input
                        id="dcity"
                        value={deliveryCity}
                        onChange={(e) => {
                          setDeliveryDiffers(true);
                          setDeliveryCity(e.target.value);
                        }}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {needsLines ? (
              <div
                id="fix-LINES"
                className="space-y-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3"
              >
                <p className="text-sm font-medium">Lignes de facture</p>
                <p className="text-xs text-muted-foreground">
                  {errorCodes.has("NO_LINES")
                    ? "Aucune ligne — recréez ou éditez la facture."
                    : "Dénomination / quantité invalide sur une ligne."}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {detail.lines.map((l) => (
                    <li key={l.id}>
                      {l.lineNumber}. {l.description || "(sans libellé)"} — qté {l.quantity}
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/invoices/new">Nouvelle facture</Link>
                </Button>
              </div>
            ) : null}

            {needsSellerSiren ? (
              <div
                id="fix-SELLER_SIREN_PLACEHOLDER"
                className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
              >
                <p className="text-sm font-medium">SELLER_SIREN_PLACEHOLDER</p>
                <p className="text-xs text-muted-foreground">
                  SIREN vendeur placeholder — à corriger dans les paramètres organisation.
                </p>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/settings">Ouvrir les paramètres</Link>
                </Button>
              </div>
            ) : null}

            {canEdit ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => void save(true)} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Validation…
                    </>
                  ) : isRejected ? (
                    "Corriger et remettre prête"
                  ) : hasSpecificFixes ? (
                    "Appliquer les corrections"
                  ) : (
                    "Marquer prête"
                  )}
                </Button>
                {hasSpecificFixes || isRejected ? (
                  <Button variant="outline" onClick={() => void save(false)} disabled={saving}>
                    Enregistrer sans finaliser
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Facture verrouillée.</p>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              {detail.direction === "SALE" ? (
                <Button
                  variant={isReady || blocking.length === 0 ? "default" : "secondary"}
                  className="gap-2"
                  onClick={() => void downloadFacturX()}
                  disabled={downloading || blocking.length > 0}
                >
                  {downloading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  3 · Télécharger Factur-X (XML)
                </Button>
              ) : null}
              {canArchive ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void doArchive()}
                  disabled={archiving}
                >
                  {archiving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                  Archiver (preuve)
                </Button>
              ) : null}
            </div>

            {detail.archived || archives.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Artefacts d’archive ({detail.archiveCount || archives.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {archives.map((a) => (
                    <Button
                      key={a.id}
                      size="sm"
                      variant="secondary"
                      className="gap-1.5 text-xs"
                      onClick={() => void downloadArtifact(a.id)}
                    >
                      <Download className="size-3" />
                      {a.filename}
                    </Button>
                  ))}
                  {archives.length === 0 && detail.archived ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const arts = await listArchivesFn({
                          data: { invoiceId: detail.id },
                        });
                        setArchives(
                          arts.map((a) => ({
                            id: a.id,
                            kind: a.kind,
                            filename: a.filename,
                          })),
                        );
                      }}
                    >
                      Charger les fichiers
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {preview ? (
              <pre className="max-h-48 overflow-auto rounded-lg bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                {preview}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {detail.direction === "SALE" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="size-4 text-primary" />4 · Transmission PA
            </CardTitle>
            <CardDescription>
              Après contrôles, correction et Factur-X — dépôt via votre plateforme agréée connectée.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!detail.hasActivePa ? (
              <div className="rounded-lg border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                Aucune PA connectée.{" "}
                <Link to="/platforms" className="font-medium text-primary hover:underline">
                  Connecter une plateforme
                </Link>{" "}
                (process 2), puis revenez ici.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  disabled={!canTransmit || transmitting}
                  onClick={() => void transmit()}
                >
                  {transmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {isRejected ? "Renvoyer via PA" : "Transmettre via PA"}
                </Button>
              </div>
            )}
            {detail.hasActivePa && isRejected ? (
              <p className="text-xs text-muted-foreground">
                Après correction (étape 2), remettez prête, puis renvoyez via PA.
              </p>
            ) : null}
            {detail.hasActivePa && !canTransmit && !isRejected && !isReady ? (
              <p className="text-xs text-muted-foreground">
                Marquez d’abord la facture comme prête (sans blocage) pour transmettre.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Journal de cycle de vie</CardTitle>
          <CardDescription>Statuts horodatés — émission via PA</CardDescription>
        </CardHeader>
        <CardContent>
          {lifecycle.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement pour l’instant.</p>
          ) : (
            <ol className="space-y-3">
              {[...lifecycle].reverse().map((e) => (
                <li
                  key={e.id}
                  className="flex gap-3 border-b border-border/50 pb-3 last:border-0 last:pb-0"
                >
                  <div className="mt-0.5 size-2 shrink-0 rounded-full bg-primary/70" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABEL[e.status] ?? e.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(e.occurredAt).toLocaleString("fr-FR")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">· {e.source}</span>
                    </div>
                    {e.message ? (
                      <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </AppPageShell>
  );
}
