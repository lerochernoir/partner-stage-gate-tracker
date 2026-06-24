begin;

insert into public.roles (code, name, description)
values
    ('product_technical_reviewer', 'Product / Technical Reviewer', 'Reviews ISV product integration and technical roadmap implications.'),
    ('delivery_operations_reviewer', 'Delivery / Operations Reviewer', 'Reviews SI delivery capacity, methodology, and operational readiness.'),
    ('marketplace_operations_reviewer', 'Marketplace Operations Reviewer', 'Reviews marketplace listing, transaction, fulfillment, and support readiness.'),
    ('legal_compliance_reviewer', 'Legal / Compliance Reviewer', 'Reviews data rights, privacy, licensing, regulatory, and compliance considerations.')
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

update public.approval_rules ar
set
    approval_sequence = 3,
    updated_at = now()
from public.stage_gates sg
join public.roles r on r.code = 'alliance_leadership'
where ar.stage_gate_id = sg.id
  and ar.approver_role_id = r.id
  and sg.code = 'SG2'
  and ar.partner_type_id is null
  and ar.partner_tier_id is null
  and ar.approval_sequence = 2;

insert into public.approval_rules (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    approver_role_id,
    approval_sequence,
    is_parallel,
    is_required,
    is_active
)
select
    sg.id,
    pt.id,
    tier.id,
    r.id,
    seed.approval_sequence,
    seed.is_parallel,
    seed.is_required,
    seed.is_active
from (
    values
        ('SG0', null, 'synergy', 'executive_sponsor', 2, false, true, true),
        ('SG0', null, 'apex', 'executive_sponsor', 2, false, true, true),
        ('SG1', 'oem', null, 'executive_sponsor', 2, false, true, true),
        ('SG1', 'data_provider', null, 'executive_sponsor', 2, false, true, true),
        ('SG1', null, 'synergy', 'executive_sponsor', 2, false, true, true),
        ('SG1', null, 'apex', 'executive_sponsor', 2, false, true, true),
        ('SG2', 'oem', null, 'executive_sponsor', 2, false, true, true),
        ('SG2', null, 'synergy', 'executive_sponsor', 2, false, true, true),
        ('SG2', null, 'apex', 'executive_sponsor', 2, false, true, true),
        ('SG2', 'isv', null, 'product_technical_reviewer', 2, false, true, false),
        ('SG2', 'si', null, 'delivery_operations_reviewer', 2, false, true, false),
        ('SG2', 'marketplace', null, 'marketplace_operations_reviewer', 2, false, true, false),
        ('SG2', 'data_provider', null, 'legal_compliance_reviewer', 2, false, true, false)
) as seed(stage_code, partner_type_code, partner_tier_code, role_code, approval_sequence, is_parallel, is_required, is_active)
join public.stage_gates sg on sg.code = seed.stage_code
left join public.partner_types pt on pt.code = seed.partner_type_code
left join public.partner_tiers tier on tier.code = seed.partner_tier_code
join public.roles r on r.code = seed.role_code
on conflict on constraint approval_rules_unique_route do update
set
    is_parallel = excluded.is_parallel,
    is_required = excluded.is_required,
    is_active = excluded.is_active,
    updated_at = now();

insert into public.stage_gate_package_section_templates (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    section_type,
    title,
    description,
    is_required,
    display_order
)
select
    sg.id,
    pt.id,
    tier.id,
    seed.section_type,
    seed.title,
    seed.description,
    seed.is_required,
    seed.display_order
