import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import { AppLogo } from "@/components/app/AppLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getDocsUrl } from "@/lib/docs-url";
import { LANDING_CONTAINER } from "@/lib/landing-layout";

const navLinks = [
  { href: "/#parcours", label: "Parcours" },
  { href: "/#fonctionnalites", label: "Fonctionnalités" },
  { href: "/#integrations", label: "Intégrations" },
  { href: "/#tarifs", label: "Tarifs" },
  { href: "/faq", label: "FAQ" },
  { href: getDocsUrl(), label: "API", external: true },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className={`${LANDING_CONTAINER} flex h-16 items-center justify-between`}>
        <AppLogo imgClassName="h-7" />

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Connexion</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Essai gratuit</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`border-t border-border/60 bg-background py-4 md:hidden`}>
          <nav className={`${LANDING_CONTAINER} flex flex-col gap-3`}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                className="text-sm font-medium text-muted-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <Button variant="ghost" size="sm" className="justify-start" asChild>
                <Link to="/login">Connexion</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Essai gratuit</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
