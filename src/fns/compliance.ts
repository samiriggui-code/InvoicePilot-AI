import { createServerFn } from "@tanstack/react-start";

const DEFAULT_CHECKLIST = [
  {
    code: "choose_pa",
    label: "Choisir une plateforme agréée (PA)",
    description: "Déclarée à l’inscription ou connectée dans Plateforme",
    sortOrder: 1,
  },
  {
    code: "directory_check",
    label: "SIREN organisation renseigné",
    description: "Identifiant légal de votre entreprise (annuaire / Factur-X)",
    sortOrder: 2,
  },
  {
    code: "invoice_tool",
    label: "Outil de facturation compatible",
    description: "InvoicePilot est votre outil — validé dès l’ouverture du compte",
    sortOrder: 3,
  },
  {
    code: "mandatory_mentions",
    label: "Acheteurs avec SIREN (mentions 2026)",
    description: "Au moins un client B2B avec SIREN dans Acheteurs",
    sortOrder: 4,
  },
  {
    code: "facturx",
    label: "Émettre une facture conforme (Factur-X)",
    description: "Au moins une facture de vente validée / prête PA",
    sortOrder: 5,
  },
  {
    code: "e_reporting",
    label: "E-reporting (si B2C / export)",
    description: "Requis seulement si le diagnostic indique B2C ou clients étrangers",
    sortOrder: 6,
  },
] as const;

const VALID_INVOICE_STATUSES = [
  "VALIDATED",
  "TRANSMITTING",
  "TRANSMITTED",
  "RECEIVED",
  "APPROVED",
  "PAID",
  "ARCHIVED",
] as const;

