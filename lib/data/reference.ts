import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReferenceUser = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "inactive";
};

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
      .order("name")
      .returns<ReferenceUser[]>(),
  ]);

  if (partnerTypes.error) throw partnerTypes.error;
  if (partnerTiers.error) throw partnerTiers.error;
  if (users.error) throw users.error;

  return {
    partnerTypes: partnerTypes.data ?? [],
    partnerTiers: partnerTiers.data ?? [],
    users: (users.data ?? []).map((user) => ({
      ...user,
      name: isPlaceholderName(user.name) ? nameFromEmail(user.email) : user.name,
    })),
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

function isPlaceholderName(name: string) {
  return name.trim().toLowerCase() === "your name";
}

function nameFromEmail(email: string) {
  if (!email || email.trim().toLowerCase() === "your.email@example.com") {
    return "Unknown user";
  }

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
