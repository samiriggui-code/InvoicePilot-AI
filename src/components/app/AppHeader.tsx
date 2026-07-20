import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { FileCheck, LogOut } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/fns/auth";
import { getDocsUrl } from "@/lib/docs-url";

const appLinks = [
  { to: "/dashboard" as const, label: "Tableau de bord" },
  { to: "/agent" as const, label: "Agent IA" },
];

export function AppHeader() {
  const navigate = useNavigate();
  const { workspace } = useRouteContext({ from: "/_app" });

  async function handleLogout() {
    await logoutUser();
    await navigate({ to: "/login" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileCheck className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            InvoicePilot <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {appLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
          <a
            href={getDocsUrl()}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            API (docs)
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {workspace.user.email}
          </span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Site marketing</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleLogout()}
            className="gap-1.5"
          >
            <LogOut className="size-3.5" />
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
}
