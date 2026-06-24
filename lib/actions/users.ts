"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAnyRole } from "@/lib/auth/session";
import { ROLE_CODES } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { editUserFormSchema, userFormSchema } from "@/lib/validation/user";

export type FormState = {
  error?: string;
};

function roleIdsFromFormData(formData: FormData) {
  return formData.getAll("roleIds").map(String).filter(Boolean);
}

export async function createUserAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireAnyRole([ROLE_CODES.systemAdmin]);
  const parsed = userFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    department: formData.get("department"),
    region: formData.get("region"),
    status: formData.get("status"),
    roleIds: roleIdsFromFormData(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Unable to create auth user." };
  }

  const { error: profileError } = await admin.from("users").insert({
    id: authData.user.id,
    name: parsed.data.name,
    email: parsed.data.email,
    department: parsed.data.department || null,
    region: parsed.data.region || null,
    status: parsed.data.status,
    created_by: currentUser.id,
    updated_by: currentUser.id,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: rolesError } = await admin.from("user_roles").insert(
    parsed.data.roleIds.map((roleId) => ({
      user_id: authData.user.id,
      role_id: roleId,
      created_by: currentUser.id,
    })),
  );

  if (rolesError) {
    return { error: rolesError.message };
  }

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserAction(
  userId: string,
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentUser = await requireAnyRole([ROLE_CODES.systemAdmin]);
  const parsed = editUserFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    department: formData.get("department"),
    region: formData.get("region"),
    status: formData.get("status"),
    roleIds: roleIdsFromFormData(formData),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid user details." };
  }

  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  const { data: systemAdminRole } = await supabase
    .from("roles")
    .select("id")
    .eq("code", ROLE_CODES.systemAdmin)
    .maybeSingle();

  if (
    systemAdminRole &&
    !parsed.data.roleIds.includes(systemAdminRole.id) &&
    (await isLastActiveAdmin(admin, userId, systemAdminRole.id))
  ) {
    return { error: "At least one active System Admin must remain." };
  }

  const { error: updateError } = await admin
    .from("users")
    .update({
      name: parsed.data.name,
      email: parsed.data.email,
      department: parsed.data.department || null,
      region: parsed.data.region || null,
      status: parsed.data.status,
      updated_by: currentUser.id,
    })
    .eq("id", userId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: deleteRolesError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);

  if (deleteRolesError) {
    return { error: deleteRolesError.message };
  }

  const { error: insertRolesError } = await admin.from("user_roles").insert(
    parsed.data.roleIds.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
      created_by: currentUser.id,
    })),
  );

  if (insertRolesError) {
    return { error: insertRolesError.message };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  redirect("/admin/users");
}

async function isLastActiveAdmin(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  systemAdminRoleId: string,
) {
  const { data, error } = await admin
    .from("user_roles")
    .select("user_id, users!inner(status)")
    .eq("role_id", systemAdminRoleId)
    .eq("users.status", "active")
    .neq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []).length === 0;
}

export type UserFormInput = z.infer<typeof userFormSchema>;
