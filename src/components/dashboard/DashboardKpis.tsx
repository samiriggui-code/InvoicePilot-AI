import { AlertTriangle, CheckCircle2, Clock, Euro, ShieldCheck, Users } from "lucide-react";

import type { PageKpi } from "@/components/app/PageKpiCards";
import type { DashboardData } from "@/lib/types";

/** KPIs exclusifs au tableau de bord. */
export function buildDashboardKpis(stats: DashboardData["stats"]): PageKpi[] {
  return [
    {
      label: "Score conformité",
      value: `${stats.complianceScore || "—"}%`,
      hint: "Mentions 2026 · Factur-X",
      icon: ShieldCheck,
      accent: "from-sky-500/15 to-transparent",
      iconClass: "text-sky-700 dark:text-sky-400",
    },
    {
      label: "CA facturé HT",
      value: stats.revenueHt.toLocaleString("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
      hint: "Factures validées",
      icon: Euro,
      accent: "from-emerald-500/15 to-transparent",
      iconClass: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Prêtes / Bloquées",
      value: `${stats.validatedInvoices} / ${stats.blockedErrors}`,
      hint: stats.blockedErrors > 0 ? "Contrôles bloquants actifs" : "Aucune erreur bloquante",
      icon: stats.blockedErrors > 0 ? AlertTriangle : CheckCircle2,
      alert: stats.blockedErrors > 0,
    },
    {
      label: "Équipe & revue",
      value: `${stats.teamMembers}`,
      hint: `${stats.pendingReview} facture(s) en revue`,
      icon: stats.pendingReview > 0 ? Clock : Users,
      accent: "from-violet-500/10 to-transparent",
      iconClass: "text-muted-foreground",
    },
  ];
}
