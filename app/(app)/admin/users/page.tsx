import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAnyRole } from "@/lib/auth/session";
import { ROLE_CODES } from "@/lib/auth/roles";
import { getUsers } from "@/lib/data/users";
import { formatDateTime, humanize } from "@/lib/format";

export default async function UsersPage() {
  await requireAnyRole([ROLE_CODES.systemAdmin]);
  let users: Awaited<ReturnType<typeof getUsers>>;

  try {
    users = await getUsers();
  } catch (error) {
    console.error("[route:/admin/users] Failed to load users page.", error);

    return (
      <PageShell
        description="Manage internal access and Sprint 1 role assignments."
        title="Users"
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm">
          <h2 className="font-semibold text-destructive">Users could not load.</h2>
          <p className="mt-2 text-muted-foreground">
            The exact server error has been written to the Vercel logs for route
            <span className="font-mono"> /admin/users</span>.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown server error"}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      description="Manage internal access and Sprint 1 role assignments."
      title="Users"
    >
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/admin/users/new">Create user</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Roles</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Last login</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-b last:border-0" key={user.id}>
                <td className="px-4 py-3">
                  <strong>{user.name}</strong>
                  <p className="text-muted-foreground">{user.department ?? "No department"}</p>
                </td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.user_roles.map((role) =>
                      role.roles ? (
                        <Badge key={role.roles.id} variant="secondary">
                          {role.roles.name}
                        </Badge>
                      ) : null,
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">{humanize(user.status)}</td>
                <td className="px-4 py-3">{formatDateTime(user.last_login_at)}</td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/users/${user.id}`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No users have been created yet.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
