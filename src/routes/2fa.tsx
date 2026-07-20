import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthBrandedLayout } from "@/components/auth/AuthBrandedLayout";
import { TwoFactorForm } from "@/components/auth/TwoFactorForm";
import { getCurrentUser, getPending2FA } from "@/fns/auth";

export const Route = createFileRoute("/2fa")({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    if (user) throw redirect({ to: "/dashboard" });
    if (typeof window !== "undefined" && !getPending2FA()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [{ title: "Vérification 2FA — InvoicePilot AI" }],
  }),
  component: TwoFactorPage,
});

function TwoFactorPage() {
  return (
    <AuthBrandedLayout>
      <TwoFactorForm />
    </AuthBrandedLayout>
  );
}
