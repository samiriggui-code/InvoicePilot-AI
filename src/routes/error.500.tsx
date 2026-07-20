import { createFileRoute } from "@tanstack/react-router";

import { Error500 } from "@/errors/error-500";

export const Route = createFileRoute("/error/500")({
  component: Error500Page,
});

function Error500Page() {
  return <Error500 />;
}
