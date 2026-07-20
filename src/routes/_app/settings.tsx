import { createFileRoute } from "@tanstack/react-router";
import { Building2, KeyRound, Palette, Shield } from "lucide-react";

import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { SettingsSidebarLayout } from "@/components/settings/SettingsSidebarLayout";
import {
  ApiKeysSection,
  AppearanceSection,
  NotificationsSection,
  OrganizationSection,
  ProfileSection,
  SecuritySection,
} from "@/components/settings/SettingsSections";
import { pageGuide } from "@/lib/page-guides";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Mes paramètres — InvoicePilot AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { workspace } = Route.useRouteContext();

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Compte · Paramètres"
        title="Mes paramètres"
        description={pageGuide("settings").blurb}
        kpis={[
          {
            label: "Organisation",
            value: workspace.organization.size,
            hint: workspace.organization.legalName,
            icon: Building2,
          },
          {
            label: "Votre rôle",
            value: workspace.organization.role,
            hint: "Droits sur ce dossier",
            icon: Shield,
          },
          {
            label: "Sécurité",
            value: "2FA / sessions",
            hint: "Volet Sécurité",
            icon: KeyRound,
          },
          {
            label: "Apparence",
            value: "Thème",
            hint: "Clair / sombre",
            icon: Palette,
          },
        ]}
      />

      <SettingsSidebarLayout
        panels={{
          settings_profile: <ProfileSection workspace={workspace} />,
          settings_organization: <OrganizationSection workspace={workspace} />,
          settings_security: <SecuritySection />,
          settings_api_keys: <ApiKeysSection workspace={workspace} />,
          settings_appearance: <AppearanceSection />,
          settings_notifications: <NotificationsSection workspace={workspace} />,
        }}
      />

      <PageGuide page="settings" />
    </AppPageShell>
  );
}
