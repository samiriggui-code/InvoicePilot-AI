import { Link } from "@tanstack/react-router";

import { media } from "@/lib/media";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  imgClassName?: string;
  to?: "/" | "/dashboard";
  /** Affiche le wordmark « InvoicePilot AI » (logo-full). Défaut : true. */
  withWordmark?: boolean;
  /** Force la variante dark (fonds foncés). */
  onDark?: boolean;
};

export function AppLogo({
  className,
  imgClassName,
  to = "/",
  withWordmark = true,
  onDark = false,
}: AppLogoProps) {
  if (withWordmark) {
    return (
      <Link to={to} className={cn("inline-flex items-center", className)}>
        {onDark ? (
          <img
            src={media.app.logoFullDark}
            alt="InvoicePilot AI"
            className={cn("h-8 w-auto max-w-none", imgClassName)}
          />
        ) : (
          <>
            <img
              src={media.app.logoFull}
              alt="InvoicePilot AI"
              className={cn("h-8 w-auto max-w-none dark:hidden", imgClassName)}
            />
            <img
              src={media.app.logoFullDark}
              alt="InvoicePilot AI"
              className={cn("hidden h-8 w-auto max-w-none dark:block", imgClassName)}
            />
          </>
        )}
      </Link>
    );
  }

  return (
    <Link to={to} className={cn("inline-flex items-center", className)}>
      {onDark ? (
        <img
          src={media.app.logoDark}
          alt=""
          className={cn("size-7 shrink-0", imgClassName)}
          aria-hidden
        />
      ) : (
        <>
          <img
            src={media.app.logo}
            alt=""
            className={cn("size-7 shrink-0 dark:hidden", imgClassName)}
            aria-hidden
          />
          <img
            src={media.app.logoDark}
            alt=""
            className={cn("hidden size-7 shrink-0 dark:block", imgClassName)}
            aria-hidden
          />
        </>
      )}
      <span className="sr-only">InvoicePilot AI</span>
    </Link>
  );
}

export function AppMiniLogo({ className }: { className?: string }) {
  return (
    <>
      <img
        src={media.app.miniCircle}
        alt="InvoicePilot AI"
        className={cn("size-8 dark:hidden", className)}
      />
      <img
        src={media.app.miniCircleDark}
        alt="InvoicePilot AI"
        className={cn("hidden size-8 dark:block", className)}
      />
    </>
  );
}