from (
    values
        ('SG0', null, null, 'partner_summary', 'Partner Summary', 'Basic partner identity, classification, tier, and ownership.', true, 10),
        ('SG0', null, null, 'identification_rationale', 'Identification Rationale', 'Reason the partner is being considered.', true, 20),
        ('SG0', null, null, 'initial_opportunity_hypothesis', 'Initial Opportunity Hypothesis', 'Early view of strategic or commercial opportunity.', true, 30),
        ('SG0', null, null, 'risk_summary', 'Risk Summary', 'Known early risks and unknowns.', true, 40),
        ('SG0', null, null, 'recommendation', 'Recommendation', 'Advance, reject, or request rework recommendation.', true, 50),
        ('SG1', null, null, 'partner_summary', 'Partner Summary', 'Current partner identity, stage, type, tier, and owner.', true, 10),
        ('SG1', null, null, 'strategic_fit', 'Strategic Fit', 'Alignment to Blue Yonder priorities.', true, 20),
        ('SG1', null, null, 'market_alignment', 'Market Alignment', 'Region, industry, segment, and customer relevance.', true, 30),
        ('SG1', null, null, 'adjacency', 'Product / Services / Data Adjacency', 'How the partner complements Blue Yonder.', true, 40),
        ('SG1', null, null, 'competitive_positioning', 'Competitive Positioning', 'Differentiation, market signal, or strategic rationale.', true, 50),
        ('SG1', null, null, 'executive_sponsor_recommendation', 'Executive Sponsor Recommendation', 'Executive sponsor rationale when conditionally required.', false, 60),
        ('SG1', 'oem', null, 'executive_sponsor_recommendation', 'Executive Sponsor Recommendation', 'Executive sponsor rationale required for OEM partners.', true, 60),
        ('SG1', 'data_provider', null, 'executive_sponsor_recommendation', 'Executive Sponsor Recommendation', 'Executive sponsor rationale required for Data Provider partners.', true, 60),
        ('SG1', null, 'synergy', 'executive_sponsor_recommendation', 'Executive Sponsor Recommendation', 'Executive sponsor rationale required for Synergy partners.', true, 60),
        ('SG1', null, 'apex', 'executive_sponsor_recommendation', 'Executive Sponsor Recommendation', 'Executive sponsor rationale required for Apex partners.', true, 60),
        ('SG1', null, null, 'risk_summary', 'Risk Summary', 'Known strategic, market, or execution risks.', true, 70),
        ('SG1', null, null, 'qualification_recommendation', 'Qualification Recommendation', 'Advance, reject, or request rework recommendation.', true, 80),
        ('SG2', null, null, 'partner_summary', 'Partner Summary', 'Partner identity, stage, owner, type, and tier.', true, 10),
        ('SG2', null, null, 'strategic_context', 'Strategic Context', 'Why this business case matters.', true, 20),
        ('SG2', null, null, 'business_case_summary', 'Business Case Summary', 'Primary business case narrative.', true, 30),
        ('SG2', null, null, 'revenue_pipeline_hypothesis', 'Revenue / Pipeline Hypothesis', 'Expected pipeline, revenue, or influence.', true, 40),
        ('SG2', null, null, 'investment_requirement', 'Investment Requirement', 'Required Blue Yonder and partner investment.', true, 50),
        ('SG2', null, null, 'commercial_rationale', 'Commercial Rationale', 'Economics, route-to-market, and value model.', true, 60),
        ('SG2', null, null, 'gtm_assumptions', 'GTM Assumptions', 'Target accounts, sales motion, and launch assumptions.', true, 70),
        ('SG2', null, null, 'finance_considerations', 'Finance Considerations', 'Margin, cost, incentive, or financial risk assumptions.', true, 80),
        ('SG2', null, null, 'risk_summary', 'Risk Summary', 'Commercial, operational, legal, and strategic risk.', true, 90),
        ('SG2', null, null, 'recommendation', 'Recommendation', 'Approve, reject, or request rework recommendation.', true, 100)
) as seed(stage_code, partner_type_code, partner_tier_code, section_type, title, description, is_required, display_order)
join public.stage_gates sg on sg.code = seed.stage_code
left join public.partner_types pt on pt.code = seed.partner_type_code
left join public.partner_tiers tier on tier.code = seed.partner_tier_code
on conflict on constraint stage_gate_package_section_templates_unique do update
set
    title = excluded.title,
    description = excluded.description,
    is_required = excluded.is_required,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

insert into public.stage_gate_package_field_templates (
    section_template_id,
    field_key,
    label,
    field_type,
    description,
    is_required,
    display_order
)
select
    st.id,
    seed.field_key,
    seed.label,
    seed.field_type::public.package_field_type,
    seed.description,
    seed.is_required,
    seed.display_order
