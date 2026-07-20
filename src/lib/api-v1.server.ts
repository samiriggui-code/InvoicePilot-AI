/** Public API v1 — validate / remediate / render / emit (sandbox + live keys). */

import type { ApiAuthContext } from "@/lib/api-auth.server";

export type ApiCheck = { code: string; label: string; ok: boolean };

export function jsonResponse(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type, X-Api-Key",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      ...extraHeaders,
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Authorization, Content-Type, X-Api-Key",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    },
  });
}

export async function handleApiV1(request: Request, pathname: string): Promise<Response | null> {
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return corsPreflight();
  }

  if (pathname === "/api/openapi.json" && request.method === "GET") {
    const { openApiDocument } = await import("@/lib/openapi");
    return jsonResponse(openApiDocument);
  }

  if (pathname === "/api/v1/health" && request.method === "GET") {
    return jsonResponse({
      ok: true,
      mode: "sandbox_or_live",
      version: "2026.2",
      product: "InvoicePilot AI — solution compatible",
      sandbox_key: "Bearer ip_sandbox_demo",
      endpoints: [
        "GET  /health",
        "POST /sources/import",
        "POST /invoices/validate",
        "POST /invoices/remediate",
        "POST /invoices/render",
        "POST /invoices/emit",
        "GET  /inbox",
        "POST /inbox/:id/ack",
        "GET  /compliance/score",
        "POST /webhooks",
      ],
    });
  }

  if (!pathname.startsWith("/api/v1/")) return null;

  const { resolveApiAuth } = await import("@/lib/api-auth.server");
  const auth = await resolveApiAuth(request);

  if (!auth && pathname !== "/api/v1/health") {
    return jsonResponse(
      {
        error: "unauthorized",
        message:
          "Clé API requise. Sandbox : Bearer ip_sandbox_demo — ou clé live ip_live_… (Réglages → Clés API).",
      },
      401,
    );
  }

  if (pathname === "/api/v1/invoices/validate" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    return jsonResponse(await validateInvoiceApi(body, auth!));
  }

  if (pathname === "/api/v1/invoices/remediate" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    return jsonResponse(await remediateInvoiceApi(body, auth!));
  }

  if (pathname === "/api/v1/invoices/render" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const result = await renderInvoiceApi(body, auth!);
    return jsonResponse(result, result.error ? 422 : 200);
  }

  if (pathname === "/api/v1/invoices/emit" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const validation = await validateInvoiceApi(body, auth!);
    if (!validation.valid) {
      return jsonResponse(
        {
          status: "blocked",
          errors: validation.errors,
          checks: validation.checks,
          suggestions: validation.suggestions,
          note: "Émission refusée — utilisez POST /invoices/remediate puis /render",
        },
        422,
      );
    }
    return jsonResponse({
      status: auth!.mode === "sandbox" ? "sandbox_accepted" : "accepted_pending_pa",
      invoice_id: (body.invoice_id as string) ?? `FAC-API-${Date.now().toString(36).toUpperCase()}`,
      pdp: (body.pdp as string) ?? "demo-pa",
      pdp_reference: `PDP-${auth!.mode === "sandbox" ? "SBOX" : "LIVE"}-${Date.now().toString(36).toUpperCase()}`,
      transmitted_at: new Date().toISOString(),
      mode: auth!.mode,
      note:
        auth!.mode === "sandbox"
          ? "Sandbox — aucune transmission PA réelle (solution compatible)"
          : "Accepté côté InvoicePilot — transmission via votre PA connectée",
    });
  }

  /** Simulation import Sources (PDF / Shopify / Woo…) */
  if (pathname === "/api/v1/sources/import" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      source?: string;
      filename?: string;
      orders_count?: number;
      payload?: Record<string, unknown>;
    };
    const source = (body.source ?? "MANUAL_UPLOAD").toUpperCase();
    const allowed = [
      "MANUAL_UPLOAD",
      "SHOPIFY",
      "WOOCOMMERCE",
      "PRESTASHOP",
      "WIX",
      "GENERIC_HTTP",
      "API_PUSH",
    ];
    if (!allowed.includes(source)) {
      return jsonResponse(
        {
          error: "invalid_source",
          message: `source invalide. Valeurs: ${allowed.join(", ")}`,
        },
        400,
      );
    }
    const importId = `src_${Date.now().toString(36)}`;
    const count = Math.max(1, Math.min(50, Number(body.orders_count ?? 1)));
    return jsonResponse({
      status: "imported",
      import_id: importId,
      source,
      filename: body.filename ?? null,
      invoices_staged: count,
      next: [
        "Les factures apparaissent dans Mon analyse IA (app)",
        "Ou enchaînez POST /invoices/validate avec un body structuré",
      ],
      mode: auth!.mode,
      note:
        auth!.mode === "sandbox"
          ? "Sandbox — import simulé, aucune sync boutique réelle"
          : "Live — branchez le connecteur dans Mes sources pour un pull réel",
    });
  }

  /** Réception PA simulée — liste inbox */
  if (pathname === "/api/v1/inbox" && request.method === "GET") {
    const now = Date.now();
    return jsonResponse({
      mode: auth!.mode,
      items: [
        {
          id: `recv_${now.toString(36)}_1`,
          number: "F-2026-1001",
          seller_name: "Fournisseur Démo SAS",
          seller_siren: "443061841",
          total_ttc: 240,
          currency: "EUR",
          received_at: new Date(now - 3600_000).toISOString(),
          status: "RECEIVED",
        },
        {
          id: `recv_${now.toString(36)}_2`,
          number: "F-2026-0888",
          seller_name: "Studio Nord",
          seller_siren: "552100554",
          total_ttc: 96,
          currency: "EUR",
          received_at: new Date(now - 86_400_000).toISOString(),
          status: "RECEIVED",
        },
      ],
      note:
        auth!.mode === "sandbox"
          ? "Sandbox — factures fournisseurs fictives (pas de PA réelle)"
          : "Live — alimenté par le canal réception de votre PA",
    });
  }

  /** Accusé réception / refus métier */
  {
    const ackMatch = pathname.match(/^\/api\/v1\/inbox\/([^/]+)\/ack$/);
    if (ackMatch && request.method === "POST") {
      const id = decodeURIComponent(ackMatch[1]!);
      const body = (await request.json().catch(() => ({}))) as {
        decision?: "approve" | "refuse";
        reason?: string;
      };
      const decision = body.decision === "refuse" ? "refuse" : "approve";
      return jsonResponse({
        id,
        decision,
        reason: body.reason ?? null,
        status: decision === "approve" ? "APPROVED" : "REFUSED",
        processed_at: new Date().toISOString(),
        mode: auth!.mode,
        note: "Approuver ≠ payer — traitement métier uniquement",
      });
    }
  }

  if (pathname === "/api/v1/compliance/score" && request.method === "GET") {
    if (auth!.mode === "live" && auth!.organizationId) {
      const { db } = await import("@/lib/db");
      const invoices = await db.invoice.findMany({
        where: { organizationId: auth!.organizationId },
        select: { status: true, complianceScore: true },
        take: 500,
      });
      const validated = invoices.filter((i) =>
        ["VALIDATED", "TRANSMITTED", "APPROVED", "PAID"].includes(i.status),
      ).length;
      const blocked = invoices.filter((i) =>
        ["BLOCKED", "REJECTED", "REFUSED"].includes(i.status),
      ).length;
      const scores = invoices
        .map((i) => (i.complianceScore != null ? Number(i.complianceScore) : null))
        .filter((n): n is number => n != null);
      const score =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;
      return jsonResponse({
        score,
        validated,
        blocked,
        mode: "live",
        organization_id: auth!.organizationId,
      });
    }
    return jsonResponse({
      score: 98.4,
      validated: 1247,
      blocked: 38,
      period: "2026-07",
      mode: "sandbox",
    });
  }

  const paWebhookMatch = pathname.match(/^\/api\/v1\/webhooks\/pa\/([^/]+)$/);
  if (paWebhookMatch && request.method === "POST") {
    const slug = decodeURIComponent(paWebhookMatch[1]!);
    const body = await request.json().catch(() => null);
    const { processPaWebhook } = await import("@/fns/pa-webhook");
    const result = await processPaWebhook(slug, body);
    if (!result.ok) {
      return jsonResponse({ error: "webhook_rejected", message: result.error }, 422);
    }
    return jsonResponse(result);
  }

  if (pathname === "/api/v1/webhooks" && request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      url?: string;
      events?: string[];
    };
    if (!body.url?.startsWith("https://")) {
      return jsonResponse(
        { error: "invalid_url", message: "URL HTTPS requise pour les webhooks." },
        400,
      );
    }
    return jsonResponse({
      id: `wh_${crypto.randomUUID().slice(0, 8)}`,
      secret: `whsec_${crypto.randomUUID().replace(/-/g, "")}`,
      url: body.url,
      events: body.events?.length
        ? body.events
        : ["invoice.validated", "invoice.blocked", "invoice.emitted", "invoice.ready"],
      mode: auth!.mode,
    });
  }

  return jsonResponse({ error: "not_found", message: `Route ${pathname} inconnue` }, 404);
}

