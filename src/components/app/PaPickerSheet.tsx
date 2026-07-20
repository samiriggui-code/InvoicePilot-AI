import { Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";

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
import { searchPaCatalog, type PaCatalogEntry } from "@/lib/pa-catalog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSlug: string | null;
  /** true si une API était branchée — demande DECONNECTER */
  needsApiConfirm: boolean;
  busy: boolean;
  onConfirm: (entry: PaCatalogEntry, confirmText?: string) => void | Promise<void>;
};

export function PaPickerSheet({
  open,
  onOpenChange,
  currentSlug,
  needsApiConfirm,
  busy,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PaCatalogEntry | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const entries = useMemo(() => searchPaCatalog(query, 60), [query]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setQuery("");
      setSelected(null);
      setConfirmText("");
    }
    onOpenChange(next);
  }

  const canSubmit =
    selected !== null &&
    selected.slug !== currentSlug &&
    (!needsApiConfirm || confirmText.trim().toUpperCase() === "DECONNECTER") &&
    !busy;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 px-6 py-5 text-left">
          <SheetTitle>Choisir votre PA</SheetTitle>
          <SheetDescription>
            Une seule plateforme agréée pour ce dossier. Sélectionnez-la, puis branchez l’API si
            disponible.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 border-b border-border/60 px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (Qonto, Pennylane, Indy…)"
              className="pl-9"
              autoFocus
            />
          </div>
          {selected ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-white p-1.5">
                <img
                  src={selected.logoUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selected.apiMaturity === "partner_docs" || selected.apiMaturity === "api_first"
                    ? "API documentée"
                    : selected.apiMaturity === "enterprise_partner"
                      ? "API partenaire (entreprise)"
                      : selected.apiMaturity === "saas_user_api"
                        ? "API produit / à confirmer"
                        : "Credentials génériques"}
                </p>
              </div>
              <Badge
                variant={
                  selected.apiMaturity === "partner_docs" || selected.apiMaturity === "api_first"
                    ? "default"
                    : "outline"
                }
              >
                API
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!query.trim() ? (
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Populaires
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {entries.map((entry) => {
              const isCurrent = entry.slug === currentSlug;
              const isSelected = selected?.slug === entry.slug;
              return (
                <button
                  key={entry.slug}
                  type="button"
                  disabled={isCurrent || busy}
                  onClick={() => setSelected(entry)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border/60 bg-card hover:border-primary/30 hover:bg-muted/40",
                    isCurrent && "opacity-50",
                  )}
                >
                  <div className="flex size-12 items-center justify-center rounded-xl border border-border/50 bg-white p-2 shadow-xs">
                    <img
                      src={entry.logoUrl}
                      alt={entry.name}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <span className="line-clamp-2 w-full text-[11px] font-medium leading-tight">
                    {entry.name}
                  </span>
                  {isCurrent ? (
                    <span className="text-[10px] text-muted-foreground">Actuelle</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aucun résultat.</p>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border/60 px-6 py-4 sm:flex-col">
          {needsApiConfirm ? (
            <div className="mb-3 w-full space-y-1.5">
              <Label htmlFor="pa-confirm">
                Tapez <kbd className="rounded bg-muted px-1 font-mono text-xs">DECONNECTER</kbd>{" "}
                pour couper l’API actuelle
              </Label>
              <Input
                id="pa-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DECONNECTER"
                className="font-mono"
                autoComplete="off"
              />
            </div>
          ) : null}
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={() => {
              if (!selected) return;
              void onConfirm(selected, needsApiConfirm ? confirmText : undefined);
            }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {selected?.canTransmit
              ? `Sélectionner ${selected.name}`
              : selected
                ? `Continuer avec ${selected.name}`
                : "Sélectionner une PA"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => handleOpenChange(false)}
          >
            Annuler
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
