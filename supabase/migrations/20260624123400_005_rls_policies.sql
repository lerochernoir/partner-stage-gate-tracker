begin;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
    select auth.uid();
$$;

create or replace function public.current_user_has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        join public.users u on u.id = ur.user_id
        where ur.user_id = auth.uid()
          and u.status = 'active'
          and r.code = role_code
    );
$$;

create or replace function public.current_user_has_any_role(role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        join public.users u on u.id = ur.user_id
        where ur.user_id = auth.uid()
          and u.status = 'active'
          and r.code = any(role_codes)
    );
$$;

create or replace function public.can_view_all_partners()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.current_user_has_any_role(array[
        'system_admin',
        'alliance_leadership',
        'viewer'
    ]);
$$;

create or replace function public.can_access_partner(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.can_view_all_partners()
        or exists (
            select 1
            from public.partners p
            where p.id = p_partner_id
              and (
                  p.alliance_manager_id = auth.uid()
                  or p.executive_sponsor_id = auth.uid()
              )
        )
        or exists (
            select 1
            from public.approvals a
            join public.approval_steps s on s.approval_id = a.id
            left join public.user_roles ur on ur.user_id = auth.uid()
            left join public.roles r on r.id = ur.role_id
            where a.partner_id = p_partner_id
              and (
                  s.approver_user_id = auth.uid()
                  or (
                      s.approver_user_id is null
                      and r.id = s.approver_role_id
                  )
              )
        );
$$;

create or replace function public.can_modify_partner(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.current_user_has_role('system_admin')
        or exists (
            select 1
            from public.partners p
            where p.id = p_partner_id
              and p.alliance_manager_id = auth.uid()
        );
$$;

create or replace function public.can_access_package(p_package_id uuid)
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
          and public.can_access_partner(sgp.partner_id)
    );
$$;

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
          and sgp.status in ('draft', 'rework_required')
          and public.can_modify_partner(sgp.partner_id)
    );
$$;

create or replace function public.can_access_approval(p_approval_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.approvals a
        where a.id = p_approval_id
          and public.can_access_partner(a.partner_id)
    );
$$;

create or replace function public.can_decide_approval_step(p_step_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.approval_steps s
        left join public.user_roles ur on ur.user_id = auth.uid()
        left join public.roles r on r.id = ur.role_id
        join public.users u on u.id = auth.uid()
        where s.id = p_step_id
          and u.status = 'active'
          and (
              s.approver_user_id = auth.uid()
              or (
                  s.approver_user_id is null
                  and r.id = s.approver_role_id
              )
              or public.current_user_has_role('system_admin')
          )
    );
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.current_user_has_role(text) to authenticated;
grant execute on function public.current_user_has_any_role(text[]) to authenticated;
grant execute on function public.can_view_all_partners() to authenticated;
grant execute on function public.can_access_partner(uuid) to authenticated;
grant execute on function public.can_modify_partner(uuid) to authenticated;
grant execute on function public.can_access_package(uuid) to authenticated;
grant execute on function public.can_modify_package(uuid) to authenticated;
grant execute on function public.can_access_approval(uuid) to authenticated;
grant execute on function public.can_decide_approval_step(uuid) to authenticated;

alter table public.roles enable row level security;
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.partner_types enable row level security;
alter table public.partner_tiers enable row level security;
alter table public.stage_gates enable row level security;
alter table public.stage_requirements enable row level security;
alter table public.approval_rules enable row level security;
alter table public.partners enable row level security;
alter table public.partner_type_assignments enable row level security;
alter table public.partner_stage_requirements enable row level security;
alter table public.stage_gate_packages enable row level security;
alter table public.stage_gate_package_sections enable row level security;
alter table public.approvals enable row level security;
alter table public.approval_steps enable row level security;
alter table public.decision_logs enable row level security;
alter table public.partner_stage_history enable row level security;
alter table public.audit_events enable row level security;

create policy roles_select_authenticated
on public.roles for select
to authenticated
using (true);

create policy roles_admin_all
on public.roles for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy users_select_authenticated
on public.users for select
to authenticated
using (true);

create policy users_admin_insert
on public.users for insert
to authenticated
with check (public.current_user_has_role('system_admin'));

create policy users_admin_update
on public.users for update
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy user_roles_select_self_or_admin
on public.user_roles for select
to authenticated
using (
    user_id = auth.uid()
    or public.current_user_has_role('system_admin')
);

create policy user_roles_admin_all
on public.user_roles for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy partner_types_select_authenticated
on public.partner_types for select
to authenticated
using (true);

create policy partner_types_admin_all
on public.partner_types for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy partner_tiers_select_authenticated
on public.partner_tiers for select
to authenticated
using (true);

create policy partner_tiers_admin_all
on public.partner_tiers for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy stage_gates_select_authenticated
on public.stage_gates for select
to authenticated
using (true);

create policy stage_gates_admin_all
on public.stage_gates for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy stage_requirements_select_authenticated
on public.stage_requirements for select
to authenticated
using (true);

create policy stage_requirements_admin_all
on public.stage_requirements for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy approval_rules_select_authenticated
on public.approval_rules for select
to authenticated
using (true);

