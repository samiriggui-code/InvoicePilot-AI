import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppLogo, AppMiniLogo } from "@/components/app/AppLogo";
import { AssistantFab, ComplianceAssistantSheet } from "@/components/app/ComplianceAssistantSheet";
import { UserMenu } from "@/components/app/UserMenu";
import { TrialLifecycleDialogs } from "@/components/billing/TrialLifecycleDialogs";
import { KeenIcon } from "@/components/keenicons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { media } from "@/lib/media";
import { planLabel, type WorkspaceContext } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "invoicepilot.sidebar.collapsed";

/** Nav : Pilotage → Configurer → Flux (parcours métier) → Compte. */
const navGroups = [
  {
    label: "Pilotage",
    items: [
      { to: "/dashboard", label: "Mon tableau de bord", icon: "element-11" },
      { to: "/compliance", label: "Ma conformité", icon: "shield-tick" },
    ],
  },
  {
    label: "Configurer",
    items: [
      { to: "/clients", label: "Mes clients", icon: "people" },
      { to: "/establishments", label: "Mes établissements", icon: "shop" },
      { to: "/platforms", label: "Ma plateforme agréée", icon: "share" },
    ],
  },
  {
    label: "Flux",
    items: [
      { to: "/integrations", label: "Mes sources", icon: "abstract-26" },
      { to: "/agent", label: "Mon analyse IA", icon: "artificial-intelligence" },
      { to: "/invoices", label: "Mon émission PA", icon: "document" },
      { to: "/e-reporting", label: "Mon e-reporting", icon: "chart-line-up-2" },
      { to: "/inbox", label: "Ma réception PA", icon: "sms" },
    ],
  },
  {
    label: "Compte",
    items: [
      { to: "/team", label: "Mon équipe", icon: "security-user" },
      { to: "/billing", label: "Mon abonnement", icon: "credit-cart" },
      { to: "/settings", label: "Mes paramètres", icon: "setting-2" },
    ],
  },
] as const;

type NavItem = (typeof navGroups)[number]["items"][number];
const navItems: NavItem[] = navGroups.flatMap((g): NavItem[] => [...g.items]);

function trialBadgeLabel(days: number) {
  return `Essai ${days} JOUR${days > 1 ? "S" : ""}`;
}

export function AppShell({
  workspace,
  children,
}: {
  workspace: WorkspaceContext;
  children: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const orgName = workspace.organization.tradeName ?? workspace.organization.legalName;
  const plan = workspace.subscription?.plan;
  const isTrialing = workspace.subscription?.status === "TRIALING";
  const trialDays = workspace.trialDaysLeft;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="app-ui flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border/60 bg-card/30 transition-[width] duration-200 md:flex",
          collapsed ? "w-[4.25rem]" : "w-[15.5rem]",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border/60",
            collapsed ? "justify-center px-2" : "justify-between gap-2 px-3",
          )}
        >
          {collapsed ? (
            <Link
              to="/dashboard"
              className="flex items-center justify-center"
              title="InvoicePilot AI"
            >
              <AppMiniLogo className="size-8" />
            </Link>
          ) : (
            <AppLogo to="/dashboard" imgClassName="h-[22px]" />
          )}
          {!collapsed && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground"
              onClick={toggleCollapsed}
              title="Réduire le menu"
            >
              <KeenIcon icon="black-left-line" className="text-base" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center border-b border-border/60 py-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              onClick={toggleCollapsed}
              title="Étendre le menu"
            >
              <KeenIcon icon="black-right-line" className="text-base" />
            </Button>
          </div>
        )}

        {!collapsed && (
          <div className="border-b border-border/60 px-4 py-3">
            <div className="flex items-start gap-2">
              <KeenIcon icon="briefcase" className="mt-0.5 text-sm text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{orgName}</p>
                <p className="flex items-center gap-1.5 truncate font-mono text-2xs text-muted-foreground">
                  <img src={media.flag("france")} alt="" className="size-3.5 rounded-[2px]" />
                  {workspace.organization.siren}
                </p>
              </div>
            </div>
            {plan && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge variant={isTrialing ? "secondary" : "default"} className="text-[10px]">
                  {planLabel(plan)}
                  {isTrialing && trialDays != null ? ` · ${trialBadgeLabel(trialDays)}` : ""}
                  {!isTrialing && workspace.subscription?.status === "ACTIVE" ? " · Actif" : ""}
                  {workspace.subscription?.stripeLinked && isTrialing ? " · Carte OK" : ""}
                </Badge>
                {workspace.organization.isDemo ? (
                  <Badge variant="outline" className="text-[10px]">
                    Compte démo
                  </Badge>
                ) : null}
              </div>
            )}
            {!plan && workspace.organization.isDemo ? (
              <Badge variant="outline" className="mt-2.5 text-[10px]">
                Compte démo
              </Badge>
            ) : null}
          </div>
        )}

        {collapsed && isTrialing && trialDays != null && (
          <div
            className="flex justify-center border-b border-border/60 py-2"
            title={trialBadgeLabel(trialDays)}
          >
            <Badge variant="outline" className="px-1.5 text-[10px]">
              {trialDays}j
            </Badge>
          </div>
        )}

        <nav
          className={cn(
            "flex flex-1 flex-col gap-3 overflow-y-auto p-2.5",
            collapsed && "items-center",
          )}
        >
          {navGroups.map((group) => (
            <div
              key={group.label}
              className={cn("flex flex-col gap-0.5", collapsed && "items-center")}
            >
              {!collapsed && (
                <p className="px-2.5 pb-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-colors",
                      collapsed ? "size-10 justify-center" : "gap-2.5 px-2.5 py-2",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <KeenIcon icon={item.icon} className="text-base opacity-80" />
                    {!collapsed && item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-border/60 p-2.5", collapsed && "flex justify-center")}>
          <UserMenu workspace={workspace} collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/90 px-3 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <AppMiniLogo className="size-7" />
            <span className="truncate text-sm font-semibold">{orgName}</span>
            {isTrialing && trialDays != null && (
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {trialBadgeLabel(trialDays)}
              </Badge>
            )}
          </div>
          <UserMenu workspace={workspace} className="w-auto border-none px-1" />
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 py-2 md:hidden">
          {navItems.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium",
                  active ? "bg-primary/10 text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 overflow-x-hidden pb-20">{children}</div>
      </div>

      <AssistantFab onClick={() => setAssistantOpen(true)} />
      <ComplianceAssistantSheet open={assistantOpen} onOpenChange={setAssistantOpen} />
      <TrialLifecycleDialogs workspace={workspace} />
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
