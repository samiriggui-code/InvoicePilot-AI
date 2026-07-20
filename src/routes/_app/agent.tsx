import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2, FileSearch, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AgentInvoicesDataGrid } from "@/components/agent/AgentInvoicesDataGrid";
import { AiStatusBadge } from "@/components/agent/AiStatusBadge";
import { AppPageHero, AppPageShell } from "@/components/app/AppPageHero";
import { PageGuide } from "@/components/app/PageGuide";
import { listAnalysisQueue } from "@/fns/clients";
import { pageGuide } from "@/lib/page-guides";

const agentSearchSchema = z.object({
  invoiceId: z.string().optional(),
});

export const Route = createFileRoute("/_app/agent")({
  head: () => ({
    meta: [{ title: "Mon analyse IA — InvoicePilot AI" }],
  }),
  validateSearch: (search) => agentSearchSchema.parse(search),
  loader: () => listAnalysisQueue(),
  component: AgentPage,
});

function AgentPage() {
  const rows = Route.useLoaderData();
  const { invoiceId } = Route.useSearch();
  const [analyzing, setAnalyzing] = useState(false);
  const pending = rows.filter((r) => r.verdict === "A_ANALYSER").length;
  const passed = rows.filter((r) => r.verdict === "PASSE").length;
  const blocked = rows.filter((r) => r.verdict === "BLOQUE").length;

  return (
    <AppPageShell>
      <AppPageHero
        eyebrow="Flux · Analyse IA"
        title="Mon analyse IA"
        description={pageGuide("agent").blurb}
        meta={<AiStatusBadge analyzing={analyzing} />}
        kpis={[
          {
            label: "Total",
            value: String(rows.length),
            hint: "Factures vente",
            icon: FileSearch,
          },
          {
            label: "À analyser",
            value: String(pending),
            hint: "En attente",
            icon: Sparkles,
          },
          {
            label: "Passées",
            value: String(passed),
            hint: "→ Émission ou E-reporting",
            icon: FileCheck2,
          },
          {
            label: "Bloquées",
            value: String(blocked),
            hint: blocked > 0 ? "À corriger" : "Aucune",
            icon: ShieldAlert,
            alert: blocked > 0,
          },
        ]}
      />
      <AgentInvoicesDataGrid
        initialRows={rows}
        autoAnalyzeId={invoiceId}
        onAnalyzingChange={setAnalyzing}
      />
      <PageGuide page="agent" />
    </AppPageShell>
  );
}
