import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Faq } from "@/components/metronic/faq";
import { Help } from "@/components/metronic/help";
import { InvitePeopleCard } from "@/components/team/InvitePeopleCard";
import { TeamMembersGrid } from "@/components/team/TeamMembersGrid";
import { pageGuide } from "@/lib/page-guides";
import { canManageTeam } from "@/lib/team-roles";

export const Route = createFileRoute("/_app/team/")({
  head: () => ({ meta: [{ title: "Mon équipe — InvoicePilot AI" }] }),
  component: TeamMembersPage,
});

/** Page principale — Metronic account/members/team-members */
function TeamMembersPage() {
  const { workspace } = Route.useRouteContext();
  const [refreshKey, setRefreshKey] = useState(0);
  const canManage = canManageTeam(workspace.organization.role);

  return (
    <div className="grid gap-5 lg:gap-7">
      <TeamMembersGrid refreshKey={refreshKey} />
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-7">
        <InvitePeopleCard
          canManage={canManage}
          refreshKey={refreshKey}
          onInvited={() => setRefreshKey((k) => k + 1)}
        />
        <Faq items={pageGuide("team").faq} />
      </div>
      <Help helpUrl="/team/roles" supportUrl="mailto:support@invoicepilot.ai" />
    </div>
  );
}
