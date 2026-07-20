import { getCookie } from "@tanstack/react-start/server";

import { ORG_COOKIE } from "@/fns/cabinet";

export function readActiveOrgCookie(): string | null {
  try {
    const v = getCookie(ORG_COOKIE);
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}