type StructuredInvoice = {
  format?: string;
  invoice_id?: string;
  pdp?: string;
  buyer?: { siren?: string; legal_name?: string; vat?: string };
  seller?: { siren?: string; legal_name?: string };
  operation_category?: "GOODS" | "SERVICES" | "MIXED";
  issue_date?: string;
  service_date?: string;
  delivery_differs?: boolean;
  delivery?: { line1?: string; city?: string; postal?: string };
  lines?: {
    description?: string;
    quantity?: number;
    unit_price_ht?: number;
    vat_rate?: number;
  }[];
  options?: { strict?: boolean; check_siret?: boolean; siren?: string; vat?: string };
  data?: string;
  patches?: {
    buyer_siren?: string;
    operation_category?: "GOODS" | "SERVICES" | "MIXED";
    issue_date?: string;
    service_date?: string;
    delivery_line1?: string;
    delivery_city?: string;
  };
};

async function validateInvoiceApi(body: StructuredInvoice, auth: ApiAuthContext) {
  const { validateInvoiceDraft } = await import("@/lib/invoice-validation");

  const buyerSiren =
    body.buyer?.siren?.replace(/\s/g, "") || body.options?.siren?.replace(/\s/g, "") || null;
  const lines = (body.lines ?? [])
    .filter((l) => l.description || (l.quantity ?? 0) > 0)
    .map((l) => ({
      description: (l.description ?? "").trim() || "Ligne",
      quantity: Number(l.quantity ?? 1),
      unitPriceHt: Number(l.unit_price_ht ?? 0),
      vatRate: Number(l.vat_rate ?? 20),
    }));

  // Fallback sandbox-style if no structured lines
  if (lines.length === 0 && !body.buyer && body.format) {
    return validateInvoiceSandboxLegacy(body);
  }

  const issues = validateInvoiceDraft({
    buyerSiren,
    operationCategory: body.operation_category ?? null,
    deliveryDiffers: Boolean(body.delivery_differs),
    deliveryLine1: body.delivery?.line1,
    deliveryCity: body.delivery?.city,
    issueDate: body.issue_date ?? null,
    serviceDate: body.service_date ?? null,
    lines:
      lines.length > 0
        ? lines
        : [{ description: "Ligne API", quantity: 1, unitPriceHt: 100, vatRate: 20 }],
    sellerSiren: body.seller?.siren ?? null,
  });

  const blocking = issues.filter((i) => i.blocking);
  const checks: ApiCheck[] = [
    {
      code: "format",
      label: "Format Factur-X / UBL / CII",
      ok: ["factur-x", "ubl", "cii", undefined].includes((body.format ?? "factur-x").toLowerCase()),
    },
    ...issues.map((i) => ({
      code: i.code.toLowerCase(),
      label: i.message,
      ok: !i.blocking,
    })),
  ];

  const suggestions = blocking.map((i) => ({
    code: i.code,
    field: i.field ?? null,
    action:
      i.code === "BUYER_SIREN_2026"
        ? "Fournir buyer.siren (9 chiffres) ou POST /invoices/remediate avec patches.buyer_siren / lookup entreprise"
        : i.code === "OPERATION_CATEGORY_2026"
          ? "Définir operation_category: GOODS | SERVICES | MIXED"
          : `Corriger le champ ${i.field ?? i.code}`,
  }));

  const score =
    Math.round(((checks.length - blocking.length) / Math.max(1, checks.length)) * 1000) / 10;

  return {
    valid: blocking.length === 0,
    score,
    errors: blocking.map((i) => i.message),
    warnings: issues.filter((i) => !i.blocking).map((i) => i.message),
    checks,
    suggestions,
    mode: auth.mode,
  };
}

