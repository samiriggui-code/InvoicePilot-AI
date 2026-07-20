import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";

import { AppEmptyState } from "@/components/app/AppEmptyState";
import type { DashboardData } from "@/lib/types";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l’instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

const VISIBLE = 5;

export function RecentActivityFeed({ items }: { items: DashboardData["recentActivity"] }) {
  const visible = items.slice(0, VISIBLE);
  const remaining = Math.max(0, items.length - VISIBLE);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
      <div className="border-b border-border/60 px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold tracking-tight">Activité récente</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Dernières actions sur toute l’organisation
        </p>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-1 items-center p-5">
          <AppEmptyState
            icon={Activity}
            title="Pas encore d’activité"
            description="Les actions équipe, sources, factures et paramètres apparaîtront ici."
          />
        </div>
      ) : (
        <>
          <ul className="flex-1 divide-y divide-border/60">
            {visible.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3 sm:px-6">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{item.label}</p>
                  {item.actor ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.actor}</p>
                  ) : null}
                </div>
                <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {relativeTime(item.createdAt)}
                </time>
              </li>
            ))}
          </ul>
          <div className="border-t border-border/60 px-5 py-2.5 text-center sm:px-6">
            <Link
              to="/team"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              {remaining > 0
                ? `Voir ${remaining} autre${remaining > 1 ? "s" : ""} →`
                : "Journal équipe →"}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
