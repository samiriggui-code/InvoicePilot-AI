import { PA_LOGO_FILES, type PaLogoSlug } from "@/lib/pa-logos.generated";
import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

function normalizeSlug(slug: string): string {
  return slug
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Resolve `/media/pa-logos/…` for a PA slug (DGFiP catalogue). */
export function resolvePaLogoUrl(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const key = normalizeSlug(slug);
  const file = (PA_LOGO_FILES as Record<string, string>)[key];
  if (file) return media.paLogo(file);
  // fuzzy: pennylane vs pennylane-xxx
  const hit = (Object.keys(PA_LOGO_FILES) as PaLogoSlug[]).find(
    (s) => key.startsWith(s) || s.startsWith(key),
  );
  return hit ? media.paLogo(PA_LOGO_FILES[hit]) : null;
}

type PaLogoProps = {
  slug: string;
  name: string;
  className?: string;
  /** Outer mark frame (default size-11) */
  frameClassName?: string;
};

/** Official-ish PA mark from public/media/pa-logos (favicon/Clearbit pack). */
export function PaLogo({ slug, name, className, frameClassName }: PaLogoProps) {
  const src = resolvePaLogoUrl(slug);

  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-white p-2 shadow-xs dark:bg-white",
        frameClassName,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn("max-h-full max-w-full object-contain", className)}
          loading="lazy"
        />
      ) : (
        <span className="text-xs font-semibold text-slate-700">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
