import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import { Error404, Error500 } from "@/errors/error-routing";
import { ErrorLayout } from "@/layouts/error/layout";
import { ThemeProvider } from "../components/theme/ThemeProvider";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <ErrorLayout>
      <Error404 />
    </ErrorLayout>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const detail = import.meta.env.DEV && error?.message ? error.message : undefined;

  return (
    <ErrorLayout>
      <Error500
        detail={detail}
        onRetry={() => {
          router.invalidate();
          reset();
        }}
      />
    </ErrorLayout>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "InvoicePilot AI" },
      { name: "description", content: "Plateforme de conformité facture pilotée par l'IA" },
      { name: "author", content: "InvoicePilot AI" },
      { property: "og:title", content: "InvoicePilot AI" },
      { property: "og:description", content: "Plateforme de conformité facture pilotée par l'IA" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/media/app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/media/app/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/media/app/favicon.svg?v=20260719" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/media/app/icon.png?v=20260719" },
      { rel: "shortcut icon", href: "/favicon.ico?v=20260719" },
      { rel: "apple-touch-icon", href: "/media/app/apple-touch-icon.png?v=20260719" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("invoicepilot-theme");document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
