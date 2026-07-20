import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Card, CardContent } from "@/components/ui/card";
import { media, toAbsoluteUrl } from "@/lib/media";

export function AuthBrandedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen w-full grow lg:grid-cols-2">
      <div className="order-2 flex flex-col lg:order-1">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:hidden">
          <Link to="/">
            <img
              src={toAbsoluteUrl(media.app.mini)}
              className="h-[28px] max-w-none"
              alt="InvoicePilot AI"
            />
          </Link>
          <ThemeToggle />
        </div>

        <div className="relative flex flex-1 items-center justify-center p-8 lg:p-10">
          <div className="absolute end-8 top-8 hidden lg:block">
            <ThemeToggle />
          </div>
          <Card className="w-full max-w-[400px]">
            <CardContent className="p-6">{children}</CardContent>
          </Card>
        </div>
      </div>

      <div className="order-1 flex flex-col overflow-hidden bg-muted/40 dark:bg-background lg:order-2 lg:m-5 lg:rounded-xl lg:border lg:border-border">
        <div className="flex flex-col gap-4 p-8 lg:px-12 lg:pt-12 lg:pb-6">
          <Link to="/" className="hidden w-fit lg:block">
            <img
              src={toAbsoluteUrl(media.app.mini)}
              className="h-[28px] max-w-none"
              alt="InvoicePilot AI"
            />
          </Link>

          <div className="flex flex-col gap-3">
            <h3 className="text-2xl font-semibold text-foreground">
              Accès sécurisé à InvoicePilot AI
            </h3>
            <div className="text-base font-medium text-secondary-foreground">
              Solution compatible pour préparer Factur-X, e-reporting
              <br />
              et la connexion aux{" "}
              <span className="font-semibold text-foreground">plateformes agréées</span>
              <br />
              avant le 1<sup>er</sup> septembre 2026.
            </div>
          </div>
        </div>

        <div className="relative flex flex-1 items-end justify-center px-4 pb-4 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10">
          <img
            src={toAbsoluteUrl(media.app.authScreen)}
            alt="Aperçu du tableau de bord InvoicePilot AI"
            className="w-full max-w-[560px] object-contain object-bottom drop-shadow-sm dark:hidden"
          />
          <img
            src={toAbsoluteUrl(media.app.authScreenDark)}
            alt="Aperçu du tableau de bord InvoicePilot AI"
            className="hidden w-full max-w-[560px] object-contain object-bottom drop-shadow-sm dark:block"
          />
        </div>
      </div>
    </div>
  );
}
