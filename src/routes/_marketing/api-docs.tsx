import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { docsHref } from "@/lib/docs-url";

/** Ancienne route /api-docs → Mintlify (docs.global-it-ss.com / localhost:3004). */
export const Route = createFileRoute("/_marketing/api-docs")({
  head: () => ({
    meta: [{ title: "Documentation API — InvoicePilot AI" }],
  }),
  component: ApiDocsRedirect,
});

function ApiDocsRedirect() {
  useEffect(() => {
    window.location.replace(docsHref("/introduction"));
  }, []);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        La documentation API est désormais servie par Mintlify.
      </p>
      <a
        href={docsHref("/introduction")}
        className="text-sm font-medium text-primary hover:underline"
      >
        Continuer vers {docsHref("/introduction")}
      </a>
      <p className="text-xs text-muted-foreground">
        Local : <code className="rounded bg-muted px-1">npm run docs:dev</code> (port 3004)
      </p>
    </main>
  );
}
