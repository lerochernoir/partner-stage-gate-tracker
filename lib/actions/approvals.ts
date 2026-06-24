"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditEvent } from "@/lib/audit";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDraftPackageForStage } from "@/lib/workflows/stage-packages";

export type ApprovalActionState = {
  error?: string;
  success?: string;
};

const approvalDecisionSchema = z.object({
  approvalId: z.string().uuid(),
  stepId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "rework_required"]),
  comments: z.string().trim().optional(),
});

type ApprovalDecision = z.infer<typeof approvalDecisionSchema>["decision"];

export async function submitApprovalDecisionAction(
  _previousState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const currentUser = await requireUser();
  const parsed = approvalDecisionSchema.safeParse({
    approvalId: formData.get("approvalId"),
    stepId: formData.get("stepId"),
    decision: formData.get("decision"),
    comments: formData.get("comments"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid approval decision." };
  }

  if (
    ["rejected", "rework_required"].includes(parsed.data.decision) &&
    !parsed.data.comments
  ) {
    return { error: "Comments are required for rejection or rework." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: approval, error: approvalError } = await supabase
    .from("approvals")
    .select(
      `
        id,
        status,
        partner_id,
        stage_gate_id,
        stage_gate_package_id,
        approval_steps(
          id,
          step_order,
          status,
          is_required,
          approver_user_id,
          approver_role_id,
          roles(code, name)
        ),
        stage_gates(code, sequence),
        stage_gate_packages!approvals_stage_gate_package_id_fkey(id, package_version)
      `,
    )
    .eq("id", parsed.data.approvalId)
    .maybeSingle();

  if (approvalError) return { error: approvalError.message };
  if (!approval) return { error: "Approval not found." };
  if (!["submitted", "in_review"].includes(approval.status as string)) {
    return { error: "This approval is already complete." };
  }

  const rawSteps = (approval.approval_steps ?? []) as unknown as Array<{
    id: string;
    step_order: number;
    status: string;
    is_required: boolean;
    approver_user_id: string | null;
    approver_role_id: string;
    roles: { code: string; name: string } | { code: string; name: string }[] | null;
  }>;
  const steps = rawSteps.map((item) => ({
    ...item,
    roles: Array.isArray(item.roles) ? item.roles[0] ?? null : item.roles,
  })) as Array<{
    id: string;
    step_order: number;
    status: string;
    is_required: boolean;
    approver_user_id: string | null;
    approver_role_id: string;
    roles: { code: string; name: string } | null;
  }>;
  const step = steps.find((item) => item.id === parsed.data.stepId);
  if (!step) return { error: "Approval step not found." };
  if (step.status !== "pending") return { error: "This approval step is already complete." };

  const canDecide =
    step.approver_user_id === currentUser.id ||
    (step.approver_user_id === null &&
      step.roles?.code &&
      (currentUser.roles as string[]).includes(step.roles.code)) ||
    hasAnyRole(currentUser, [ROLE_CODES.systemAdmin]);

  if (!canDecide) {
    return { error: "You are not assigned to this approval step." };
  }

  const previousRequiredIncomplete = steps.some(
    (item) =>
      item.is_required &&
      item.step_order < step.step_order &&
      item.status !== "approved",
  );
  if (previousRequiredIncomplete) {
    return { error: "Prior approval sequence steps must be approved first." };
  }

  const status =
    parsed.data.decision === "approved"
      ? "approved"
      : parsed.data.decision === "rejected"
        ? "rejected"
        : "rework_required";

  const { error: stepError } = await supabase
    .from("approval_steps")
    .update({
      status,
      decision: parsed.data.decision,
      comments: parsed.data.comments || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.stepId);

  if (stepError) {
    return { error: stepError.message };
  }

  await writeAuditEvent(supabase, {
    actorUserId: currentUser.id,
    entityType: "approval_step",
    entityId: parsed.data.stepId,
    action: "decision",
    newValue: {
      decision: parsed.data.decision,
      approvalId: parsed.data.approvalId,
    },
  });

  if (parsed.data.decision === "approved") {
    const remainingRequired = steps.filter(
      (item) =>
        item.is_required &&
        item.id !== parsed.data.stepId &&
        item.status !== "approved",
    );

    if (remainingRequired.length === 0) {
      await finalizeApproval({
        approvalId: parsed.data.approvalId,
        decision: "approved",
        comments: parsed.data.comments,
        decidedBy: currentUser.id,
      });
    }
  } else {
    await finalizeApproval({
      approvalId: parsed.data.approvalId,
      decision: parsed.data.decision,
      comments: parsed.data.comments,
      decidedBy: currentUser.id,
    });
  }

  revalidatePath("/approvals/my");
  revalidatePath(`/approvals/${parsed.data.approvalId}`);
  revalidatePath(`/packages/${approval.stage_gate_package_id}`);
  revalidatePath(`/partners/${approval.partner_id}`);
  return { success: "Approval decision submitted." };
}

async function finalizeApproval(input: {
  approvalId: string;
  decision: ApprovalDecision;
  comments?: string;
  decidedBy: string;
}) {
  const admin = createSupabaseAdminClient();
  const completedAt = new Date().toISOString();
  const { data: rawApproval, error } = await admin
    .from("approvals")
    .select(
      `
        id,
        partner_id,
        stage_gate_id,
        stage_gate_package_id,
        stage_gates(code, name, sequence),
        stage_gate_packages!approvals_stage_gate_package_id_fkey(package_version)
      `,
    )
    .eq("id", input.approvalId)
    .single();

  if (error) throw error;
  const approval = normalizeApprovalJoin(rawApproval);

  const approvalStatus =
    input.decision === "approved"
      ? "approved"
      : input.decision === "rejected"
        ? "rejected"
        : "rework_required";
  const packageStatus = approvalStatus;
  const outcome =
    input.decision === "approved"
      ? "approved"
      : input.decision === "rejected"
        ? "rejected"
        : "rework_required";

  await admin
    .from("approval_steps")
    .update({ status: "cancelled" })
    .eq("approval_id", input.approvalId)
    .eq("status", "pending")
    .neq("decision", "approved");

  await admin
    .from("approvals")
    .update({
      status: approvalStatus,
      completed_at: completedAt,
      final_decision: input.decision,
    })
    .eq("id", input.approvalId);

  await admin
    .from("stage_gate_packages")
    .update({
      status: packageStatus,
      review_completed_at: completedAt,
    })
    .eq("id", approval.stage_gate_package_id);

  const decisionLog = await createDecisionLog({
    admin,
    approval,
    outcome,
    comments: input.comments,
    decidedBy: input.decidedBy,
  });

  await admin
    .from("stage_gate_packages")
    .update({ decision_log_id: decisionLog.id })
    .eq("id", approval.stage_gate_package_id);

  if (input.decision === "approved") {
    await advanceStageIfApplicable({
      admin,
      partnerId: approval.partner_id as string,
      stageCode: String(approval.stage_gates?.code),
      currentStageId: approval.stage_gate_id as string,
      packageId: approval.stage_gate_package_id as string,
      decisionLogId: decisionLog.id as string,
      actorUserId: input.decidedBy,
    });
  }
}

async function createDecisionLog(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  approval: {
    id: unknown;
    partner_id: unknown;
    stage_gate_id: unknown;
    stage_gate_package_id: unknown;
    stage_gates: { code?: string; name?: string } | null;
    stage_gate_packages: { package_version?: number } | null;
  };
  outcome: "approved" | "rejected" | "rework_required";
  comments?: string;
  decidedBy: string;
}) {
  const stageCode = String(input.approval.stage_gates?.code ?? "SG");
  const decisionType =
    stageCode === "SG0"
      ? "sg0_identification_approval"
      : stageCode === "SG1"
        ? "sg1_strategic_qualification_approval"
        : "sg2_business_case_approval";
  const title = `${stageCode} ${input.outcome === "approved" ? "Approved" : input.outcome === "rejected" ? "Rejected" : "Rework Required"}`;
  const { data, error } = await input.admin
    .from("decision_logs")
    .insert({
      partner_id: input.approval.partner_id,
      stage_gate_id: input.approval.stage_gate_id,
      stage_gate_package_id: input.approval.stage_gate_package_id,
      approval_id: input.approval.id,
      decision_type: decisionType,
      decision_outcome: input.outcome,
      decision_title: title,
      decision_summary:
        input.comments ||
        `${stageCode} package v${input.approval.stage_gate_packages?.package_version ?? ""} ${input.outcome}.`,
      rationale: input.comments || null,
      decided_by: input.decidedBy,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

function normalizeApprovalJoin(value: unknown) {
  const approval = value as {
    id: string;
    partner_id: string;
    stage_gate_id: string;
    stage_gate_package_id: string;
    stage_gates: { code?: string; name?: string; sequence?: number } | { code?: string; name?: string; sequence?: number }[] | null;
    stage_gate_packages: { package_version?: number } | { package_version?: number }[] | null;
  };

  return {
    ...approval,
    stage_gates: Array.isArray(approval.stage_gates)
      ? approval.stage_gates[0] ?? null
      : approval.stage_gates,
    stage_gate_packages: Array.isArray(approval.stage_gate_packages)
      ? approval.stage_gate_packages[0] ?? null
      : approval.stage_gate_packages,
  };
}

async function advanceStageIfApplicable(input: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  partnerId: string;
  stageCode: string;
  currentStageId: string;
  packageId: string;
  decisionLogId: string;
  actorUserId: string;
}) {
  if (input.stageCode === "SG2") {
    return;
  }

  const nextStageCode = input.stageCode === "SG0" ? "SG1" : "SG2";
  const { data: nextStage, error: nextStageError } = await input.admin
    .from("stage_gates")
    .select("id")
    .eq("code", nextStageCode)
    .single();

  if (nextStageError) throw nextStageError;

  const { data: partner, error: partnerError } = await input.admin
    .from("partners")
    .select("current_tier_id")
    .eq("id", input.partnerId)
    .single();

  if (partnerError) throw partnerError;

  const { data: partnerTypeAssignments, error: partnerTypesError } =
    await input.admin
      .from("partner_type_assignments")
      .select("partner_type_id")
      .eq("partner_id", input.partnerId);

  if (partnerTypesError) throw partnerTypesError;

  await input.admin
    .from("partner_stage_history")
    .update({
      transition_status: "approved",
      exited_at: new Date().toISOString(),
      stage_gate_package_id: input.packageId,
      decision_log_id: input.decisionLogId,
    })
    .eq("partner_id", input.partnerId)
    .eq("transition_status", "current");

  await input.admin.from("partner_stage_history").insert({
    partner_id: input.partnerId,
    from_stage_id: input.currentStageId,
    to_stage_id: nextStage.id,
    transition_status: "current",
  });

  await input.admin
    .from("partners")
    .update({
      current_stage_id: nextStage.id,
      updated_by: input.actorUserId,
    })
    .eq("id", input.partnerId);

  const { data: requirements, error: requirementsError } = await input.admin
    .from("stage_requirements")
    .select("id")
    .eq("stage_gate_id", nextStage.id)
    .eq("is_active", true);

  if (requirementsError) throw requirementsError;

  if (requirements?.length) {
    await input.admin.from("partner_stage_requirements").upsert(
      requirements.map((requirement) => ({
        partner_id: input.partnerId,
        stage_requirement_id: requirement.id,
        status: "not_started",
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
      })),
      { onConflict: "partner_id,stage_requirement_id", ignoreDuplicates: true },
    );
  }

  const packageResult = await createDraftPackageForStage({
    supabase: input.admin,
    partnerId: input.partnerId,
    stageGateId: nextStage.id as string,
    currentTierId: partner.current_tier_id as string,
    partnerTypeIds: (partnerTypeAssignments ?? []).map(
      (assignment) => assignment.partner_type_id as string,
    ),
    actorUserId: input.actorUserId,
  });

  if (packageResult.error) {
    throw new Error(packageResult.error);
  }

  await input.admin.from("audit_events").insert({
    actor_user_id: input.actorUserId,
    entity_type: "partner_stage_history",
    entity_id: input.partnerId,
    action: "transition",
    new_value: {
      fromStage: input.stageCode,
      toStage: nextStageCode,
      packageId: input.packageId,
      decisionLogId: input.decisionLogId,
    },
  });
}
