import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RoleCode } from "./roles";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  status: "pending" | "active" | "inactive";
  roles: RoleCode[];
};

type UserRoleRow = {
  roles: {
    code: string;
  } | null;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: appUser, error: userError } = await supabase
    .from("users")
    .select("id, email, name, status")
    .eq("id", user.id)
    .maybeSingle();

  if (userError || !appUser || appUser.status !== "active") {
    return null;
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("roles(code)")
    .eq("user_id", user.id)
    .returns<UserRoleRow[]>();

  if (rolesError) {
    throw rolesError;
  }

  return {
    ...appUser,
    email: getDisplayEmail(appUser.email, user.email),
    name: getDisplayName(appUser.name, user.user_metadata, user.email),
    roles: (roleRows ?? [])
      .map((row) => row.roles?.code)
      .filter((code): code is RoleCode => Boolean(code)),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAnyRole(allowedRoles: RoleCode[]) {
  const user = await requireUser();

  if (!allowedRoles.some((role) => user.roles.includes(role))) {
    redirect("/partners");
  }

  return user;
}

export function hasAnyRole(user: AppUser, allowedRoles: RoleCode[]) {
  return allowedRoles.some((role) => user.roles.includes(role));
}

function getDisplayEmail(appEmail: string, authEmail?: string) {
  if (isPlaceholderEmail(appEmail) && authEmail) {
    return authEmail;
  }

  return authEmail || appEmail;
}

function getDisplayName(
  appName: string,
  metadata: Record<string, unknown>,
  authEmail?: string,
) {
  const metadataName =
    stringFromMetadata(metadata, "full_name") ||
    stringFromMetadata(metadata, "name") ||
    stringFromMetadata(metadata, "display_name");

  if (isPlaceholderName(appName)) {
    return metadataName || nameFromEmail(authEmail) || appName;
  }

  return appName;
}

function stringFromMetadata(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isPlaceholderName(name: string) {
  return name.trim().toLowerCase() === "your name";
}

function isPlaceholderEmail(email: string) {
  return email.trim().toLowerCase() === "your.email@example.com";
}

function nameFromEmail(email?: string) {
  if (!email) return null;

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
