import { ROLE_CODES } from "@/lib/auth/roles";
import type { AppUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkflowStatus =
  | "not_started"
  | "draft"
  | "in_progress"
  | "ready_for_review"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "complete";

export type Sg0WorkflowState = {
  stage: { id: string; code: string; name: string };
  checklist: {
    total: number;
    complete: number;
    isComplete: boolean;
    status: WorkflowStatus;
  };
  package: {
    id: string;
    status: string;
    sectionsTotal: number;
    sectionsComplete: number;
    isComplete: boolean;
    approvalId: string | null;
    decisionLogId: string | null;
    workflowStatus: WorkflowStatus;
  } | null;
  approval: {
    id: string;
    status: string;
    finalDecision: string | null;
    workflowStatus: WorkflowStatus;
  } | null;
  decision: {
    id: string;
    outcome: string;
    workflowStatus: WorkflowStatus;
  } | null;
  currentStage: { code: string; name: string } | null;
  currentTier: { code: string; name: string } | null;
  isAdvancedToSg1: boolean;
};

export type Sg0NextAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "create_package"; label: string; partnerId: string }
  | { kind: "submit_package"; label: string; packageId: string }
  | { kind: "none"; label: string };

type PartnerWorkflowInput = {
  id: string;
  current_stage_id: string;
  stage_gates: { code: string; name: string } | null;
  partner_tiers: { code: string; name: string } | null;
};

