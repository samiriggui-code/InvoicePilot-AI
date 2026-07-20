import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { createClient, deleteClient, updateClient, type ClientListItem } from "@/fns/clients";
import { searchCompanies, type CompanyLookupHit } from "@/fns/company-lookup";

export type ClientSheetMode = "view" | "edit" | "create";

type FormState = {
  legalName: string;
  siren: string;
  siret: string;
  vatNumber: string;
  email: string;
  phone: string;
  billingLine1: string;
  billingPostal: string;
  billingCity: string;
  billingCountry: string;
};

const emptyForm: FormState = {
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
};

function fromClient(c: ClientListItem): FormState {
  return {
    legalName: c.legalName,
    siren: c.siren ?? "",
    siret: c.siret ?? "",
    vatNumber: c.vatNumber ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    billingLine1: c.billingLine1 ?? "",
    billingPostal: c.billingPostal ?? "",
    billingCity: c.city ?? "",
    billingCountry: c.billingCountry || "FR",
  };
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

export function ClientSheet({
  open,
  mode,
  client,
  onOpenChange,
  onModeChange,
}: {
  open: boolean;
  mode: ClientSheetMode;
  client: ClientListItem | null;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: ClientSheetMode) => void;
}) {
  const router = useRouter();
  const createFn = useServerFn(createClient);
  const updateFn = useServerFn(updateClient);
  const deleteFn = useServerFn(deleteClient);
  const searchFn = useServerFn(searchCompanies);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<CompanyLookupHit[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setHits([]);
    setConfirmText("");
    if (mode === "create") {
      setForm(emptyForm);
    } else if (client) {
      setForm(fromClient(client));
    }
  }, [open, mode, client]);

  function set<K extends keyof FormState>(key: K, value: string) {
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

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        const result = await createFn({ data: form });
        if (!result.success) {
          setError(result.error ?? "Erreur");
          return;
        }
      } else if (client) {
        const result = await updateFn({ data: { id: client.id, ...form } });
        if (!result.success) {
          setError(result.error ?? "Erreur");
          return;
        }
        onModeChange("view");
      }
      await router.invalidate();
      if (mode === "create") onOpenChange(false);
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      const result = await deleteFn({
        data: { id: client.id, confirmText },
      });
      if (!result.success) {
        setError(result.error ?? "Suppression impossible.");
        return;
      }
      setDeleteOpen(false);
      onOpenChange(false);
      await router.invalidate();
    } catch {
      setError("Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "create"
      ? "Nouveau client"
      : mode === "edit"
        ? "Modifier le client"
        : (client?.legalName ?? "Client");

  const description =
    mode === "create"
      ? "Fiche acheteur (SIREN) pour Factur-X et la correction IA."
      : mode === "edit"
        ? "Mettez à jour l’identité et l’adresse de facturation."
        : "Référentiel client — données utilisées pour détecter les écarts sur les factures.";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex-1 space-y-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {mode === "view" && client ? (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Raison sociale" value={client.legalName} />
                  <Field label="SIREN" value={client.siren} />
                  <Field label="SIRET" value={client.siret} />
                  <Field label="N° TVA" value={client.vatNumber} />
                  <Field label="Email" value={client.email} />
                  <Field label="Téléphone" value={client.phone} />
                </div>
                <div className="space-y-4 border-t border-border/70 pt-4">
                  <Field label="Adresse" value={client.billingLine1} />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Code postal" value={client.billingPostal} />
                    <Field label="Ville" value={client.city} />
                    <Field label="Pays" value={client.billingCountry} />
                  </div>
                </div>
                <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-3">
                  <Field label="Factures" value={String(client.invoiceCount)} />
                  <Field label="Analysées" value={String(client.analyzedCount)} />
                  <Field label="PA annuaire" value={client.directoryPaName} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-legalName">Raison sociale *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="client-legalName"
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
                    <Label htmlFor="client-siren">SIREN *</Label>
                    <Input
                      id="client-siren"
                      inputMode="numeric"
                      maxLength={9}
                      value={form.siren}
                      onChange={(e) => set("siren", e.target.value.replace(/\D/g, "").slice(0, 9))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-siret">SIRET</Label>
                    <Input
                      id="client-siret"
                      inputMode="numeric"
                      maxLength={14}
                      value={form.siret}
                      onChange={(e) => set("siret", e.target.value.replace(/\D/g, "").slice(0, 14))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="client-email">Email</Label>
                    <Input
                      id="client-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-vat">N° TVA</Label>
                    <Input
                      id="client-vat"
                      value={form.vatNumber}
                      onChange={(e) => set("vatNumber", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone">Téléphone</Label>
                  <Input
                    id="client-phone"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-address">Adresse de facturation</Label>
                  <Input
                    id="client-address"
                    value={form.billingLine1}
                    onChange={(e) => set("billingLine1", e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="client-postal">Code postal</Label>
                    <Input
                      id="client-postal"
                      value={form.billingPostal}
                      onChange={(e) => set("billingPostal", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="client-city">Ville</Label>
                    <Input
                      id="client-city"
                      value={form.billingCity}
                      onChange={(e) => set("billingCity", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="mt-6 gap-2 border-t border-border/70 pt-4 sm:justify-between">
            {mode === "view" && client ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-1.5"
                  onClick={() => {
                    setConfirmText("");
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Fermer
                  </Button>
                  <Button type="button" className="gap-1.5" onClick={() => onModeChange("edit")}>
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (mode === "edit") onModeChange("view");
                    else onOpenChange(false);
                  }}
                >
                  Annuler
                </Button>
                <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {mode === "create" ? "Créer" : "Enregistrer"}
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Les factures sources liées (non transmises à la PA) seront aussi
              supprimées. Saisissez <strong>SUPPRIMER</strong> pour confirmer
              {client ? ` la suppression de ${client.legalName}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete">Confirmation</Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              autoComplete="off"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={busy || confirmText.trim().toUpperCase() !== "SUPPRIMER"}
              onClick={() => void handleDelete()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
