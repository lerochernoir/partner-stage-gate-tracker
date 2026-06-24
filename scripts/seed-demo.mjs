import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowRemote = process.env.ALLOW_REMOTE_DEMO_SEED === "true";
const demoEmail = process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@example.com";
const demoPassword = process.env.DEMO_ADMIN_PASSWORD ?? "DemoAdmin123!";

assertSafeEnvironment();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const now = new Date().toISOString();

const refs = await loadReferenceData();
assertReferenceData(refs);
const demoUser = await ensureDemoAdminUser(refs.roles.system_admin.id);
const herePartner = await resetHerePartner(demoUser.id);
const sg0Package = await resetSg0Package(herePartner.id, demoUser.id);
const approval = await resetSg0Approval(herePartner.id, sg0Package.id, demoUser.id);

console.log("Demo data reset complete:");
console.log(`- Demo admin: ${demoEmail}`);
console.log("- Partner: HERE Technologies");
console.log(`- SG0 package: ${sg0Package.id}`);
console.log(`- SG0 approval: ${approval.id}`);

function assertSafeEnvironment() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Refusing to seed demo data.",
    );
  }

  const url = new URL(supabaseUrl);
  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".local");
  const isDevLike =
    process.env.NODE_ENV !== "production" &&
    /dev|local|test|localhost|127\.0\.0\.1/i.test(supabaseUrl);

  if (!allowRemote && !isLocalhost && !isDevLike) {
    throw new Error(
      [
        "Refusing to seed demo data against a non-local/non-dev Supabase URL.",
        "Point NEXT_PUBLIC_SUPABASE_URL at a local/dev project, or set ALLOW_REMOTE_DEMO_SEED=true explicitly.",
      ].join(" "),
    );
  }
}

async function loadReferenceData() {
  const [roles, partnerTypes, partnerTiers, stages, requirements, approvalRules] =
    await Promise.all([
      selectByCode("roles"),
      selectByCode("partner_types"),
      selectByCode("partner_tiers"),
      selectByCode("stage_gates"),
      supabase.from("stage_requirements").select("id, name, stage_gate_id, owner_role_id"),
      supabase.from("approval_rules").select("id, stage_gate_id, approver_role_id, approval_sequence, is_required").eq("is_active", true),
    ]);

  if (requirements.error) throw requirements.error;
  if (approvalRules.error) throw approvalRules.error;

  return {
    roles: roles.data,
    partnerTypes: partnerTypes.data,
    partnerTiers: partnerTiers.data,
    stages: stages.data,
    requirements: requirements.data ?? [],
    approvalRules: approvalRules.data ?? [],
  };
}

async function selectByCode(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw error;

  return {
    data: Object.fromEntries((data ?? []).map((row) => [row.code, row])),
  };
}

async function ensureDemoAdminUser(systemAdminRoleId) {
  const { data: existing, error: listUsersError } = await supabase.auth.admin.listUsers();
  if (listUsersError) throw listUsersError;

  let authUser = existing.users.find(
    (user) => user.email?.toLowerCase() === demoEmail.toLowerCase(),
  );

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { name: "Demo Admin" },
    });
    if (error) throw error;
    authUser = data.user;
  }

  const { error: userError } = await supabase.from("users").upsert(
    {
      id: authUser.id,
      name: "Demo Admin",
      email: demoEmail,
      department: "Alliances",
      region: "Global",
      status: "active",
      updated_by: authUser.id,
    },
    { onConflict: "id" },
  );
  if (userError) throw userError;

  const { error: roleError } = await supabase.from("user_roles").upsert(
    {
      user_id: authUser.id,
      role_id: systemAdminRoleId,
      created_by: authUser.id,
    },
    { onConflict: "user_id,role_id" },
  );
  if (roleError) throw roleError;

  return authUser;
}

