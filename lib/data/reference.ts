import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getReferenceData() {
  const supabase = await createSupabaseServerClient();
  const [partnerTypes, partnerTiers, users] = await Promise.all([
    supabase
      .from("partner_types")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("partner_tiers")
      .select("id, code, name, rank")
      .eq("is_active", true)
      .order("rank"),
    supabase
      .from("users")
      .select("id, name, email, status")
      .eq("status", "active")
      .order("name"),
  ]);

  if (partnerTypes.error) throw partnerTypes.error;
  if (partnerTiers.error) throw partnerTiers.error;
  if (users.error) throw users.error;

  return {
    partnerTypes: partnerTypes.data ?? [],
    partnerTiers: partnerTiers.data ?? [],
    users: users.data ?? [],
  };
}

export async function getRoles() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, description")
    .order("name");

  if (error) throw error;
  return data ?? [];
}
