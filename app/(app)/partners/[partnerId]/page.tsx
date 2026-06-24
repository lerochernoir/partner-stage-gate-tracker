import { notFound } from "next/navigation";
import Link from "next/link";
import { InitialRationalePreview } from "@/components/partners/InitialRationalePreview";
import { StageWorkflowPanel } from "@/components/partners/StageWorkflowPanel";
import {
  PartnerStatusBadge,
  StageBadge,
  TierBadge,
} from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createStageGatePackageAction } from "@/lib/actions/packages";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import {
  getPartnerCurrentRequirements,
  getPartnerStageHistory,
  getReadinessSummary,
} from "@/lib/data/lifecycle";
import { getApprovals } from "@/lib/data/approvals";
import { getPartnerDecisionLogs } from "@/lib/data/decisions";
import { getPartnerById } from "@/lib/data/partners";
import { getPartnerPackages, type PackageListRow } from "@/lib/data/packages";
import { formatDateTime, humanize } from "@/lib/format";

type PartnerTab =
  | "overview"
  | "checklist"
  | "packages"
  | "approvals"
  | "decisions"
  | "stage-history";

export default async function PartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { partnerId } = await params;
  const { tab: rawTab } = await searchParams;
  const activeTab = normalizeTab(rawTab);
  const [partner, requirements, packages, allApprovals, decisions, history] =
    await Promise.all([
      getPartnerById(partnerId),
      getPartnerCurrentRequirements(partnerId),
      getPartnerPackages(partnerId),
      getApprovals(),
      getPartnerDecisionLogs(partnerId),
      getPartnerStageHistory(partnerId),
    ]);

  if (!partner) {
    notFound();
  }

  const approvals = allApprovals.filter((approval) => approval.partner_id === partner.id);
  const currentPackage = getCurrentPackage(packages, partner.current_stage_id);
  const currentApproval = currentPackage
    ? approvals.find((approval) => approval.stage_gate_package_id === currentPackage.id)
    : null;
  const currentDecision = currentPackage
    ? decisions.find((decision) => decision.stage_gate_package_id === currentPackage.id)
    : null;
  const nextStepDue = getNextStepDue(currentPackage, currentApproval ?? null);
  const canEdit =
    hasAnyRole(user, [ROLE_CODES.systemAdmin]) ||
    partner.alliance_manager_id === user.id;
  const createPackageAction = async () => {
    "use server";
    await createStageGatePackageAction(partner.id);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{partner.name}</h1>
              <p className="mt-2 text-muted-foreground">
                {partner.website ? (
                  <a href={partner.website} rel="noreferrer" target="_blank">
                    {partner.website}
                  </a>
                ) : (
                  partner.legal_name ?? "No website provided"
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryCta
                currentApprovalId={currentApproval?.id}
                currentDecisionId={currentDecision?.id}
                currentPackage={currentPackage}
                stageCode={partner.stage_gates?.code}
              />
              {canEdit ? (
                <Button asChild variant="outline">
                  <Link href={`/partners/${partner.id}/edit`}>Edit partner</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/partners">Back to partners</Link>
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryItem label="Website" value={partner.website ?? "Not set"} />
            <SummaryItem
              label="Current Stage"
              value={partner.stage_gates ? `${partner.stage_gates.code} - ${partner.stage_gates.name}` : "Not set"}
            />
            <SummaryItem label="Owner" value={partner.alliance_manager?.name ?? "Unassigned"} />
            <SummaryItem label="Package Status" value={humanize(currentPackage?.status)} />
            <SummaryItem label="Approval Status" value={humanize(currentApproval?.status)} />
            <SummaryItem label="Next Step Due" value={nextStepDue} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {partner.stage_gates ? <StageBadge code={partner.stage_gates.code} /> : null}
            {partner.partner_tiers ? <TierBadge name={partner.partner_tiers.name} /> : null}
            <PartnerStatusBadge status={partner.status} />
            {partner.partner_type_assignments.map((assignment) =>
              assignment.partner_types ? (
                <Badge
                  key={assignment.partner_types.id}
                  variant={assignment.is_primary ? "default" : "secondary"}
                >
                  {assignment.partner_types.name}
                </Badge>
              ) : null,
            )}
          </div>
        </CardContent>
      </Card>

      <TabNav activeTab={activeTab} partnerId={partner.id} />

      {activeTab === "overview" ? (
        <div className="grid gap-6">
          <StageWorkflowPanel
            createPackageAction={createPackageAction}
            packages={packages}
            partnerId={partner.id}
            requirements={requirements}
            stage={partner.stage_gates}
          />
          <OverviewTab partner={partner} />
        </div>
      ) : null}

      {activeTab === "checklist" ? (
        <ChecklistTab partnerId={partner.id} requirements={requirements} />
      ) : null}

      {activeTab === "packages" ? (
        <PackagesTab
          currentStageId={partner.current_stage_id}
          packages={packages}
        />
      ) : null}

      {activeTab === "approvals" ? <ApprovalsTab approvals={approvals} /> : null}

      {activeTab === "decisions" ? <DecisionsTab decisions={decisions} /> : null}

      {activeTab === "stage-history" ? <StageHistoryTab history={history} /> : null}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function PrimaryCta({
  currentPackage,
  currentApprovalId,
  currentDecisionId,
  stageCode,
}: {
  currentPackage: PackageListRow | null;
  currentApprovalId?: string;
  currentDecisionId?: string;
  stageCode?: string;
}) {
  if (
    currentPackage &&
    ["draft", "in_progress", "ready_for_review", "rework_required"].includes(
      currentPackage.status,
    )
  ) {
    return (
      <Button asChild>
        <Link href={`/packages/${currentPackage.id}`}>Open Current Package</Link>
      </Button>
    );
  }

  if (
    currentPackage &&
    ["submitted", "in_review"].includes(currentPackage.status) &&
    currentApprovalId
  ) {
    return (
      <Button asChild>
        <Link href={`/approvals/${currentApprovalId}`}>View Approval</Link>
      </Button>
    );
  }

  if (stageCode === "SG2" && currentDecisionId && currentPackage?.status === "approved") {
    return (
      <Button asChild>
        <Link href={`/decisions/${currentDecisionId}`}>View Decision Log</Link>
      </Button>
    );
  }

  return null;
}

function TabNav({
  activeTab,
  partnerId,
}: {
  activeTab: PartnerTab;
  partnerId: string;
}) {
  const tabs: Array<{ key: PartnerTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "checklist", label: "Checklist" },
    { key: "packages", label: "Packages" },
    { key: "approvals", label: "Approvals" },
    { key: "decisions", label: "Decisions" },
    { key: "stage-history", label: "Stage History" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Button
          asChild
          key={tab.key}
          variant={activeTab === tab.key ? "default" : "outline"}
        >
          <Link
            href={
              tab.key === "overview"
                ? `/partners/${partnerId}`
                : `/partners/${partnerId}?tab=${tab.key}`
            }
          >
            {tab.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

function OverviewTab({ partner }: { partner: NonNullable<Awaited<ReturnType<typeof getPartnerById>>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner profile</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 md:grid-cols-2">
          <ProfileItem label="Website" value={partner.website ?? "Not set"} />
          <ProfileItem label="Region" value={partner.region ?? "Not set"} />
          <ProfileItem
            label="Headquarters country"
            value={partner.headquarters_country ?? "Not set"}
          />
          <ProfileItem label="Industry focus" value={partner.industry_focus ?? "Not set"} />
          <ProfileItem label="Alliance manager" value={partner.alliance_manager?.name ?? "Unassigned"} />
          <ProfileItem label="Executive sponsor" value={partner.executive_sponsor?.name ?? "Unassigned"} />
          <ProfileItem label="Created" value={formatDateTime(partner.created_at)} />
          <ProfileItem label="Current stage" value={partner.stage_gates?.name ?? "Not set"} />
        </dl>

        <div className="mt-6">
          <h3 className="font-medium">Initial rationale</h3>
          <InitialRationalePreview value={partner.initial_rationale} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <dt>{label}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{value}</dd>
    </div>
  );
}

function ChecklistTab({
  partnerId,
  requirements,
}: {
  partnerId: string;
  requirements: Awaited<ReturnType<typeof getPartnerCurrentRequirements>>;
}) {
  const readiness = getReadinessSummary(requirements);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>
            Checklist ({readiness.mandatoryComplete}/{readiness.mandatoryTotal})
          </CardTitle>
          <Button asChild variant="outline">
            <Link href={`/partners/${partnerId}/checklist`}>Open full checklist</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {requirements.map((requirement) => (
          <div
            className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-start md:justify-between"
            key={requirement.id}
          >
            <div>
              <h3 className="font-medium">{requirement.stage_requirements?.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {requirement.stage_requirements?.description ?? "No description."}
              </p>
            </div>
            <Badge variant={requirement.status === "complete" ? "default" : "secondary"}>
              {humanize(requirement.status)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PackagesTab({
  currentStageId,
  packages,
}: {
  currentStageId: string;
  packages: PackageListRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Version</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Access</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((stagePackage) => (
              <tr className="border-b last:border-0" key={stagePackage.id}>
                <td className="px-4 py-3">{stagePackage.stage_gates?.code}</td>
                <td className="px-4 py-3">v{stagePackage.package_version}</td>
                <td className="px-4 py-3">{humanize(stagePackage.status)}</td>
                <td className="px-4 py-3">
                  {stagePackage.stage_gate_id === currentStageId ? "Current stage" : "Read-only prior stage"}
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/packages/${stagePackage.id}`}>Open</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ApprovalsTab({ approvals }: { approvals: Awaited<ReturnType<typeof getApprovals>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {approvals.map((approval) => (
          <div className="flex flex-col justify-between gap-2 rounded-lg border p-4 md:flex-row" key={approval.id}>
            <div>
              <h3 className="font-medium">{approval.approval_type}</h3>
              <p className="text-sm text-muted-foreground">
                {approval.stage_gates?.code} · Requested {formatDateTime(approval.requested_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{humanize(approval.status)}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href={`/approvals/${approval.id}`}>Open</Link>
              </Button>
            </div>
          </div>
        ))}
        {approvals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approvals for this partner.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DecisionsTab({ decisions }: { decisions: Awaited<ReturnType<typeof getPartnerDecisionLogs>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {decisions.map((decision) => (
          <div className="flex flex-col justify-between gap-2 rounded-lg border p-4 md:flex-row" key={decision.id}>
            <div>
              <h3 className="font-medium">{decision.decision_title}</h3>
              <p className="text-sm text-muted-foreground">
                {decision.stage_gates?.code} · {formatDateTime(decision.decided_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{humanize(decision.decision_outcome)}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href={`/decisions/${decision.id}`}>Open</Link>
              </Button>
            </div>
          </div>
        ))}
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions for this partner.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StageHistoryTab({ history }: { history: Awaited<ReturnType<typeof getPartnerStageHistory>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage History</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {history.map((item) => (
          <div className="rounded-lg border p-4" key={item.id}>
            <h3 className="font-medium">
              {item.from_stage?.code ?? "Start"} → {item.to_stage?.code}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {humanize(item.transition_status)} · Entered {formatDateTime(item.entered_at)} · Exited{" "}
              {formatDateTime(item.exited_at)}
            </p>
          </div>
        ))}
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stage history for this partner.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getCurrentPackage(packages: PackageListRow[], currentStageId: string) {
  return (
    packages
      .filter((stagePackage) => stagePackage.stage_gate_id === currentStageId)
      .sort((a, b) => b.package_version - a.package_version)[0] ?? null
  );
}

function getNextStepDue(
  stagePackage: PackageListRow | null,
  approval: Awaited<ReturnType<typeof getApprovals>>[number] | null,
) {
  if (approval && ["submitted", "in_review"].includes(approval.status)) {
    return "Now: review approval";
  }

  if (!stagePackage) {
    return "Now: create package";
  }

  if (["draft", "in_progress", "rework_required"].includes(stagePackage.status)) {
    return "Now: complete package";
  }

  if (stagePackage.status === "ready_for_review") {
    return "Now: submit package";
  }

  return "Not scheduled";
}

function normalizeTab(tab?: string): PartnerTab {
  if (
    tab === "checklist" ||
    tab === "packages" ||
    tab === "approvals" ||
    tab === "decisions" ||
    tab === "stage-history"
  ) {
    return tab;
  }

  return "overview";
}
