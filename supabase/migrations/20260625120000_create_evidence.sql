create table if not exists public.evidence (
    id uuid primary key default gen_random_uuid(),

    partner_id uuid not null references public.partners(id) on delete cascade,
    stage_gate_id uuid references public.stage_gates(id),
    package_id uuid references public.stage_gate_packages(id),
    requirement_id uuid references public.stage_requirements(id),

    title text not null,
    description text,
    evidence_type text not null default 'document',
    url text,
    status text not null default 'draft',

    submitted_by uuid references public.users(id),
    reviewed_by uuid references public.users(id),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
