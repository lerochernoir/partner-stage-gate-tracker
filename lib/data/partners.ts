import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentPackagesByPartner,
  getNextStepDue,
} from "@/lib/packages/workflow";
import type { PartnerStatus } from "@/lib/supabase/types";

export type PartnerListRow = {
  id: string;
  name: string;
  legal_name: string | null;
  region: string | null;
  status: PartnerStatus;
  created_at: string;
  stage_gates: { id: string; code: string; name: string } | null;
  partner_tiers: { id: string; name: string; code: string } | null;
  alliance_manager: { id: string; name: string; email: string } | null;
  executive_sponsor: { id: string; name: string; email: string } | null;
  partner_type_assignments: {
    is_primary: boolean;
    partner_types: { id: string; code: string; name: string } | null;
  }[];
};

export type PartnerWorkingListRow = {
  id: string;
  name: string;
  website: string | null;
  industry_focus: string | null;
  created_at: string;
  updated_at: string;
  current_stage_id: string;
  stage: { id: string; code: string; name: string } | null;
  packageStatus: string;
  approvalStatus: string;
  nextStepDue: string;
  owner: { id: string; name: string; email: string } | null;
  sortRank: number;
};

export type PartnerWorkingListFilters = {
  q?: string;
  stage?: string;
  packageStatus?: string;
  approvalStatus?: string;
  owner?: string;
};

type PartnerUser = { id: string; name: string; email: string } | null;

export type PartnerDetail = PartnerListRow & {
  website: string | null;
  headquarters_country: string | null;
  industry_focus: string | null;
  initial_rationale: string | null;
  current_stage_id: string;
  current_tier_id: string;
  alliance_manager_id: string;
  executive_sponsor_id: string | null;
};

export async function getPartnerWorkingList(
  filters: PartnerWorkingListFilters = {},
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("partners")
    .select(
      `
        id,
        name,
        website,
        industry_focus,
        status,
        created_at,
        updated_at,
        current_stage_id,
        alliance_manager_id,
        stage_gates!partners_current_stage_id_fkey(id, code, name),
        alliance_manager:users!partners_alliance_manager_id_fkey(id, name, email)
      `,
    )
    .neq("status", "rejected")
    .returns<
      Array<{
        id: string;
        name: string;
        website: string | null;
        industry_focus: string | null;
        status: string;
        created_at: string;
        updated_at: string;
        current_stage_id: string;
        alliance_manager_id: string;
        stage_gates:
          | { id: string; code: string; name: string }
          | { id: string; code: string; name: string }[]
          | null;
        alliance_manager:
          | { id: string; name: string; email: string }
          | { id: string; name: string; email: string }[]
          | null;
      }>
    >();

  if (error) throw error;

  const partners = (data ?? []).map((partner) => {
    const stage = Array.isArray(partner.stage_gates)
      ? partner.stage_gates[0] ?? null
      : partner.stage_gates;
    const owner = normalizeUserDisplay(
      Array.isArray(partner.alliance_manager)
        ? partner.alliance_manager[0] ?? null
        : partner.alliance_manager,
    );

    return {
      id: partner.id,
      name: partner.name,
      website: partner.website,
      industry_focus: partner.industry_focus,
      created_at: partner.created_at,
      updated_at: partner.updated_at,
      current_stage_id: partner.current_stage_id,
      stage,
      owner,
    };
  });

  const [packagesResult, approvalsResult] = await Promise.all([
    supabase
      .from("stage_gate_packages")
      .select("id, partner_id, stage_gate_id, package_version, status")
      .in("partner_id", partners.map((partner) => partner.id)),
    supabase
      .from("approvals")
      .select("id, partner_id, stage_gate_package_id, status"),
  ]);

  if (packagesResult.error) throw packagesResult.error;
  if (approvalsResult.error) throw approvalsResult.error;

  const currentPackages = getCurrentPackagesByPartner(
    partners,
    packagesResult.data ?? [],
  );
  const approvalsByPackageId = new Map(
    (approvalsResult.data ?? []).map((approval) => [
      approval.stage_gate_package_id,
      approval,
    ]),
  );
  const rows = partners.map((partner) => {
    const stagePackage = currentPackages.get(partner.id) ?? null;
    const approval = stagePackage
      ? approvalsByPackageId.get(stagePackage.id) ?? null
      : null;
    const packageStatus = stagePackage?.status ?? "not_created";
    const approvalStatus = approval?.status ?? "not_started";
    const pendingApproval = ["submitted", "in_review"].includes(approvalStatus);
    const inProgressPackage = ["in_progress", "ready_for_review", "rework_required"].includes(
      packageStatus,
    );

    return {
      ...partner,
      packageStatus,
      approvalStatus,
      nextStepDue: getNextStepDue(packageStatus, approvalStatus),
      sortRank: pendingApproval ? 0 : inProgressPackage ? 1 : 2,
    };
  });

  return rows.filter((row) => matchesWorkingListFilters(row, filters)).sort(sortWorkingList);
}

