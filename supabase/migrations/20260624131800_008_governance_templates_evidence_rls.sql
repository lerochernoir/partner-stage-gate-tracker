begin;

create or replace function public.can_access_evidence(p_evidence_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.evidence e
        where e.id = p_evidence_id
          and public.can_access_partner(e.partner_id)
    );
$$;

create or replace function public.can_review_evidence(p_evidence_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.evidence e
        where e.id = p_evidence_id
          and public.can_access_partner(e.partner_id)
          and public.current_user_has_any_role(array[
              'system_admin',
              'alliance_leadership',
              'executive_sponsor',
              'finance_reviewer',
              'gtm_reviewer',
              'product_technical_reviewer',
              'delivery_operations_reviewer',
              'marketplace_operations_reviewer',
              'legal_compliance_reviewer'
          ])
    );
$$;

grant execute on function public.can_access_evidence(uuid) to authenticated;
grant execute on function public.can_review_evidence(uuid) to authenticated;

alter table public.stage_gate_package_section_templates enable row level security;
alter table public.stage_gate_package_field_templates enable row level security;
alter table public.stage_gate_evidence_requirements enable row level security;
alter table public.evidence enable row level security;
alter table public.evidence_reviews enable row level security;
alter table public.stage_gate_package_evidence enable row level security;

create policy stage_gate_package_section_templates_select_authenticated
on public.stage_gate_package_section_templates for select
to authenticated
using (true);

create policy stage_gate_package_section_templates_admin_all
on public.stage_gate_package_section_templates for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy stage_gate_package_field_templates_select_authenticated
on public.stage_gate_package_field_templates for select
to authenticated
using (true);

create policy stage_gate_package_field_templates_admin_all
on public.stage_gate_package_field_templates for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy stage_gate_evidence_requirements_select_authenticated
on public.stage_gate_evidence_requirements for select
to authenticated
using (true);

create policy stage_gate_evidence_requirements_admin_all
on public.stage_gate_evidence_requirements for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy evidence_select_accessible
on public.evidence for select
to authenticated
using (public.can_access_partner(partner_id));

create policy evidence_insert_partner_owner
on public.evidence for insert
to authenticated
with check (public.can_modify_partner(partner_id));

create policy evidence_update_owner_or_reviewer
on public.evidence for update
to authenticated
using (
    public.can_modify_partner(partner_id)
    or public.can_review_evidence(id)
)
with check (
    public.can_modify_partner(partner_id)
    or public.can_review_evidence(id)
);

create policy evidence_delete_owner
on public.evidence for delete
to authenticated
using (public.can_modify_partner(partner_id));

create policy evidence_reviews_select_accessible
on public.evidence_reviews for select
to authenticated
using (public.can_access_evidence(evidence_id));

create policy evidence_reviews_insert_reviewer
on public.evidence_reviews for insert
to authenticated
with check (
    reviewer_id = auth.uid()
    and public.can_review_evidence(evidence_id)
);

create policy stage_gate_package_evidence_select_accessible
on public.stage_gate_package_evidence for select
to authenticated
using (public.can_access_package(stage_gate_package_id));

create policy stage_gate_package_evidence_insert_owner
on public.stage_gate_package_evidence for insert
to authenticated
with check (
    public.can_modify_package(stage_gate_package_id)
    and public.can_access_evidence(evidence_id)
);

create policy stage_gate_package_evidence_delete_owner
on public.stage_gate_package_evidence for delete
to authenticated
using (public.can_modify_package(stage_gate_package_id));

commit;
