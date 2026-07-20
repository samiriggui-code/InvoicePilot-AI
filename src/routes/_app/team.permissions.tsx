import { createFileRoute } from "@tanstack/react-router";

import { TeamPermissionsMatrix } from "@/components/team/TeamPermissionsMatrix";

export const Route = createFileRoute("/_app/team/permissions")({
  head: () => ({ meta: [{ title: "Permissions — InvoicePilot AI" }] }),
  component: TeamPermissionsPage,
});

/** Sous-page Permissions — Metronic account/members/permissions-toggle */
function TeamPermissionsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Permissions</h2>
        <p className="text-sm text-muted-foreground">
          Capacités accordées à chaque rôle au sein de votre organisation uniquement.
        </p>
      </div>
      <TeamPermissionsMatrix />
    </div>
  );
}
