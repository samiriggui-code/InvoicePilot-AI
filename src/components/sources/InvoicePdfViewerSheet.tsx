import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/reui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getInvoiceSourcePdf } from "@/fns/invoice-source-pdf";

type Props = {
  invoiceId: string | null;
  invoiceNumber?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Visionneuse PDF source — ouverte depuis la datatable Sources. */
export function InvoicePdfViewerSheet({ invoiceId, invoiceNumber, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !invoiceId) {
      setPdfUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPdfUrl(null);

    void getInvoiceSourcePdf({ data: { invoiceId } }).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.success || !res.pdfUrl) {
        setError(res.error ?? "PDF introuvable.");
        return;
      }
      setPdfUrl(res.pdfUrl);
      setFilename(res.filename);
    });

    return () => {
      cancelled = true;
    };
  }, [open, invoiceId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl lg:max-w-4xl"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-4 pr-12 text-left">
          <SheetTitle className="font-mono">{invoiceNumber ?? "Document source"}</SheetTitle>
          <SheetDescription>
            Visionneuse PDF — fichier chargé depuis vos sources.
            {filename ? (
              <span className="mt-2 block">
                <Badge variant="outline" size="sm" className="max-w-full truncate">
                  {filename}
                </Badge>
              </span>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="relative min-h-0 flex-1 bg-muted/30">
          {loading ? (
            <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm">Chargement du PDF…</p>
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
              <FileText className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              title={filename ?? "PDF source"}
              src={pdfUrl}
              className="h-[min(85vh,900px)] w-full border-0 bg-background"
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
