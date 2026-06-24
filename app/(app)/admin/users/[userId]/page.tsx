import { notFound } from "next/navigation";
import Link from "next/link";
import { UserForm } from "@/components/users/UserForm";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateUserAction } from "@/lib/actions/users";
import { ROLE_CODES } from "@/lib/auth/roles";
import { requireAnyRole } from "@/lib/auth/session";
import { getRoles } from "@/lib/data/reference";
import { getUserById } from "@/lib/data/users";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAnyRole([ROLE_CODES.systemAdmin]);
  const { userId } = await params;
  const [roles, user] = await Promise.all([getRoles(), getUserById(userId)]);

  if (!user) {
    notFound();
  }

  const boundAction = updateUserAction.bind(null, user.id);

  return (
    <PageShell description={user.email} title="Edit user">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/users">Back to users</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <UserForm
            action={boundAction}
            roles={roles}
            submitLabel="Save changes"
            user={{
              name: user.name,
              email: user.email,
              department: user.department,
              region: user.region,
              status: user.status,
              roleIds: user.user_roles
                .map((role) => role.roles?.id)
                .filter((roleId): roleId is string => Boolean(roleId)),
            }}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