export async function getPartnerById(partnerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("partners")
    .select(
      `
        id,
        name,
        legal_name,
        website,
        headquarters_country,
        region,
        industry_focus,
        status,
        initial_rationale,
        current_stage_id,
        current_tier_id,
        alliance_manager_id,
        executive_sponsor_id,
        created_at,
        stage_gates!partners_current_stage_id_fkey(id, code, name),
        partner_tiers!partners_current_tier_id_fkey(id, code, name),
        alliance_manager:users!partners_alliance_manager_id_fkey(id, name, email),
        executive_sponsor:users!partners_executive_sponsor_id_fkey(id, name, email),
        partner_type_assignments(
          is_primary,
          partner_types(id, code, name)
        )
      `,
    )
    .eq("id", partnerId)
    .maybeSingle()
    .returns<PartnerDetail | null>();

  if (error) throw error;
  return data ? normalizePartnerUsers(data) : null;
}

export async function getSg0StageId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gates")
    .select("id")
    .eq("code", "SG0")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function getRegisteredTierId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("partner_tiers")
    .select("id")
    .eq("code", "registered")
    .single();

  if (error) throw error;
  return data.id as string;
}

function normalizePartnerUsers<T extends { alliance_manager: PartnerUser; executive_sponsor: PartnerUser }>(
  partner: T,
) {
  return {
    ...partner,
    alliance_manager: normalizeUserDisplay(partner.alliance_manager),
    executive_sponsor: normalizeUserDisplay(partner.executive_sponsor),
  };
}

function normalizeUserDisplay(user: PartnerUser): PartnerUser {
  if (!user) return null;

  return {
    ...user,
    name: isPlaceholderName(user.name) ? nameFromEmail(user.email) : user.name,
  };
}

function isPlaceholderName(name: string) {
  return name.trim().toLowerCase() === "your name";
}

function nameFromEmail(email: string) {
  if (!email || email.trim().toLowerCase() === "your.email@example.com") {
    return "Unknown user";
  }

  return email
    .split("@")[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function matchesWorkingListFilters(
  row: Omit<PartnerWorkingListRow, "sortRank"> & { sortRank: number },
  filters: PartnerWorkingListFilters,
) {
  const search = filters.q?.trim().toLowerCase();
  const matchesSearch =
    !search ||
    row.name.toLowerCase().includes(search) ||
    row.website?.toLowerCase().includes(search) ||
    row.industry_focus?.toLowerCase().includes(search);
  const matchesStage = !filters.stage || row.stage?.code === filters.stage;
  const matchesPackage =
    !filters.packageStatus || row.packageStatus === filters.packageStatus;
  const matchesApproval =
    !filters.approvalStatus || row.approvalStatus === filters.approvalStatus;
  const matchesOwner = !filters.owner || row.owner?.id === filters.owner;

  return (
    matchesSearch &&
    matchesStage &&
    matchesPackage &&
    matchesApproval &&
    matchesOwner
  );
}

function sortWorkingList(a: PartnerWorkingListRow, b: PartnerWorkingListRow) {
  if (a.sortRank !== b.sortRank) return a.sortRank - b.sortRank;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
