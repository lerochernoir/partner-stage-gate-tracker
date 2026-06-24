import Link from "next/link";
import { UserForm } from "@/components/users/UserForm";
import { createUserAction } from "@/lib/actions/users";
import { ROLE_CODES } from "@/lib/auth/roles";
import { requireAnyRole } from "@/lib/auth/session";
import { getRoles } from "@/lib/data/reference";

export default async function NewUserPage() {
  await requireAnyRole([ROLE_CODES.systemAdmin]);
  const roles = await getRoles();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Create user</h1>
          <p className="page-description">
            Create a Supabase Auth user and assign MVP application roles.
          </p>
        </div>
        <Link className="button secondary" href="/admin/users">
          Back to users
        </Link>
      </header>

      <section className="card">
        <div className="card-body">
          <UserForm
            action={createUserAction}
            includePassword
            roles={roles}
            submitLabel="Create user"
          />
        </div>
      </section>
    </div>
  );
}
