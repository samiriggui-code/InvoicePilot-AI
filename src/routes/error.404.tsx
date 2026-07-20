import { createFileRoute } from "@tanstack/react-router";

import { Error404 } from "@/errors/error-404";

export const Route = createFileRoute("/error/404")({
  component: Error404Page,
});

function Error404Page() {
  return <Error404 />;
}