export const getComplianceData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadWorkspace } = await import("@/lib/workspace.server");
  const { db } = await import("@/lib/db");

  const workspace = await loadWorkspace();
  if (!workspace) return null;

  const orgId = workspace.organization.id;

  let items = await db.complianceChecklistItem.findMany({
    where: { organizationId: orgId },
    orderBy: { sortOrder: "asc" },
  });

  if (items.length === 0) {
    await db.complianceChecklistItem.createMany({
      data: DEFAULT_CHECKLIST.map((item) => ({
        organizationId: orgId,
        code: item.code,
        label: item.label,
        description: item.description,
        sortOrder: item.sortOrder,
        status: "PENDING" as const,
      })),
    });
    items = await db.complianceChecklistItem.findMany({
      where: { organizationId: orgId },
      orderBy: { sortOrder: "asc" },
    });
  } else {
    // Align labels/descriptions with latest copy
    for (const def of DEFAULT_CHECKLIST) {
      const row = items.find((i) => i.code === def.code);
      if (row && (row.label !== def.label || row.description !== def.description)) {
        await db.complianceChecklistItem.update({
          where: { id: row.id },
          data: { label: def.label, description: def.description },
        });
      }
    }
    items = await db.complianceChecklistItem.findMany({
      where: { organizationId: orgId },
      orderBy: { sortOrder: "asc" },
    });
  }

  const diagnostic = await db.complianceDiagnostic.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  const [
    bridge,
    integrations,
    paConnections,
    clientsWithSiren,
    saleReadyCount,
    eReportingCount,
    org,
  ] = await Promise.all([
    db.organizationBridgeProfile.findUnique({ where: { organizationId: orgId } }),
    db.merchantIntegration.findMany({
      where: { organizationId: orgId },
      select: { provider: true, status: true },
    }),
    db.organizationPlatformConnection.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { platform: { select: { name: true, slug: true } } },
    }),
    db.counterparty.count({
      where: {
        organizationId: orgId,
        type: { in: ["CLIENT", "BOTH"] },
        siren: { not: null },
      },
    }),
    db.invoice.count({
      where: {
        organizationId: orgId,
        direction: "SALE",
        status: { in: [...VALID_INVOICE_STATUSES] },
      },
    }),
    db.eReportingEntry.count({ where: { organizationId: orgId } }),
    db.organization.findUnique({
      where: { id: orgId },
      select: { siren: true, size: true, vatRegime: true },
    }),
  ]);

  const { SOURCE_OPTIONS } = await import("@/lib/pa-guidance");
  const { canConnectionTransmit, parseCredentialsMode } = await import("@/lib/pa-partners");

  const sourceLabels = (bridge?.sourceProviders ?? []).map(
    (id) => SOURCE_OPTIONS.find((o) => o.id === id)?.label ?? id,
  );

  const purposeLabel =
    bridge?.paPurpose === "EMISSION"
      ? "Émission seule"
      : bridge?.paPurpose === "RECEPTION"
        ? "Réception seule"
        : "Émission & réception";

  const connectedSources = integrations.filter(
    (i) => i.status === "CONNECTED" || i.status === "SYNCING",
  );
  const transmitPa = paConnections.find((c) => canConnectionTransmit(c.credentialsRef));
  const declaredPa = paConnections.find(
    (c) => parseCredentialsMode(c.credentialsRef) === "declared",
  );

  const now = Date.now();
  const receiveMs = diagnostic?.mustReceiveBy?.getTime() ?? Date.UTC(2026, 8, 1);
  const emitMs =
    diagnostic?.mustEmitBy?.getTime() ??
    (workspace.organization.size === "MICRO" || workspace.organization.size === "PME"
      ? Date.UTC(2027, 8, 1)
      : Date.UTC(2026, 8, 1));
  const daysToReceive = Math.max(0, Math.ceil((receiveMs - now) / 86_400_000));
  const daysToEmit = Math.max(0, Math.ceil((emitMs - now) / 86_400_000));

  /** Sources choisies à l’inscription vs réellement branchées (API). */
  const sourcesChosenIds = bridge?.sourceProviders ?? [];
  const connectedProviderSet = new Set<string>(connectedSources.map((i) => i.provider));
  const sourcesSatisfied = sourcesChosenIds.filter((id) => {
    if (id === "MANUAL_UPLOAD" || id === "API_PUSH") return true;
    return connectedProviderSet.has(id);
  });
  const sourcesChosenCount = sourcesChosenIds.length;
  const sourcesConnectedCount = sourcesSatisfied.length;
  const sourcesRatio = sourcesChosenCount > 0 ? sourcesConnectedCount / sourcesChosenCount : null;

  /** PA : choix inscription + canal technique d’émission. */
  const preferredPaSlug = bridge?.preferredPlatformSlug ?? null;
  const preferredPaConnected = preferredPaSlug
    ? paConnections.some((c) => c.platform.slug === preferredPaSlug)
    : false;
  const paDeclaredOnly = Boolean(declaredPa) && !transmitPa;
  const paTransmitReady = Boolean(transmitPa);

  const paChosenLive =
    Boolean(preferredPaSlug) || Boolean(bridge?.hasExistingPa) || paConnections.length > 0;
  const sirenOk = Boolean(org?.siren && org.siren.length >= 9);
  const needsEReportingTx = diagnostic ? Boolean(diagnostic.needsEReportingTx) : null;

  type LiveMeta = {
    done: boolean;
    wait?: boolean;
    hint: string;
    badge: "OK" | "À faire" | "En attente";
  };
  const liveByCode: Record<string, LiveMeta> = {
    choose_pa: {
      done: paChosenLive,
      hint: preferredPaSlug
        ? `Choix inscription : ${preferredPaSlug}${paTransmitReady ? " · canal OK" : declaredPa ? " · déclarée" : " · à brancher"}`
        : paConnections.length > 0
          ? `PA connectée · ${paConnections[0]?.platform.name}`
          : "Aucune PA choisie à l’inscription",
      badge: paChosenLive ? "OK" : "À faire",
    },
    directory_check: {
      done: sirenOk,
      hint: sirenOk ? `SIREN ${org?.siren}` : "Compléter le SIREN dans Paramètres",
      badge: sirenOk ? "OK" : "À faire",
    },
    invoice_tool: {
      done: true,
      hint: "Votre compte InvoicePilot compte comme outil compatible",
      badge: "OK",
    },
    mandatory_mentions: {
      done: clientsWithSiren > 0,
      hint:
        clientsWithSiren > 0
          ? `${clientsWithSiren} acheteur(s) avec SIREN`
          : "Ajouter un acheteur avec SIREN",
      badge: clientsWithSiren > 0 ? "OK" : "À faire",
    },
    facturx: {
      done: saleReadyCount > 0,
      hint:
        saleReadyCount > 0
          ? `${saleReadyCount} facture(s) vente prête(s)`
          : "Créer / valider une facture d’émission",
      badge: saleReadyCount > 0 ? "OK" : "À faire",
    },
    e_reporting: {
      // Sans diagnostic on ne peut PAS savoir → jamais vert
      done: needsEReportingTx === false || (needsEReportingTx === true && eReportingCount > 0),
      wait: needsEReportingTx === null,
      hint:
        needsEReportingTx === null
          ? "Le diagnostic (à droite) décide si le e-reporting est obligatoire"
          : needsEReportingTx === false
            ? "Non requis pour votre profil (pas de B2C / export)"
            : eReportingCount > 0
              ? `${eReportingCount} lot(s) préparé(s) — module E-reporting`
              : "Obligatoire pour vous → créer un lot dans E-reporting",
      badge:
        needsEReportingTx === null
          ? "En attente"
          : needsEReportingTx === false || eReportingCount > 0
            ? "OK"
            : "À faire",
    },
  };

  // Sync checklist en live (inscription + branchements + données métier)
  for (const item of items) {
    const live = liveByCode[item.code];
    if (!live) continue;
    // "wait" reste PENDING (pas de faux vert)
    const nextStatus = live.done && !live.wait ? "DONE" : "PENDING";
    if (item.status !== nextStatus) {
      await db.complianceChecklistItem.update({
        where: { id: item.id },
        data: {
          status: nextStatus,
          completedAt: nextStatus === "DONE" ? new Date() : null,
        },
      });
      item.status = nextStatus;
    }
  }

  const done = items.filter((i) => i.status === "DONE").length;
  const checklistProgress = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  /**
   * Indice composite (pas seulement checklist légale) :
   * - 30 pts sources (choix → API connectée)
   * - 35 pts PA (choix → canal émission)
   * - 25 pts checklist réforme
   * - 10 pts diagnostic
   */
  let readinessPoints = 0;
  let readinessMax = 0;

  // Sources — 30 pts (si rien choisi : 15 pts neutres pour ne pas pénaliser un parcours sans boutique)
  readinessMax += 30;
  if (sourcesChosenCount === 0) {
    readinessPoints += 15;
  } else {
    readinessPoints += Math.round(30 * (sourcesRatio ?? 0));
  }

  // PA — 35 pts
  readinessMax += 35;
  if (paTransmitReady) {
    readinessPoints += 35;
  } else if (paDeclaredOnly || preferredPaConnected) {
    readinessPoints += 18; // PA connue / déclarée mais pas de canal technique
  } else if (preferredPaSlug || bridge?.hasExistingPa) {
    readinessPoints += 8; // choisie à l’inscription, pas encore branchée
  }

  // Checklist — 25 pts
  readinessMax += 25;
  readinessPoints += Math.round(25 * (checklistProgress / 100));

  // Diagnostic — 10 pts
  readinessMax += 10;
  if (diagnostic) readinessPoints += 10;

  const readinessScore = Math.min(100, Math.round((readinessPoints / readinessMax) * 100));

  const readinessBreakdown = {
    sources: {
      points: sourcesChosenCount === 0 ? 15 : Math.round(30 * (sourcesRatio ?? 0)),
      max: 30,
      chosen: sourcesChosenCount,
      connected: sourcesConnectedCount,
      label:
        sourcesChosenCount === 0
          ? "Aucune source déclarée"
          : `${sourcesConnectedCount}/${sourcesChosenCount} source(s) branchée(s)`,
      ready: sourcesChosenCount === 0 ? false : sourcesConnectedCount >= sourcesChosenCount,
    },
    pa: {
      points: paTransmitReady
        ? 35
        : paDeclaredOnly || preferredPaConnected
          ? 18
          : preferredPaSlug || bridge?.hasExistingPa
            ? 8
            : 0,
      max: 35,
      preferredSlug: preferredPaSlug,
      transmitReady: paTransmitReady,
      declaredOnly: paDeclaredOnly,
      label: paTransmitReady
        ? `Canal émission OK · ${transmitPa?.platform.name}`
        : paDeclaredOnly
          ? `PA déclarée · ${declaredPa?.platform.name} (pas d’API)`
          : preferredPaSlug
            ? `Choisie à l’inscription · ${preferredPaSlug} — à brancher`
            : "Aucune PA choisie",
      ready: paTransmitReady,
    },
    checklist: {
      points: Math.round(25 * (checklistProgress / 100)),
      max: 25,
      progress: checklistProgress,
      label: `Checklist réforme · ${checklistProgress} %`,
      ready: checklistProgress >= 100,
    },
    diagnostic: {
      points: diagnostic ? 10 : 0,
      max: 10,
      label: diagnostic ? "Diagnostic enregistré" : "Diagnostic à faire",
      ready: Boolean(diagnostic),
    },
  };

  return {
    organization: workspace.organization,
    diagnostic: diagnostic
      ? {
          id: diagnostic.id,
          companySize: diagnostic.companySize,
          vatRegime: diagnostic.vatRegime,
          hasB2cClients: diagnostic.hasB2cClients,
          hasForeignClients: diagnostic.hasForeignClients,
          mustReceiveBy: diagnostic.mustReceiveBy?.toISOString().slice(0, 10) ?? null,
          mustEmitBy: diagnostic.mustEmitBy?.toISOString().slice(0, 10) ?? null,
          needsEInvoicing: diagnostic.needsEInvoicing,
          needsEReportingTx: diagnostic.needsEReportingTx,
          needsEReportingPay: diagnostic.needsEReportingPay,
          completedAt: diagnostic.completedAt?.toISOString() ?? null,
        }
      : null,
    /** Choix inscription + état réel des branchements */
    onboarding: {
      sourcesChosen: sourceLabels,
      sourcesChosenIds,
      sourcesConnected: connectedSources.map((i) => i.provider),
      sourcesConnectedCount,
      preferredPaSlug,
      preferredPaConnected,
      paPurpose: bridge?.paPurpose ?? "BOTH",
      paPurposeLabel: purposeLabel,
      hasExistingPa: bridge?.hasExistingPa ?? false,
      paTransmitReady,
      paTransmitName: transmitPa?.platform.name ?? null,
      paDeclaredName: declaredPa?.platform.name ?? null,
      monthlyVolume: bridge?.monthlyInvoiceVolume ?? null,
      daysToReceive,
      daysToEmit,
    },
    checklist: items.map((i) => {
      const live = liveByCode[i.code];
      return {
        id: i.id,
        code: i.code,
        label: i.label,
        description: i.description,
        status: i.status,
        sortOrder: i.sortOrder,
        badge: live?.badge ?? (i.status === "DONE" ? "OK" : "À faire"),
        liveHint: live?.hint ?? null,
        waiting: Boolean(live?.wait),
      };
    }),
    /** @deprecated alias checklist — préférer readinessScore */
    progress: checklistProgress,
    checklistProgress,
    readinessScore,
    readinessBreakdown,
    diagnosticPreview: {
      receiveBy: "1 septembre 2026",
      emitByMicroPme: "1 septembre 2027",
      emitByEtiGe: "1 septembre 2026",
    },
  };
});

