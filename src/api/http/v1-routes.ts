/**
 * Handlers HTTP /v1 — à brancher sur le routeur TanStack / serveur.
 * Contrat figé ; implémentation progressive.
 *
 * POST /v1/invoices/import
 * POST /v1/invoices/validate
 * POST /v1/invoices/remediate
 * POST /v1/invoices/render
 * POST /v1/invoices/submit
 * GET  /v1/inbox
 * POST /v1/webhooks/pa/:slug
 */

export const V1_ROUTES = [
  { method: "POST", path: "/v1/invoices/import", stage: "INGEST" },
  { method: "POST", path: "/v1/invoices/validate", stage: "VALIDATE" },
  { method: "POST", path: "/v1/invoices/remediate", stage: "REMEDIATE" },
  { method: "POST", path: "/v1/invoices/render", stage: "RENDER" },
  { method: "POST", path: "/v1/invoices/submit", stage: "SUBMIT" },
  { method: "GET", path: "/v1/inbox", stage: "RECEIVE" },
  { method: "POST", path: "/v1/webhooks/pa/:slug", stage: "NOTIFY" },
] as const;
