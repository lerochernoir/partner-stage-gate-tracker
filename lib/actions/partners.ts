"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditEvent } from "@/lib/audit";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getRegisteredTierId, getSg0StageId } from "@/lib/data/partners";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { partnerFormSchema } from "@/lib/validation/partner";

export type PartnerFormState = {
  error?: string;
};

function partnerTypeIdsFromFormData(formData: FormData) {
  return formData.getAll("partnerTypeIds").map(String).filter(Boolean);
}

export async function createPartnerAction(
  _previousState: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const currentUser = await requireUser();

  if (
    !hasAnyRole(currentUser, [ROLE_CODES.systemAdmin, ROLE_CODES.allianceManager])
  ) {
    return { error: "You do not have permission to create partners." };
  }

  const sg0StageId = await getSg0StageId();
  const registeredTierId = await getRegisteredTierId();
  const parsed = partnerFormSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    website: formData.get("website"),
    headquartersCountry: formData.get("headquartersCountry"),
    region: formData.get("region"),
    industryFocus: formData.get("industryFocus"),
    status: formData.get("status"),
    currentTierId: formData.get("currentTierId") || registeredTierId,
    allianceManagerId: formData.get("allianceManagerId") || currentUser.id,
    executiveSponsorId: formData.get("executiveSponsorId"),
    initialRationale: formData.get("initialRationale"),
    partnerTypeIds: partnerTypeIdsFromFormData(formData),
    primaryPartnerTypeId: formData.get("primaryPartnerTypeId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid partner details.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .insert({
      name: parsed.data.name,
      legal_name: parsed.data.legalName || null,
      website: parsed.data.website || null,
      headquarters_country: parsed.data.headquartersCountry || null,
      region: parsed.data.region || null,
      industry_focus: parsed.data.industryFocus || null,
      status: parsed.data.status,
      current_stage_id: sg0StageId,
      current_tier_id: parsed.data.currentTierId,
      alliance_manager_id: parsed.data.allianceManagerId,
      executive_sponsor_id: parsed.data.executiveSponsorId || null,
      initial_rationale: parsed.data.initialRationale || null,
      created_by: currentUser.id,
      updated_by: currentUser.id,
    })
    .select("id")
    .single();

  if (partnerError) {
    return { error: partnerError.message };
  }

  const assignmentRows = parsed.data.partnerTypeIds.map((partnerTypeId) => ({
    partner_id: partner.id,
    partner_type_id: partnerTypeId,
    is_primary: partnerTypeId === parsed.data.primaryPartnerTypeId,
    assigned_by: currentUser.id,
  }));

  const { error: typeError } = await supabase
    .from("partner_type_assignments")
    .insert(assignmentRows);

  if (typeError) {
    return { error: typeError.message };
  }

  const initError = await initializeSg0Requirements(
    partner.id,
    parsed.data.allianceManagerId,
    currentUser.id,
  );

  if (initError) {
    return { error: initError };
  }

  await supabase.from("partner_stage_history").insert({
    partner_id: partner.id,
    to_stage_id: sg0StageId,
    transition_status: "current",
  });

  await writeAuditEvent(supabase, {
    actorUserId: currentUser.id,
    entityType: "partner",
    entityId: partner.id,
    action: "create",
    newValue: { name: parsed.data.name, status: parsed.data.status },
  });

  revalidatePath("/partners");
  redirect(`/partners/${partner.id}`);
}

export async function updatePartnerAction(
  partnerId: string,
  _previousState: PartnerFormState,
  formData: FormData,
): Promise<PartnerFormState> {
  const currentUser = await requireUser();
  const parsed = partnerFormSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    website: formData.get("website"),
    headquartersCountry: formData.get("headquartersCountry"),
    region: formData.get("region"),
    industryFocus: formData.get("industryFocus"),
    status: formData.get("status"),
    currentTierId: formData.get("currentTierId"),
    allianceManagerId: formData.get("allianceManagerId"),
    executiveSponsorId: formData.get("executiveSponsorId"),
    initialRationale: formData.get("initialRationale"),
    partnerTypeIds: partnerTypeIdsFromFormData(formData),
    primaryPartnerTypeId: formData.get("primaryPartnerTypeId"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid partner details.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("partners")
    .select("name, status")
    .eq("id", partnerId)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("partners")
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legalName || null,
      website: parsed.data.website || null,
      headquarters_country: parsed.data.headquartersCountry || null,
      region: parsed.data.region || null,
      industry_focus: parsed.data.industryFocus || null,
      status: parsed.data.status,
      current_tier_id: parsed.data.currentTierId,
      alliance_manager_id: parsed.data.allianceManagerId,
      executive_sponsor_id: parsed.data.executiveSponsorId || null,
      initial_rationale: parsed.data.initialRationale || null,
      updated_by: currentUser.id,
    })
    .eq("id", partnerId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: deleteTypeError } = await supabase
    .from("partner_type_assignments")
    .delete()
    .eq("partner_id", partnerId);

  if (deleteTypeError) {
    return { error: deleteTypeError.message };
  }

  const { error: insertTypeError } = await supabase
    .from("partner_type_assignments")
    .insert(
      parsed.data.partnerTypeIds.map((partnerTypeId) => ({
        partner_id: partnerId,
        partner_type_id: partnerTypeId,
        is_primary: partnerTypeId === parsed.data.primaryPartnerTypeId,
        assigned_by: currentUser.id,
      })),
    );

  if (insertTypeError) {
    return { error: insertTypeError.message };
  }

  await writeAuditEvent(supabase, {
    actorUserId: currentUser.id,
    entityType: "partner",
    entityId: partnerId,
    action: "update",
    oldValue: existing ?? null,
    newValue: { name: parsed.data.name, status: parsed.data.status },
  });

  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}`);
  redirect(`/partners/${partnerId}`);
}

async function initializeSg0Requirements(
  partnerId: string,
  allianceManagerId: string,
  currentUserId: string,
) {
  const supabase = await createSupabaseServerClient();
  const sg0StageId = await getSg0StageId();
  const { data: requirements, error: requirementsError } = await supabase
    .from("stage_requirements")
    .select("id")
    .eq("stage_gate_id", sg0StageId)
    .eq("is_active", true);

  if (requirementsError) {
    return requirementsError.message;
  }

  if (!requirements?.length) {
    return "No SG0 requirements are configured.";
  }

  const { error: insertError } = await supabase
    .from("partner_stage_requirements")
    .insert(
      requirements.map((requirement) => ({
        partner_id: partnerId,
        stage_requirement_id: requirement.id,
        owner_id: allianceManagerId,
        created_by: currentUserId,
        updated_by: currentUserId,
      })),
    );

  return insertError?.message;
}
