begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
    create type public.user_status as enum (
        'pending',
        'active',
        'inactive'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.partner_status as enum (
        'draft',
        'active',
        'on_hold',
        'rejected'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.requirement_type as enum (
        'profile',
        'strategic',
        'business_case',
        'review',
        'risk',
        'recommendation'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.requirement_status as enum (
        'not_started',
        'in_progress',
        'complete',
        'blocked',
        'not_applicable'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.package_status as enum (
        'draft',
        'submitted',
        'in_review',
        'approved',
        'rejected',
        'rework_required',
        'superseded',
        'withdrawn'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.package_section_status as enum (
        'draft',
        'complete'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.approval_status as enum (
        'draft',
        'submitted',
        'in_review',
        'approved',
        'rejected',
        'rework_required',
        'cancelled'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.approval_step_status as enum (
        'pending',
        'approved',
        'rejected',
        'rework_required',
        'cancelled'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.approval_decision as enum (
        'approved',
        'rejected',
        'rework_required'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.decision_type as enum (
        'sg0_identification_approval',
        'sg1_strategic_qualification_approval',
        'sg2_business_case_approval',
        'stage_advancement',
        'rework_required',
        'partner_rejection'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.decision_outcome as enum (
        'approved',
        'rejected',
        'conditionally_approved',
        'rework_required'
    );
exception
    when duplicate_object then null;
end $$;

do $$
begin
    create type public.stage_transition_status as enum (
        'current',
        'approved',
        'rejected',
        'rework_required'
    );
exception
    when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

commit;
