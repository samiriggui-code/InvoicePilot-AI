import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
import {
  deleteEstablishment,
  upsertEstablishment,
  type EstablishmentListItem,
} from "@/fns/establishments";

export type EstablishmentSheetMode = "view" | "edit" | "create";

type FormState = {
  label: string;
  siret: string;
  isHeadOffice: boolean;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  phone: string;
  email: string;
};

const emptyForm: FormState = {
  label: "",
  siret: "",
  isHeadOffice: false,
  addressLine1: "",
  postalCode: "",
  city: "",
  countryCode: "FR",
  phone: "",
  email: "",
};

function fromRow(r: EstablishmentListItem): FormState {
  return {
    label: r.label ?? "",
    siret: r.siret,
    isHeadOffice: r.isHeadOffice,
    addressLine1: r.addressLine1 ?? "",
    postalCode: r.postalCode ?? "",
    city: r.city ?? "",
    countryCode: r.countryCode || "FR",
    phone: r.phone ?? "",
    email: r.email ?? "",
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

export function EstablishmentSheet({
  open,
  mode,
  row,
  orgSiren,
  onOpenChange,
  onModeChange,
}: {
  open: boolean;
  mode: EstablishmentSheetMode;
  row: EstablishmentListItem | null;
  orgSiren: string;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: EstablishmentSheetMode) => void;
}) {
  const router = useRouter();
  const upsertFn = useServerFn(upsertEstablishment);
  const deleteFn = useServerFn(deleteEstablishment);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(row && mode !== "create" ? fromRow(row) : emptyForm);
  }, [open, row, mode]);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await upsertFn({
        data: {
          id: mode === "edit" && row ? row.id : undefined,
          ...form,
          siret: form.siret.replace(/\s/g, ""),
        },
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      await router.invalidate();
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteFn({ data: { id: row.id } });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setConfirmDelete(false);
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
      ? "Nouvel établissement"
      : mode === "edit"
        ? "Modifier l’établissement"
        : (row?.label ?? "Établissement");

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>
              SIRET sous le SIREN {orgSiren} — sites d’émission de votre entreprise.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {mode === "view" && row ? (
              <div className="grid gap-4">
                <Field label="Label" value={row.label} />
                <Field label="SIRET" value={row.siret} />
                <Field label="Type" value={row.isHeadOffice ? "Siège" : "Établissement"} />
                <Field label="Adresse" value={row.addressLine1} />
                <Field label="Ville" value={[row.postalCode, row.city].filter(Boolean).join(" ")} />
                <Field label="E-mail" value={row.email} />
                <Field label="Téléphone" value={row.phone} />
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="est-label">Label</Label>
                  <Input
                    id="est-label"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Siège, Agence Lyon…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="est-siret">SIRET</Label>
                  <Input
                    id="est-siret"
                    value={form.siret}
                    onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
                    placeholder={`${orgSiren}xxxxx`}
                    className="font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isHeadOffice}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        isHeadOffice: e.target.checked,
                      }))
                    }
                  />
                  Siège social
                </label>
                <div className="space-y-1.5">
                  <Label htmlFor="est-addr">Adresse</Label>
                  <Input
                    id="est-addr"
                    value={form.addressLine1}
                    onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="est-postal">Code postal</Label>
                    <Input
                      id="est-postal"
                      value={form.postalCode}
                      onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="est-city">Ville</Label>
                    <Input
                      id="est-city"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="est-email">E-mail</Label>
                  <Input
                    id="est-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="est-phone">Téléphone</Label>
                  <Input
                    id="est-phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="gap-2 sm:flex-row">
            {mode === "view" && row ? (
              <>
                <Button type="button" variant="outline" onClick={() => onModeChange("edit")}>
                  <Pencil className="size-3.5" />
                  Modifier
                </Button>
                {!row.isHeadOffice ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-3.5" />
                    Supprimer
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => (mode === "edit" ? onModeChange("view") : onOpenChange(false))}
                >
                  Annuler
                </Button>
                <Button type="button" disabled={busy} onClick={() => void save()}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  Enregistrer
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              SIRET {row?.siret} sera retiré du référentiel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
              Supprimer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
