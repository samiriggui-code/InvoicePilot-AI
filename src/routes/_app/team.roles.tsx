import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { TeamRolesGrid } from "@/components/team/TeamRolesGrid";
import { listTeamMembers } from "@/fns/team";
import type { MemberRole } from "@/lib/types";

export const Route = createFileRoute("/_app/team/roles")({
  head: () => ({ meta: [{ title: "Rôles — InvoicePilot AI" }] }),
  component: TeamRolesPage,
});

const EMPTY: Record<MemberRole, number> = {
  OWNER: 0,
  ADMIN: 0,
  ACCOUNTANT: 0,
  COLLABORATOR: 0,
};

/** Sous-page Rôles — Metronic account/members/roles */
function TeamRolesPage() {
  const list = useServerFn(listTeamMembers);
  const [counts, setCounts] = useState(EMPTY);

  useEffect(() => {
    void (async () => {
      const data = await list();
      const next = { ...EMPTY };
      for (const m of data.members) {
        next[m.role] += 1;
      }
      setCounts(next);
    })();
  }, [list]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Rôles</h2>
        <p className="text-sm text-muted-foreground">
          Quatre rôles système alignés sur le schéma Prisma — pas de mélange entre organisations.
        </p>
      </div>
      <TeamRolesGrid counts={counts} />
    </div>
  );
}
