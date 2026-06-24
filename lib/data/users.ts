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

type UserBaseRow = Omit<UserListRow, "user_roles">;

type UserRoleJoinRow = UserListRow["user_roles"][number] & {
  user_id: string;
};

const userSelect = "id, name, email, department, region, status, last_login_at";

export async function getUsers() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select(userSelect)
    .order("name")
    .returns<UserBaseRow[]>();

  if (error) throw error;
  return hydrateUsers(data ?? []);
}

export async function getUserById(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select(userSelect)
    .eq("id", userId)
    .maybeSingle()
    .returns<UserBaseRow | null>();

  if (error) throw error;
  const users = data ? await hydrateUsers([data]) : [];
  return users[0] ?? null;
}

async function hydrateUsers(users: UserBaseRow[]): Promise<UserListRow[]> {
  if (users.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const userIds = users.map((user) => user.id);
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, roles!user_roles_role_id_fkey(id, code, name)")
    .in("user_id", userIds)
    .returns<UserRoleJoinRow[]>();

  if (error) throw error;

  const rolesByUserId = new Map<string, UserListRow["user_roles"]>();
  for (const role of data ?? []) {
    const roles = rolesByUserId.get(role.user_id) ?? [];
    roles.push({ roles: role.roles });
    rolesByUserId.set(role.user_id, roles);
  }

  return users.map((user) => ({
    ...user,
    user_roles: rolesByUserId.get(user.id) ?? [],
  }));
}
