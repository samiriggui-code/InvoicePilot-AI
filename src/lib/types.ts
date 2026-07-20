export type MemberRole = "OWNER" | "ADMIN" | "ACCOUNTANT" | "COLLABORATOR";
export type SubscriptionPlan = "STARTER" | "PRO" | "ENTERPRISE";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "UNPAID";

export type WorkspaceOrg = {
  id: string;
  legalName: string;
  tradeName: string | null;
  siren: string;
  siret: string | null;
  size: string;
  vatRegime: string;
  complianceScore: number | null;
  role: MemberRole;
  /** Org seed / sandbox produit — mocks autorisés */
  isDemo: boolean;
};

export type WorkspaceSubscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  /** Customer Stripe lie (carte / abonnement). */
  stripeLinked: boolean;
};

export type WorkspaceContext = {
  user: { id: string; email: string; name: string; avatarKey: string | null };
  organization: WorkspaceOrg;
  subscription: WorkspaceSubscription | null;
  trialDaysLeft: number | null;
};

export type DashboardReadiness = {
  daysToReceiveDeadline: number;
  receiveDeadlineLabel: string;
  emitDeadlineLabel: string | null;
  paConnected: boolean;
  paName: string | null;
  checklistProgress: number;
  clientsCount: number;
  clientsWithSiren: number;
  topInsight: string;
  nextActions: { label: string; href: string; urgent?: boolean }[];
};

export type DashboardData = {
  organizationName: string;
  journey: {
    sourceConnected: boolean;
    hasAnalyzed: boolean;
    paConnected: boolean;
    hasEmittedOrReady: boolean;
    hasEReporting: boolean;
    hasReception: boolean;
  };
  reformAlerts: {
    id: string;
    title: string;
    detail: string;
    daysLeft: number;
    urgency: "critical" | "warning" | "info";
    href: string;
  }[];
  stats: {
    complianceScore: number;
    validatedInvoices: number;
    blockedErrors: number;
    pendingReview: number;
    revenueHt: number;
    totalInvoices: number;
    teamMembers: number;
    sourcesCount: number;
  };
  invoiceStatusPie: { name: string; value: number; key: string }[];
  modules: {
    id: string;
    label: string;
    href: string;
    done: boolean;
    hint: string;
  }[];
  recentActivity: {
    id: string;
    label: string;
    action: string;
    createdAt: string;
    actor?: string | null;
  }[];
  readiness: DashboardReadiness;
  /** Contrôles type mockup landing « Agent IA — Analyse » */
  agentAnalysis: { label: string; ok: boolean }[];
  monthlyTrend: {
    month: string;
    score: number;
    validated: number;
    errors: number;
    revenueHt: number;
  }[];
  errorBreakdown: { type: string; count: number }[];
  recentInvoices: {
    id: string;
    number: string;
    client: string;
    amount: number;
    status: "valid" | "blocked" | "pending";
    date: string;
    errors?: string[];
  }[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PlanId = "starter" | "pro" | "enterprise";

export function planLabel(plan: SubscriptionPlan): string {
  switch (plan) {
    case "STARTER":
      return "Starter";
    case "PRO":
      return "Pro";
    case "ENTERPRISE":
      return "Enterprise";
  }
}

export function planToId(plan: SubscriptionPlan): PlanId {
  switch (plan) {
    case "STARTER":
      return "starter";
    case "PRO":
      return "pro";
    case "ENTERPRISE":
      return "enterprise";
  }
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const end = typeof date === "string" ? new Date(date) : date;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
