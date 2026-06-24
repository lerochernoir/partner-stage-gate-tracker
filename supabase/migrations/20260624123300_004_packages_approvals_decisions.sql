begin;

create table public.stage_gate_packages (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    stage_gate_id uuid not null references public.stage_gates(id) on delete restrict,
    package_version integer not null default 1,
    status public.package_status not null default 'draft',
    submitted_by uuid references public.users(id) on delete set null,
    submitted_at timestamptz,
    review_started_at timestamptz,
    review_completed_at timestamptz,
    summary text,
    strategic_fit_summary text,
    business_case_summary text,
    risk_summary text,
    recommendation text,
    approval_id uuid,
    decision_log_id uuid,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_gate_packages_version_positive check (package_version > 0),
    constraint stage_gate_packages_unique_version unique (partner_id, stage_gate_id, package_version),
    constraint stage_gate_packages_review_dates check (
        review_completed_at is null
        or review_started_at is null
        or review_completed_at >= review_started_at
    )
);

create unique index stage_gate_packages_one_active_submitted_idx
on public.stage_gate_packages(partner_id, stage_gate_id)
where status in ('submitted', 'in_review');

create index stage_gate_packages_partner_id_idx on public.stage_gate_packages(partner_id);
create index stage_gate_packages_stage_gate_id_idx on public.stage_gate_packages(stage_gate_id);
create index stage_gate_packages_status_idx on public.stage_gate_packages(status);
create index stage_gate_packages_submitted_by_idx on public.stage_gate_packages(submitted_by);
create index stage_gate_packages_submitted_at_idx on public.stage_gate_packages(submitted_at);

create trigger set_stage_gate_packages_updated_at
before update on public.stage_gate_packages
for each row execute function public.set_updated_at();

create table public.stage_gate_package_sections (
    id uuid primary key default gen_random_uuid(),
    stage_gate_package_id uuid not null references public.stage_gate_packages(id) on delete cascade,
    section_type text not null,
    title text not null,
    content text not null default '',
    status public.package_section_status not null default 'draft',
    display_order integer not null default 0,
    updated_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_gate_package_sections_type_not_blank check (length(trim(section_type)) > 0),
    constraint stage_gate_package_sections_title_not_blank check (length(trim(title)) > 0),
    constraint stage_gate_package_sections_display_order_non_negative check (display_order >= 0),
    constraint stage_gate_package_sections_unique_type unique (stage_gate_package_id, section_type)
);

create index stage_gate_package_sections_package_id_idx
on public.stage_gate_package_sections(stage_gate_package_id);

create trigger set_stage_gate_package_sections_updated_at
before update on public.stage_gate_package_sections
for each row execute function public.set_updated_at();

create table public.approvals (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    stage_gate_id uuid not null references public.stage_gates(id) on delete restrict,
    stage_gate_package_id uuid not null references public.stage_gate_packages(id) on delete cascade,
    approval_type text not null,
    status public.approval_status not null default 'submitted',
    requested_by uuid references public.users(id) on delete set null,
    requested_at timestamptz not null default now(),
    completed_at timestamptz,
    final_decision public.approval_decision,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint approvals_type_not_blank check (length(trim(approval_type)) > 0),
    constraint approvals_one_per_package unique (stage_gate_package_id),
    constraint approvals_completed_decision check (
        completed_at is null
        or final_decision is not null
    )
);

create index approvals_partner_id_idx on public.approvals(partner_id);
create index approvals_stage_gate_id_idx on public.approvals(stage_gate_id);
create index approvals_stage_gate_package_id_idx on public.approvals(stage_gate_package_id);
create index approvals_status_idx on public.approvals(status);
create index approvals_requested_by_idx on public.approvals(requested_by);

create trigger set_approvals_updated_at
before update on public.approvals
for each row execute function public.set_updated_at();

create table public.approval_steps (
    id uuid primary key default gen_random_uuid(),
    approval_id uuid not null references public.approvals(id) on delete cascade,
    step_order integer not null,
    approver_role_id uuid not null references public.roles(id) on delete restrict,
    approver_user_id uuid references public.users(id) on delete set null,
    status public.approval_step_status not null default 'pending',
    decision public.approval_decision,
    comments text,
    decided_at timestamptz,
    is_required boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint approval_steps_order_positive check (step_order > 0),
    constraint approval_steps_decision_status_alignment check (
        (status = 'approved' and decision = 'approved')
        or (status = 'rejected' and decision = 'rejected')
        or (status = 'rework_required' and decision = 'rework_required')
        or (status in ('pending', 'cancelled') and decision is null)
    ),
    constraint approval_steps_decided_at_required check (
        status in ('pending', 'cancelled')
        or decided_at is not null
    ),
    constraint approval_steps_comment_required check (
        status not in ('rejected', 'rework_required')
        or length(trim(coalesce(comments, ''))) > 0
    )
);

