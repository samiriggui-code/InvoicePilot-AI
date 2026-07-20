import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const APPROVED_PLATFORMS = [
  {
    slug: "invoicepilot-sandbox",
    name: "Sandbox InvoicePilot",
    dgfipReference: "SANDBOX",
    pricingHint: "FREE" as const,
    audienceHint: "TPE" as const,
    recommendTags: ["sandbox", "partner_api", "dev"],
    websiteUrl: null as string | null,
    apiDocsUrl: null as string | null,
  },
  {
    slug: "seqino",
    name: "Seqino (API partenaire)",
    dgfipReference: null,
    pricingHint: "PAID" as const,
    audienceHint: "PME" as const,
    recommendTags: ["partner_api", "marque_grise"],
    websiteUrl: "https://seqino.com/",
    apiDocsUrl:
      "https://dev-portal.seqino.dev/portal/catalogue-products/seqino-pdp-1/b4a01d315c59492f601ffcac91e1a2a6/docs",
  },
  {
    slug: "b2brouter",
    name: "B2Brouter (API partenaire)",
    dgfipReference: null,
    pricingHint: "PAID" as const,
    audienceHint: "PME" as const,
    recommendTags: ["partner_api", "marque_grise", "sc"],
    websiteUrl: "https://www.b2brouter.net/fr/edocsync-pdp/",
    apiDocsUrl: "https://developer.b2brouter.net/docs/introduction",
  },
  {
    slug: "chorus-pro",
    name: "Chorus Pro (B2G)",
    dgfipReference: "CHORUS",
    pricingHint: "FREE" as const,
    audienceHint: "ENTERPRISE" as const,
    recommendTags: ["b2g", "public", "partner_api"],
    websiteUrl: "https://portail.chorus-pro.gouv.fr/",
    apiDocsUrl: "https://www.data.gouv.fr/dataservices/api-chorus-pro",
  },
  {
    slug: "pennylane",
    name: "Pennylane",
    dgfipReference: null,
    pricingHint: "PAID" as const,
    audienceHint: "PME" as const,
    recommendTags: ["accounting", "pme", "client_pa_only"],
    websiteUrl: "https://www.pennylane.com/",
    apiDocsUrl: "https://pennylane.readme.io/",
  },
  {
    slug: "qonto",
    name: "Qonto",
    dgfipReference: null,
    pricingHint: "FREE" as const,
    audienceHint: "TPE" as const,
    recommendTags: ["free", "bank", "tpe", "client_pa_only"],
    websiteUrl: null,
    apiDocsUrl: null,
  },
  {
    slug: "indy",
    name: "Indy",
    dgfipReference: null,
    pricingHint: "FREEMIUM" as const,
    audienceHint: "TPE" as const,
    recommendTags: ["tpe", "accounting", "micro", "client_pa_only"],
    websiteUrl: null,
    apiDocsUrl: null,
  },
  {
    slug: "shine",
    name: "Shine",
    dgfipReference: null,
    pricingHint: "FREEMIUM" as const,
    audienceHint: "TPE" as const,
    recommendTags: ["bank", "tpe", "client_pa_only"],
    websiteUrl: null,
    apiDocsUrl: null,
  },
  {
    slug: "yooz",
    name: "Yooz",
    dgfipReference: null,
    pricingHint: "PAID" as const,
    audienceHint: "ENTERPRISE" as const,
    recommendTags: ["erp", "enterprise", "client_pa_only"],
    websiteUrl: null,
    apiDocsUrl: null,
  },
  {
    slug: "basware",
    name: "Basware",
    dgfipReference: null,
    pricingHint: "PAID" as const,
    audienceHint: "ENTERPRISE" as const,
    recommendTags: ["enterprise", "client_pa_only"],
    websiteUrl: null,
    apiDocsUrl: null,
  },
] as const;

/** Mot de passe commun pour tous les comptes de démo */
const DEMO_PASSWORD = "Test1234!";

type SeedOrg = {
  legalName: string;
  tradeName: string;
  siren: string;
  siret: string;
  size: "MICRO" | "PME" | "ETI" | "GE";
  vatRegime: "STANDARD" | "FRANCHISE_BASE";
  plan: "STARTER" | "PRO" | "ENTERPRISE";
  status: "TRIALING" | "ACTIVE";
  owner: { email: string; name: string };
  members?: { email: string; name: string; role: "ACCOUNTANT" | "COLLABORATOR" | "ADMIN" }[];
};

