import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserListRow = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  region: string | null;
  status: "pending" | "active" | "inactive";
  last_login_at: string | null;
  user_roles: {
    roles: {
      id: string;
      code: string;
      name: string;
    } | null;
  }[];
};

export async function getUsers() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, email, department, region, status, last_login_at, user_roles(roles(id, code, name))",
    )
    .order("name")
    .returns<UserListRow[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getUserById(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, name, email, department, region, status, last_login_at, user_roles(roles(id, code, name))",
    )
    .eq("id", userId)
    .maybeSingle()
    .returns<UserListRow | null>();

  if (error) throw error;
  return data;
}
