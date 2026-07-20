import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Lock,
  Plus,
  Plug,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Store,
  Unplug,
  Webhook,
} from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { SourceImportsDataGrid } from "@/components/sources/SourceImportsDataGrid";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addSourceProvider,
  connectShopifyLive,
  connectWooLive,
  disconnectShopify,
  disconnectWoo,
  getIntegrationsData,
  removeSourceProvider,
  syncShopifyOrders,
  syncWooOrders,
  uploadSourcePdfs,
  type IntegrationSummary,
  type MerchantProviderId,
} from "@/fns/integrations";
import { pageGuide } from "@/lib/page-guides";
import { SOURCE_OPTIONS } from "@/lib/pa-guidance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/integrations")({
  head: () => ({ meta: [{ title: "Mes sources — InvoicePilot AI" }] }),
  loader: () => getIntegrationsData(),
  component: IntegrationsPage,
});

const COMING_SOON = new Set<MerchantProviderId>(["WIX", "PRESTASHOP", "GENERIC_HTTP", "API_PUSH"]);

const ICONS: Partial<Record<MerchantProviderId, typeof Plug>> = {
  SHOPIFY: ShoppingBag,
  WOOCOMMERCE: Store,
  MANUAL_UPLOAD: FileUp,
  GENERIC_HTTP: Webhook,
  API_PUSH: Webhook,
};

type SheetKind = null | "add" | "shopify-connect" | "woo-connect" | "pdf-upload" | "coming-soon";

type ConfirmKind =
  | null
  | { type: "disconnect"; provider: "SHOPIFY" | "WOOCOMMERCE" }
  | { type: "remove"; provider: MerchantProviderId };

function IntegrationsPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [comingSoonId, setComingSoonId] = useState<MerchantProviderId | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [confirmText, setConfirmText] = useState("");

  const [shopDomain, setShopDomain] = useState("");
  const [shopToken, setShopToken] = useState("");
  const [wooUrl, setWooUrl] = useState("");
  const [wooKey, setWooKey] = useState("");
  const [wooSecret, setWooSecret] = useState("");

  const gridRows = useMemo(
    () =>
      (data?.recentImports ?? []).map((inv) => ({
        id: inv.id,
        number: inv.number,
        client: inv.client,
        amount: inv.amount,
        status: inv.status,
        issueDate: inv.issueDate,
        sourceSystem: inv.sourceSystem,
        format: inv.format,
        hasPdf: inv.hasPdf,
      })),
    [data?.recentImports],
  );

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Session expirée.</p>
      </AppPageShell>
    );
  }

  const byProvider = Object.fromEntries(data.integrations.map((i) => [i.provider, i])) as Partial<
    Record<MerchantProviderId, IntegrationSummary>
  >;

  const catalog = (() => {
    const base =
      data.chosenSources.length > 0
        ? [...data.chosenSources]
        : (["MANUAL_UPLOAD"] as MerchantProviderId[]);
    if (!base.includes("MANUAL_UPLOAD")) base.unshift("MANUAL_UPLOAD");
    // PDF secours toujours en premier
    return ["MANUAL_UPLOAD" as MerchantProviderId, ...base.filter((id) => id !== "MANUAL_UPLOAD")];
  })();

  const availableToAdd = SOURCE_OPTIONS.map((o) => o.id as MerchantProviderId).filter(
    (id) => id !== "MANUAL_UPLOAD" && !catalog.includes(id),
  );

  const activeCount = catalog.filter((id) => {
    const row = byProvider[id];
    if (id === "MANUAL_UPLOAD") return Boolean(row && row.status !== "DISCONNECTED");
    return row?.status === "CONNECTED" || row?.status === "SYNCING";
  }).length;

  async function refresh() {
    await router.invalidate();
  }

  function closeSheet() {
    setSheet(null);
    setComingSoonId(null);
  }

  function openConnect(provider: MerchantProviderId) {
    if (provider === "SHOPIFY") setSheet("shopify-connect");
    else if (provider === "WOOCOMMERCE") setSheet("woo-connect");
    else if (provider === "MANUAL_UPLOAD") setSheet("pdf-upload");
    else {
      setComingSoonId(provider);
      setSheet("coming-soon");
    }
  }

  async function handleAdd(provider: MerchantProviderId) {
    setBusy(`add-${provider}`);
    setError(null);
    const res = await addSourceProvider({ data: { provider } });
    setBusy(null);
    if (!res.success) {
      setError(res.error ?? "Impossible d’ajouter la source.");
      return;
    }
    await refresh();
    closeSheet();
    openConnect(provider);
  }

  async function readPdfs(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList).slice(0, 10);
    const payloads: { filename: string; base64: string; byteSize: number }[] = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError(`Fichier non PDF : ${file.name}`);
        return;
      }
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
      payloads.push({
        filename: file.name,
        base64: btoa(binary),
        byteSize: file.size,
      });
    }

    setBusy("pdf-upload");
    setError(null);
    setSyncMsg(null);
    const res = await uploadSourcePdfs({ data: { files: payloads } });
    if (!res.success) setError(res.error ?? "Upload échoué.");
    else {
      const n = res.imported.length;
      const skipped = res.skippedDuplicates?.length ?? 0;
      setSyncMsg(
        n > 0
          ? skipped > 0
            ? `${n} PDF chargé(s), ${skipped} doublon(s) refusé(s). Ouverture Analyse IA…`
            : `${n} PDF chargé(s). Ouverture Analyse IA…`
          : "Aucun nouveau PDF (doublons ignorés).",
      );
      closeSheet();
      if (res.imported[0]) {
        await router.navigate({
          to: "/agent",
          search: { invoiceId: res.imported[0] },
        });
        return;
      }
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    await refresh();
  }

  async function runConfirm() {
    if (!confirm) return;
    setBusy("confirm");
    setError(null);

    if (confirm.type === "disconnect") {
      const res =
        confirm.provider === "SHOPIFY"
          ? await disconnectShopify({ data: { confirmText } })
          : await disconnectWoo({ data: { confirmText } });
      if (!res.success) setError(res.error ?? "Déconnexion refusée.");
      else {
        setSyncMsg(
          `${confirm.provider === "SHOPIFY" ? "Shopify" : "WooCommerce"} déconnecté. Le canal API est coupé — la source reste au catalogue.`,
        );
        setConfirm(null);
        setConfirmText("");
      }
    } else {
      const res = await removeSourceProvider({
        data: { provider: confirm.provider, confirmText },
      });
      if (!res.success) setError(res.error ?? "Retrait refusé.");
      else {
        setSyncMsg("Source retirée du catalogue.");
        setConfirm(null);
        setConfirmText("");
      }
    }

    setBusy(null);
    await refresh();
  }

  function statusMeta(provider: MerchantProviderId) {
    const row = byProvider[provider];
    if (COMING_SOON.has(provider)) {
      return { label: "Bientôt", tone: "muted" as const, connected: false };
    }
    if (provider === "MANUAL_UPLOAD") {
      const on = Boolean(row && row.status !== "DISCONNECTED");
      return {
        label: on ? "Secours · toujours actif" : "Secours · activation…",
        tone: "ok" as const,
        connected: true,
      };
    }
    if (row?.status === "CONNECTED" || row?.status === "SYNCING") {
      return {
        label: row.authMode === "live" ? "Connecté · live" : "Connecté",
        tone: "ok" as const,
        connected: true,
      };
    }
    if (row?.status === "ERROR") {
      return { label: "Erreur", tone: "bad" as const, connected: false };
    }
    return { label: "Non connecté", tone: "warn" as const, connected: false };
  }

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Flux · Sources"
        title="Mes sources"
        description={pageGuide("sources").blurb}
        actions={[
          {
            label: "Ajouter une source",
            onClick: () => setSheet("add"),
            icon: Plus,
          },
        ]}
        meta={
          <>
            <Badge variant="secondary" className="gap-1">
              <Lock className="size-3" />
              Procédure sécurisée
            </Badge>
            <Badge variant={activeCount > 0 ? "default" : "outline"}>
              {activeCount}/{catalog.length} canal(aux) actif(s)
            </Badge>
          </>
        }
        kpis={[
          {
            label: "Au catalogue",
            value: String(catalog.length),
            hint: "Sources déclarées",
            icon: Plug,
          },
          {
            label: "Canaux actifs",
            value: String(activeCount),
            hint: "Prêts à récupérer",
            icon: ShieldCheck,
            alert: activeCount === 0,
          },
          {
            label: "Imports",
            value: String(data.recentImports.length),
            hint: "Factures sources",
            icon: FileUp,
          },
          {
            label: "Volume",
            value: data.monthlyVolume != null ? `~${data.monthlyVolume}` : "—",
            hint: "Estimé / mois",
            icon: Store,
          },
        ]}
      />

      <Alert className="border-border/70 bg-muted/30">
        <ShieldCheck className="size-4" />
        <AlertTitle className="text-sm">Règle de robustesse</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          Aucune déconnexion ni retrait de catalogue sans confirmation textuelle. Les credentials
          sont vérifiés auprès de l’API avant d’activer un canal. L’actualisation ne coupe jamais
          une source.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Action refusée</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {syncMsg ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{syncMsg}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Canaux sources</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Statut en lecture seule — toute modification passe par un panneau guidé.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setSheet("add")}>
            <Plus className="size-3.5" />
            Ajouter
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {catalog.map((provider) => {
            const opt = SOURCE_OPTIONS.find((o) => o.id === provider);
            const row = byProvider[provider];
            const meta = statusMeta(provider);
            const Icon = ICONS[provider] ?? Plug;
            const coming = COMING_SOON.has(provider);

            return (
              <article
                key={provider}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs"
              >
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-0.5",
                    meta.tone === "ok"
                      ? "bg-emerald-500"
                      : meta.tone === "bad"
                        ? "bg-destructive"
                        : meta.tone === "warn"
                          ? "bg-amber-500"
                          : "bg-border",
                  )}
                />
                <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background shadow-xs">
                        <Icon className="size-5 text-primary" strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Source
                        </p>
                        <h4 className="text-lg font-semibold tracking-tight">
                          {opt?.label ?? provider}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {provider === "MANUAL_UPLOAD"
                            ? "Filet de secours si boutique / API indisponible"
                            : row?.shopDomain || row?.shopLabel || opt?.hint}
                          {row?.lastSyncAt && provider !== "MANUAL_UPLOAD"
                            ? ` · sync ${new Date(row.lastSyncAt).toLocaleString("fr-FR")}`
                            : provider === "MANUAL_UPLOAD" && row?.lastSyncAt
                              ? ` · dernier dépôt ${new Date(row.lastSyncAt).toLocaleString("fr-FR")}`
                              : ""}
                        </p>
                      </div>
                    </div>
                    <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  </div>

                  {row?.lastError ? (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {row.lastError}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-border/50 pt-4">
                    {coming ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setComingSoonId(provider);
                          setSheet("coming-soon");
                        }}
                      >
                        Voir le statut
                      </Button>
                    ) : provider === "MANUAL_UPLOAD" ? (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={busy !== null}
                        onClick={() => setSheet("pdf-upload")}
                      >
                        <FileUp className="size-3.5" />
                        Charger des PDF
                      </Button>
                    ) : meta.connected ? (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy !== null}
                          onClick={async () => {
                            const key = provider === "SHOPIFY" ? "shopify-sync" : "woo-sync";
                            setBusy(key);
                            setError(null);
                            setSyncMsg(null);
                            const res =
                              provider === "SHOPIFY"
                                ? await syncShopifyOrders()
                                : await syncWooOrders();
                            if (!res.success) setError(res.error ?? "Actualisation échouée.");
                            else {
                              setSyncMsg(
                                `${opt?.label}: ${res.imported.length} import(s), ${res.skipped} déjà présents.`,
                              );
                            }
                            setBusy(null);
                            await refresh();
                          }}
                        >
                          {busy === "shopify-sync" || busy === "woo-sync" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5" />
                          )}
                          Actualiser
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openConnect(provider)}>
                          Mettre à jour les accès
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={busy !== null}
                          onClick={() => {
                            setConfirmText("");
                            setConfirm({
                              type: "disconnect",
                              provider: provider as "SHOPIFY" | "WOOCOMMERCE",
                            });
                          }}
                        >
                          <Unplug className="size-3.5" />
                          Déconnecter
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="gap-1.5" onClick={() => openConnect(provider)}>
                        <Plug className="size-3.5" />
                        Configurer la connexion
                      </Button>
                    )}

                    {provider !== "MANUAL_UPLOAD" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-muted-foreground"
                        disabled={busy !== null || catalog.length <= 1}
                        onClick={() => {
                          setConfirmText("");
                          setConfirm({ type: "remove", provider });
                        }}
                      >
                        Retirer du catalogue
                      </Button>
                    ) : (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Lock className="size-3" />
                        Non retirable
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <SourceImportsDataGrid rows={gridRows} />

      <PageGuide page="sources" />

      {/* ── Sheet : ajouter ── */}
      <Sheet open={sheet === "add"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Ajouter une source</SheetTitle>
            <SheetDescription>
              Ajoute au catalogue sans toucher aux canaux déjà connectés. La configuration se fait
              ensuite dans un panneau dédié.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            {availableToAdd.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Toutes les sources disponibles sont déjà au catalogue.
              </p>
            ) : (
              availableToAdd.map((id) => {
                const opt = SOURCE_OPTIONS.find((o) => o.id === id);
                const Icon = ICONS[id] ?? Plug;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void handleAdd(id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/70 px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex size-9 items-center justify-center rounded-lg border border-border/60">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{opt?.label}</p>
                      <p className="text-xs text-muted-foreground">{opt?.hint}</p>
                    </div>
                    {busy === `add-${id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : COMING_SOON.has(id) ? (
                      <Badge variant="outline">Bientôt</Badge>
                    ) : (
                      <Plus className="size-4 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Sheet : Shopify ── */}
      <Sheet open={sheet === "shopify-connect"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Connexion Shopify</SheetTitle>
            <SheetDescription>
              Étape sécurisée : vérification live auprès de l’Admin API avant activation du canal.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex-1 space-y-4">
            <Step n={1} title="Custom app Shopify">
              Créez une app privée / custom app avec scope lecture commandes, puis copiez le token
              Admin API.
            </Step>
            <Step n={2} title="Identifiants">
              <div className="mt-2 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="shop-domain">Domaine boutique</Label>
                  <Input
                    id="shop-domain"
                    placeholder="ma-boutique.myshopify.com"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shop-token">Admin API access token</Label>
                  <Input
                    id="shop-token"
                    type="password"
                    placeholder="shpat_…"
                    value={shopToken}
                    onChange={(e) => setShopToken(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </Step>
            <Step n={3} title="Vérifier & activer">
              InvoicePilot appelle Shopify. Le canal n’est marqué « connecté » qu’après succès.
            </Step>
          </div>
          <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full gap-2"
              disabled={busy !== null}
              onClick={async () => {
                setBusy("shopify-live");
                setError(null);
                const res = await connectShopifyLive({
                  data: { shopDomain, accessToken: shopToken },
                });
                if (!res.success) setError(res.error ?? "Connexion refusée.");
                else {
                  setShopToken("");
                  setShopDomain("");
                  setSyncMsg("Shopify connecté — canal live actif.");
                  closeSheet();
                }
                setBusy(null);
                await refresh();
              }}
            >
              {busy === "shopify-live" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Vérifier auprès de Shopify
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet : Woo ── */}
      <Sheet open={sheet === "woo-connect"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Connexion WooCommerce</SheetTitle>
            <SheetDescription>
              Clés REST WooCommerce — vérification HTTP avant activation.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex-1 space-y-4">
            <Step n={1} title="Clés REST">
              WooCommerce → Réglages → Avancé → API REST → ajouter une clé lecture/écriture.
            </Step>
            <Step n={2} title="Identifiants">
              <div className="mt-2 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="woo-url">URL boutique</Label>
                  <Input
                    id="woo-url"
                    placeholder="https://boutique.example.com"
                    value={wooUrl}
                    onChange={(e) => setWooUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="woo-key">Consumer Key</Label>
                  <Input
                    id="woo-key"
                    placeholder="ck_…"
                    value={wooKey}
                    onChange={(e) => setWooKey(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="woo-secret">Consumer Secret</Label>
                  <Input
                    id="woo-secret"
                    type="password"
                    placeholder="cs_…"
                    value={wooSecret}
                    onChange={(e) => setWooSecret(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </Step>
          </div>
          <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
            <Button
              className="w-full gap-2"
              disabled={busy !== null}
              onClick={async () => {
                setBusy("woo-live");
                setError(null);
                const res = await connectWooLive({
                  data: {
                    storeUrl: wooUrl,
                    consumerKey: wooKey,
                    consumerSecret: wooSecret,
                  },
                });
                if (!res.success) setError(res.error ?? "Connexion refusée.");
                else {
                  setWooKey("");
                  setWooSecret("");
                  setSyncMsg("WooCommerce connecté — canal live actif.");
                  closeSheet();
                }
                setBusy(null);
                await refresh();
              }}
            >
              {busy === "woo-live" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
              Vérifier auprès de WooCommerce
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet : PDF ── */}
      <Sheet open={sheet === "pdf-upload"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Dépôt de factures PDF</SheetTitle>
            <SheetDescription>
              Canal de secours toujours actif. 1 à 10 fichiers — si vos APIs boutique ne répondent
              pas, chargez ici.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex-1 space-y-4">
            <Step n={1} title="Sélection">
              Uniquement des PDF (&lt; 12 Mo chacun). Pas d’activation magique sans revue.
            </Step>
            <Step n={2} title="Après dépôt">
              Les factures apparaissent dans le tableau ci-dessous, statut brouillon — complétez
              client / montants avant émission PA.
            </Step>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => void readPdfs(e.target.files)}
            />
          </div>
          <SheetFooter className="mt-6">
            <Button
              className="w-full gap-2"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              {busy === "pdf-upload" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              Choisir les PDF
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Sheet : bientôt ── */}
      <Sheet open={sheet === "coming-soon"} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {SOURCE_OPTIONS.find((o) => o.id === comingSoonId)?.label ?? "Source"}
            </SheetTitle>
            <SheetDescription>
              Connecteur en préparation. La source reste au catalogue pour votre planification
              conformité — utilisez PDF ou une boutique déjà branchée en attendant.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-8">
            <Button className="w-full" variant="outline" onClick={closeSheet}>
              Compris
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── AlertDialog : actions destructives ── */}
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "disconnect"
                ? "Couper le canal API ?"
                : "Retirer la source du catalogue ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {confirm?.type === "disconnect" ? (
                <>
                  <span className="block">
                    Cela coupe l’accès API. Les factures déjà importées restent. La source reste
                    listée — vous pourrez reconnecter plus tard.
                  </span>
                  <span className="block font-medium text-foreground">
                    Tapez{" "}
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      DECONNECTER
                    </kbd>{" "}
                    pour confirmer.
                  </span>
                </>
              ) : (
                <>
                  <span className="block">
                    Retrait du catalogue uniquement. Si un canal est encore connecté, l’action sera
                    refusée côté serveur.
                  </span>
                  <span className="block font-medium text-foreground">
                    Tapez{" "}
                    <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">RETIRER</kbd>{" "}
                    pour confirmer.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirm?.type === "disconnect" ? "DECONNECTER" : "RETIRER"}
            autoComplete="off"
            className="font-mono uppercase"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy !== null}>Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={
                busy !== null ||
                (confirm?.type === "disconnect"
                  ? confirmText.trim().toUpperCase() !== "DECONNECTER"
                  : confirmText.trim().toUpperCase() !== "RETIRER")
              }
              onClick={() => void runConfirm()}
            >
              {busy === "confirm" ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPageShell>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "ok" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "bg-amber-500/10 text-amber-800 dark:text-amber-400",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "ok" && "bg-emerald-500",
          tone === "warn" && "bg-amber-500",
          tone === "bad" && "bg-destructive",
          tone === "muted" && "bg-muted-foreground/40",
        )}
      />
      {children}
    </span>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Étape {n}
      </p>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <div className="mt-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
