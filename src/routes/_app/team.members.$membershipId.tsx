import { createFileRoute } from "@tanstack/react-router";

import { TeamMemberProfile } from "@/components/team/TeamMemberProfile";

export const Route = createFileRoute("/_app/team/members/$membershipId")({
  head: () => ({ meta: [{ title: "Profil membre — InvoicePilot AI" }] }),
  component: TeamMemberProfilePage,
});

function TeamMemberProfilePage() {
  const { membershipId } = Route.useParams();
  return <TeamMemberProfile membershipId={membershipId} />;
}
