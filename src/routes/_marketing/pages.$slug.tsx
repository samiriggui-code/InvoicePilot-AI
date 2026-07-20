import { createFileRoute, redirect } from "@tanstack/react-router";

import { getMarketingRoute } from "@/lib/marketing-registry";

/** Anciennes URLs /pages/:slug → /:slug */
export const Route = createFileRoute("/_marketing/pages/$slug")({
  beforeLoad: ({ params }) => {
    const page = getMarketingRoute(params.slug);
    if (!page) {
      throw redirect({ to: "/" });
    }
    throw redirect({
      to: "/$slug",
      params: { slug: params.slug },
    });
  },
});
