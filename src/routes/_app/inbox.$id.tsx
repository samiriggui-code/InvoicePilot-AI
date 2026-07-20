import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { PurchaseReceptionDetail } from "@/components/reception/PurchaseReceptionDetail";
import { getInvoiceDetail } from "@/fns/invoice-remediation";

export const Route = createFileRoute("/_app/inbox/$id")({
  head: () => ({ meta: [{ title: "Réception PA — InvoicePilot AI" }] }),
  loader: async ({ params }) => {
    const detail = await getInvoiceDetail({ data: { invoiceId: params.id } });
    if (!detail) throw notFound();
    if (detail.direction !== "PURCHASE") {
      throw redirect({ to: "/invoices/$id", params: { id: params.id } });
    }
    return detail;
  },
  component: InboxInvoicePage,
});

function InboxInvoicePage() {
  const detail = Route.useLoaderData();
  return <PurchaseReceptionDetail detail={detail} />;
}