async function resetHerePartner(demoUserId) {
  const sg0 = refs.stages.SG0;
  const registeredTier =
    refs.partnerTiers.registered ??
    refs.partnerTiers.advanced ??
    Object.values(refs.partnerTiers)[0];
  const primaryType = refs.partnerTypes.marketplace ?? refs.partnerTypes.isv;

  const { data: existingPartner, error: existingError } = await supabase
    .from("partners")
    .select("id")
    .eq("name", "HERE Technologies")
    .maybeSingle();
  if (existingError) throw existingError;

  if (existingPartner) {
    await deletePartnerWorkflow(existingPartner.id);
  }

  const partnerPayload = {
    name: "HERE Technologies",
    legal_name: "HERE Technologies",
    website: "https://www.here.com",
    headquarters_country: "Netherlands",
    region: "Global",
    industry_focus: "Location data and supply chain visibility",
    status: "active",
    current_stage_id: sg0.id,
    current_tier_id: registeredTier.id,
    alliance_manager_id: demoUserId,
    executive_sponsor_id: demoUserId,
    initial_rationale:
      "Demo partner for validating the SG0-SG2 Blue Yonder alliance stage-gate workflow.",
    created_by: demoUserId,
    updated_by: demoUserId,
  };
  const query = existingPartner
    ? supabase
        .from("partners")
        .update(partnerPayload)
        .eq("id", existingPartner.id)
        .select("id")
        .single()
    : supabase
        .from("partners")
        .insert(partnerPayload)
        .select("id")
        .single();
  const { data: partner, error } = await query;
  if (error) throw error;

  const { error: typeError } = await supabase.from("partner_type_assignments").upsert(
    {
      partner_id: partner.id,
      partner_type_id: primaryType.id,
      is_primary: true,
      assigned_by: demoUserId,
    },
    { onConflict: "partner_id,partner_type_id" },
  );
  if (typeError) throw typeError;

  await initializeSg0Checklist(partner.id, demoUserId);
  const { error: historyError } = await supabase.from("partner_stage_history").insert({
    partner_id: partner.id,
    to_stage_id: sg0.id,
    transition_status: "current",
    entered_at: now,
  });
  if (historyError) throw historyError;

  return partner;
}

async function deletePartnerWorkflow(partnerId) {
  const { data: packageRows, error: packagesError } = await supabase
    .from("stage_gate_packages")
    .select("id")
    .eq("partner_id", partnerId);
  if (packagesError) throw packagesError;

  const packageIds = (packageRows ?? []).map((row) => row.id);
  const ids = packageIds.length > 0 ? await approvalIds(packageIds) : [];

  if (packageIds.length > 0) {
    if (ids.length > 0) {
      await checked(
        supabase.from("approval_steps").delete().in("approval_id", ids),
        "delete approval steps",
      );
    }
    await checked(
      supabase.from("approvals").delete().in("stage_gate_package_id", packageIds),
      "delete approvals",
    );
    await checked(
      supabase
        .from("stage_gate_package_sections")
        .delete()
        .in("stage_gate_package_id", packageIds),
      "delete package sections",
    );
    await checked(
      supabase.from("stage_gate_packages").delete().in("id", packageIds),
      "delete packages",
    );
  }

  await checked(
    supabase.from("decision_logs").delete().eq("partner_id", partnerId),
    "delete decisions",
  );
  await checked(
    supabase.from("partner_stage_history").delete().eq("partner_id", partnerId),
    "delete stage history",
  );
  await checked(
    supabase.from("partner_stage_requirements").delete().eq("partner_id", partnerId),
    "delete stage requirements",
  );
  await checked(
    supabase.from("partner_type_assignments").delete().eq("partner_id", partnerId),
    "delete partner type assignments",
  );
}

async function approvalIds(packageIds) {
  const { data, error } = await supabase
    .from("approvals")
    .select("id")
    .in("stage_gate_package_id", packageIds);
  if (error) throw error;
  return (data ?? []).map((approval) => approval.id);
}

