"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createEvidenceAction(formData: FormData): Promise<void> {
  const currentUser = await requireUser();
  const supabase = await createSupabaseServerClient();

  const partnerId = String(formData.get("partner_id") || "");
  const evidenceType = String(formData.get("evidence_type") || "document");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const externalUrl = String(formData.get("url") || "").trim();
  const textValue = String(formData.get("text_value") || "").trim();

  if (!partnerId || !title) {
    throw new Error("Partner and Title are required.");
  }

  if (!externalUrl && !textValue) {
    throw new Error("Provide a Reference URL or Content/Notes value.");
  }

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("current_stage_id")
    .eq("id", partnerId)
    .single();

  if (partnerError || !partner) {
    throw new Error("Could not resolve the partner's current stage gate.");
  }

  const { error } = await supabase.from("evidence").insert({
    partner_id: partnerId,
    stage_gate_id: partner.current_stage_id,
    evidence_type: evidenceType,
    title,
    description: description || null,
    external_url: externalUrl || null,
    text_value: textValue || null,
    status: "submitted",
    created_by: currentUser.id,
    updated_by: currentUser.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/evidence");
  redirect("/evidence");
}