const SEED_ORGS: SeedOrg[] = [
  {
    legalName: "Dupont Conseil SAS",
    tradeName: "Dupont Conseil",
    siren: "512345678",
    siret: "51234567800014",
    size: "PME",
    vatRegime: "STANDARD",
    plan: "PRO",
    status: "TRIALING",
    owner: { email: "owner@dupont.fr", name: "Marie Dupont" },
    members: [
      { email: "comptable@dupont.fr", name: "Paul Martin", role: "ACCOUNTANT" },
      { email: "collab@dupont.fr", name: "Léa Bernard", role: "COLLABORATOR" },
    ],
  },
  {
    legalName: "Auto-Entrepreneur Martin",
    tradeName: "Martin Freelance",
    siren: "823456789",
    siret: "82345678900012",
    size: "MICRO",
    vatRegime: "FRANCHISE_BASE",
    plan: "STARTER",
    status: "ACTIVE",
    owner: { email: "jean@martin-freelance.fr", name: "Jean Martin" },
  },
  {
    legalName: "Cabinet Expertise Comptable Lyon",
    tradeName: "CEC Lyon",
    siren: "390123456",
    siret: "39012345600028",
    size: "ETI",
    vatRegime: "STANDARD",
    plan: "ENTERPRISE",
    status: "ACTIVE",
    owner: { email: "dirigeant@cec-lyon.fr", name: "Sophie Leroy" },
    members: [{ email: "assoc@cec-lyon.fr", name: "Marc Petit", role: "ADMIN" }],
  },
];

/** Accès multi-dossiers : Marie Dupont voit aussi le cabinet (offre cabinets Phase 4) */
const CABINET_CROSS_MEMBERSHIPS: {
  userEmail: string;
  orgSiren: string;
  role: "ACCOUNTANT" | "COLLABORATOR" | "ADMIN";
}[] = [{ userEmail: "owner@dupont.fr", orgSiren: "390123456", role: "ACCOUNTANT" }];

async function seedPlatforms() {
  for (const platform of APPROVED_PLATFORMS) {
    await prisma.approvedPlatform.upsert({
      where: { slug: platform.slug },
      create: {
        slug: platform.slug,
        name: platform.name,
        dgfipReference: platform.dgfipReference,
        pricingHint: platform.pricingHint,
        audienceHint: platform.audienceHint,
        recommendTags: [...platform.recommendTags],
        websiteUrl: platform.websiteUrl,
        apiDocsUrl: platform.apiDocsUrl,
        isActive: true,
      },
      update: {
        name: platform.name,
        dgfipReference: platform.dgfipReference,
        pricingHint: platform.pricingHint,
        audienceHint: platform.audienceHint,
        recommendTags: [...platform.recommendTags],
        websiteUrl: platform.websiteUrl,
        apiDocsUrl: platform.apiDocsUrl,
        isActive: true,
      },
    });
  }
}

async function upsertUser(email: string, name: string, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      emailVerified: new Date(),
      twoFactorEnabled: true,
    },
    update: {
      name,
      passwordHash,
      emailVerified: new Date(),
    },
  });
}

