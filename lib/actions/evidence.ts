"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createEvidenceAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const partnerId = String(formData.get("partner_id") || "");
  const evidenceType = String(formData.get("evidence_type") || "document");
  const title = String(formData.get("title") || "");
  const description = String(formData.get("description") || "");
  const externalUrl = String(formData.get("url") || "");

  if (!partnerId || !title) {
    throw new Error("Partner and title are required.");
  }

  const { error } = await supabase.from("evidence").insert({
    partner_id: partnerId,
    evidence_type: evidenceType,
    title,
    description,
    external_url: externalUrl || null,
    status: "draft",
  });

  if (error) {
    console.error("createEvidenceAction failed", error);
    throw new Error(error.message);
  }

  redirect("/evidence");
}
