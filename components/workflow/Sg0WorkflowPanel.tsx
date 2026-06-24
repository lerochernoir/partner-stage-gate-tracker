import Link from "next/link";
import {
  createStageGatePackageFromWorkflowAction,
  submitPackageFromWorkflowAction,
} from "@/lib/actions/packages";
import type {
  Sg0NextAction,
  Sg0WorkflowState,
  WorkflowStatus,
} from "@/lib/data/sg0-workflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workflowSteps = [
  "Partner Created",
  "Checklist Complete",
  "Package Created",
  "Package Submitted",
  "Approval Pending",
  "Decision Complete",
  "Advanced to SG1",
];

const statusLabels: Record<WorkflowStatus, string> = {
  not_started: "Not Started",
  draft: "In Progress",
  in_progress: "In Progress",
  ready_for_review: "In Progress",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  complete: "Approved",
};

export function Sg0WorkflowPanel({
  workflow,
  nextAction,
}: {
  workflow: Sg0WorkflowState;
  nextAction: Sg0NextAction;
}) {
  const completedSteps = getCompletedSteps(workflow);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Guided SG0 Workflow</CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Stage: {workflow.stage.code} {workflow.stage.name}
            </p>
          </div>
          <NextActionButton action={nextAction} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <StatusItem
            label="Checklist Progress"
            value={`${workflow.checklist.complete}/${workflow.checklist.total}`}
            status={workflow.checklist.status}
          />
          <StatusItem
            label="Package Status"
            value={workflow.package ? statusLabels[workflow.package.workflowStatus] : "Not Started"}
            status={workflow.package?.workflowStatus ?? "not_started"}
          />
          <StatusItem
            label="Approval Status"
            value={workflow.approval ? statusLabels[workflow.approval.workflowStatus] : "Not Started"}
            status={workflow.approval?.workflowStatus ?? "not_started"}
          />
          <StatusItem
            label="Decision Status"
            value={workflow.decision ? statusLabels[workflow.decision.workflowStatus] : "Not Started"}
            status={workflow.decision?.workflowStatus ?? "not_started"}
          />
          <StatusItem
            label="Current Tier"
            value={workflow.currentTier?.name ?? "Not set"}
            status="in_progress"
          />
          <StatusItem
            label="Current Stage"
            value={
              workflow.currentStage
                ? `${workflow.currentStage.code} ${workflow.currentStage.name}`
                : "Not set"
            }
            status={workflow.isAdvancedToSg1 ? "approved" : "in_progress"}
          />
        </div>

        {!workflow.package ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No SG0 package exists yet. New partners auto-create this package;
            partners created before Sprint 3 can create it after the SG0 checklist is complete.
          </div>
        ) : null}

        <ol className="grid gap-2">
          {workflowSteps.map((step, index) => {
            const complete = index < completedSteps;
            return (
              <li className="flex items-center gap-3" key={step}>
                <span
                  className={
                    complete
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                      : "flex h-6 w-6 items-center justify-center rounded-full border text-xs text-muted-foreground"
                  }
                >
                  {complete ? "OK" : index + 1}
                </span>
                <span className={complete ? "font-medium" : "text-muted-foreground"}>
                  {step}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function StatusItem({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: WorkflowStatus;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-medium">{value}</span>
        <WorkflowBadge status={status} />
      </div>
    </div>
  );
}

function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const variant =
    status === "rejected"
      ? "destructive"
      : status === "approved" || status === "complete"
        ? "default"
        : "secondary";

  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}

function NextActionButton({ action }: { action: Sg0NextAction }) {
  if (action.kind === "link") {
    return (
      <Button asChild>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  if (action.kind === "create_package") {
    return (
      <form action={createStageGatePackageFromWorkflowAction}>
        <input name="partnerId" type="hidden" value={action.partnerId} />
        <Button type="submit">{action.label}</Button>
      </form>
    );
  }

  if (action.kind === "submit_package") {
    return (
      <form action={submitPackageFromWorkflowAction}>
        <input name="packageId" type="hidden" value={action.packageId} />
        <Button type="submit">{action.label}</Button>
      </form>
    );
  }

  return (
    <Button disabled type="button">
      {action.label}
    </Button>
  );
}

function getCompletedSteps(workflow: Sg0WorkflowState) {
  if (workflow.isAdvancedToSg1) return 7;
  if (workflow.decision) return 6;
  if (workflow.approval?.workflowStatus === "pending_approval") return 5;
  if (
    workflow.package &&
    ["pending_approval", "approved", "rejected"].includes(workflow.package.workflowStatus)
  ) {
    return 4;
  }
  if (workflow.package) return 3;
  if (workflow.checklist.isComplete) return 2;
  return 1;
}
