begin;

create table public.roles (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text,
    is_system boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint roles_code_format check (code ~ '^[a-z][a-z0-9_]*$')
);

create trigger set_roles_updated_at
before update on public.roles
for each row execute function public.set_updated_at();

create table public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    email citext not null unique,
    department text,
    region text,
    status public.user_status not null default 'pending',
    last_login_at timestamptz,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint users_email_not_blank check (length(trim(email::text)) > 0),
    constraint users_name_not_blank check (length(trim(name)) > 0)
);

create index users_status_idx on public.users(status);
create index users_region_idx on public.users(region);

create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    role_id uuid not null references public.roles(id) on delete cascade,
    created_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint user_roles_unique unique (user_id, role_id)
);

create index user_roles_user_id_idx on public.user_roles(user_id);
create index user_roles_role_id_idx on public.user_roles(role_id);

create table public.partner_types (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint partner_types_code_format check (code ~ '^[a-z][a-z0-9_]*$')
);

create trigger set_partner_types_updated_at
before update on public.partner_types
for each row execute function public.set_updated_at();

create table public.partner_tiers (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text,
    rank integer not null unique,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint partner_tiers_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
    constraint partner_tiers_rank_positive check (rank > 0)
);

create trigger set_partner_tiers_updated_at
before update on public.partner_tiers
for each row execute function public.set_updated_at();

create table public.stage_gates (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    name text not null,
    description text,
    sequence integer not null unique,
    entry_criteria text,
    exit_criteria text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_gates_code_format check (code ~ '^SG[0-9]+$'),
    constraint stage_gates_sequence_non_negative check (sequence >= 0)
);

create trigger set_stage_gates_updated_at
before update on public.stage_gates
for each row execute function public.set_updated_at();

create table public.stage_requirements (
    id uuid primary key default gen_random_uuid(),
    stage_gate_id uuid not null references public.stage_gates(id) on delete cascade,
    partner_type_id uuid references public.partner_types(id) on delete restrict,
    partner_tier_id uuid references public.partner_tiers(id) on delete restrict,
    name text not null,
    description text,
    requirement_type public.requirement_type not null,
    is_mandatory boolean not null default true,
    owner_role_id uuid references public.roles(id) on delete restrict,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_requirements_name_not_blank check (length(trim(name)) > 0),
    constraint stage_requirements_display_order_non_negative check (display_order >= 0),
    constraint stage_requirements_unique_template unique nulls not distinct (
        stage_gate_id,
        partner_type_id,
        partner_tier_id,
        name
    )
);

create index stage_requirements_stage_gate_id_idx on public.stage_requirements(stage_gate_id);
create index stage_requirements_partner_type_id_idx on public.stage_requirements(partner_type_id);
create index stage_requirements_partner_tier_id_idx on public.stage_requirements(partner_tier_id);
create index stage_requirements_owner_role_id_idx on public.stage_requirements(owner_role_id);

create trigger set_stage_requirements_updated_at
before update on public.stage_requirements
for each row execute function public.set_updated_at();

create table public.approval_rules (
    id uuid primary key default gen_random_uuid(),
    stage_gate_id uuid not null references public.stage_gates(id) on delete cascade,
    partner_type_id uuid references public.partner_types(id) on delete restrict,
    partner_tier_id uuid references public.partner_tiers(id) on delete restrict,
    approver_role_id uuid not null references public.roles(id) on delete restrict,
    approval_sequence integer not null,
    is_parallel boolean not null default false,
    is_required boolean not null default true,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint approval_rules_sequence_positive check (approval_sequence > 0),
    constraint approval_rules_unique_route unique nulls not distinct (
        stage_gate_id,
        partner_type_id,
        partner_tier_id,
        approver_role_id,
        approval_sequence
    )
);

create index approval_rules_stage_gate_id_idx on public.approval_rules(stage_gate_id);
create index approval_rules_partner_type_id_idx on public.approval_rules(partner_type_id);
create index approval_rules_partner_tier_id_idx on public.approval_rules(partner_tier_id);
create index approval_rules_approver_role_id_idx on public.approval_rules(approver_role_id);

create trigger set_approval_rules_updated_at
before update on public.approval_rules
for each row execute function public.set_updated_at();

commit;