from (
    values
        ('SG0', 'partner_summary', 'partner_name', 'Partner Name', 'text', 'Legal or operating partner name.', true, 10),
        ('SG0', 'partner_summary', 'partner_type', 'Partner Type', 'multi_select', 'One or more partner types.', true, 20),
        ('SG0', 'partner_summary', 'primary_partner_type', 'Primary Partner Type', 'single_select', 'Primary alliance motion.', true, 30),
        ('SG0', 'partner_summary', 'partner_tier', 'Partner Tier', 'single_select', 'Initial partner tier.', true, 40),
        ('SG0', 'partner_summary', 'alliance_manager', 'Alliance Manager', 'user_reference', 'Blue Yonder owner.', true, 50),
        ('SG0', 'identification_rationale', 'initial_rationale', 'Initial Rationale', 'textarea', 'Why the partner is being considered.', true, 10),
        ('SG0', 'initial_opportunity_hypothesis', 'opportunity_hypothesis', 'Initial Opportunity Hypothesis', 'textarea', 'Early opportunity hypothesis.', true, 10),
        ('SG0', 'risk_summary', 'known_risks', 'Known Risks', 'textarea', 'Early risks or unknowns.', true, 10),
        ('SG0', 'recommendation', 'recommendation', 'Recommendation', 'textarea', 'Advance, reject, or rework recommendation.', true, 10),
        ('SG1', 'strategic_fit', 'strategic_fit_summary', 'Strategic Fit Summary', 'textarea', 'Strategic alignment with Blue Yonder priorities.', true, 10),
        ('SG1', 'market_alignment', 'market_alignment_summary', 'Market Alignment Summary', 'textarea', 'Target market, region, industry, or segment fit.', true, 10),
        ('SG1', 'adjacency', 'adjacency_summary', 'Product / Services / Data Adjacency', 'textarea', 'How partner complements Blue Yonder.', true, 10),
        ('SG1', 'competitive_positioning', 'competitive_positioning', 'Competitive Positioning', 'textarea', 'Differentiation and strategic rationale.', true, 10),
        ('SG1', 'executive_sponsor_recommendation', 'executive_sponsor', 'Executive Sponsor', 'user_reference', 'Executive sponsor when required.', false, 10),
        ('SG1', 'risk_summary', 'known_risks', 'Known Risks', 'textarea', 'Strategic, market, or execution risks.', true, 10),
        ('SG1', 'qualification_recommendation', 'qualification_recommendation', 'Qualification Recommendation', 'textarea', 'Advance, reject, or rework recommendation.', true, 10),
        ('SG2', 'business_case_summary', 'business_case_summary', 'Business Case Summary', 'textarea', 'Primary business case narrative.', true, 10),
        ('SG2', 'revenue_pipeline_hypothesis', 'pipeline_hypothesis', 'Revenue / Pipeline Hypothesis', 'textarea', 'Expected pipeline, revenue, or influence.', true, 10),
        ('SG2', 'revenue_pipeline_hypothesis', 'estimated_pipeline_value', 'Estimated Pipeline Value', 'currency', 'Estimated pipeline value where available.', false, 20),
        ('SG2', 'revenue_pipeline_hypothesis', 'estimated_revenue_value', 'Estimated Revenue Value', 'currency', 'Estimated revenue value where available.', false, 30),
        ('SG2', 'investment_requirement', 'investment_need', 'Investment Need', 'textarea', 'Required Blue Yonder and partner investment.', true, 10),
        ('SG2', 'commercial_rationale', 'commercial_model', 'Commercial Model', 'textarea', 'Commercial model and value rationale.', true, 10),
        ('SG2', 'gtm_assumptions', 'target_segments', 'Target Customer Segments', 'textarea', 'Target customer segments and accounts.', true, 10),
        ('SG2', 'gtm_assumptions', 'gtm_motion', 'GTM Motion', 'textarea', 'Sales motion and GTM assumptions.', true, 20),
        ('SG2', 'finance_considerations', 'finance_considerations', 'Finance Considerations', 'textarea', 'Margin, cost, incentives, or financial risks.', true, 10),
        ('SG2', 'risk_summary', 'risk_summary', 'Risk Summary', 'textarea', 'Commercial, operational, legal, or strategic risk.', true, 10),
        ('SG2', 'recommendation', 'recommendation', 'Recommendation', 'textarea', 'Approve, reject, or request rework recommendation.', true, 10)
) as seed(stage_code, section_type, field_key, label, field_type, description, is_required, display_order)
join public.stage_gates sg on sg.code = seed.stage_code
join public.stage_gate_package_section_templates st
    on st.stage_gate_id = sg.id
   and st.partner_type_id is null
   and st.partner_tier_id is null
   and st.section_type = seed.section_type
