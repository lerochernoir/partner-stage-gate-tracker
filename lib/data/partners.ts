import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export async function getPartners(searchParams?: {
  q?: string;
  stage?: string;
  status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("partners")
    .select(
      `
        id,
        name,
        legal_name,
        region,
        status,
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
    .order("created_at", { ascending: false });

  if (searchParams?.q) {
    query = query.ilike("name", `%${searchParams.q}%`);
  }

  if (searchParams?.status) {
    query = query.eq("status", searchParams.status as PartnerStatus);
  }

  if (searchParams?.stage) {
    query = query.eq("current_stage_id", searchParams.stage);
  }

  const { data, error } = await query.returns<PartnerListRow[]>();

  if (error) throw error;
  return data ?? [];
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
  return data;
}

export async function getSg0StageId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("stage_gates")
    .select("id")
    .eq("code", "SG0")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getRegisteredTierId() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("partner_tiers")
    .select("id")
    .eq("code", "registered")
    .single();

  if (error) throw error;
  return data.id;
}
