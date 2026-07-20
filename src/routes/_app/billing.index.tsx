import { createFileRoute } from "@tanstack/react-router";

import { BillingEnterpriseView } from "@/components/billing/BillingEnterprise";

export const Route = createFileRoute("/_app/billing/")({
  component: BillingOverviewPage,
});

function BillingOverviewPage() {
  const { workspace } = Route.useRouteContext();
  return <BillingEnterpriseView workspace={workspace} />;
}
