import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/invoices")({
  component: InvoicesLayout,
});

/** Layout parent — obligatoire pour /invoices/$id et /invoices/new */
function InvoicesLayout() {
  return <Outlet />;
}
