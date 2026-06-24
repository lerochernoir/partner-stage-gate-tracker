import Link from "next/link";
import { UserForm } from "@/components/users/UserForm";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createUserAction } from "@/lib/actions/users";
import { ROLE_CODES } from "@/lib/auth/roles";
import { requireAnyRole } from "@/lib/auth/session";
import { getRoles } from "@/lib/data/reference";

export default async function NewUserPage() {
  await requireAnyRole([ROLE_CODES.systemAdmin]);
  const roles = await getRoles();

  return (
    <PageShell
      description="Create a Supabase Auth user and assign MVP application roles."
      title="Create user"
    >
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/users">Back to users</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <UserForm
            action={createUserAction}
            includePassword
            roles={roles}
            submitLabel="Create user"
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
