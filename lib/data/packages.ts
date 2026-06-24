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
  approvals: { id: string; status: string }[] | null;
  decision_logs: { id: string; decision_outcome: string }[] | null;
};

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
  stage_gate_id,
  partners(id, name),
  stage_gates(id, code, name),
  approvals(id, status),
  decision_logs(id, decision_outcome)
`;

export async function getPackages() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gate_packages")
    .select(packageListSelect)
    .order("updated_at", { ascending: false })
    .returns<PackageListRow[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getPartnerPackages(partnerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gate_packages")
    .select(packageListSelect)
    .eq("partner_id", partnerId)
    .order("package_version", { ascending: false })
    .returns<PackageListRow[]>();

  if (error) throw error;
  return data ?? [];
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
        partners(id, name, status, current_stage_id, alliance_manager_id),
        stage_gates(id, code, name),
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