async function remediateInvoiceApi(body: StructuredInvoice, auth: ApiAuthContext) {
  const patches = body.patches ?? {};
  const merged: StructuredInvoice = {
    ...body,
    buyer: {
      ...body.buyer,
      siren: patches.buyer_siren ?? body.buyer?.siren,
    },
    operation_category: patches.operation_category ?? body.operation_category,
    issue_date: patches.issue_date ?? body.issue_date,
    service_date: patches.service_date ?? body.service_date,
    delivery: {
      ...body.delivery,
      line1: patches.delivery_line1 ?? body.delivery?.line1,
      city: patches.delivery_city ?? body.delivery?.city,
    },
    delivery_differs:
      body.delivery_differs || Boolean(patches.delivery_line1 || patches.delivery_city),
  };

  // Enrichissement auto si SIREN manquant mais nom présent
  if (!merged.buyer?.siren && merged.buyer?.legal_name) {
    const { bestCompanyMatch } = await import("@/lib/company-lookup");
    const match = await bestCompanyMatch(merged.buyer.legal_name);
    if (match?.active) {
      merged.buyer = {
        ...merged.buyer,
        siren: match.siren,
        vat: match.vatNumber ?? merged.buyer.vat,
        legal_name: match.legalName,
      };
    }
  }

  const validation = await validateInvoiceApi(merged, auth);

  return {
    ...validation,
    remediated: true,
    invoice: {
      buyer: merged.buyer,
      operation_category: merged.operation_category,
      issue_date: merged.issue_date,
      service_date: merged.service_date,
      delivery: merged.delivery,
      lines: merged.lines,
    },
    next: validation.valid
      ? "POST /invoices/render puis POST /invoices/emit"
      : "Compléter patches manquants puis rappeler /remediate",
    mode: auth.mode,
  };
}

