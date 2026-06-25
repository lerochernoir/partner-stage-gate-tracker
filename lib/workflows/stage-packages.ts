import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTIVE_PACKAGE_STATUSES } from "@/lib/packages/status";

type StagePackageWorkflowInput = {
  supabase: SupabaseClient;
  partnerId: string;
  stageGateId: string;
  currentTierId: string;
  partnerTypeIds: string[];
  actorUserId: string;
};

export async function createDraftPackageForStage({
  supabase,
  partnerId,
  stageGateId,
  currentTierId,
  partnerTypeIds,
  actorUserId,
}: StagePackageWorkflowInput) {
  const { data: existingActive, error: existingError } = await supabase
    .from("stage_gate_packages")
    .select("id, status")
    .eq("partner_id", partnerId)
    .eq("stage_gate_id", stageGateId)
    .in("status", [...ACTIVE_PACKAGE_STATUSES])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  if (existingActive) {
    return {
      packageId: existingActive.id as string,
      created: false,
    };
  }

  const { data: versions, error: versionsError } = await supabase
    .from("stage_gate_packages")
    .select("package_version")
    .eq("partner_id", partnerId)
    .eq("stage_gate_id", stageGateId)
    .order("package_version", { ascending: false })
    .limit(1);

  if (versionsError) {
    return { error: versionsError.message };
  }

  const nextVersion = Number(versions?.[0]?.package_version ?? 0) + 1;
  const { data: stagePackage, error: packageError } = await supabase
    .from("stage_gate_packages")
    .insert({
      partner_id: partnerId,
      stage_gate_id: stageGateId,
      package_version: nextVersion,
      status: "draft",
      created_by: actorUserId,
      updated_by: actorUserId,
    })
    .select("id")
    .single();

  if (packageError) {
    return { error: packageError.message };
  }

  const { data: templates, error: templatesError } = await supabase
    .from("stage_gate_package_section_templates")
    .select("section_type, title, display_order, partner_type_id, partner_tier_id")
    .eq("stage_gate_id", stageGateId)
    .eq("is_active", true);

  if (templatesError) {
    return { error: templatesError.message };
  }

  const typeIds = new Set(partnerTypeIds);
  const sectionMap = new Map<
    string,
    { section_type: string; title: string; display_order: number }
  >();

  for (const template of templates ?? []) {
    const appliesToType =
      !template.partner_type_id || typeIds.has(template.partner_type_id as string);
    const appliesToTier =
      !template.partner_tier_id || template.partner_tier_id === currentTierId;

    if (!appliesToType || !appliesToTier) {
      continue;
    }

    const current = {
      section_type: template.section_type as string,
      title: template.title as string,
      display_order: Number(template.display_order ?? 0),
    };
    const existing = sectionMap.get(current.section_type);

    if (!existing || current.display_order <= existing.display_order) {
      sectionMap.set(current.section_type, current);
    }
  }

  const sections = Array.from(sectionMap.values()).sort(
    (a, b) => a.display_order - b.display_order,
  );

  if (sections.length > 0) {
    const { error: sectionsError } = await supabase
      .from("stage_gate_package_sections")
      .insert(
        sections.map((section) => ({
          stage_gate_package_id: stagePackage.id,
          section_type: section.section_type,
          title: section.title,
          display_order: section.display_order,
          status: "draft",
          content: "",
          updated_by: actorUserId,
        })),
      );

    if (sectionsError) {
      return { error: sectionsError.message };
    }
  }

  await supabase.from("audit_events").insert({
    actor_user_id: actorUserId,
    entity_type: "stage_gate_package",
    entity_id: stagePackage.id,
    action: "create",
    new_value: {
      partnerId,
      stageGateId,
      packageVersion: nextVersion,
      source: "stage_workflow",
    },
  });

  return {
    packageId: stagePackage.id as string,
    created: true,
  };
}
