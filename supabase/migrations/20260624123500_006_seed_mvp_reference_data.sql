begin;

insert into public.roles (code, name, description)
values
    ('system_admin', 'System Admin', 'Manages users, roles, reference data, and configuration.'),
    ('alliance_manager', 'Alliance Manager', 'Creates and manages partner records, checklists, and stage gate packages.'),
    ('alliance_leadership', 'Alliance Leadership', 'Reviews portfolio health and approves governed stage progression.'),
    ('executive_sponsor', 'Executive Sponsor', 'Provides executive oversight for sponsored alliance partners.'),
    ('finance_reviewer', 'Finance Reviewer', 'Reviews SG2 business case economics and financial assumptions.'),
    ('gtm_reviewer', 'GTM Reviewer', 'Reviews SG2 go-to-market assumptions and commercial readiness.'),
    ('viewer', 'Viewer', 'Read-only user with dashboard and partner visibility.')
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into public.partner_types (code, name, description)
values
    ('isv', 'ISV', 'Independent software vendor building complementary applications, extensions, or integrations.'),
    ('si', 'SI', 'Systems integrator delivering implementation, transformation, managed services, or advisory services.'),
    ('marketplace', 'Marketplace', 'Partner offering or transacting through a marketplace/channel motion.'),
    ('oem', 'OEM', 'Partner embedding, white-labeling, bundling, or reselling Blue Yonder capabilities.'),
    ('data_provider', 'Data Provider', 'Partner supplying external data, signals, forecasts, benchmarks, enrichment, or analytics inputs.')
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    is_active = true,
    updated_at = now();

insert into public.partner_tiers (code, name, description, rank)
values
    ('registered', 'Registered', 'Entry-level partner with basic profile, eligibility, and minimum governance coverage.', 1),
    ('nexus', 'Nexus', 'Validated partner with approved business case and active engagement motion.', 2),
    ('synergy', 'Synergy', 'Strategic partner with validated technical/operational readiness and approved GTM motion.', 3),
    ('apex', 'Apex', 'Executive-priority partner with scaled field motion and measurable portfolio impact.', 4)
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    rank = excluded.rank,
    is_active = true,
    updated_at = now();

insert into public.stage_gates (code, name, description, sequence, entry_criteria, exit_criteria)
values
    (
        'SG0',
        'Identification',
        'Capture candidate partner and initial alliance hypothesis.',
        0,
        'Partner candidate is nominated or identified.',
        'Partner profile, type, owner, and initial rationale are complete and approved.'
    ),
    (
        'SG1',
        'Strategic Qualification',
        'Confirm strategic alignment with Blue Yonder alliance priorities.',
        1,
        'SG0 Identification has been approved.',
        'Strategic fit, market alignment, executive sponsorship, and qualification recommendation are approved.'
    ),
    (
        'SG2',
        'Business Case Approval',
        'Approve the commercial and strategic business case for the alliance motion.',
        2,
        'SG1 Strategic Qualification has been approved.',
        'Business case, revenue/pipeline hypothesis, investment need, risk summary, and functional reviews are approved.'
    )
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    sequence = excluded.sequence,
    entry_criteria = excluded.entry_criteria,
    exit_criteria = excluded.exit_criteria,
    is_active = true,
    updated_at = now();

insert into public.stage_requirements (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    name,
    description,
    requirement_type,
    is_mandatory,
    owner_role_id,
    display_order
)
select
    sg.id,
    null,
    null,
    seed.name,
    seed.description,
    seed.requirement_type::public.requirement_type,
    seed.is_mandatory,
    r.id,
    seed.display_order
from public.stage_gates sg
join (
    values
        ('SG0', 'Partner profile completed', 'Partner name, legal name where available, website, region, country, and industry focus are captured.', 'profile', true, 'alliance_manager', 10),
        ('SG0', 'Partner type selected', 'At least one partner type is assigned and a primary type is selected when multiple types apply.', 'profile', true, 'alliance_manager', 20),
        ('SG0', 'Alliance manager assigned', 'A Blue Yonder alliance manager owns the partner record.', 'profile', true, 'alliance_manager', 30),
        ('SG0', 'Initial rationale captured', 'The initial alliance hypothesis and rationale are documented.', 'recommendation', true, 'alliance_manager', 40),
        ('SG1', 'Strategic fit summary completed', 'Strategic alignment with Blue Yonder priorities is documented.', 'strategic', true, 'alliance_manager', 10),
        ('SG1', 'Market alignment completed', 'Target market, region, industry, or segment alignment is documented.', 'strategic', true, 'alliance_manager', 20),
        ('SG1', 'Product or services adjacency captured', 'Solution, data, service, or route-to-market adjacency is documented.', 'strategic', true, 'alliance_manager', 30),
        ('SG1', 'Executive sponsor identified', 'Executive sponsorship is identified for the alliance motion.', 'review', true, 'alliance_manager', 40),
        ('SG1', 'Qualification recommendation entered', 'Recommendation to advance, reject, or rework is documented.', 'recommendation', true, 'alliance_manager', 50),
        ('SG2', 'Business case summary completed', 'The business case and strategic thesis are documented.', 'business_case', true, 'alliance_manager', 10),
        ('SG2', 'Revenue or pipeline hypothesis entered', 'Estimated pipeline or revenue opportunity is documented.', 'business_case', true, 'alliance_manager', 20),
        ('SG2', 'Investment need captured', 'Required Blue Yonder and partner-side investment assumptions are captured.', 'business_case', true, 'alliance_manager', 30),
        ('SG2', 'Risk summary entered', 'Material commercial, operational, legal, or execution risks are summarized.', 'risk', true, 'alliance_manager', 40),
        ('SG2', 'Finance review completed', 'Finance reviewer has reviewed business case economics.', 'review', true, 'finance_reviewer', 50),
        ('SG2', 'GTM review completed', 'GTM reviewer has reviewed go-to-market and commercial assumptions.', 'review', true, 'gtm_reviewer', 60),
        ('SG2', 'Leadership review completed', 'Alliance leadership has reviewed the SG2 business case recommendation.', 'review', true, 'alliance_leadership', 70)
) as seed(stage_code, name, description, requirement_type, is_mandatory, owner_role_code, display_order)
    on seed.stage_code = sg.code
left join public.roles r on r.code = seed.owner_role_code
on conflict on constraint stage_requirements_unique_template do update
set
    description = excluded.description,
    requirement_type = excluded.requirement_type,
    is_mandatory = excluded.is_mandatory,
    owner_role_id = excluded.owner_role_id,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

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
    null,
    null,
    r.id,
    seed.approval_sequence,
    seed.is_parallel,
    true,
    true
from public.stage_gates sg
join (
    values
        ('SG0', 'alliance_leadership', 1, false),
        ('SG1', 'alliance_leadership', 1, false),
        ('SG2', 'finance_reviewer', 1, true),
        ('SG2', 'gtm_reviewer', 1, true),
        ('SG2', 'alliance_leadership', 2, false)
) as seed(stage_code, role_code, approval_sequence, is_parallel)
    on seed.stage_code = sg.code
join public.roles r on r.code = seed.role_code
on conflict on constraint approval_rules_unique_route do update
set
    is_parallel = excluded.is_parallel,
    is_required = excluded.is_required,
    is_active = true,
    updated_at = now();

commit;