create policy approval_rules_admin_all
on public.approval_rules for all
to authenticated
using (public.current_user_has_role('system_admin'))
with check (public.current_user_has_role('system_admin'));

create policy partners_select_accessible
on public.partners for select
to authenticated
using (public.can_access_partner(id));

create policy partners_insert_admin_or_manager
on public.partners for insert
to authenticated
with check (
    public.current_user_has_role('system_admin')
    or (
        public.current_user_has_role('alliance_manager')
        and alliance_manager_id = auth.uid()
    )
);

create policy partners_update_admin_or_owner
on public.partners for update
to authenticated
using (public.can_modify_partner(id))
with check (public.can_modify_partner(id));

create policy partner_type_assignments_select_accessible
on public.partner_type_assignments for select
to authenticated
using (public.can_access_partner(partner_id));

create policy partner_type_assignments_insert_owner
on public.partner_type_assignments for insert
to authenticated
with check (public.can_modify_partner(partner_id));

create policy partner_type_assignments_update_owner
on public.partner_type_assignments for update
to authenticated
using (public.can_modify_partner(partner_id))
with check (public.can_modify_partner(partner_id));

create policy partner_type_assignments_delete_owner
on public.partner_type_assignments for delete
to authenticated
using (public.can_modify_partner(partner_id));

create policy partner_stage_requirements_select_accessible
on public.partner_stage_requirements for select
to authenticated
using (public.can_access_partner(partner_id));

create policy partner_stage_requirements_insert_owner
on public.partner_stage_requirements for insert
to authenticated
with check (public.can_modify_partner(partner_id));

create policy partner_stage_requirements_update_owner_or_leadership
on public.partner_stage_requirements for update
to authenticated
using (
    public.can_modify_partner(partner_id)
    or public.current_user_has_role('alliance_leadership')
)
with check (
    public.can_modify_partner(partner_id)
    or public.current_user_has_role('alliance_leadership')
);

create policy stage_gate_packages_select_accessible
on public.stage_gate_packages for select
to authenticated
using (public.can_access_partner(partner_id));

create policy stage_gate_packages_insert_owner
on public.stage_gate_packages for insert
to authenticated
with check (public.can_modify_partner(partner_id));

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
        and status in ('draft', 'submitted', 'in_review', 'rework_required', 'withdrawn')
    )
    or public.can_access_approval(approval_id)
);

create policy stage_gate_package_sections_select_accessible
on public.stage_gate_package_sections for select
to authenticated
using (public.can_access_package(stage_gate_package_id));

create policy stage_gate_package_sections_insert_owner
on public.stage_gate_package_sections for insert
to authenticated
with check (public.can_modify_package(stage_gate_package_id));

create policy stage_gate_package_sections_update_owner_when_editable
on public.stage_gate_package_sections for update
to authenticated
using (public.can_modify_package(stage_gate_package_id))
with check (public.can_modify_package(stage_gate_package_id));

create policy approvals_select_accessible
on public.approvals for select
to authenticated
using (public.can_access_partner(partner_id));

create policy approvals_insert_owner
on public.approvals for insert
to authenticated
with check (public.can_modify_partner(partner_id));

create policy approvals_update_accessible_reviewers
on public.approvals for update
to authenticated
using (
    public.can_modify_partner(partner_id)
    or public.can_access_approval(id)
)
with check (
    public.can_modify_partner(partner_id)
    or public.can_access_approval(id)
);

create policy approval_steps_select_accessible
on public.approval_steps for select
to authenticated
using (public.can_access_approval(approval_id));

create policy approval_steps_insert_package_owner
on public.approval_steps for insert
to authenticated
with check (public.can_access_approval(approval_id));

create policy approval_steps_update_assigned_approver
on public.approval_steps for update
to authenticated
using (
    (status = 'pending' and public.can_decide_approval_step(id))
    or public.current_user_has_role('system_admin')
)
with check (
    public.can_decide_approval_step(id)
    or public.current_user_has_role('system_admin')
);

create policy decision_logs_select_accessible
on public.decision_logs for select
to authenticated
using (public.can_access_partner(partner_id));

create policy decision_logs_insert_governed
on public.decision_logs for insert
to authenticated
with check (
    public.can_access_partner(partner_id)
    or public.current_user_has_any_role(array['system_admin', 'alliance_leadership'])
);

create policy partner_stage_history_select_accessible
on public.partner_stage_history for select
to authenticated
using (public.can_access_partner(partner_id));

create policy partner_stage_history_insert_governed
on public.partner_stage_history for insert
to authenticated
with check (
    public.can_modify_partner(partner_id)
    or public.current_user_has_any_role(array['system_admin', 'alliance_leadership'])
);

create policy audit_events_select_admin_or_leadership
on public.audit_events for select
to authenticated
using (
    public.current_user_has_any_role(array['system_admin', 'alliance_leadership'])
);

create policy audit_events_insert_authenticated
on public.audit_events for insert
to authenticated
with check (actor_user_id = auth.uid() or public.current_user_has_role('system_admin'));

commit;
