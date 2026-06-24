import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PackageListRow = {
  id: string;
  package_version: number;
  status: string;
  submitted_at: string | null;
  partner_id: string;
  stage_gate_id: string;
  partners: { id: string; name: string } | null;
  stage_gates: { id: string; code: string; name: string } | null;
};

type PackageListBaseRow = Omit<
  PackageListRow,
  "partners" | "stage_gates" | "approvals" | "decision_logs"
>;

export type PackageSectionRow = {
  id: string;
  section_type: string;
  title: string;
  content: string;
  status: string;
  display_order: number;
};

export type PackageDetail = {
  id: string;
  partner_id: string;
  stage_gate_id: string;
  package_version: number;
  status: string;
  submitted_at: string | null;
  review_started_at: string | null;
  review_completed_at: string | null;
  summary: string | null;
  strategic_fit_summary: string | null;
  business_case_summary: string | null;
  risk_summary: string | null;
  recommendation: string | null;
  approval_id: string | null;
  decision_log_id: string | null;
  partners: {
    id: string;
    name: string;
    status: string;
    current_stage_id: string;
    alliance_manager_id: string;
  } | null;
  stage_gates: { id: string; code: string; name: string } | null;
  stage_gate_package_sections: PackageSectionRow[];
};

const packageListSelect = `
  id,
  package_version,
  status,
  submitted_at,
  partner_id,
  stage_gate_id
`;

export async function getPackages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gate_packages")
    .select(packageListSelect)
    .order("updated_at", { ascending: false })
    .returns<PackageListBaseRow[]>();

  if (error) throw error;
  return hydratePackageList(data ?? []);
}

export async function getPartnerPackages(partnerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gate_packages")
    .select(packageListSelect)
    .eq("partner_id", partnerId)
    .order("package_version", { ascending: false })
    .returns<PackageListBaseRow[]>();

  if (error) throw error;
  return hydratePackageList(data ?? []);
}

async function hydratePackageList(packages: PackageListBaseRow[]): Promise<PackageListRow[]> {
  if (packages.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const partnerIds = unique(packages.map((stagePackage) => stagePackage.partner_id));
  const stageGateIds = unique(packages.map((stagePackage) => stagePackage.stage_gate_id));

  const [partnersResult, stageGatesResult] = await Promise.all([
    supabase.from("partners").select("id, name").in("id", partnerIds),
    supabase.from("stage_gates").select("id, code, name").in("id", stageGateIds),
  ]);

  if (partnersResult.error) throw partnersResult.error;
  if (stageGatesResult.error) throw stageGatesResult.error;

  const partnersById = new Map((partnersResult.data ?? []).map((partner) => [partner.id, partner]));
  const stageGatesById = new Map((stageGatesResult.data ?? []).map((stageGate) => [stageGate.id, stageGate]));

  return packages.map((stagePackage) => ({
    ...stagePackage,
    partners: partnersById.get(stagePackage.partner_id) ?? null,
    stage_gates: stageGatesById.get(stagePackage.stage_gate_id) ?? null,
  }));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export async function getPackageById(packageId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gate_packages")
    .select(
      `
        id,
        partner_id,
        stage_gate_id,
        package_version,
        status,
        submitted_at,
        review_started_at,
        review_completed_at,
        summary,
        strategic_fit_summary,
        business_case_summary,
        risk_summary,
        recommendation,
        approval_id,
        decision_log_id,
        partners!stage_gate_packages_partner_id_fkey(id, name, status, current_stage_id, alliance_manager_id),
        stage_gates!stage_gate_packages_stage_gate_id_fkey(id, code, name),
        stage_gate_package_sections(
          id,
          section_type,
          title,
          content,
          status,
          display_order
        )
      `,
    )
    .eq("id", packageId)
    .maybeSingle()
    .returns<PackageDetail | null>();

  if (error) throw error;

  if (data) {
    data.stage_gate_package_sections = data.stage_gate_package_sections.sort(
      (a, b) => a.display_order - b.display_order,
    );
  }

  return data;
}