export const toggleChecklistItem = createServerFn({ method: "POST" })
  .validator((data: { id: string; done: boolean }) => data)
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false };

    await db.complianceChecklistItem.updateMany({
      where: { id: data.id, organizationId: workspace.organization.id },
      data: {
        status: data.done ? "DONE" : "PENDING",
        completedAt: data.done ? new Date() : null,
      },
    });

    return { success: true };
  });

export const saveQuickDiagnostic = createServerFn({ method: "POST" })
  .validator(
    (data: {
      companySize: "MICRO" | "PME" | "ETI" | "GE";
      vatRegime: "STANDARD" | "FRANCHISE_BASE" | "EXEMPT";
      hasB2cClients: boolean;
      hasForeignClients: boolean;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { loadWorkspace } = await import("@/lib/workspace.server");
    const { db } = await import("@/lib/db");

    const workspace = await loadWorkspace();
    if (!workspace) return { success: false };

    const mustReceiveBy = new Date("2026-09-01");
    const mustEmitBy =
      data.companySize === "MICRO" || data.companySize === "PME"
        ? new Date("2027-09-01")
        : new Date("2026-09-01");

    await db.organization.update({
      where: { id: workspace.organization.id },
      data: {
        size: data.companySize,
        vatRegime: data.vatRegime,
      },
    });

    await db.complianceDiagnostic.create({
      data: {
        organizationId: workspace.organization.id,
        companySize: data.companySize,
        vatRegime: data.vatRegime,
        hasB2bClients: true,
        hasB2cClients: data.hasB2cClients,
        hasForeignClients: data.hasForeignClients,
        mustReceiveBy,
        mustEmitBy,
        needsEInvoicing: true,
        needsEReportingTx: data.hasB2cClients || data.hasForeignClients,
        needsEReportingPay: data.vatRegime === "STANDARD",
        completedAt: new Date(),
      },
    });

    return { success: true };
  });
