import { notFound } from "next/navigation";
import Link from "next/link";
import { ApprovalDecisionForm } from "@/components/approvals/ApprovalDecisionForm";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_CODES } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { getApprovalById } from "@/lib/data/approvals";
import { formatDateTime, humanize } from "@/lib/format";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ approvalId: string }>;
}) {
  const user = await requireUser();
  const { approvalId } = await params;
  const approval = await getApprovalById(approvalId);

  if (!approval) notFound();

  const myStep = approval.approval_steps.find(
    (step) =>
      step.status === "pending" &&
      (user.roles.includes(ROLE_CODES.systemAdmin) ||
        step.approver_user_id === user.id ||
        (step.approver_user_id === null &&
          step.roles?.code &&
          (user.roles as string[]).includes(step.roles.code))),
  );

  return (
    <PageShell
      description={`${approval.partners?.name ?? "Partner"} · ${approval.stage_gates?.code}`}
      title="Approval Detail"
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/approvals/my">Back to approvals</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/packages/${approval.stage_gate_package_id}`}>View package</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {approval.approval_type}
            <Badge variant="secondary">{humanize(approval.status)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Requested {formatDateTime(approval.requested_at)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Steps</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {approval.approval_steps.map((step) => (
            <div className="rounded-lg border p-4" key={step.id}>
              <div className="flex flex-col justify-between gap-2 md:flex-row">
                <div>
                  <h3 className="font-medium">
                    Step {step.step_order}: {step.roles?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Approver: {step.users?.name ?? "Role-based approval"}
                  </p>
                </div>
                <Badge variant="secondary">{humanize(step.status)}</Badge>
              </div>
              {step.comments ? (
                <p className="mt-3 text-sm text-muted-foreground">{step.comments}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {myStep ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalDecisionForm approvalId={approval.id} stepId={myStep.id} />
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