async function initializeSg0Checklist(partnerId, demoUserId) {
  const sg0Requirements = refs.requirements.filter(
    (requirement) => requirement.stage_gate_id === refs.stages.SG0.id,
  );

  const { error } = await supabase.from("partner_stage_requirements").insert(
    sg0Requirements.map((requirement) => ({
      partner_id: partnerId,
      stage_requirement_id: requirement.id,
      status: "not_started",
      owner_id: demoUserId,
      created_by: demoUserId,
      updated_by: demoUserId,
    })),
  );
  if (error) throw error;
}

async function resetSg0Package(partnerId, demoUserId) {
  const { data: stagePackage, error } = await supabase
    .from("stage_gate_packages")
    .insert({
      partner_id: partnerId,
      stage_gate_id: refs.stages.SG0.id,
      package_version: 1,
      status: "draft",
      created_by: demoUserId,
      updated_by: demoUserId,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { data: templates, error: templatesError } = await supabase
    .from("stage_gate_package_section_templates")
    .select("section_type, title, display_order")
    .eq("stage_gate_id", refs.stages.SG0.id)
    .is("partner_type_id", null)
    .is("partner_tier_id", null)
    .eq("is_active", true)
    .order("display_order");
  if (templatesError) throw templatesError;

  if (templates?.length) {
    const { error: sectionsError } = await supabase
      .from("stage_gate_package_sections")
      .insert(
        templates.map((template) => ({
          stage_gate_package_id: stagePackage.id,
          section_type: template.section_type,
          title: template.title,
          content: "",
          status: "draft",
          display_order: template.display_order,
          updated_by: demoUserId,
        })),
      );
    if (sectionsError) throw sectionsError;
  }

  return stagePackage;
}

async function resetSg0Approval(partnerId, packageId, demoUserId) {
  const { data: approval, error } = await supabase
    .from("approvals")
    .insert({
      partner_id: partnerId,
      stage_gate_id: refs.stages.SG0.id,
      stage_gate_package_id: packageId,
      approval_type: "SG0 Stage Gate Approval",
      status: "in_review",
      requested_by: demoUserId,
    })
    .select("id")
    .single();
  if (error) throw error;

  const sg0Rules = refs.approvalRules.filter(
    (rule) => rule.stage_gate_id === refs.stages.SG0.id,
  );

  const { error: stepsError } = await supabase.from("approval_steps").insert(
    sg0Rules.map((rule) => ({
      approval_id: approval.id,
      step_order: rule.approval_sequence,
      approver_role_id: rule.approver_role_id,
      approver_user_id: demoUserId,
      status: "pending",
      is_required: rule.is_required,
    })),
  );
  if (stepsError) throw stepsError;

  await supabase
    .from("stage_gate_packages")
    .update({
      approval_id: approval.id,
      submitted_by: demoUserId,
      submitted_at: now,
      review_started_at: now,
      status: "in_review",
      updated_by: demoUserId,
    })
    .eq("id", packageId);

  return approval;
}

function assertReferenceData(referenceData) {
  const missing = [];

  if (!referenceData.roles.system_admin) missing.push("role: system_admin");
  if (!referenceData.partnerTypes.marketplace && !referenceData.partnerTypes.isv) {
    missing.push("partner type: marketplace or isv");
  }
  if (!referenceData.partnerTiers.registered && !referenceData.partnerTiers.advanced) {
    missing.push("partner tier: registered or advanced");
  }
  if (!referenceData.stages.SG0) missing.push("stage: SG0");

  const sg0Requirements = referenceData.requirements.filter(
    (requirement) => requirement.stage_gate_id === referenceData.stages.SG0?.id,
  );
  const sg0Rules = referenceData.approvalRules.filter(
    (rule) => rule.stage_gate_id === referenceData.stages.SG0?.id,
  );

  if (sg0Requirements.length === 0) missing.push("SG0 requirements");
  if (sg0Rules.length === 0) missing.push("SG0 approval rules");

  if (missing.length > 0) {
    throw new Error(`Cannot seed demo data. Missing reference data: ${missing.join(", ")}`);
  }
}

async function checked(query, label) {
  const { error } = await query;
  if (error) {
    throw new Error(`Failed to ${label}: ${error.message}`);
  }
}
