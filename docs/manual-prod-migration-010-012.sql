-- =============================================================================
-- Manual production migration bundle: package_status drift fix (010 -> 012)
-- =============================================================================
--
-- PURPOSE
--   Applies the three pending migrations that fix the `package_status`
--   schema drift which causes package section autosave to fail with:
--       invalid input value for enum package_status: "in_progress"
--       invalid input value for enum package_status: "ready_for_review"
--
--   Source migrations (already in the repo) combined here for manual apply:
--     1. supabase/migrations/20260624205500_010_add_stage_package_edit_statuses.sql
--     2. supabase/migrations/20260624205600_011_update_stage_package_edit_policies.sql
--     3. supabase/migrations/20260624211500_012_update_sg2_package_sections.sql
--
-- HOW TO USE
--   1. Open the Supabase Dashboard -> SQL Editor -> New query.
--   2. Copy and paste this entire file.
--   3. Run it once.
--
-- SAFETY
--   * Idempotent: safe to run more than once.
--       - Enum values use ADD VALUE IF NOT EXISTS.
--       - Function uses CREATE OR REPLACE; policy uses DROP ... IF EXISTS + CREATE.
--       - SG2 section templates use an upsert (ON CONFLICT ... DO UPDATE).
--   * Preserves existing records: no rows are deleted. The enum is only
--     extended, the RLS function/policy are redefined, and SG2 section
--     TEMPLATES are deactivated/upserted (package data is untouched).
--
-- ORDERING NOTE (important)
--   PostgreSQL does not allow a newly added enum value to be *used* in the same
--   transaction that added it. Section 1 (the ADD VALUE statements) therefore
--   runs as standalone, auto-committed statements so the new values are durable
--   before Section 2 references them. The Supabase SQL Editor auto-commits each
--   top-level statement, so running the whole file in one pass is safe.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Section 1 of 3 -- Migration 010: add package_status edit lifecycle values
-- (Auto-committed individually; must complete before Section 2 references them.)
-- -----------------------------------------------------------------------------
alter type public.package_status add value if not exists 'in_progress';
alter type public.package_status add value if not exists 'ready_for_review';


-- -----------------------------------------------------------------------------
-- Section 2 of 3 -- Migration 011: package edit RLS (function + update policy)
-- Allows editing while a package is in the 'in_progress' / 'ready_for_review'
-- states (without this, edits get RLS-blocked once a package leaves 'draft').
-- -----------------------------------------------------------------------------
begin;

create or replace function public.can_modify_package(p_package_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.stage_gate_packages sgp
        where sgp.id = p_package_id
          and sgp.status in ('draft', 'in_progress', 'ready_for_review', 'rework_required')
          and public.can_modify_partner(sgp.partner_id)
    );
$$;

drop policy if exists stage_gate_packages_update_owner_when_editable
on public.stage_gate_packages;

create policy stage_gate_packages_update_owner_when_editable
on public.stage_gate_packages for update
to authenticated
using (
    public.can_modify_partner(partner_id)
    or public.can_access_approval(approval_id)
)
with check (
    public.current_user_has_role('system_admin')
    or (
        public.can_modify_partner(partner_id)
        and status in (
            'draft',
            'in_progress',
            'ready_for_review',
            'submitted',
            'in_review',
            'rework_required',
            'withdrawn'
        )
    )
    or public.can_access_approval(approval_id)
);

commit;


-- -----------------------------------------------------------------------------
-- Section 3 of 3 -- Migration 012: refresh SG2 default package section templates
-- Deactivates legacy SG2 default templates and upserts the canonical set.
-- Only template definitions are touched; existing package sections are kept.
-- -----------------------------------------------------------------------------
begin;

update public.stage_gate_package_section_templates template
set
    is_active = false,
    updated_at = now()
from public.stage_gates stage
where template.stage_gate_id = stage.id
  and stage.code = 'SG2'
  and template.partner_type_id is null
  and template.partner_tier_id is null
  and template.section_type not in (
      'solution_fit',
      'integration_requirements',
      'technical_architecture',
      'customer_use_case',
      'commercial_structure',
      'delivery_readiness',
      'sg3_recommendation'
  );

insert into public.stage_gate_package_section_templates (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    section_type,
    title,
    description,
    is_required,
    display_order,
    is_active
)
select
    stage.id,
    null,
    null,
    seed.section_type,
    seed.title,
    seed.description,
    true,
    seed.display_order,
    true
from public.stage_gates stage
join (
    values
        ('solution_fit', 'Solution Fit', 'Describe how the partner solution fits the partner governance motion.', 10),
        ('integration_requirements', 'Integration Requirements', 'Document integration scope, dependencies, APIs, and constraints.', 20),
        ('technical_architecture', 'Technical Architecture', 'Capture the proposed technical architecture and validation assumptions.', 30),
        ('customer_use_case', 'Customer Use Case', 'Describe target customer use cases and value realization.', 40),
        ('commercial_structure', 'Commercial Structure', 'Document commercial model, ownership, and business structure.', 50),
        ('delivery_readiness', 'Delivery Readiness', 'Assess delivery readiness, support ownership, and operational readiness.', 60),
        ('sg3_recommendation', 'SG3 Recommendation', 'Recommend whether the partner should proceed to future SG3 validation.', 70)
) as seed(section_type, title, description, display_order)
    on true
where stage.code = 'SG2'
on conflict on constraint stage_gate_package_section_templates_unique do update
set
    title = excluded.title,
    description = excluded.description,
    is_required = true,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

commit;


-- -----------------------------------------------------------------------------
-- Verification (read-only) -- confirm the enum now includes the edit statuses.
-- Expect rows including: draft, submitted, in_review, in_progress,
-- ready_for_review, rework_required, ...
-- -----------------------------------------------------------------------------
select enumlabel as package_status_value
from pg_enum
where enumtypid = 'public.package_status'::regtype
order by enumsortorder;
