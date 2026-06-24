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
