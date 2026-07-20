/** OpenAPI 3.1 — InvoicePilot AI API (sandbox + live) */

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "InvoicePilot AI API",
    version: "2026.2",
    description:
      "API conformité facture électronique (solution compatible). Auth sandbox : Bearer ip_sandbox_demo. Auth live : clé ip_live_… créée dans Réglages. Endpoints validate → remediate → render → emit.",
    contact: { name: "InvoicePilot AI", url: "https://invoicepilot.ai" },
  },
  servers: [{ url: "/api/v1", description: "Same-origin" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "ip_sandbox_demo ou ip_live_…",
      },
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-Api-Key",
      },
    },
  },
  security: [{ bearerAuth: [] }, { apiKey: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Santé API",
        security: [],
        responses: { "200": { description: "OK" } },
      },
    },
    "/invoices/validate": {
      post: {
        summary: "Valider mentions 2026 + format",
        responses: { "200": { description: "Résultat + suggestions" } },
      },
    },
    "/invoices/remediate": {
      post: {
        summary: "Corriger / enrichir (patches + lookup entreprise)",
        description:
          "Applique patches (buyer_siren, operation_category…) et tente un enrichissement SIREN via recherche-entreprises si legal_name fourni.",
        responses: { "200": { description: "Facture remédiée + validation" } },
      },
    },
    "/invoices/render": {
      post: {
        summary: "Générer Factur-X XML",
        responses: {
          "200": { description: "XML + summary" },
          "422": { description: "Contrôles bloquants" },
        },
      },
    },
    "/invoices/emit": {
      post: {
        summary: "Émettre (sandbox ou pending PA)",
        responses: {
          "200": { description: "Accepté" },
          "422": { description: "Bloqué" },
        },
      },
    },
    "/sources/import": {
      post: {
        summary: "Simuler import Sources",
        responses: { "200": { description: "Import simulé" } },
      },
    },
    "/inbox": {
      get: {
        summary: "Réception PA — inbox",
        responses: { "200": { description: "Liste" } },
      },
    },
    "/inbox/{id}/ack": {
      post: {
        summary: "Approuver / refuser réception",
        responses: { "200": { description: "Décision" } },
      },
    },
    "/compliance/score": {
      get: {
        summary: "Score de conformité (live = org de la clé)",
        responses: { "200": { description: "Score" } },
      },
    },
    "/webhooks": {
      post: {
        summary: "Enregistrer un webhook",
        responses: { "200": { description: "Webhook créé" } },
      },
    },
  },
} as const;
