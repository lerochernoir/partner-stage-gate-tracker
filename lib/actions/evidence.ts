import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEvidence() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("evidence")
    .select(`
      id,
      title,
      evidence_type,
      status,
      external_url,
      created_at,
      partners(name),
      stage_gates(code, name)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}
