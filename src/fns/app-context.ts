import { createServerFn } from "@tanstack/react-start";

export const getWorkspace = createServerFn({ method: "GET" }).handler(async () => {
  const { loadWorkspace } = await import("@/lib/workspace.server");
  return loadWorkspace();
});
