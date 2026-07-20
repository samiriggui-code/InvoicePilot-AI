import { useCallback, useEffect, useState, type ReactNode } from "react";

import { SETTINGS_NAV, type SettingsNavItem } from "@/components/settings/SettingsSidebarNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function readHashPanel(): string {
  if (typeof window === "undefined") return SETTINGS_NAV[0]!.target;
  const hash = window.location.hash.replace(/^#/, "");
  if (SETTINGS_NAV.some((item) => item.target === hash)) return hash;
  return SETTINGS_NAV[0]!.target;
}

export function SettingsSidebarLayout({
  panels,
}: {
  /** Clé = target SETTINGS_NAV (ex. settings_profile) */
  panels: Record<string, ReactNode>;
}) {
  const isMobile = useIsMobile();
  const [active, setActive] = useState(readHashPanel);

  useEffect(() => {
    const onHash = () => setActive(readHashPanel());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const select = useCallback((item: SettingsNavItem) => {
    setActive(item.target);
    const url = `${window.location.pathname}${window.location.search}#${item.target}`;
    window.history.replaceState(null, "", url);
  }, []);

  const nav = (
    <nav
      className={cn(isMobile ? "flex min-w-max gap-1" : "flex flex-col gap-0.5")}
      aria-label="Sections paramètres"
    >
      {SETTINGS_NAV.map((item) => {
        const isActive = active === item.target;
        return (
          <button
            key={item.target}
            type="button"
            onClick={() => select(item)}
            className={cn(
              isMobile
                ? "shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                : "rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              isActive
                ? isMobile
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "bg-primary/10 font-medium text-foreground"
                : isMobile
                  ? "border-border/70 bg-card text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            {item.title}
          </button>
        );
      })}
    </nav>
  );

  const panel = panels[active] ?? panels[SETTINGS_NAV[0]!.target];

  if (isMobile) {
    return (
      <div className="flex w-full flex-col gap-6">
        <div className="overflow-x-auto pb-1">{nav}</div>
        <div className="min-w-0" role="tabpanel">
          {panel}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 grow items-start gap-8">
      <aside className="w-44 shrink-0 self-start lg:w-52">
        <div className="sticky top-6">
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Réglages
          </p>
          {nav}
        </div>
      </aside>
      <div className="min-w-0 grow" role="tabpanel">
        {panel}
      </div>
    </div>
  );
}