export async function getSg0WorkflowState(
  partner: PartnerWorkflowInput,
): Promise<Sg0WorkflowState> {
  const supabase = await createSupabaseServerClient();
  const { data: sg0, error: sg0Error } = await supabase
    .from("stage_gates")
    .select("id, code, name")
    .eq("code", "SG0")
    .single();

  if (sg0Error) throw sg0Error;

  const { data: requirements, error: requirementsError } = await supabase
    .from("partner_stage_requirements")
    .select(
      `
        id,
        status,
        stage_requirements!partner_stage_requirements_stage_requirement_id_fkey(stage_gate_id)
      `,
    )
    .eq("partner_id", partner.id)
    .eq("stage_requirements.stage_gate_id", sg0.id);

  if (requirementsError) throw requirementsError;

  const checklistRows = (requirements ?? []).filter((row) => {
    const requirement = Array.isArray(row.stage_requirements)
      ? row.stage_requirements[0]
      : row.stage_requirements;

    return requirement?.stage_gate_id === sg0.id;
  });
  const checklistComplete = checklistRows.filter((row) => row.status === "complete").length;
  const checklistTotal = checklistRows.length;
  const checklistIsComplete = checklistTotal > 0 && checklistComplete === checklistTotal;

  const { data: stagePackage, error: packageError } = await supabase
    .from("stage_gate_packages")
    .select(
      "id, status, approval_id, decision_log_id, submitted_at, review_completed_at, package_version",
    )
    .eq("partner_id", partner.id)
    .eq("stage_gate_id", sg0.id)
    .order("package_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (packageError) throw packageError;

  let packageState: Sg0WorkflowState["package"] = null;
  let approvalState: Sg0WorkflowState["approval"] = null;
  let decisionState: Sg0WorkflowState["decision"] = null;

  if (stagePackage) {
    const { data: sections, error: sectionsError } = await supabase
      .from("stage_gate_package_sections")
      .select("status, content")
      .eq("stage_gate_package_id", stagePackage.id);

    if (sectionsError) throw sectionsError;

    const sectionsTotal = sections?.length ?? 0;
    const sectionsComplete =
      sections?.filter((section) => section.status === "complete" && section.content?.trim())
        .length ?? 0;
    const packageIsComplete = sectionsTotal > 0 && sectionsComplete === sectionsTotal;

    packageState = {
      id: stagePackage.id,
      status: stagePackage.status,
      sectionsTotal,
      sectionsComplete,
      isComplete: packageIsComplete,
      approvalId: stagePackage.approval_id,
      decisionLogId: stagePackage.decision_log_id,
      workflowStatus: getPackageWorkflowStatus(
        stagePackage.status,
        packageIsComplete,
        checklistIsComplete,
      ),
    };

    const approval = await getPackageApproval(
      stagePackage.id,
      stagePackage.approval_id,
    );
    if (approval) {
      approvalState = {
        id: approval.id,
        status: approval.status,
        finalDecision: approval.final_decision,
        workflowStatus: getApprovalWorkflowStatus(approval.status),
      };
    }

    const decision = await getPackageDecision(
      stagePackage.decision_log_id,
      approvalState?.id ?? null,
    );
    if (decision) {
      decisionState = {
        id: decision.id,
        outcome: decision.decision_outcome,
        workflowStatus: "complete",
      };
    }
  }

  return {
    stage: sg0,
    checklist: {
      total: checklistTotal,
      complete: checklistComplete,
      isComplete: checklistIsComplete,
      status: checklistIsComplete ? "complete" : "in_progress",
    },
    package: packageState,
    approval: approvalState,
    decision: decisionState,
    currentStage: partner.stage_gates,
    currentTier: partner.partner_tiers,
    isAdvancedToSg1: partner.stage_gates?.code === "SG1",
  };
}

export function getSg0NextAction(
  partnerId: string,
  workflow: Sg0WorkflowState,
  user: AppUser,
): Sg0NextAction {
  if (!workflow.checklist.isComplete) {
    return {
      kind: "link",
      label: "Complete SG0 Checklist",
      href: `/partners/${partnerId}/checklist`,
    };
  }

  if (!workflow.package) {
    return { kind: "create_package", label: "Create SG0 Package", partnerId };
  }

  if (
    workflow.package.workflowStatus === "draft" ||
    workflow.package.workflowStatus === "in_progress"
  ) {
    return {
      kind: "link",
      label: "Continue Package",
      href: `/packages/${workflow.package.id}`,
    };
  }

  if (workflow.package.workflowStatus === "ready_for_review") {
    return {
      kind: "submit_package",
      label: "Submit Package",
      packageId: workflow.package.id,
    };
  }

  if (
    workflow.approval &&
    workflow.approval.workflowStatus === "pending_approval"
  ) {
    return {
      kind: "link",
      label: "View Approval",
      href: `/approvals/${workflow.approval.id}`,
    };
  }

  if (workflow.approval?.workflowStatus === "approved" && !workflow.isAdvancedToSg1) {
    return {
      kind: "link",
      label: "Advance to Next Stage",
      href: workflow.approval ? `/approvals/${workflow.approval.id}` : `/partners/${partnerId}`,
    };
  }

  if (workflow.decision) {
    return {
      kind: "link",
      label: "View Decision",
      href: `/decisions/${workflow.decision.id}`,
    };
  }

  if (user.roles.includes(ROLE_CODES.systemAdmin)) {
    return { kind: "link", label: "View Approvals", href: "/approvals/my" };
  }

  return { kind: "none", label: "No action required" };
}

function getPackageWorkflowStatus(
  status: string,
  isComplete: boolean,
  checklistIsComplete: boolean,
): WorkflowStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "submitted" || status === "in_review") return "pending_approval";
  if (status === "draft" || status === "rework_required") {
    return isComplete && checklistIsComplete ? "ready_for_review" : "draft";
  }

  return "in_progress";
}

function getApprovalWorkflowStatus(status: string): WorkflowStatus {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "submitted" || status === "in_review") return "pending_approval";
  return "in_progress";
}

async function getPackageApproval(packageId: string, approvalId: string | null) {
  const supabase = await createSupabaseServerClient();

  if (approvalId) {
    const { data, error } = await supabase
      .from("approvals")
      .select("id, status, final_decision")
      .eq("id", approvalId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("approvals")
    .select("id, status, final_decision")
    .eq("stage_gate_package_id", packageId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getPackageDecision(
  decisionLogId: string | null,
  approvalId: string | null,
) {
  const supabase = await createSupabaseServerClient();

  if (decisionLogId) {
    const { data, error } = await supabase
      .from("decision_logs")
      .select("id, decision_outcome")
      .eq("id", decisionLogId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (!approvalId) return null;

  const { data, error } = await supabase
    .from("decision_logs")
    .select("id, decision_outcome")
    .eq("approval_id", approvalId)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
