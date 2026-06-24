import type { AppUser } from "@/lib/auth/session";
import { ROLE_CODES } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApprovalStepRow = {
  id: string;
  step_order: number;
  status: string;
  decision: string | null;
  comments: string | null;
  decided_at: string | null;
  is_required: boolean;
  approver_user_id: string | null;
  roles: { id: string; code: string; name: string } | null;
  users: { id: string; name: string; email: string } | null;
};

export type ApprovalRow = {
  id: string;
  partner_id: string;
  stage_gate_id: string;
  stage_gate_package_id: string;
  approval_type: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
  final_decision: string | null;
  partners: { id: string; name: string } | null;
  stage_gates: { id: string; code: string; name: string } | null;
  stage_gate_packages: { id: string; package_version: number; status: string } | null;
  approval_steps: ApprovalStepRow[];
};

type ApprovalBaseRow = Omit<
  ApprovalRow,
  "partners" | "stage_gates" | "stage_gate_packages" | "approval_steps"
>;

type ApprovalStepJoinRow = ApprovalStepRow & {
  approval_id: string;
};

const approvalSelect = `
  id,
  partner_id,
  stage_gate_id,
  stage_gate_package_id,
  approval_type,
  status,
  requested_at,
  completed_at,
  final_decision
`;

export async function getApprovals() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("approvals")
    .select(approvalSelect)
    .order("requested_at", { ascending: false })
    .returns<ApprovalBaseRow[]>();

  if (error) throw error;
  return hydrateApprovals(data ?? []);
}

export async function getMyApprovals(user: AppUser) {
  const approvals = await getApprovals();

  if (user.roles.includes(ROLE_CODES.systemAdmin)) {
    return approvals.filter(
      (approval) =>
        ["submitted", "in_review"].includes(approval.status) &&
        approval.approval_steps.some((step) => step.status === "pending"),
    );
  }

  return approvals.filter((approval) =>
    approval.approval_steps.some(
      (step) =>
        step.status === "pending" &&
        (step.approver_user_id === user.id ||
          (step.approver_user_id === null &&
            step.roles?.code &&
            (user.roles as string[]).includes(step.roles.code))),
    ),
  );
}

export async function getApprovalById(approvalId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("approvals")
    .select(approvalSelect)
    .eq("id", approvalId)
    .maybeSingle()
    .returns<ApprovalBaseRow | null>();

  if (error) throw error;
  const approvals = data ? await hydrateApprovals([data]) : [];
  return approvals[0] ?? null;
}

async function hydrateApprovals(approvals: ApprovalBaseRow[]): Promise<ApprovalRow[]> {
  if (approvals.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const approvalIds = unique(approvals.map((approval) => approval.id));
  const partnerIds = unique(approvals.map((approval) => approval.partner_id));
  const stageGateIds = unique(approvals.map((approval) => approval.stage_gate_id));
  const packageIds = unique(approvals.map((approval) => approval.stage_gate_package_id));

  const [stepsResult, partnersResult, stageGatesResult, packagesResult] = await Promise.all([
    supabase
      .from("approval_steps")
      .select(
        `
          id,
          approval_id,
          step_order,
          status,
          decision,
          comments,
          decided_at,
          is_required,
          approver_user_id,
          roles!approval_steps_approver_role_id_fkey(id, code, name),
          users!approval_steps_approver_user_id_fkey(id, name, email)
        `,
      )
      .in("approval_id", approvalIds)
      .returns<ApprovalStepJoinRow[]>(),
    supabase.from("partners").select("id, name").in("id", partnerIds),
    supabase.from("stage_gates").select("id, code, name").in("id", stageGateIds),
    supabase.from("stage_gate_packages").select("id, package_version, status").in("id", packageIds),
  ]);

  if (stepsResult.error) throw stepsResult.error;
  if (partnersResult.error) throw partnersResult.error;
  if (stageGatesResult.error) throw stageGatesResult.error;
  if (packagesResult.error) throw packagesResult.error;

  const stepsByApprovalId = new Map<string, ApprovalStepRow[]>();
  for (const step of stepsResult.data ?? []) {
    const steps = stepsByApprovalId.get(step.approval_id) ?? [];
    steps.push(step);
    stepsByApprovalId.set(step.approval_id, steps);
  }

  const partnersById = new Map((partnersResult.data ?? []).map((partner) => [partner.id, partner]));
  const stageGatesById = new Map((stageGatesResult.data ?? []).map((stageGate) => [stageGate.id, stageGate]));
  const packagesById = new Map((packagesResult.data ?? []).map((stagePackage) => [stagePackage.id, stagePackage]));

  return approvals.map((approval) =>
    normalizeApproval({
      ...approval,
      partners: partnersById.get(approval.partner_id) ?? null,
      stage_gates: stageGatesById.get(approval.stage_gate_id) ?? null,
      stage_gate_packages: packagesById.get(approval.stage_gate_package_id) ?? null,
      approval_steps: stepsByApprovalId.get(approval.id) ?? [],
    }),
  );
}

function normalizeApproval(approval: ApprovalRow) {
  approval.approval_steps = approval.approval_steps.sort(
    (a, b) => a.step_order - b.step_order,
  );
  return approval;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
