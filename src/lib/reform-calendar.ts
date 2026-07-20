/** Calendrier réforme facturation électronique — alertes PME 2027 / GE-ETI 2026. */

export type ReformDeadline = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  label: string;
  appliesTo: "ALL" | "GE_ETI" | "PME_MICRO";
  kind: "reception" | "emission" | "e_reporting";
};

export const REFORM_DEADLINES: ReformDeadline[] = [
  {
    id: "recv-2026",
    date: "2026-09-01",
    label: "Réception e-factures obligatoire (toutes entreprises)",
    appliesTo: "ALL",
    kind: "reception",
  },
  {
    id: "emit-ge-2026",
    date: "2026-09-01",
    label: "Émission + e-reporting obligatoires (GE / ETI)",
    appliesTo: "GE_ETI",
    kind: "emission",
  },
  {
    id: "emit-pme-2027",
    date: "2027-09-01",
    label: "Émission + e-reporting obligatoires (PME / TPE / micro)",
    appliesTo: "PME_MICRO",
    kind: "emission",
  },
];

export function orgSizeBucket(size: string): "GE_ETI" | "PME_MICRO" {
  return size === "GE" || size === "ETI" ? "GE_ETI" : "PME_MICRO";
}

export type ReformAlert = {
  id: string;
  title: string;
  detail: string;
  daysLeft: number;
  urgency: "critical" | "warning" | "info";
  href: string;
};

export function buildReformAlerts(input: { size: string; today?: Date }): ReformAlert[] {
  const today = input.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const bucket = orgSizeBucket(input.size);

  const alerts: ReformAlert[] = [];

  for (const d of REFORM_DEADLINES) {
    if (d.appliesTo !== "ALL" && d.appliesTo !== bucket) continue;
    const target = new Date(d.date + "T00:00:00");
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < -30) continue; // trop passé

    let urgency: ReformAlert["urgency"] = "info";
    if (daysLeft <= 30) urgency = "critical";
    else if (daysLeft <= 120) urgency = "warning";

    const when =
      daysLeft < 0
        ? `Échéance dépassée de ${Math.abs(daysLeft)} j`
        : daysLeft === 0
          ? "Échéance aujourd’hui"
          : `J−${daysLeft}`;

    alerts.push({
      id: d.id,
      title: d.label,
      detail: `${when} · ${new Date(d.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`,
      daysLeft,
      urgency,
      href: d.kind === "e_reporting" || d.kind === "emission" ? "/e-reporting" : "/compliance",
    });
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}
