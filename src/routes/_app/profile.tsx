import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, KeyRound, Mail, UserRound } from "lucide-react";

import { AppPageShell } from "@/components/app/AppPageHero";
import { PageKpiCards } from "@/components/app/PageKpiCards";
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from "@/components/metronic/toolbar";
import { UserProfileView } from "@/components/profile/UserProfileView";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Mon profil — InvoicePilot AI" }] }),
  component: ProfilePage,
});

/** Page profil — réf. Metronic account/home/user-profile */
function ProfilePage() {
  const { workspace } = Route.useRouteContext();
  const user = workspace.user;
  const org = workspace.organization;

  return (
    <AppPageShell>
      <div className="flex flex-col gap-5 lg:gap-7">
        <Toolbar>
          <ToolbarHeading>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Compte · Profil
            </p>
            <ToolbarPageTitle text="Mon profil" />
            <ToolbarDescription>
              Identité de votre compte — distinct de l’organisation facturante.
            </ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">Paramètres</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/team">Utilisateurs</Link>
            </Button>
          </ToolbarActions>
        </Toolbar>

        <PageKpiCards
          items={[
            {
              label: "Identité",
              value: user.name?.trim() ? "OK" : "À compléter",
              hint: user.name?.trim() || "Nom affiché",
              icon: UserRound,
              alert: !user.name?.trim(),
            },
            {
              label: "E-mail",
              value: user.email.includes("@") ? "OK" : "—",
              hint: user.email,
              icon: Mail,
            },
            {
              label: "Rôle org",
              value: org.role,
              hint: org.tradeName ?? org.legalName,
              icon: Building2,
            },
            {
              label: "Avatar",
              value: user.avatarKey ? "Personnalisé" : "Défaut",
              hint: "Galerie Metronic",
              icon: KeyRound,
            },
          ]}
        />

        <UserProfileView workspace={workspace} />
      </div>
    </AppPageShell>
  );
}
