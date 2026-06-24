import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { requireAnyRole } from "@/lib/auth/session";
import { ROLE_CODES } from "@/lib/auth/roles";
import { getUsers } from "@/lib/data/users";
import { formatDateTime, humanize } from "@/lib/format";

export default async function UsersPage() {
  await requireAnyRole([ROLE_CODES.systemAdmin]);
  const users = await getUsers();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-description">
            Manage internal access and Sprint 1 role assignments.
          </p>
        </div>
        <Link className="button primary" href="/admin/users/new">
          Create user
        </Link>
      </header>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Last login</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <p className="help">{user.department ?? "No department"}</p>
                </td>
                <td>{user.email}</td>
                <td>
                  <div className="pill-row">
                    {user.user_roles.map((role) =>
                      role.roles ? (
                        <Badge key={role.roles.id} tone="gray">
                          {role.roles.name}
                        </Badge>
                      ) : null,
                    )}
                  </div>
                </td>
                <td>{humanize(user.status)}</td>
                <td>{formatDateTime(user.last_login_at)}</td>
                <td>
                  <Link className="button secondary" href={`/admin/users/${user.id}`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <div className="empty-state">No users have been created yet.</div>
        ) : null}
      </div>
    </div>
  );
}
