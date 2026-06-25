"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EvidenceFormState = {
  error?: string;
};

export async function createEvidenceAction(
  _previousState: EvidenceFormState,
  formData: FormData,
): Promise<EvidenceFormState> {
  const currentUser = await requireUser();
  const supabase = await createSupabaseServerClient();

  const partnerId = String(formData.get("partner_id") || "");
  const evidenceType = String(formData.get("evidence_type") || "document");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const externalUrl = String(formData.get("url") || "").trim();

  if (!partnerId) {
    return { error: "Partner is required." };
  }

  if (!title) {
    return { error: "Title is required." };
  }

  const { error } = await supabase.from("evidence").insert({
    partner_id: partnerId,
    evidence_type: evidenceType,
    title,
    description: description || null,
    external_url: externalUrl || null,
    status: "draft",
    created_by: currentUser.id,
    updated_by: currentUser.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/evidence");
  redirect("/evidence");
}
