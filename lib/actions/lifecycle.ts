"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditEvent } from "@/lib/audit";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionState = {
  error?: string;
  success?: string;
};

const requirementUpdateSchema = z.object({
  requirementId: z.string().uuid(),
  partnerId: z.string().uuid(),
  status: z.enum([
    "not_started",
    "in_progress",
    "complete",
    "blocked",
    "not_applicable",
  ]),
  notes: z.string().trim().optional(),
});

export async function updateStageRequirementAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const currentUser = await requireUser();
  const parsed = requirementUpdateSchema.safeParse({
    requirementId: formData.get("requirementId"),
    partnerId: formData.get("partnerId"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid requirement update." };
  }

  if (parsed.data.status === "blocked" && !parsed.data.notes) {
    return { error: "Blocked requirements require notes." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("partner_stage_requirements")
    .select("status, notes")
    .eq("id", parsed.data.requirementId)
    .maybeSingle();

  const completed = parsed.data.status === "complete";
  const { error } = await supabase
    .from("partner_stage_requirements")
    .update({
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      completed_by: completed ? currentUser.id : null,
      completed_at: completed ? new Date().toISOString() : null,
      updated_by: currentUser.id,
    })
    .eq("id", parsed.data.requirementId)
    .eq("partner_id", parsed.data.partnerId);

  if (error) {
    return { error: error.message };
  }

  await writeAuditEvent(supabase, {
    actorUserId: currentUser.id,
    entityType: "partner_stage_requirement",
    entityId: parsed.data.requirementId,
    action: "update",
    oldValue: existing ?? null,
    newValue: {
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
    },
  });

  revalidatePath(`/partners/${parsed.data.partnerId}`);
  revalidatePath(`/partners/${parsed.data.partnerId}/checklist`);
  return { success: "Requirement updated." };
}