async function seedOrganizations(passwordHash: string) {
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  for (const org of SEED_ORGS) {
    const owner = await upsertUser(org.owner.email, org.owner.name, passwordHash);

    let organization = await prisma.organization.findFirst({
      where: { siret: org.siret },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          legalName: org.legalName,
          tradeName: org.tradeName,
          siren: org.siren,
          siret: org.siret,
          email: org.owner.email,
          size: org.size,
          vatRegime: org.vatRegime,
          countryCode: "FR",
          isDemo: true,
          complianceScore: org.size === "MICRO" ? 72 : 88,
          subscription: {
            create: {
              plan: org.plan,
              status: org.status,
              trialEndsAt: org.status === "TRIALING" ? trialEndsAt : null,
              currentPeriodStart: new Date(),
              currentPeriodEnd: trialEndsAt,
            },
          },
          invoiceSequences: {
            create: { prefix: "FAC", nextNumber: 1, padding: 4 },
          },
        },
      });
    } else {
      await prisma.organization.update({
        where: { id: organization.id },
        data: { isDemo: true },
      });
      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        create: {
          organizationId: organization.id,
          plan: org.plan,
          status: org.status,
          trialEndsAt: org.status === "TRIALING" ? trialEndsAt : null,
        },
        update: {
          plan: org.plan,
          status: org.status,
          trialEndsAt: org.status === "TRIALING" ? trialEndsAt : null,
        },
      });
    }

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: owner.id,
        },
      },
      create: {
        organizationId: organization.id,
        userId: owner.id,
        role: "OWNER",
      },
      update: { role: "OWNER" },
    });

    for (const member of org.members ?? []) {
      const user = await upsertUser(member.email, member.name, passwordHash);
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: user.id,
          },
        },
        create: {
          organizationId: organization.id,
          userId: user.id,
          role: member.role,
        },
        update: { role: member.role },
      });
    }

    // Démo riche — Dupont Conseil (entreprise vitrine)
    if (org.siren === "512345678") {
      await seedDupontDemo(organization.id);
    }
  }

  for (const cross of CABINET_CROSS_MEMBERSHIPS) {
    const user = await prisma.user.findUnique({ where: { email: cross.userEmail } });
    const org = await prisma.organization.findFirst({ where: { siren: cross.orgSiren } });
    if (!user || !org) continue;
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: user.id,
        },
      },
      create: {
        organizationId: org.id,
        userId: user.id,
        role: cross.role,
      },
      update: { role: cross.role },
    });
  }
}

