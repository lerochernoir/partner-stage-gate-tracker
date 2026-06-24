begin;

create table public.partners (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    legal_name text,
    website text,
    headquarters_country text,
    region text,
    industry_focus text,
    status public.partner_status not null default 'draft',
    current_stage_id uuid not null references public.stage_gates(id) on delete restrict,
    current_tier_id uuid not null references public.partner_tiers(id) on delete restrict,
    alliance_manager_id uuid not null references public.users(id) on delete restrict,
    executive_sponsor_id uuid references public.users(id) on delete set null,
    initial_rationale text,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint partners_name_not_blank check (length(trim(name)) > 0),
    constraint partners_website_url check (
        website is null
        or website ~* '^https?://[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=%-]+$'
    )
);

create index partners_name_trgm_like_idx on public.partners using btree (lower(name));
create index partners_legal_name_trgm_like_idx on public.partners using btree (lower(legal_name));
create index partners_status_idx on public.partners(status);
create index partners_current_stage_id_idx on public.partners(current_stage_id);
create index partners_current_tier_id_idx on public.partners(current_tier_id);
create index partners_alliance_manager_id_idx on public.partners(alliance_manager_id);
create index partners_executive_sponsor_id_idx on public.partners(executive_sponsor_id);
create index partners_region_idx on public.partners(region);

create trigger set_partners_updated_at
before update on public.partners
for each row execute function public.set_updated_at();

create table public.partner_type_assignments (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    partner_type_id uuid not null references public.partner_types(id) on delete restrict,
    is_primary boolean not null default false,
    assigned_by uuid references public.users(id) on delete set null,
    assigned_at timestamptz not null default now(),
    constraint partner_type_assignments_unique unique (partner_id, partner_type_id)
);

create unique index partner_type_assignments_one_primary_idx
on public.partner_type_assignments(partner_id)
where is_primary;

create index partner_type_assignments_partner_id_idx on public.partner_type_assignments(partner_id);
create index partner_type_assignments_partner_type_id_idx on public.partner_type_assignments(partner_type_id);

create table public.partner_stage_requirements (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    stage_requirement_id uuid not null references public.stage_requirements(id) on delete restrict,
    status public.requirement_status not null default 'not_started',
    owner_id uuid references public.users(id) on delete set null,
    completed_by uuid references public.users(id) on delete set null,
    completed_at timestamptz,
    notes text,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint partner_stage_requirements_unique unique (partner_id, stage_requirement_id),
    constraint partner_stage_requirements_complete_metadata check (
        status <> 'complete'
        or (completed_by is not null and completed_at is not null)
    ),
    constraint partner_stage_requirements_blocked_notes check (
        status <> 'blocked'
        or length(trim(coalesce(notes, ''))) > 0
    )
);

create index partner_stage_requirements_partner_id_idx on public.partner_stage_requirements(partner_id);
create index partner_stage_requirements_stage_requirement_id_idx on public.partner_stage_requirements(stage_requirement_id);
create index partner_stage_requirements_status_idx on public.partner_stage_requirements(status);
create index partner_stage_requirements_owner_id_idx on public.partner_stage_requirements(owner_id);

create trigger set_partner_stage_requirements_updated_at
before update on public.partner_stage_requirements
for each row execute function public.set_updated_at();

commit;
