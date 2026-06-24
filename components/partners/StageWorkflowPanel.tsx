import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReadinessSummary, type StageRequirementRow } from "@/lib/data/lifecycle";
import type { PackageListRow } from "@/lib/data/packages";
import { humanize } from "@/lib/format";

type StageWorkflowPanelProps = {
  partnerId: string;
  stage: {
    id: string;
    code: string;
    name: string;
  } | null;
  requirements: StageRequirementRow[];
  packages: PackageListRow[];
  createPackageAction: () => Promise<void>;
};

export function StageWorkflowPanel({
  partnerId,
  stage,
  requirements,
  packages,
  createPackageAction,
}: StageWorkflowPanelProps) {
  const readiness = getReadinessSummary(requirements);
  const currentPackages = packages
    .filter((stagePackage) => stage && stagePackage.stage_gate_id === stage.id)
    .sort((a, b) => b.package_version - a.package_version);
  const currentPackage = currentPackages[0];
  const approvalStatus = currentPackage?.approvals?.[0]?.status;
  const decisionStatus = currentPackage?.decision_logs?.[0]?.decision_outcome;
  const isSg2Complete = stage?.code === "SG2" && currentPackage?.status === "approved";
  const nextAction = getNextAction({
    stageCode: stage?.code,
    ready: readiness.ready,
    currentPackageStatus: currentPackage?.status,
    approvalStatus,
    isSg2Complete,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Stage Workflow
          {stage ? <Badge>{stage.code}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div>
          <p className="text-sm font-medium">
            {stage ? `${stage.code} - ${stage.name}` : "No current stage"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{nextAction}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Checklist"
            value={`${readiness.mandatoryComplete}/${readiness.mandatoryTotal}`}
          />
          <Metric
            label="Package"
            value={currentPackage ? humanize(currentPackage.status) : "Not created"}
          />
          <Metric label="Approval" value={humanize(approvalStatus)} />
          <Metric label="Decision" value={humanize(decisionStatus)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/partners/${partnerId}/checklist`}>Open checklist</Link>
          </Button>
          {currentPackage ? (
            <Button asChild>
              <Link href={`/packages/${currentPackage.id}`}>Open current package</Link>
            </Button>
          ) : readiness.ready ? (
            <form action={createPackageAction}>
              <Button type="submit">Create {stage?.code} package</Button>
            </form>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/partners/${partnerId}/packages`}>View all packages</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function getNextAction(input: {
  stageCode?: string;
  ready: boolean;
  currentPackageStatus?: string;
  approvalStatus?: string;
  isSg2Complete: boolean;
}) {
  if (input.isSg2Complete) {
    return "SG2 business case is approved. MVP lifecycle is complete.";
  }

  if (!input.ready) {
    return `Complete the ${input.stageCode ?? "current-stage"} checklist.`;
  }

  if (!input.currentPackageStatus) {
    return `Create the ${input.stageCode ?? "current-stage"} package.`;
  }

  if (["draft", "rework_required"].includes(input.currentPackageStatus)) {
    return "Complete package sections and submit for approval.";
  }

  if (["submitted", "in_review"].includes(input.currentPackageStatus)) {
    return `Await approval${input.approvalStatus ? ` (${humanize(input.approvalStatus)})` : ""}.`;
  }

  if (input.currentPackageStatus === "rejected") {
    return "Package was rejected. Create a new version or resolve governance feedback.";
  }

  if (input.currentPackageStatus === "approved") {
    return "Stage package is approved. The workflow will continue to the next stage when available.";
  }

  return "Review the current stage workflow.";
}
