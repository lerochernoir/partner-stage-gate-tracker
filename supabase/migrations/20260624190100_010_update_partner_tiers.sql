begin;

insert into public.partner_tiers (code, name, description, rank)
values ('registered', 'Registered', 'Entry-level partner with basic profile, eligibility, and minimum governance coverage.', 1)
on conflict (code) do update
set
    name = excluded.name,
    description = excluded.description,
    rank = excluded.rank,
    is_active = true,
    updated_at = now();

do $$
declare
    v_registered_id uuid;
    v_nexus_id uuid;
    v_synergy_id uuid;
    v_apex_id uuid;
    v_advanced_id uuid;
    v_authorized_id uuid;
begin
    select id into v_registered_id from public.partner_tiers where code = 'registered';
    select id into v_nexus_id from public.partner_tiers where code = 'nexus';
    select id into v_synergy_id from public.partner_tiers where code = 'synergy';
    select id into v_apex_id from public.partner_tiers where code = 'apex';
    select id into v_advanced_id from public.partner_tiers where code = 'advanced';
    select id into v_authorized_id from public.partner_tiers where code = 'authorized';

    if v_advanced_id is null then
        if v_nexus_id is not null then
            update public.partner_tiers
            set
                code = 'advanced',
                name = 'Advanced',
                description = 'Validated partner with approved business case and active engagement motion.',
                rank = 2,
                is_active = true,
                updated_at = now()
            where id = v_nexus_id;
            v_advanced_id := v_nexus_id;
        else
            insert into public.partner_tiers (code, name, description, rank)
            values ('advanced', 'Advanced', 'Validated partner with approved business case and active engagement motion.', 2)
            returning id into v_advanced_id;
        end if;
    else
        update public.partner_tiers
        set
            name = 'Advanced',
            description = 'Validated partner with approved business case and active engagement motion.',
            rank = 2,
            is_active = true,
            updated_at = now()
        where id = v_advanced_id;
    end if;

    if v_nexus_id is not null and v_nexus_id <> v_advanced_id then
        update public.partners set current_tier_id = v_advanced_id where current_tier_id = v_nexus_id;
        update public.stage_requirements set partner_tier_id = v_advanced_id where partner_tier_id = v_nexus_id;
        update public.approval_rules set partner_tier_id = v_advanced_id where partner_tier_id = v_nexus_id;
        update public.stage_gate_package_section_templates set partner_tier_id = v_advanced_id where partner_tier_id = v_nexus_id;
        update public.stage_gate_evidence_requirements set partner_tier_id = v_advanced_id where partner_tier_id = v_nexus_id;
        delete from public.partner_tiers where id = v_nexus_id;
    end if;

    if v_authorized_id is null then
        if v_synergy_id is not null then
            update public.partner_tiers
            set
                code = 'authorized',
                name = 'Authorized',
                description = 'Authorized partner with validated readiness, approved GTM motion, and executive-priority coverage where applicable.',
                rank = 3,
                is_active = true,
                updated_at = now()
            where id = v_synergy_id;
            v_authorized_id := v_synergy_id;
        elsif v_apex_id is not null then
            update public.partner_tiers
            set
                code = 'authorized',
                name = 'Authorized',
                description = 'Authorized partner with validated readiness, approved GTM motion, and executive-priority coverage where applicable.',
                rank = 3,
                is_active = true,
                updated_at = now()
            where id = v_apex_id;
            v_authorized_id := v_apex_id;
        else
            insert into public.partner_tiers (code, name, description, rank)
            values ('authorized', 'Authorized', 'Authorized partner with validated readiness, approved GTM motion, and executive-priority coverage where applicable.', 3)
            returning id into v_authorized_id;
        end if;
    else
        update public.partner_tiers
        set
            name = 'Authorized',
            description = 'Authorized partner with validated readiness, approved GTM motion, and executive-priority coverage where applicable.',
            rank = 3,
            is_active = true,
            updated_at = now()
        where id = v_authorized_id;
    end if;

    update public.partners
    set current_tier_id = v_authorized_id
    where current_tier_id in (
        select id
        from public.partner_tiers
        where code in ('synergy', 'apex')
    );

    update public.stage_requirements
    set partner_tier_id = v_authorized_id
    where partner_tier_id in (
        select id
        from public.partner_tiers
        where code in ('synergy', 'apex')
    );

    delete from public.approval_rules
    where partner_tier_id in (
        select id
        from public.partner_tiers
        where code in ('synergy', 'apex')
    );

    delete from public.stage_gate_package_section_templates
    where partner_tier_id in (
        select id
        from public.partner_tiers
        where code in ('synergy', 'apex')
    );

    delete from public.stage_gate_evidence_requirements
    where partner_tier_id in (
        select id
        from public.partner_tiers
        where code in ('synergy', 'apex')
    );

    delete from public.partner_tiers
    where code in ('nexus', 'synergy', 'apex');

    delete from public.partner_tiers
    where rank > 3
      and code not in ('registered', 'advanced', 'authorized');
end $$;

insert into public.approval_rules (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    approver_role_id,
    approval_sequence,
    is_parallel,
    is_required,
    is_active
)
select
    sg.id,
    null,
    tier.id,
    r.id,
    2,
    false,
    true,
    true
from public.stage_gates sg
cross join public.partner_tiers tier
join public.roles r on r.code = 'executive_sponsor'
where sg.code in ('SG0', 'SG1', 'SG2')
  and tier.code = 'authorized'
on conflict on constraint approval_rules_unique_route do update
set
    is_parallel = excluded.is_parallel,
    is_required = excluded.is_required,
    is_active = true,
    updated_at = now();

insert into public.stage_gate_package_section_templates (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    section_type,
    title,
    description,
    is_required,
    display_order
)
select
    sg.id,
    null,
    tier.id,
    'executive_sponsor_recommendation',
    'Executive Sponsor Recommendation',
    'Executive sponsor rationale required for Authorized partners.',
    true,
    60
from public.stage_gates sg
cross join public.partner_tiers tier
where sg.code = 'SG1'
  and tier.code = 'authorized'
on conflict on constraint stage_gate_package_section_templates_unique do update
set
    title = excluded.title,
    description = excluded.description,
    is_required = excluded.is_required,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

insert into public.stage_gate_evidence_requirements (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    evidence_key,
    title,
    description,
    evidence_type,
    is_required,
    display_order
)
select
    sg.id,
    null,
    tier.id,
    'executive_sponsor_confirmation',
    'Executive sponsor confirmation',
    case
        when sg.code = 'SG0' then 'Executive sponsor confirmation for direct Authorized tier.'
        when sg.code = 'SG1' then 'Executive sponsor confirmation required for Authorized partners.'
        else 'Executive sponsor confirmation required for Authorized business case.'
    end,
    'confirmation'::public.evidence_type,
    true,
    case when sg.code = 'SG2' then 70 else 50 end
from public.stage_gates sg
cross join public.partner_tiers tier
where sg.code in ('SG0', 'SG1', 'SG2')
  and tier.code = 'authorized'
on conflict on constraint stage_gate_evidence_requirements_unique do update
set
    title = excluded.title,
    description = excluded.description,
    evidence_type = excluded.evidence_type,
    is_required = excluded.is_required,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

commit;
