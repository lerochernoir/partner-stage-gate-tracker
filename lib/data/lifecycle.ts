import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RequirementStatus } from "@/lib/supabase/types";

export type StageRequirementRow = {
  id: string;
  status: RequirementStatus;
  notes: string | null;
  completed_at: string | null;
  owner: { id: string; name: string; email: string } | null;
  completed_by_user: { id: string; name: string; email: string } | null;
  stage_requirements: {
    id: string;
    name: string;
    description: string | null;
    is_mandatory: boolean;
    display_order: number;
    requirement_type: string;
    stage_gates: { code: string; name: string } | null;
  } | null;
};

export type StageHistoryRow = {
  id: string;
  transition_status: string;
  entered_at: string;
  exited_at: string | null;
  from_stage: { code: string; name: string } | null;
  to_stage: { code: string; name: string } | null;
  stage_gate_package_id: string | null;
  decision_log_id: string | null;
};

export async function getPartnerCurrentRequirements(partnerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select(
      `
        id,
        name,
        legal_name,
        website,
        headquarters_country,
        region,
        industry_focus,
        alliance_manager_id,
        initial_rationale,
        current_stage_id,
        partner_type_assignments(partner_type_id)
      `,
    )
    .eq("id", partnerId)
    .maybeSingle();

  if (partnerError) throw partnerError;
  if (!partner) return [];

  const { data, error } = await supabase
    .from("partner_stage_requirements")
    .select(
      `
        id,
        status,
        notes,
        completed_at,
        owner:users!partner_stage_requirements_owner_id_fkey(id, name, email),
        completed_by_user:users!partner_stage_requirements_completed_by_fkey(id, name, email),
        stage_requirements(
          id,
          name,
          description,
          is_mandatory,
          display_order,
          requirement_type,
          stage_gates(code, name)
        )
      `,
    )
    .eq("partner_id", partnerId)
    .eq("stage_requirements.stage_gate_id", partner.current_stage_id)
    .returns<StageRequirementRow[]>();

  if (error) throw error;
  const requirements = data ?? [];
  const updates = getAutoCompleteSg0Updates(partner, requirements);

  if (updates.length > 0) {
    await Promise.all(
      updates.map((update) =>
        supabase
          .from("partner_stage_requirements")
          .update({
            status: "complete",
            completed_by: partner.alliance_manager_id,
            completed_at: new Date().toISOString(),
            updated_by: partner.alliance_manager_id,
          })
          .eq("id", update.id),
      ),
    );
  }

  const completedIds = new Set(updates.map((update) => update.id));
  return requirements
    .map((row) =>
      completedIds.has(row.id)
        ? {
            ...row,
            status: "complete" as const,
            completed_by: partner.alliance_manager_id,
            completed_at: new Date().toISOString(),
          }
        : row,
    )
    .filter((row) => row.stage_requirements)
    .sort(
      (a, b) =>
        (a.stage_requirements?.display_order ?? 0) -
        (b.stage_requirements?.display_order ?? 0),
    );
}

export async function getPartnerRequirementsForStage(
  partnerId: string,
  stageGateId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("partner_stage_requirements")
    .select(
      `
        id,
        status,
        notes,
        completed_at,
        owner:users!partner_stage_requirements_owner_id_fkey(id, name, email),
        completed_by_user:users!partner_stage_requirements_completed_by_fkey(id, name, email),
        stage_requirements(
          id,
          name,
          description,
          is_mandatory,
          display_order,
          requirement_type,
          stage_gates(code, name)
        )
      `,
    )
    .eq("partner_id", partnerId)
    .eq("stage_requirements.stage_gate_id", stageGateId)
    .returns<StageRequirementRow[]>();

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.stage_requirements)
    .sort(
      (a, b) =>
        (a.stage_requirements?.display_order ?? 0) -
        (b.stage_requirements?.display_order ?? 0),
    );
}

function getAutoCompleteSg0Updates(
  partner: {
    name: string;
    legal_name: string | null;
    website: string | null;
    headquarters_country: string | null;
    region: string | null;
    industry_focus: string | null;
    alliance_manager_id: string;
    initial_rationale: string | null;
    partner_type_assignments: { partner_type_id: string }[] | null;
  },
  requirements: StageRequirementRow[],
) {
  return requirements.filter((requirement) => {
    if (requirement.status === "complete") return false;

    switch (requirement.stage_requirements?.name) {
      case "Partner profile completed":
        return Boolean(
          partner.name &&
            (partner.legal_name || partner.website || partner.region || partner.headquarters_country || partner.industry_focus),
        );
      case "Partner type selected":
        return Boolean(partner.partner_type_assignments?.length);
      case "Alliance manager assigned":
        return Boolean(partner.alliance_manager_id);
      case "Initial rationale captured":
        return Boolean(partner.initial_rationale?.trim());
      default:
        return false;
    }
  });
}

export async function getPartnerStageHistory(partnerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("partner_stage_history")
    .select(
      `
        id,
        transition_status,
        entered_at,
        exited_at,
        stage_gate_package_id,
        decision_log_id,
        from_stage:stage_gates!partner_stage_history_from_stage_id_fkey(code, name),
        to_stage:stage_gates!partner_stage_history_to_stage_id_fkey(code, name)
      `,
    )
    .eq("partner_id", partnerId)
    .order("entered_at", { ascending: false })
    .returns<StageHistoryRow[]>();

  if (error) throw error;
  return data ?? [];
}

export function getReadinessSummary(requirements: StageRequirementRow[]) {
  const mandatory = requirements.filter(
    (requirement) => requirement.stage_requirements?.is_mandatory,
  );
  const incompleteMandatory = mandatory.filter(
    (requirement) => requirement.status !== "complete",
  );

  return {
    total: requirements.length,
    complete: requirements.filter((requirement) => requirement.status === "complete")
      .length,
    mandatoryTotal: mandatory.length,
    mandatoryComplete: mandatory.length - incompleteMandatory.length,
    ready: incompleteMandatory.length === 0,
    incompleteMandatory,
  };
}
