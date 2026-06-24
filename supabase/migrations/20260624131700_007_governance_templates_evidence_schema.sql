begin;

do $$
begin
    create type public.package_field_type as enum (
        'text',
        'textarea',
        'number',
        'currency',
        'date',
        'boolean',
        'url',
        'user_reference',
        'single_select',
        'multi_select'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.evidence_type as enum (
        'package_field',
        'url',
        'document',
        'confirmation',
        'note'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.evidence_status as enum (
        'submitted',
        'under_review',
        'accepted',
        'rejected',
        'expired',
        'waived'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.confidentiality_level as enum (
        'internal',
        'confidential',
        'restricted'
    );
exception
    when duplicate_object then null;
end $$;

create table public.stage_gate_package_section_templates (
    id uuid primary key default gen_random_uuid(),
    stage_gate_id uuid not null references public.stage_gates(id) on delete cascade,
    partner_type_id uuid references public.partner_types(id) on delete restrict,
    partner_tier_id uuid references public.partner_tiers(id) on delete restrict,
    section_type text not null,
    title text not null,
    description text,
    is_required boolean not null default true,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_gate_package_section_templates_type_not_blank check (length(trim(section_type)) > 0),
    constraint stage_gate_package_section_templates_title_not_blank check (length(trim(title)) > 0),
    constraint stage_gate_package_section_templates_display_order_non_negative check (display_order >= 0),
    constraint stage_gate_package_section_templates_unique unique nulls not distinct (
        stage_gate_id,
        partner_type_id,
        partner_tier_id,
        section_type
    )
);

create index stage_gate_package_section_templates_stage_gate_id_idx
on public.stage_gate_package_section_templates(stage_gate_id);

create index stage_gate_package_section_templates_partner_type_id_idx
on public.stage_gate_package_section_templates(partner_type_id);

create index stage_gate_package_section_templates_partner_tier_id_idx
on public.stage_gate_package_section_templates(partner_tier_id);

create trigger set_stage_gate_package_section_templates_updated_at
before update on public.stage_gate_package_section_templates
for each row execute function public.set_updated_at();

create table public.stage_gate_package_field_templates (
    id uuid primary key default gen_random_uuid(),
    section_template_id uuid not null references public.stage_gate_package_section_templates(id) on delete cascade,
    field_key text not null,
    label text not null,
    field_type public.package_field_type not null,
    description text,
    is_required boolean not null default true,
    validation_regex text,
    min_numeric numeric,
    max_numeric numeric,
    display_order integer not null default 0,
    metadata jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_gate_package_field_templates_key_format check (field_key ~ '^[a-z][a-z0-9_]*$'),
    constraint stage_gate_package_field_templates_label_not_blank check (length(trim(label)) > 0),
    constraint stage_gate_package_field_templates_display_order_non_negative check (display_order >= 0),
    constraint stage_gate_package_field_templates_numeric_range check (
        min_numeric is null
        or max_numeric is null
        or min_numeric <= max_numeric
    ),
    constraint stage_gate_package_field_templates_unique unique (section_template_id, field_key)
);

create index stage_gate_package_field_templates_section_template_id_idx
on public.stage_gate_package_field_templates(section_template_id);

create trigger set_stage_gate_package_field_templates_updated_at
before update on public.stage_gate_package_field_templates
for each row execute function public.set_updated_at();

create table public.stage_gate_evidence_requirements (
    id uuid primary key default gen_random_uuid(),
    stage_gate_id uuid not null references public.stage_gates(id) on delete cascade,
    stage_requirement_id uuid references public.stage_requirements(id) on delete set null,
    partner_type_id uuid references public.partner_types(id) on delete restrict,
    partner_tier_id uuid references public.partner_tiers(id) on delete restrict,
    evidence_key text not null,
    title text not null,
    description text,
    evidence_type public.evidence_type not null,
    is_required boolean not null default true,
    display_order integer not null default 0,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint stage_gate_evidence_requirements_key_format check (evidence_key ~ '^[a-z][a-z0-9_]*$'),
    constraint stage_gate_evidence_requirements_title_not_blank check (length(trim(title)) > 0),
    constraint stage_gate_evidence_requirements_display_order_non_negative check (display_order >= 0),
    constraint stage_gate_evidence_requirements_unique unique nulls not distinct (
        stage_gate_id,
        partner_type_id,
        partner_tier_id,
        evidence_key
    )
);

create index stage_gate_evidence_requirements_stage_gate_id_idx
on public.stage_gate_evidence_requirements(stage_gate_id);

create index stage_gate_evidence_requirements_stage_requirement_id_idx
on public.stage_gate_evidence_requirements(stage_requirement_id);

create index stage_gate_evidence_requirements_partner_type_id_idx
on public.stage_gate_evidence_requirements(partner_type_id);

create index stage_gate_evidence_requirements_partner_tier_id_idx
on public.stage_gate_evidence_requirements(partner_tier_id);

create trigger set_stage_gate_evidence_requirements_updated_at
before update on public.stage_gate_evidence_requirements
for each row execute function public.set_updated_at();

create table public.evidence (
    id uuid primary key default gen_random_uuid(),
    partner_id uuid not null references public.partners(id) on delete cascade,
    stage_gate_id uuid not null references public.stage_gates(id) on delete restrict,
    stage_gate_package_id uuid references public.stage_gate_packages(id) on delete cascade,
    evidence_requirement_id uuid references public.stage_gate_evidence_requirements(id) on delete set null,
    stage_requirement_id uuid references public.stage_requirements(id) on delete set null,
    evidence_type public.evidence_type not null,
    title text not null,
    description text,
    file_uri text,
    external_url text,
    text_value text,
    confidentiality_level public.confidentiality_level not null default 'internal',
    status public.evidence_status not null default 'submitted',
    submitted_by uuid references public.users(id) on delete set null,
    submitted_at timestamptz not null default now(),
    reviewed_by uuid references public.users(id) on delete set null,
    reviewed_at timestamptz,
    expiration_date date,
    created_by uuid references public.users(id) on delete set null,
    updated_by uuid references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint evidence_title_not_blank check (length(trim(title)) > 0),
    constraint evidence_external_url_format check (
        external_url is null
        or external_url ~* '^https?://[A-Za-z0-9._~:/?#\[\]@!$&''()*+,;=%-]+$'
    ),
    constraint evidence_has_content check (
        file_uri is not null
        or external_url is not null
        or length(trim(coalesce(text_value, ''))) > 0
    ),
    constraint evidence_review_metadata check (
        status not in ('accepted', 'rejected', 'waived')
        or (reviewed_by is not null and reviewed_at is not null)
    )
);

create index evidence_partner_id_idx on public.evidence(partner_id);
create index evidence_stage_gate_id_idx on public.evidence(stage_gate_id);
create index evidence_stage_gate_package_id_idx on public.evidence(stage_gate_package_id);
create index evidence_evidence_requirement_id_idx on public.evidence(evidence_requirement_id);
create index evidence_stage_requirement_id_idx on public.evidence(stage_requirement_id);
create index evidence_status_idx on public.evidence(status);
create index evidence_submitted_by_idx on public.evidence(submitted_by);
create index evidence_expiration_date_idx on public.evidence(expiration_date);

create trigger set_evidence_updated_at
before update on public.evidence
for each row execute function public.set_updated_at();

create table public.evidence_reviews (
    id uuid primary key default gen_random_uuid(),
    evidence_id uuid not null references public.evidence(id) on delete cascade,
    reviewer_id uuid not null references public.users(id) on delete restrict,
    reviewer_role_id uuid references public.roles(id) on delete restrict,
    status public.evidence_status not null,
    comments text,
    reviewed_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint evidence_reviews_review_status check (status in ('accepted', 'rejected', 'waived')),
    constraint evidence_reviews_rejection_comments check (
        status <> 'rejected'
        or length(trim(coalesce(comments, ''))) > 0
    )
);

create index evidence_reviews_evidence_id_idx on public.evidence_reviews(evidence_id);
create index evidence_reviews_reviewer_id_idx on public.evidence_reviews(reviewer_id);
create index evidence_reviews_reviewer_role_id_idx on public.evidence_reviews(reviewer_role_id);
create index evidence_reviews_status_idx on public.evidence_reviews(status);

create table public.stage_gate_package_evidence (
    id uuid primary key default gen_random_uuid(),
    stage_gate_package_id uuid not null references public.stage_gate_packages(id) on delete cascade,
    evidence_id uuid not null references public.evidence(id) on delete cascade,
    included_by uuid references public.users(id) on delete set null,
    included_at timestamptz not null default now(),
    constraint stage_gate_package_evidence_unique unique (stage_gate_package_id, evidence_id)
);

create index stage_gate_package_evidence_package_id_idx
on public.stage_gate_package_evidence(stage_gate_package_id);

create index stage_gate_package_evidence_evidence_id_idx
on public.stage_gate_package_evidence(evidence_id);

commit;
