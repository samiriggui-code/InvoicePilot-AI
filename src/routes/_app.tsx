import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app/AppShell";
import { getWorkspace } from "@/fns/app-context";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const workspace = await getWorkspace();
    if (!workspace) {
      throw redirect({
        to: "/login",
        search: { redirect: location.pathname },
      });
    }
    return { workspace };
  },
  component: AppLayout,
});

function AppLayout() {
  const { workspace } = Route.useRouteContext();

  return (
    <AppShell workspace={workspace}>
      <Outlet />
    </AppShell>
  );
}
