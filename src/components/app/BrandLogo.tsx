import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Filename without path, e.g. `shopify.svg` or slug `shopify` */
  name: string;
  alt: string;
  className?: string;
  /** Prefer dark assets when true; otherwise CSS dark: swap */
  forceDark?: boolean;
};

function resolvePair(name: string): { light: string; dark: string } {
  const base = name.replace(/\.svg$/i, "").replace(/-dark$/i, "");
  return {
    light: media.brand(`${base}.svg`),
    dark: media.brand(`${base}-dark.svg`),
  };
}

/** Brand mark with automatic light/dark asset swap. */
export function BrandLogo({ name, alt, className, forceDark }: BrandLogoProps) {
  const { light, dark } = resolvePair(name);

  if (forceDark) {
    return <img src={dark} alt={alt} className={cn("object-contain", className)} loading="lazy" />;
  }

  return (
    <>
      <img
        src={light}
        alt={alt}
        className={cn("object-contain dark:hidden", className)}
        loading="lazy"
      />
      <img
        src={dark}
        alt=""
        aria-hidden
        className={cn("hidden object-contain dark:block", className)}
        loading="lazy"
      />
    </>
  );
}