async function seedDupontDemo(organizationId: string) {
  const pennylane = await prisma.approvedPlatform.findUnique({ where: { slug: "pennylane" } });
  if (pennylane) {
    // Une seule PA active — désactive le reste
    await prisma.organizationPlatformConnection.updateMany({
      where: {
        organizationId,
        isActive: true,
        platformId: { not: pennylane.id },
      },
      data: { isActive: false, credentialsRef: null, metadata: {}, isDefault: false },
    });

    const existingConn = await prisma.organizationPlatformConnection.findFirst({
      where: { organizationId, platformId: pennylane.id },
    });
    if (!existingConn) {
      await prisma.organizationPlatformConnection.create({
        data: {
          organizationId,
          platformId: pennylane.id,
          purpose: "BOTH",
          label: "Pennylane — canal sandbox",
          isDefault: true,
          isActive: true,
          credentialsRef: "mode:sandbox",
        },
      });
    } else {
      await prisma.organizationPlatformConnection.update({
        where: { id: existingConn.id },
        data: {
          isActive: true,
          isDefault: true,
          credentialsRef: existingConn.credentialsRef?.startsWith("mode:apikey")
            ? existingConn.credentialsRef
            : "mode:sandbox",
          label: "Pennylane — canal sandbox",
        },
      });
    }

    await prisma.organizationBridgeProfile.upsert({
      where: { organizationId },
      create: {
        organizationId,
        preferredPlatformSlug: "pennylane",
        hasExistingPa: true,
        needsPaGuidance: false,
        sourceProviders: ["MANUAL_UPLOAD"],
      },
      update: {
        preferredPlatformSlug: "pennylane",
        hasExistingPa: true,
        needsPaGuidance: false,
      },
    });
  }

  const diagCount = await prisma.complianceDiagnostic.count({ where: { organizationId } });
  if (diagCount === 0) {
    await prisma.complianceDiagnostic.create({
      data: {
        organizationId,
        companySize: "PME",
        vatRegime: "STANDARD",
        hasB2bClients: true,
        hasB2cClients: true,
        hasForeignClients: false,
        hasPublicSector: false,
        currentTooling: "Excel + PDF email",
        mustReceiveBy: new Date("2026-09-01"),
        mustEmitBy: new Date("2027-09-01"),
        needsEInvoicing: true,
        needsEReportingTx: true,
        needsEReportingPay: true,
        completedAt: new Date(),
      },
    });
  }

  const checklistCount = await prisma.complianceChecklistItem.count({ where: { organizationId } });
  if (checklistCount === 0) {
    await prisma.complianceChecklistItem.createMany({
      data: [
        {
          organizationId,
          code: "choose_pa",
          label: "Choisir une plateforme agréée (PA)",
          description: "Pennylane connectée en démo",
          status: "DONE",
          sortOrder: 1,
          completedAt: new Date(),
        },
        {
          organizationId,
          code: "directory_check",
          label: "Vérifier mon inscription à l'annuaire",
          status: "IN_PROGRESS",
          sortOrder: 2,
        },
        {
          organizationId,
          code: "invoice_tool",
          label: "Équiper un outil de facturation compatible",
          status: "DONE",
          sortOrder: 3,
          completedAt: new Date(),
        },
        {
          organizationId,
          code: "mandatory_mentions",
          label: "Maîtriser les 4 mentions obligatoires 2026",
          status: "IN_PROGRESS",
          sortOrder: 4,
        },
        {
          organizationId,
          code: "facturx",
          label: "Générer des factures Factur-X / UBL / CII",
          status: "PENDING",
          sortOrder: 5,
        },
        {
          organizationId,
          code: "e_reporting",
          label: "Préparer le e-reporting (B2C)",
          status: "PENDING",
          sortOrder: 6,
        },
      ],
    });
  }

  const clients = [
    {
      id: "seed-client-dupont-acme",
      legalName: "ACME Industries SAS",
      siren: "443061841",
      siret: "44306184100047",
      email: "facturation@acme.fr",
      billingLine1: "12 rue de la Paix",
      billingPostal: "75002",
      billingCity: "Paris",
      directoryPaName: "Pennylane PDP",
      directoryRoutingAddr: "acme@pennylane.factur-x.fr",
    },
    {
      id: "seed-client-dupont-nord",
      legalName: "Nord Logistique SARL",
      siren: "531234567",
      siret: "53123456700019",
      email: "compta@nord-logistique.fr",
      billingLine1: "8 avenue du Port",
      billingPostal: "59000",
      billingCity: "Lille",
      directoryPaName: "Yooz",
      directoryRoutingAddr: null as string | null,
    },
    {
      id: "seed-client-dupont-atelier",
      legalName: "Atelier Lumière",
      siren: "812345679",
      siret: "81234567900025",
      email: "hello@atelier-lumiere.fr",
      billingLine1: "3 cour Saint-Émilion",
      billingPostal: "33000",
      billingCity: "Bordeaux",
      directoryPaName: null as string | null,
      directoryRoutingAddr: null as string | null,
    },
  ];

  for (const c of clients) {
    await prisma.counterparty.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        organizationId,
        type: "CLIENT",
        legalName: c.legalName,
        siren: c.siren,
        siret: c.siret,
        email: c.email,
        billingLine1: c.billingLine1,
        billingPostal: c.billingPostal,
        billingCity: c.billingCity,
        billingCountry: "FR",
        directoryPaName: c.directoryPaName,
        directoryRoutingAddr: c.directoryRoutingAddr,
        directorySyncedAt: c.directoryPaName ? new Date() : null,
      },
      update: {
        legalName: c.legalName,
        directoryPaName: c.directoryPaName,
      },
    });
  }

  const invoiceDefs: {
    id?: string;
    number: string | null;
    clientId: string;
    status: "VALIDATED" | "TRANSMITTED" | "BLOCKED" | "DRAFT" | "PAID";
    daysAgo: number;
    ht: number;
    vat: number;
    desc: string;
    score: number | null;
    errors?: boolean;
  }[] = [
    {
      number: "FAC-0001",
      clientId: "seed-client-dupont-acme",
      status: "VALIDATED",
      daysAgo: 2,
      ht: 2400,
      vat: 480,
      desc: "Audit conformité facturation électronique — phase 1",
      score: 98,
    },
    {
      number: "FAC-0002",
      clientId: "seed-client-dupont-nord",
      status: "TRANSMITTED",
      daysAgo: 8,
      ht: 1850,
      vat: 370,
      desc: "Accompagnement choix plateforme agréée",
      score: 96,
    },
    {
      number: "FAC-0003",
      clientId: "seed-client-dupont-atelier",
      status: "BLOCKED",
      daysAgo: 1,
      ht: 620,
      vat: 124,
      desc: "Formation mentions obligatoires 2026",
      score: 62,
      errors: true,
    },
    {
      id: "seed-inv-dupont-draft",
      number: null,
      clientId: "seed-client-dupont-atelier",
      status: "DRAFT",
      daysAgo: 0,
      ht: 980,
      vat: 196,
      desc: "Brouillon — revue process e-reporting",
      score: null,
    },
    {
      id: "seed-inv-dupont-5",
      number: "FAC-0005",
      clientId: "seed-client-dupont-nord",
      status: "PAID",
      daysAgo: 45,
      ht: 3200,
      vat: 640,
      desc: "Mise en conformité Factur-X — pack PME",
      score: 99,
    },
  ];

  for (const inv of invoiceDefs) {
    const exists = inv.id
      ? await prisma.invoice.findUnique({ where: { id: inv.id } })
      : inv.number
        ? await prisma.invoice.findFirst({ where: { organizationId, number: inv.number } })
        : null;
    if (exists) continue;

    const issueDate = new Date(Date.now() - inv.daysAgo * 24 * 60 * 60 * 1000);
    const client = await prisma.counterparty.findUniqueOrThrow({ where: { id: inv.clientId } });

    await prisma.invoice.create({
      data: {
        ...(inv.id ? { id: inv.id } : {}),
        organizationId,
        counterpartyId: client.id,
        direction: "SALE",
        type: "INVOICE",
        status: inv.status,
        format: inv.status === "DRAFT" ? null : "FACTUR_X",
        number: inv.number,
        issueDate: inv.status === "DRAFT" ? null : issueDate,
        serviceDate: issueDate,
        dueDate: new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        buyerSiren: client.siren,
        operationCategory: "SERVICES",
        vatOnDebitsOption: false,
        paymentTermsDays: 30,
        latePenaltyRate: 10.5,
        recoveryFeeAmount: 40,
        subtotalHt: inv.ht,
        totalVat: inv.vat,
        totalTtc: inv.ht + inv.vat,
        complianceScore: inv.score,
        issuedAt: inv.status !== "DRAFT" ? issueDate : null,
        lines: {
          create: [
            {
              lineNumber: 1,
              description: inv.desc,
              quantity: 1,
              unitPriceHt: inv.ht,
              vatRate: 20,
              lineTotalHt: inv.ht,
              lineVat: inv.vat,
            },
          ],
        },
        validations: inv.errors
          ? {
              create: [
                {
                  code: "BUYER_SIREN_2026",
                  message: "SIREN client à re-vérifier avant émission",
                  severity: "ERROR",
                  field: "buyerSiren",
                  blocking: true,
                },
                {
                  code: "MENTION_PENALTIES",
                  message: "Contrôler le taux de pénalités de retard",
                  severity: "WARNING",
                  blocking: false,
                },
              ],
            }
          : undefined,
        lifecycleEvents:
          inv.status === "TRANSMITTED" || inv.status === "PAID"
            ? {
                create: [
                  {
                    status: "VALIDATED",
                    scope: "EMISSION",
                    source: "app",
                    message: "Validée",
                    occurredAt: issueDate,
                  },
                  {
                    status: inv.status,
                    scope: "EMISSION",
                    source: "pa-webhook-demo",
                    message:
                      inv.status === "PAID"
                        ? "Encaissée (démo)"
                        : "Déposée sur PA Pennylane (sandbox)",
                    occurredAt: new Date(issueDate.getTime() + 3600_000),
                  },
                ],
              }
            : undefined,
      },
    });
  }

  await prisma.invoiceSequence.updateMany({
    where: { organizationId, prefix: "FAC" },
    data: { nextNumber: 6 },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      complianceScore: 88,
      addressLine1: "24 rue du Faubourg Saint-Honoré",
      postalCode: "75008",
      city: "Paris",
      vatNumber: "FR51512345678",
    },
  });
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  await seedPlatforms();
  await seedOrganizations(passwordHash);

  console.log("\nSeed OK — plateformes PA + comptes de démo SaaS\n");
  console.log("Mot de passe commun :", DEMO_PASSWORD);
  console.log("─────────────────────────────────────────────────");
  console.log("owner@dupont.fr          → DEMO PME Pro (clients, factures, PA, checklist)");
  console.log("comptable@dupont.fr      → même org, rôle ACCOUNTANT");
  console.log("collab@dupont.fr         → même org, rôle COLLABORATOR");
  console.log("jean@martin-freelance.fr → Micro Starter ACTIVE");
  console.log("dirigeant@cec-lyon.fr     → Cabinet Enterprise ACTIVE");
  console.log("assoc@cec-lyon.fr         → même org, rôle ADMIN");
  console.log("─────────────────────────────────────────────────");
  console.log("Login → /login puis code 2FA (affiché en mode démo / logs serveur)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
