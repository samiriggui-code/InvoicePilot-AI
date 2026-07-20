import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";

export const Route = createFileRoute("/_marketing")({
  component: MarketingLayout,
});

function MarketingLayout() {
  return (
    <div className="marketing-site flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
