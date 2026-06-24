"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditEvent } from "@/lib/audit";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartnerById } from "@/lib/data/partners";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDraftPackageForStage } from "@/lib/workflows/stage-packages";

export type PackageActionState = {
  error?: string;
  success?: string;
};

const sectionUpdateSchema = z.object({
  packageId: z.string().uuid(),
  sectionId: z.string().uuid(),
  content: z.string().trim(),
});

const submitPackageSchema = z.object({
  packageId: z.string().uuid(),
});

export async function createStageGatePackageAction(partnerId: string) {
  const currentUser = await requireUser();
  const partner = await getPartnerById(partnerId);

  if (!partner) {
    return { error: "Partner not found." };
  }

  if (
    !hasAnyRole(currentUser, [ROLE_CODES.systemAdmin]) &&
    partner.alliance_manager_id !== currentUser.id
  ) {
    return { error: "You do not have permission to create packages for this partner." };
  }

  if (partner.status === "rejected" || partner.status === "on_hold") {
    return { error: "Packages cannot be created for rejected or on-hold partners." };
  }

  const supabase = await createSupabaseServerClient();
  const partnerTypeIds = partner.partner_type_assignments
      .map((assignment) => assignment.partner_types?.id)
      .filter((id): id is string => Boolean(id));
  const result = await createDraftPackageForStage({
    supabase,
    partnerId: partner.id,
    stageGateId: partner.current_stage_id,
    currentTierId: partner.current_tier_id,
    partnerTypeIds,
    actorUserId: currentUser.id,
  });

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath(`/partners/${partner.id}/packages`);
  redirect(`/packages/${result.packageId}`);
}

