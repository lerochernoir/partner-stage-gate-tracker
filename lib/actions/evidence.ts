"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createEvidenceAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const partnerId = String(formData.get("partner_id") || "");
  const stageCode = String(formData.get("stage_code") || "SG0");
  const evidenceType = String(formData.get("evidence_type") || "document");
  const title = String(formData.get("title") || "");
  const description = String(formData.get("description") || "");
  const url = String(formData.get("url") || "");

  if (!partnerId || !title) {
    throw new Error("Partner and title are required.");
  }

  const { error } = await supabase.from("evidence").insert({
    partner_id: partnerId,
    stage_gate_id: null,
    evidence_type: evidenceType,
    title,
    description,
    url,
    status: "draft",
  });

  if (error) throw error;

  redirect("/evidence");
}