on conflict (section_template_id, field_key) do update
set
    label = excluded.label,
    field_type = excluded.field_type,
    description = excluded.description,
    is_required = excluded.is_required,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

insert into public.stage_gate_evidence_requirements (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    evidence_key,
    title,
    description,
    evidence_type,
    is_required,
    display_order
)
select
    sg.id,
    pt.id,
    tier.id,
    seed.evidence_key,
    seed.title,
    seed.description,
    seed.evidence_type::public.evidence_type,
    seed.is_required,
    seed.display_order
from (
    values
        ('SG0', null, null, 'internal_nomination_source', 'Internal nomination/source note', 'Internal source or nomination rationale for the partner.', 'note', true, 10),
        ('SG0', null, null, 'partner_type_justification', 'Partner type justification', 'Justification for selected partner type and primary type.', 'package_field', true, 20),
        ('SG0', null, null, 'partner_profile_source', 'Partner website/profile source', 'Partner website, public profile, or source URL.', 'url', false, 30),
        ('SG0', null, 'synergy', 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation for direct Synergy tier.', 'confirmation', true, 40),
        ('SG0', null, 'apex', 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation for direct Apex tier.', 'confirmation', true, 40),
        ('SG1', null, null, 'strategic_fit_notes', 'Strategic fit notes', 'Strategic alignment notes.', 'package_field', true, 10),
        ('SG1', null, null, 'market_segment_rationale', 'Market/segment rationale', 'Market, region, segment, or customer fit rationale.', 'package_field', true, 20),
        ('SG1', null, null, 'partner_capability_summary', 'Partner capability summary', 'Summary of partner capability relevant to the alliance.', 'note', true, 30),
        ('SG1', null, null, 'initial_customer_examples', 'Initial customer/account examples', 'Early customer or account examples where available.', 'note', false, 40),
        ('SG1', 'oem', null, 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for OEM partners.', 'confirmation', true, 50),
        ('SG1', 'data_provider', null, 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for Data Provider partners.', 'confirmation', true, 50),
        ('SG1', null, 'synergy', 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for Synergy partners.', 'confirmation', true, 50),
        ('SG1', null, 'apex', 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for Apex partners.', 'confirmation', true, 50),
        ('SG2', null, null, 'business_case_narrative', 'Business case narrative', 'Business case narrative and thesis.', 'package_field', true, 10),
        ('SG2', null, null, 'revenue_pipeline_assumptions', 'Revenue/pipeline assumptions', 'Pipeline, revenue, or influence assumptions.', 'package_field', true, 20),
        ('SG2', null, null, 'investment_estimate', 'Investment estimate', 'Estimated Blue Yonder and partner investment.', 'package_field', true, 30),
        ('SG2', null, null, 'gtm_assumptions', 'GTM assumptions', 'Target accounts, sales motion, or launch assumptions.', 'package_field', true, 40),
        ('SG2', null, null, 'finance_review_notes', 'Finance review notes', 'Finance review notes from approval or package content.', 'note', true, 50),
        ('SG2', null, null, 'gtm_review_notes', 'GTM review notes', 'GTM review notes from approval or package content.', 'note', true, 60),
        ('SG2', 'oem', null, 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for OEM business case.', 'confirmation', true, 70),
        ('SG2', null, 'synergy', 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for Synergy business case.', 'confirmation', true, 70),
        ('SG2', null, 'apex', 'executive_sponsor_confirmation', 'Executive sponsor confirmation', 'Executive sponsor confirmation required for Apex business case.', 'confirmation', true, 70),
        ('SG2', 'data_provider', null, 'data_rights_compliance_note', 'Data rights/compliance note', 'Data rights, privacy, licensing, or usage restriction note.', 'note', true, 80)
) as seed(stage_code, partner_type_code, partner_tier_code, evidence_key, title, description, evidence_type, is_required, display_order)
join public.stage_gates sg on sg.code = seed.stage_code
left join public.partner_types pt on pt.code = seed.partner_type_code
left join public.partner_tiers tier on tier.code = seed.partner_tier_code
on conflict on constraint stage_gate_evidence_requirements_unique do update
set
    title = excluded.title,
    description = excluded.description,
    evidence_type = excluded.evidence_type,
    is_required = excluded.is_required,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

commit;
