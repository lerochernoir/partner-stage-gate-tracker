import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DecisionLogRow = {
  id: string;
  partner_id: string;
  stage_gate_id: string;
  stage_gate_package_id: string | null;
  approval_id: string | null;
  decision_type: string;
  decision_outcome: string;
  decision_title: string;
  decision_summary: string | null;
  rationale: string | null;
  conditions: string | null;
  decided_at: string;
  partners: { id: string; name: string } | null;
  stage_gates: { id: string; code: string; name: string } | null;
  users: { id: string; name: string; email: string } | null;
};

const decisionSelect = `
  id,
  partner_id,
  stage_gate_id,
  stage_gate_package_id,
  approval_id,
  decision_type,
  decision_outcome,
  decision_title,
  decision_summary,
  rationale,
  conditions,
  decided_at,
  partners(id, name),
  stage_gates(id, code, name),
  users(id, name, email)
`;

export async function getDecisionLogs() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("decision_logs")
    .select(decisionSelect)
    .order("decided_at", { ascending: false })
    .returns<DecisionLogRow[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getPartnerDecisionLogs(partnerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("decision_logs")
    .select(decisionSelect)
    .eq("partner_id", partnerId)
    .order("decided_at", { ascending: false })
    .returns<DecisionLogRow[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getDecisionLogById(decisionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("decision_logs")
    .select(decisionSelect)
    .eq("id", decisionId)
    .maybeSingle()
    .returns<DecisionLogRow | null>();

  if (error) throw error;
  return data;
}
