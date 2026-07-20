import { createFileRoute, notFound } from "@tanstack/react-router";

import { getMarketingRoute } from "@/lib/marketing-registry";

export const Route = createFileRoute("/_marketing/$slug")({
  head: ({ params }) => {
    const page = getMarketingRoute(params.slug);
    return {
      meta: [
        {
          title: page ? `${page.title} — InvoicePilot AI` : "Page — InvoicePilot AI",
        },
        { name: "description", content: page?.description ?? "" },
      ],
    };
  },
  component: MarketingPageView,
});

function MarketingPageView() {
  const { slug } = Route.useParams();
  const page = getMarketingRoute(slug);
  if (!page) throw notFound();
  return <>{page.render()}</>;
}
