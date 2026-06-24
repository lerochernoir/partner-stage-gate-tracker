import type { AppUser } from "@/lib/auth/session";
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

const approvalSelect = `
  id,
  partner_id,
  stage_gate_id,
  stage_gate_package_id,
  approval_type,
  status,
  requested_at,
  completed_at,
  final_decision,
  partners(id, name),
  stage_gates(id, code, name),
  stage_gate_packages(id, package_version, status),
  approval_steps(
    id,
    step_order,
    status,
    decision,
    comments,
    decided_at,
    is_required,
    approver_user_id,
    roles(id, code, name),
    users(id, name, email)
  )
`;

export async function getApprovals() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("approvals")
    .select(approvalSelect)
    .order("requested_at", { ascending: false })
    .returns<ApprovalRow[]>();

  if (error) throw error;
  return normalizeApprovals(data ?? []);
}

export async function getMyApprovals(user: AppUser) {
  const approvals = await getApprovals();

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
    .returns<ApprovalRow | null>();

  if (error) throw error;
  return data ? normalizeApproval(data) : null;
}

function normalizeApprovals(approvals: ApprovalRow[]) {
  return approvals.map(normalizeApproval);
}

function normalizeApproval(approval: ApprovalRow) {
  approval.approval_steps = approval.approval_steps.sort(
    (a, b) => a.step_order - b.step_order,
  );
  return approval;
}
