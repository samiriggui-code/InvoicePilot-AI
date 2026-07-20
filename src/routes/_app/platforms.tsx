import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  ExternalLink,
  Loader2,
  Network,
  Plug,
  Radio,
  Send,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useState } from "react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { PaLogo } from "@/components/app/PaLogo";
import { PaPickerSheet } from "@/components/app/PaPickerSheet";
import { Badge } from "@/components/reui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  changePreferredPa,
  connectPlatform,
  disconnectPlatform,
  getPlatformsData,
  probePaEmission,
  testPaConnection,
} from "@/fns/platforms";
import type { PaCatalogEntry } from "@/lib/pa-catalog";
import { pageGuide } from "@/lib/page-guides";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/platforms")({
  head: () => ({ meta: [{ title: "Ma plateforme agréée — InvoicePilot AI" }] }),
  loader: () => getPlatformsData(),
  component: PlatformsPage,
});

const purposeLabels: Record<string, string> = {
  EMISSION: "Émission",
  RECEPTION: "Réception",
  BOTH: "Émission & réception",
};

const modeLabels = {
  sandbox: "Sandbox",
  apikey: "API branchée",
  declared: "Déclarée sans API",
  unknown: "—",
} as const;

function StatusBadge({ ok, okLabel, koLabel }: { ok: boolean; okLabel: string; koLabel: string }) {
  return (
    <Badge variant={ok ? "success-light" : "warning-light"} size="sm">
      {ok ? okLabel : koLabel}
    </Badge>
  );
}

