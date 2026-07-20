import { createFileRoute, Outlet } from "@tanstack/react-router";

import { ErrorLayout } from "@/layouts/error/layout";

export const Route = createFileRoute("/error")({
  component: () => (
    <ErrorLayout>
      <Outlet />
    </ErrorLayout>
  ),
});
