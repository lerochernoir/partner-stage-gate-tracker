import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardPartnerRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  current_stage_id: string;
  alliance_manager_id: string;
  stage_gates: { id: string; code: string; name: string } | { id: string; code: string; name: string }[] | null;
  alliance_manager: { id: string; name: string; email: string } | { id: string; name: string; email: string }[] | null;
};

type DashboardPackageRow = {
  id: string;
  partner_id: string;
  stage_gate_id: string;
  package_version: number;
  status: string;
  updated_at: string;
};

type DashboardApprovalRow = {
  id: string;
  partner_id: string;
  stage_gate_package_id: string;
  status: string;
  final_decision: string | null;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type ActivePipelineRow = {
  partnerId: string;
  partnerName: string;
  currentStage: string;
  packageStatus: string;
  approvalStatus: string;
  nextStepDue: string;
  owner: string;
  sortRank: number;
  createdAt: string;
};

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [partnersResult, packagesResult, approvalsResult, decisionsResult] =
    await Promise.all([
      supabase
        .from("partners")
        .select(
          `
            id,
            name,
            status,
            created_at,
            current_stage_id,
            alliance_manager_id,
            stage_gates!partners_current_stage_id_fkey(id, code, name),
            alliance_manager:users!partners_alliance_manager_id_fkey(id, name, email)
          `,
        )
        .neq("status", "rejected")
        .returns<DashboardPartnerRow[]>(),
      supabase
        .from("stage_gate_packages")
        .select("id, partner_id, stage_gate_id, package_version, status, updated_at")
        .returns<DashboardPackageRow[]>(),
      supabase
        .from("approvals")
        .select("id, partner_id, stage_gate_package_id, status, final_decision")
        .returns<DashboardApprovalRow[]>(),
      supabase
        .from("decision_logs")
        .select("id")
        .gte("decided_at", startOfMonth.toISOString()),
    ]);

  if (partnersResult.error) throw partnersResult.error;
  if (packagesResult.error) throw packagesResult.error;
  if (approvalsResult.error) throw approvalsResult.error;
  if (decisionsResult.error) throw decisionsResult.error;

  const partners = (partnersResult.data ?? []).map(normalizePartner);
  const packages = packagesResult.data ?? [];
  const approvals = approvalsResult.data ?? [];
  const currentPackages = getCurrentPackagesByPartner(partners, packages);
  const approvalsByPackageId = new Map(
    approvals.map((approval) => [approval.stage_gate_package_id, approval]),
  );
  const stageCounts = countBy(
    partners.map((partner) => partner.stage?.code ?? "No Stage"),
  );
  const packagesInProgress = packages.filter((stagePackage) =>
    ["in_progress", "ready_for_review", "rework_required"].includes(
      stagePackage.status,
    ),
  ).length;
  const approvalsPending = approvals.filter((approval) =>
    ["submitted", "in_review"].includes(approval.status),
  ).length;
  const pipeline = partners
    .map((partner) => {
      const stagePackage = currentPackages.get(partner.id) ?? null;
      const approval = stagePackage ? approvalsByPackageId.get(stagePackage.id) : null;
      return toPipelineRow(partner, stagePackage, approval ?? null);
    })
    .sort(sortPipeline);

  return {
    metrics: [
      {
        label: "Total Partners",
        value: String(partners.length),
        detail: "Active non-rejected partners",
      },
      {
        label: "Partners by Stage",
        value: formatStageCounts(stageCounts),
        detail: "Current stage distribution",
      },
      {
        label: "Packages In Progress",
        value: String(packagesInProgress),
        detail: "In progress, ready, or rework packages",
      },
      {
        label: "Approvals Pending",
        value: String(approvalsPending),
        detail: "Submitted or in-review approvals",
      },
      {
        label: "Decisions This Month",
        value: String(decisionsResult.data?.length ?? 0),
        detail: "Approval decisions recorded this month",
      },
    ] satisfies DashboardMetric[],
    pipeline,
  };
}

function normalizePartner(partner: DashboardPartnerRow) {
  const stage = Array.isArray(partner.stage_gates)
    ? partner.stage_gates[0] ?? null
    : partner.stage_gates;
  const owner = Array.isArray(partner.alliance_manager)
    ? partner.alliance_manager[0] ?? null
    : partner.alliance_manager;

  return {
    id: partner.id,
    name: partner.name,
    status: partner.status,
    createdAt: partner.created_at,
    currentStageId: partner.current_stage_id,
    stage,
    owner,
  };
}

function getCurrentPackagesByPartner(
  partners: ReturnType<typeof normalizePartner>[],
  packages: DashboardPackageRow[],
) {
  const partnerStage = new Map(
    partners.map((partner) => [partner.id, partner.currentStageId]),
  );
  const map = new Map<string, DashboardPackageRow>();

  for (const stagePackage of packages) {
    if (partnerStage.get(stagePackage.partner_id) !== stagePackage.stage_gate_id) {
      continue;
    }

    const existing = map.get(stagePackage.partner_id);
    if (!existing || stagePackage.package_version > existing.package_version) {
      map.set(stagePackage.partner_id, stagePackage);
    }
  }

  return map;
}

function toPipelineRow(
  partner: ReturnType<typeof normalizePartner>,
  stagePackage: DashboardPackageRow | null,
  approval: DashboardApprovalRow | null,
): ActivePipelineRow {
  const hasPendingApproval =
    approval && ["submitted", "in_review"].includes(approval.status);
  const hasInProgressPackage =
    stagePackage &&
    ["in_progress", "ready_for_review", "rework_required"].includes(
      stagePackage.status,
    );

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    currentStage: partner.stage
      ? `${partner.stage.code} - ${partner.stage.name}`
      : "No current stage",
    packageStatus: stagePackage?.status ?? "not_created",
    approvalStatus: approval?.status ?? "not_started",
    nextStepDue: getNextStepDue(stagePackage, approval),
    owner: partner.owner?.name ?? "Unassigned",
    sortRank: hasPendingApproval ? 0 : hasInProgressPackage ? 1 : 2,
    createdAt: partner.createdAt,
  };
}

function getNextStepDue(
  stagePackage: DashboardPackageRow | null,
  approval: DashboardApprovalRow | null,
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

function sortPipeline(a: ActivePipelineRow, b: ActivePipelineRow) {
  if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

function formatStageCounts(counts: Map<string, number>) {
  if (counts.size === 0) return "0";

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([stage, count]) => `${stage}: ${count}`)
    .join(" · ");
}