function PlatformsPage() {
  const data = Route.useLoaderData();
  const router = useRouter();

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [qontoAccessToken, setQontoAccessToken] = useState("");
  const [qontoRefreshToken, setQontoRefreshToken] = useState("");
  const [qontoEnv, setQontoEnv] = useState<"staging" | "production">("production");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [probeSteps, setProbeSteps] = useState<string[] | null>(null);

  if (!data) {
    return (
      <AppPageShell>
        <p className="text-muted-foreground">Session expirée.</p>
      </AppPageShell>
    );
  }

  const { platform, connection, paPurpose } = data;
  const isQonto = platform?.slug === "qonto";
  const apiReady = Boolean(connection?.canTransmit);
  const declaredOnly =
    connection?.credentialsMode === "declared" || (Boolean(connection) && !connection?.canTransmit);
  const purpose = connection?.purpose ?? paPurpose;
  const canEmit = purpose === "EMISSION" || purpose === "BOTH";
  const canReceive = purpose === "RECEPTION" || purpose === "BOTH";

  async function refresh() {
    await router.invalidate();
  }

  function closeConnect() {
    setConnectOpen(false);
    setApiKey("");
    setQontoAccessToken("");
    setQontoRefreshToken("");
    setQontoEnv("production");
  }

  async function submitConnect() {
    if (!platform) return;
    setBusy("connect");
    setError(null);
    setOkMsg(null);
    const result = await connectPlatform({
      data: {
        platformId: platform.id,
        purpose: paPurpose,
        mode: "partner_api",
        apiKey: !isQonto ? apiKey : undefined,
        qontoAccessToken: isQonto ? qontoAccessToken : undefined,
        qontoRefreshToken: isQonto ? qontoRefreshToken : undefined,
        qontoEnv: isQonto ? qontoEnv : undefined,
      },
    });
    setBusy(null);
    if (!result.success) {
      setError(result.error ?? "Connexion impossible.");
      return;
    }
    setOkMsg("Canal API enregistré — credentials scellés.");
    closeConnect();
    await refresh();
  }

  async function runTest() {
    if (!connection) return;
    setBusy("test");
    setError(null);
    setOkMsg(null);
    setProbeSteps(null);
    const result = await testPaConnection({ data: { connectionId: connection.id } });
    setBusy(null);
    if (!result.success) setError(result.error ?? "Test échoué.");
    else setOkMsg(result.detail ?? "Connexion OK.");
    await refresh();
  }

  async function runProbe() {
    if (!connection) return;
    setBusy("probe");
    setError(null);
    setOkMsg(null);
    const result = await probePaEmission({ data: { connectionId: connection.id } });
    setBusy(null);
    if (!result.success) {
      setError(result.error ?? "Sonde impossible.");
      setProbeSteps(null);
    } else {
      setOkMsg("Auth OK — flux d’émission documenté.");
      setProbeSteps(result.steps);
    }
    await refresh();
  }

  async function runDisconnect() {
    if (!connection) return;
    setBusy("disconnect");
    setError(null);
    const result = await disconnectPlatform({
      data: { connectionId: connection.id, confirmText },
    });
    setBusy(null);
    if (!result.success) {
      setError(result.error ?? "Déconnexion refusée.");
      return;
    }
    setOkMsg("Canal API coupé — PA toujours déclarée.");
    setDisconnectOpen(false);
    setConfirmText("");
    await refresh();
  }

  async function runPickPa(entry: PaCatalogEntry, confirm?: string) {
    setBusy("change");
    setError(null);
    const result = await changePreferredPa({
      data: {
        slug: entry.slug,
        name: entry.name,
        confirmText: apiReady ? confirm : undefined,
      },
    });
    setBusy(null);
    if (!result.success) {
      setError(result.error ?? "Changement impossible.");
      return;
    }
    setChangeOpen(false);
    setConfirmText("");
    await refresh();
    setOkMsg(`${entry.name} sélectionnée — branchez l’API.`);
    setConnectOpen(true);
  }

  const canalLabel = !platform
    ? "Aucune"
    : apiReady
      ? "Prêt"
      : declaredOnly
        ? "Déclarée"
        : "À brancher";

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Configurer · Plateforme agréée"
        title="Ma plateforme agréée"
        description={pageGuide("platforms").blurb}
        meta={
          <>
            {platform ? (
              <Badge variant={apiReady ? "success-light" : "warning-light"} size="sm">
                {apiReady ? "Canal prêt" : declaredOnly ? "Déclarée" : "À brancher"}
              </Badge>
            ) : (
              <Badge variant="outline" size="sm">
                Aucune PA
              </Badge>
            )}
            {platform ? (
              <Badge variant="secondary" size="sm">
                {purposeLabels[purpose]}
              </Badge>
            ) : null}
          </>
        }
        kpis={[
          {
            label: "Plateforme",
            value: platform?.name ?? "—",
            hint: platform ? "Choix d’inscription" : "À sélectionner",
            icon: Network,
            alert: !platform,
          },
          {
            label: "Canal API",
            value: canalLabel,
            hint: apiReady ? "Transmission possible" : "Credentials requis pour déposer",
            icon: Plug,
            alert: Boolean(platform) && !apiReady,
          },
          {
            label: "Dernier test",
            value: connection?.lastSyncAt
              ? new Date(connection.lastSyncAt).toLocaleDateString("fr-FR")
              : "—",
            hint: connection?.lastSyncAt
              ? new Date(connection.lastSyncAt).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Jamais testé",
            icon: Radio,
          },
          {
            label: "Rôle PA",
            value: purposeLabels[purpose] ?? "—",
            hint: "Émission / réception via cette PA",
            icon: ShieldCheck,
          },
        ]}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {okMsg ? (
        <Alert className="border-emerald-500/25 bg-emerald-500/5">
          <AlertDescription>{okMsg}</AlertDescription>
        </Alert>
      ) : null}
      {probeSteps && probeSteps.length > 0 ? (
        <Alert>
          <Send className="size-4" />
          <AlertDescription>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm">
              {probeSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Connexion PA */}
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        <div className="border-b border-border/60 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold tracking-tight">Votre plateforme agréée</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Une seule PA par organisation. InvoicePilot orchestre ; la PA dépose et reçoit sur le
            réseau public.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          {!platform ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Aucune PA enregistrée. Choisissez-la dans le catalogue officiel.
              </p>
              <Button
                onClick={() => {
                  setError(null);
                  setChangeOpen(true);
                }}
              >
                <Plug className="size-4" />
                Choisir ma PA
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-col gap-5 rounded-xl border p-5",
                apiReady
                  ? "border-emerald-500/25 bg-emerald-500/5"
                  : "border-border/60 bg-background/80",
              )}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <PaLogo
                    slug={platform.slug}
                    name={platform.name}
                    frameClassName="size-14 rounded-2xl p-2.5"
                  />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-tight">{platform.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <StatusBadge ok={Boolean(connection)} okLabel="Déclarée" koLabel="Non liée" />
                      <StatusBadge ok={apiReady} okLabel="API branchée" koLabel="API à brancher" />
                      <Badge variant="secondary" size="sm">
                        {modeLabels[connection?.credentialsMode ?? "unknown"]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {platform.authHint}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() => {
                      setError(null);
                      setConnectOpen(true);
                    }}
                  >
                    <Plug className="size-3.5" />
                    {apiReady ? "Mettre à jour l’API" : "Brancher l’API"}
                  </Button>
                  {apiReady && connection ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => void runTest()}
                      >
                        {busy === "test" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Radio className="size-3.5" />
                        )}
                        Tester
                      </Button>
                      {isQonto ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy !== null}
                          onClick={() => void runProbe()}
                        >
                          {busy === "probe" ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send className="size-3.5" />
                          )}
                          Sonde
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => {
                          setConfirmText("");
                          setDisconnectOpen(true);
                        }}
                      >
                        <Unplug className="size-3.5" />
                        Couper
                      </Button>
                    </>
                  ) : null}
                  {platform.apiDocsUrl ? (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={platform.apiDocsUrl} target="_blank" rel="noreferrer">
                        Doc <ExternalLink className="size-3.5" />
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfirmText("");
                      setChangeOpen(true);
                    }}
                  >
                    Changer de PA
                  </Button>
                </div>
              </div>

              {/* Capacités / flux — badges, pas de grille factures */}
              <div className="grid gap-2 border-t border-border/50 pt-4 sm:grid-cols-3">
                <FluxStatusCard
                  title="Émission B2B"
                  description="Factures ventes → réseau PA"
                  href="/invoices"
                  linkLabel="Mon émission PA"
                  enabled={canEmit}
                  ready={canEmit && apiReady}
                />
                <FluxStatusCard
                  title="Réception"
                  description="Factures fournisseurs entrantes"
                  href="/inbox"
                  linkLabel="Ma réception PA"
                  enabled={canReceive}
                  ready={canReceive && apiReady}
                />
                <FluxStatusCard
                  title="E-reporting"
                  description="B2C / export via la même PA"
                  href="/e-reporting"
                  linkLabel="Mon e-reporting"
                  enabled={canEmit}
                  ready={canEmit && apiReady}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <Sheet open={connectOpen} onOpenChange={(o) => !o && closeConnect()}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          {platform ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <PaLogo slug={platform.slug} name={platform.name} />
                  Brancher {platform.name}
                </SheetTitle>
                <SheetDescription>{platform.authHint}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto px-1">
                {isQonto ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="qonto-env">Environnement</Label>
                      <select
                        id="qonto-env"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={qontoEnv}
                        onChange={(e) => setQontoEnv(e.target.value as "staging" | "production")}
                      >
                        <option value="production">Production</option>
                        <option value="staging">Staging (hors réseau PA)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="qonto-token">Access token OAuth</Label>
                      <Input
                        id="qonto-token"
                        type="password"
                        autoComplete="off"
                        value={qontoAccessToken}
                        onChange={(e) => setQontoAccessToken(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="qonto-refresh">Refresh token (optionnel)</Label>
                      <Input
                        id="qonto-refresh"
                        type="password"
                        autoComplete="off"
                        value={qontoRefreshToken}
                        onChange={(e) => setQontoRefreshToken(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <Alert className="border-border/70">
                      <AlertDescription className="text-xs leading-relaxed">
                        {platform.authHint} Principe commun : OAuth2 / clé API → envoi Factur-X
                        (UBL/CII) → webhooks statut.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-1.5">
                      <Label htmlFor="pa-key">Clé API ou token Bearer</Label>
                      <Input
                        id="pa-key"
                        type="password"
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Collée depuis le portail développeur de la PA"
                      />
                    </div>
                  </>
                )}
              </div>
              <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
                <Button
                  className="w-full"
                  disabled={
                    busy === "connect" ||
                    (isQonto ? qontoAccessToken.trim().length < 16 : apiKey.trim().length < 8)
                  }
                  onClick={() => void submitConnect()}
                >
                  {busy === "connect" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plug className="size-4" />
                  )}
                  Enregistrer le canal API
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy === "connect"}
                  onClick={async () => {
                    if (!platform) return;
                    setBusy("connect");
                    setError(null);
                    const result = await connectPlatform({
                      data: {
                        platformId: platform.id,
                        purpose: paPurpose,
                        mode: "declare_only",
                      },
                    });
                    setBusy(null);
                    if (!result.success) {
                      setError(result.error ?? "Impossible.");
                      return;
                    }
                    setOkMsg("PA déclarée sans credentials — branchez l’API plus tard.");
                    closeConnect();
                    await refresh();
                  }}
                >
                  Déclarer sans API (plus tard)
                </Button>
                <Button variant="ghost" className="w-full" onClick={closeConnect}>
                  Fermer
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <PaPickerSheet
        open={changeOpen}
        onOpenChange={setChangeOpen}
        currentSlug={platform?.slug ?? null}
        needsApiConfirm={apiReady}
        busy={busy === "change"}
        onConfirm={(entry, confirm) => void runPickPa(entry, confirm)}
      />

      <AlertDialog
        open={disconnectOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDisconnectOpen(false);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Couper le canal API ?</AlertDialogTitle>
            <AlertDialogDescription>
              Credentials effacés — PA reste déclarée. Tapez{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">DECONNECTER</kbd>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DECONNECTER"
            className="font-mono"
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy === "disconnect"}>Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy === "disconnect" || confirmText.trim().toUpperCase() !== "DECONNECTER"}
              onClick={() => void runDisconnect()}
            >
              {busy === "disconnect" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Unplug className="size-4" />
              )}
              Couper
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageGuide page="platforms" />
    </AppPageShell>
  );
}

function FluxStatusCard({
  title,
  description,
  href,
  linkLabel,
  enabled,
  ready,
}: {
  title: string;
  description: string;
  href: "/invoices" | "/inbox" | "/e-reporting";
  linkLabel: string;
  enabled: boolean;
  ready: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        {!enabled ? (
          <Badge variant="outline" size="sm">
            Hors périmètre
          </Badge>
        ) : ready ? (
          <Badge variant="success-light" size="sm">
            Prêt
          </Badge>
        ) : (
          <Badge variant="warning-light" size="sm">
            PA requise
          </Badge>
        )}
      </div>
      <Link
        to={href}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {linkLabel}
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
