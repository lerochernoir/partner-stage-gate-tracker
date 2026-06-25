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

  if (!partnerId || !title) {
    throw new Error("Partner and title are required.");
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
    throw new Error(error.message);
  }

  revalidatePath("/evidence");
  redirect("/evidence");
}
