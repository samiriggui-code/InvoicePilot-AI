import { Calculator, Fingerprint, Settings, Users } from "lucide-react";

import { CardRole } from "@/components/metronic/card-role";
import { MEMBER_ROLE_LABELS, ROLE_DESCRIPTIONS, type MemberRole } from "@/lib/team-roles";

const ROLE_UI: Record<
  MemberRole,
  {
    icon: typeof Settings;
    stroke: string;
    fill: string;
    iconClass: string;
  }
> = {
  OWNER: {
    icon: Settings,
    stroke: "stroke-blue-200 dark:stroke-blue-950",
    fill: "fill-blue-50 dark:fill-blue-950/30",
    iconClass: "size-5 text-blue-400",
  },
  ADMIN: {
    icon: Fingerprint,
    stroke: "stroke-emerald-200 dark:stroke-emerald-950",
    fill: "fill-emerald-50 dark:fill-emerald-950/30",
    iconClass: "size-5 text-emerald-400",
  },
  ACCOUNTANT: {
    icon: Calculator,
    stroke: "stroke-orange-200 dark:stroke-orange-950",
    fill: "fill-orange-50 dark:fill-orange-950/30",
    iconClass: "size-5 text-orange-400",
  },
  COLLABORATOR: {
    icon: Users,
    stroke: "stroke-violet-200 dark:stroke-violet-950",
    fill: "fill-violet-50 dark:fill-violet-950/30",
    iconClass: "size-5 text-violet-400",
  },
};

/** Grille rôles — Metronic account/members/roles. */
export function TeamRolesGrid({ counts }: { counts: Record<MemberRole, number> }) {
  const roles: MemberRole[] = ["OWNER", "ADMIN", "ACCOUNTANT", "COLLABORATOR"];

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2">
      {roles.map((role) => {
        const ui = ROLE_UI[role];
        const Icon = ui.icon;
        const n = counts[role] ?? 0;
        return (
          <CardRole
            key={role}
            title={MEMBER_ROLE_LABELS[role]}
            subTitle="Rôle système"
            description={ROLE_DESCRIPTIONS[role]}
            team={`${n} personne${n > 1 ? "s" : ""}`}
            href="/team/permissions"
            badge={{
              size: "size-[44px]",
              stroke: ui.stroke,
              fill: ui.fill,
              badge: <Icon className={ui.iconClass} />,
            }}
          />
        );
      })}
    </div>
  );
}
