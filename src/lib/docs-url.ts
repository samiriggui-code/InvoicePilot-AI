/**
 * URL de la doc Mintlify.
 * Local : http://localhost:3004
 * Staging/prod : https://docs.<domaine> (ex. docs.global-it-ss.com)
 */
function hostnameFromAppUrl(): string | null {
  if (typeof process === "undefined") return null;
  const raw = process.env.APP_URL || process.env.PUBLIC_URL;
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

export function getDocsUrl(): string {
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_DOCS_URL
      ? String(import.meta.env.VITE_DOCS_URL).trim()
      : "";
  const fromProcess =
    typeof process !== "undefined"
      ? String(process.env.DOCS_URL || process.env.VITE_DOCS_URL || "").trim()
      : "";
  const fromEnv = (fromProcess || fromVite).replace(/\/$/, "");

  const host =
    (typeof window !== "undefined" ? window.location.hostname : null) || hostnameFromAppUrl() || "";

  const isLocal = !host || host === "localhost" || host === "127.0.0.1";

  if (isLocal) {
    return fromEnv || "http://localhost:3004";
  }

  if (fromEnv && !fromEnv.includes("localhost")) {
    return fromEnv;
  }

  const root = host.replace(/^(www|app|api)\./, "");
  return `https://docs.${root}`;
}

export function docsHref(path = "/") {
  const base = getDocsUrl().replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p === "/" ? "" : p}`;
}
