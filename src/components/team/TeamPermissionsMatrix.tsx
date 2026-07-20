import {
  Bot,
  CreditCard,
  FileBarChart,
  FileText,
  Inbox,
  KeyRound,
  Network,
  Plug,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/reui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  MEMBER_ROLE_LABELS,
  PERMISSION_META,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from "@/lib/team-roles";
import type { MemberRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const PERMISSION_ICONS: Record<PermissionKey, LucideIcon> = {
  team_manage: Users,
  billing: CreditCard,
  settings: Settings,
  sources: Plug,
  platforms: Network,
  invoices_emit: FileText,
  invoices_receive: Inbox,
  e_reporting: FileBarChart,
  api_keys: KeyRound,
  ai_agent: Bot,
};

const ROLES: MemberRole[] = ["OWNER", "ADMIN", "ACCOUNTANT", "COLLABORATOR"];

/** Matrice permissions — Metronic permissions-toggle, figée sur MemberRole. */
export function TeamPermissionsMatrix({ focusRole }: { focusRole?: MemberRole }) {
  const keys = Object.keys(PERMISSION_META) as PermissionKey[];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            Permissions par rôle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-3 text-left font-medium">Capacité</th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      className={cn(
                        "px-3 py-3 text-center font-medium",
                        focusRole === role && "bg-primary/5",
                      )}
                    >
                      <Badge variant={focusRole === role ? "default" : "secondary"} size="sm">
                        {MEMBER_ROLE_LABELS[role]}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const Icon = PERMISSION_ICONS[key];
                  const meta = PERMISSION_META[key];
                  return (
                    <tr key={key} className="border-b border-border/70">
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40">
                            <Icon className="size-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{meta.title}</p>
                            <p className="text-xs text-muted-foreground">{meta.description}</p>
                          </div>
                        </div>
                      </td>
                      {ROLES.map((role) => (
                        <td
                          key={role}
                          className={cn(
                            "px-3 py-3.5 text-center",
                            focusRole === role && "bg-primary/5",
                          )}
                        >
                          <Switch
                            checked={ROLE_PERMISSIONS[role][key]}
                            disabled
                            aria-label={`${meta.title} — ${MEMBER_ROLE_LABELS[role]}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-center text-xs text-muted-foreground">
            Matrice figée produit — seuls Propriétaire et Administrateur modifient l’équipe.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
