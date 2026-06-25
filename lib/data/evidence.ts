import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getEvidence() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("evidence")
    .select(`
      *,
      partners(name),
      stage_gates(code, name)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}