create index approval_steps_approval_id_idx on public.approval_steps(approval_id);
create index approval_steps_approver_role_id_idx on public.approval_steps(approver_role_id);
create index approval_steps_approver_user_id_idx on public.approval_steps(approver_user_id);
create index approval_steps_status_idx on public.approval_steps(status);

create trigger set_approval_steps_updated_at
before update on public.approval_steps
for each row execute function public.set_updated_at();

create table public.decision_logs (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    stage_gate_id uuid not null references public.stage_gates(id) on delete restrict,
    stage_gate_package_id uuid references public.stage_gate_packages(id) on delete set null,
    approval_id uuid references public.approvals(id) on delete set null,
    decision_type public.decision_type not null,
    decision_outcome public.decision_outcome not null,
    decision_title text not null,
    decision_summary text,
    rationale text,
    conditions text,
    decided_by uuid references public.users(id) on delete set null,
    decided_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint decision_logs_title_not_blank check (length(trim(decision_title)) > 0),
    constraint decision_logs_rationale_required check (
        decision_outcome not in ('rejected', 'rework_required')
        or length(trim(coalesce(rationale, decision_summary, ''))) > 0
    )
);

create index decision_logs_partner_id_idx on public.decision_logs(partner_id);
create index decision_logs_stage_gate_id_idx on public.decision_logs(stage_gate_id);
create index decision_logs_stage_gate_package_id_idx on public.decision_logs(stage_gate_package_id);
create index decision_logs_approval_id_idx on public.decision_logs(approval_id);
create index decision_logs_decision_type_idx on public.decision_logs(decision_type);
create index decision_logs_decision_outcome_idx on public.decision_logs(decision_outcome);
create index decision_logs_decided_by_idx on public.decision_logs(decided_by);
create index decision_logs_decided_at_idx on public.decision_logs(decided_at);

create table public.partner_stage_history (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    from_stage_id uuid references public.stage_gates(id) on delete restrict,
    to_stage_id uuid not null references public.stage_gates(id) on delete restrict,
    stage_gate_package_id uuid references public.stage_gate_packages(id) on delete set null,
    decision_log_id uuid references public.decision_logs(id) on delete set null,
    transition_status public.stage_transition_status not null default 'current',
    entered_at timestamptz not null default now(),
    exited_at timestamptz,
    created_at timestamptz not null default now(),
    constraint partner_stage_history_exit_after_enter check (
        exited_at is null
        or exited_at >= entered_at
    )
);

create unique index partner_stage_history_one_current_idx
on public.partner_stage_history(partner_id)
where transition_status = 'current';

create index partner_stage_history_partner_id_idx on public.partner_stage_history(partner_id);
create index partner_stage_history_from_stage_id_idx on public.partner_stage_history(from_stage_id);
create index partner_stage_history_to_stage_id_idx on public.partner_stage_history(to_stage_id);
create index partner_stage_history_package_id_idx on public.partner_stage_history(stage_gate_package_id);
create index partner_stage_history_decision_log_id_idx on public.partner_stage_history(decision_log_id);
create index partner_stage_history_transition_status_idx on public.partner_stage_history(transition_status);

alter table public.stage_gate_packages
add constraint stage_gate_packages_approval_fk
foreign key (approval_id) references public.approvals(id) on delete set null;

alter table public.stage_gate_packages
add constraint stage_gate_packages_decision_log_fk
foreign key (decision_log_id) references public.decision_logs(id) on delete set null;

create table public.audit_events (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid references public.users(id) on delete set null,
    entity_type text not null,
    entity_id uuid,
    action text not null,
    old_value jsonb,
    new_value jsonb,
    ip_address inet,
    created_at timestamptz not null default now(),
    constraint audit_events_entity_type_not_blank check (length(trim(entity_type)) > 0),
    constraint audit_events_action_not_blank check (length(trim(action)) > 0)
);

create index audit_events_actor_user_id_idx on public.audit_events(actor_user_id);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id);
create index audit_events_created_at_idx on public.audit_events(created_at);

commit;