export async function updatePackageSectionAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  const currentUser = await requireUser();
  const parsed = sectionUpdateSchema.safeParse({
    packageId: formData.get("packageId"),
    sectionId: formData.get("sectionId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid package section." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rawPackage, error: packageError } = await supabase
    .from("stage_gate_packages")
    .select("id, status")
    .eq("id", parsed.data.packageId)
    .maybeSingle();

  if (packageError) return { error: packageError.message };
  const pkg = normalizePackageSubmissionJoin(rawPackage);
  if (!pkg) return { error: "Package not found." };
  if (!["draft", "rework_required"].includes(pkg.status as string)) {
    return { error: "Only draft or rework packages can be edited." };
  }

  const { data: existing } = await supabase
    .from("stage_gate_package_sections")
    .select("content, status")
    .eq("id", parsed.data.sectionId)
    .maybeSingle();

  const { error } = await supabase
    .from("stage_gate_package_sections")
    .update({
      content: parsed.data.content,
      status: parsed.data.content ? "complete" : "draft",
      updated_by: currentUser.id,
    })
    .eq("id", parsed.data.sectionId)
    .eq("stage_gate_package_id", parsed.data.packageId);

  if (error) {
    return { error: error.message };
  }

  await writeAuditEvent(supabase, {
    actorUserId: currentUser.id,
    entityType: "stage_gate_package_section",
    entityId: parsed.data.sectionId,
    action: "update",
    oldValue: existing ?? null,
    newValue: { status: parsed.data.content ? "complete" : "draft" },
  });

  revalidatePath(`/packages/${parsed.data.packageId}`);
  return { success: "Section saved." };
}

export async function submitPackageAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  const currentUser = await requireUser();
  const parsed = submitPackageSchema.safeParse({
    packageId: formData.get("packageId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid package." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: rawPackage, error: packageError } = await supabase
    .from("stage_gate_packages")
    .select(
      `
        id,
        status,
        partner_id,
        stage_gate_id,
        partners(id, status, current_stage_id, current_tier_id, executive_sponsor_id),
        stage_gates(code, name),
        stage_gate_package_sections(id, content, status)
      `,
    )
    .eq("id", parsed.data.packageId)
    .maybeSingle();

  if (packageError) return { error: packageError.message };
  const pkg = normalizePackageSubmissionJoin(rawPackage);
  if (!pkg) return { error: "Package not found." };
  if (!["draft", "rework_required"].includes(pkg.status as string)) {
    return { error: "Only draft or rework packages can be submitted." };
  }
  if (pkg.partners?.status === "rejected" || pkg.partners?.status === "on_hold") {
    return { error: "Rejected or on-hold partners cannot submit packages." };
  }
  if (pkg.partners?.current_stage_id !== pkg.stage_gate_id) {
    return { error: "Package stage must match the partner current stage." };
  }

  const validationError = await validateStageReadiness(
    pkg.partner_id as string,
    pkg.stage_gate_id as string,
    (pkg.stage_gate_package_sections ?? []) as { content: string | null }[],
  );
  if (validationError) {
    return { error: validationError };
  }

  const approval = await createApprovalWorkflow({
    packageId: pkg.id as string,
    partnerId: pkg.partner_id as string,
    stageGateId: pkg.stage_gate_id as string,
    stageCode: String(pkg.stage_gates?.code ?? "SG"),
    executiveSponsorId: (pkg.partners?.executive_sponsor_id as string | null) ?? null,
    currentUserId: currentUser.id,
  });

  if (approval.error) {
    return { error: approval.error };
  }

  await supabase
    .from("stage_gate_packages")
    .update({
      status: "in_review",
      submitted_by: currentUser.id,
      submitted_at: new Date().toISOString(),
      review_started_at: new Date().toISOString(),
      approval_id: approval.approvalId,
      updated_by: currentUser.id,
    })
    .eq("id", pkg.id);

  await writeAuditEvent(supabase, {
    actorUserId: currentUser.id,
    entityType: "stage_gate_package",
    entityId: pkg.id as string,
    action: "submit",
    newValue: { approvalId: approval.approvalId },
  });

  revalidatePath(`/packages/${pkg.id}`);
  revalidatePath("/approvals/my");
  return { success: "Package submitted for approval." };
}

async function validateStageReadiness(
  partnerId: string,
  stageGateId: string,
  sections: { content: string | null }[],
) {
  const supabase = await createSupabaseServerClient();
  const { data: requirements, error } = await supabase
    .from("partner_stage_requirements")
    .select("status, stage_requirements!inner(is_mandatory, stage_gate_id)")
    .eq("partner_id", partnerId)
    .eq("stage_requirements.stage_gate_id", stageGateId);

  if (error) return error.message;

  const incomplete = (requirements ?? []).filter((requirement) => {
    const stageRequirement = Array.isArray(requirement.stage_requirements)
      ? requirement.stage_requirements[0]
      : requirement.stage_requirements;

    return stageRequirement?.is_mandatory && requirement.status !== "complete";
  });

  if (incomplete.length > 0) {
    return "All mandatory stage requirements must be complete before submission.";
  }

  if (sections.some((section) => !section.content?.trim())) {
    return "All package sections must be completed before submission.";
  }

  return null;
}

async function createApprovalWorkflow(input: {
  packageId: string;
  partnerId: string;
  stageGateId: string;
  stageCode: string;
  executiveSponsorId: string | null;
  currentUserId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: partnerTypes } = await supabase
    .from("partner_type_assignments")
    .select("partner_type_id")
    .eq("partner_id", input.partnerId);
  const { data: partner } = await supabase
    .from("partners")
    .select("current_tier_id")
    .eq("id", input.partnerId)
    .maybeSingle();

  const typeIds = new Set((partnerTypes ?? []).map((row) => row.partner_type_id));
  const { data: rules, error: rulesError } = await supabase
    .from("approval_rules")
    .select("approval_sequence, is_parallel, is_required, approver_role_id, partner_type_id, partner_tier_id, roles(code)")
    .eq("stage_gate_id", input.stageGateId)
    .eq("is_active", true)
    .order("approval_sequence", { ascending: true });

  if (rulesError) {
    return { error: rulesError.message };
  }

  const applicable = (rules ?? []).filter((rule) => {
    const typeApplies = !rule.partner_type_id || typeIds.has(rule.partner_type_id);
    const tierApplies = !rule.partner_tier_id || rule.partner_tier_id === partner?.current_tier_id;
    return typeApplies && tierApplies;
  });
  const deduped = new Map<string, (typeof applicable)[number]>();
  for (const rule of applicable) {
    deduped.set(`${rule.approval_sequence}:${rule.approver_role_id}`, rule);
  }
  const finalRules = Array.from(deduped.values());

  if (finalRules.length === 0) {
    return { error: "No approval rules are configured for this stage." };
  }

  const executiveRule = finalRules.find(
    (rule) => (rule.roles as { code?: string } | null)?.code === ROLE_CODES.executiveSponsor,
  );
  if (executiveRule && !input.executiveSponsorId) {
    return { error: "Executive Sponsor approval is required but no sponsor is assigned." };
  }

  const { data: approval, error: approvalError } = await supabase
    .from("approvals")
    .insert({
      partner_id: input.partnerId,
      stage_gate_id: input.stageGateId,
      stage_gate_package_id: input.packageId,
      approval_type: `${input.stageCode} Stage Gate Approval`,
      status: "in_review",
      requested_by: input.currentUserId,
    })
    .select("id")
    .single();

  if (approvalError) {
    return { error: approvalError.message };
  }

  const { error: stepsError } = await supabase.from("approval_steps").insert(
    finalRules.map((rule) => ({
      approval_id: approval.id,
      step_order: rule.approval_sequence,
      approver_role_id: rule.approver_role_id,
      approver_user_id:
        (rule.roles as { code?: string } | null)?.code === ROLE_CODES.executiveSponsor
          ? input.executiveSponsorId
          : null,
      is_required: rule.is_required,
      status: "pending",
    })),
  );

  if (stepsError) {
    return { error: stepsError.message };
  }

  return { approvalId: approval.id as string };
}

type PackageSubmissionJoin = {
  id: string;
  status: string;
  partner_id: string;
  stage_gate_id: string;
  partners: {
    id: string;
    status: string;
    current_stage_id: string;
    current_tier_id: string;
    executive_sponsor_id: string | null;
  } | null;
  stage_gates: {
    code: string;
    name: string;
  } | null;
  stage_gate_package_sections: { content: string | null }[];
};

function normalizePackageSubmissionJoin(
  value: unknown,
): PackageSubmissionJoin | null {
  if (!value) return null;
  const stagePackage = value as {
    id: string;
    status: string;
    partner_id: string;
    stage_gate_id: string;
    partners:
      | {
          id: string;
          status: string;
          current_stage_id: string;
          current_tier_id: string;
          executive_sponsor_id: string | null;
        }
      | {
          id: string;
          status: string;
          current_stage_id: string;
          current_tier_id: string;
          executive_sponsor_id: string | null;
        }[]
      | null;
    stage_gates:
      | {
          code: string;
          name: string;
        }
      | {
          code: string;
          name: string;
        }[]
      | null;
    stage_gate_package_sections: { content: string | null }[] | null;
  };

  return {
    id: stagePackage.id,
    status: stagePackage.status,
    partner_id: stagePackage.partner_id,
    stage_gate_id: stagePackage.stage_gate_id,
    partners: Array.isArray(stagePackage.partners)
      ? stagePackage.partners[0] ?? null
      : stagePackage.partners,
    stage_gates: Array.isArray(stagePackage.stage_gates)
      ? stagePackage.stage_gates[0] ?? null
      : stagePackage.stage_gates,
    stage_gate_package_sections: stagePackage.stage_gate_package_sections ?? [],
  };
}