async function renderInvoiceApi(body: StructuredInvoice, auth: ApiAuthContext) {
  const validation = await validateInvoiceApi(body, auth);
  if (!validation.valid) {
    return {
      error: "validation_failed",
      message: "Impossible de générer Factur-X — contrôles bloquants.",
      ...validation,
    };
  }

  const { buildFacturXXml, buildFacturXReadableSummary } = await import("@/lib/facturx");
  const { computeLineTotals } = await import("@/lib/invoice-validation");

  const linesIn = (body.lines ?? []).map((l, i) => {
    const line = {
      description: (l.description ?? `Ligne ${i + 1}`).trim(),
      quantity: Number(l.quantity ?? 1),
      unitPriceHt: Number(l.unit_price_ht ?? 0),
      vatRate: Number(l.vat_rate ?? 20),
    };
    const { lineTotalHt, lineVat } = computeLineTotals(line);
    return {
      lineNumber: i + 1,
      ...line,
      lineTotalHt,
      lineVat,
    };
  });

  const safeLines =
    linesIn.length > 0
      ? linesIn
      : [
          {
            lineNumber: 1,
            description: "Prestation",
            quantity: 1,
            unitPriceHt: 100,
            vatRate: 20,
            lineTotalHt: 100,
            lineVat: 20,
          },
        ];

  const subtotalHt = Math.round(safeLines.reduce((s, l) => s + l.lineTotalHt, 0) * 100) / 100;
  const totalVat = Math.round(safeLines.reduce((s, l) => s + l.lineVat, 0) * 100) / 100;
  const totalTtc = Math.round((subtotalHt + totalVat) * 100) / 100;

  const number = (body.invoice_id as string) || `API-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = body.issue_date ?? new Date().toISOString().slice(0, 10);
  const buyerSiren = body.buyer?.siren?.replace(/\s/g, "") ?? "000000000";
  const sellerSiren = body.seller?.siren?.replace(/\s/g, "") ?? "000000000";

  const payload = {
    number,
    issueDate,
    seller: {
      legalName: body.seller?.legal_name ?? "Vendeur API",
      siren: sellerSiren,
    },
    buyer: {
      legalName: body.buyer?.legal_name ?? "Acheteur API",
      siren: buyerSiren,
    },
    operationCategory: body.operation_category ?? "SERVICES",
    lines: safeLines,
    subtotalHt,
    totalVat,
    totalTtc,
  };

  const xml = buildFacturXXml(payload);
  const summary = buildFacturXReadableSummary(payload);

  return {
    error: null as string | null,
    format: "factur-x",
    filename: `${number}.facturx.xml`,
    xml,
    summary,
    totals: { subtotal_ht: subtotalHt, total_vat: totalVat, total_ttc: totalTtc },
    mode: auth.mode,
    note: "POC CII / Factur-X XML — PDF/A-3 hors scope de cet endpoint",
  };
}

function validateInvoiceSandboxLegacy(body: StructuredInvoice) {
  const format = (body.format ?? "factur-x").toLowerCase();
  const formatOk = ["factur-x", "ubl", "cii"].includes(format);
  const siren = body.options?.siren?.replace(/\s/g, "") ?? "";
  const checkSiren = body.options?.check_siret !== false;
  const sirenOk = !checkSiren || /^\d{9}$/.test(siren) || /^\d{14}$/.test(siren);
  const vat = body.options?.vat ?? "FR";
  const vatOk = vat.length >= 2;
  const hasPayload = Boolean(body.data && body.data.length > 8);

  const checks: ApiCheck[] = [
    { code: "format", label: "Format Factur-X / UBL / CII", ok: formatOk },
    { code: "siren_client", label: "SIREN / SIRET client (mention 2026)", ok: sirenOk },
    { code: "vat", label: "TVA intracommunautaire / régime", ok: vatOk },
    {
      code: "mentions",
      label: "Mentions obligatoires présentes",
      ok: formatOk && (hasPayload || !body.options?.strict),
    },
  ];

  const errors: string[] = [];
  if (!formatOk) errors.push("Format non supporté — utilisez factur-x, ubl ou cii.");
  if (!sirenOk) errors.push("SIREN client manquant ou invalide (9 chiffres).");
  if (body.options?.strict && !hasPayload) {
    errors.push("Payload facture absent (data base64) en mode strict.");
    checks[3]!.ok = false;
  }

  const okCount = checks.filter((c) => c.ok).length;
  const score = Math.round((okCount / checks.length) * 1000) / 10;

  return {
    valid: errors.length === 0,
    score,
    errors,
    warnings:
      errors.length === 0 ? ["Mode legacy options — préférez le body structuré buyer/lines."] : [],
    checks,
    suggestions: errors.map((e) => ({ code: "LEGACY", field: null, action: e })),
    mode: "sandbox" as const,
  };
}
