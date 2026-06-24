begin;

update public.stage_gate_package_section_templates template
set
    is_active = false,
    updated_at = now()
from public.stage_gates stage
where template.stage_gate_id = stage.id
  and stage.code = 'SG2'
  and template.partner_type_id is null
  and template.partner_tier_id is null
  and template.section_type not in (
      'solution_fit',
      'integration_requirements',
      'technical_architecture',
      'customer_use_case',
      'commercial_structure',
      'delivery_readiness',
      'sg3_recommendation'
  );

insert into public.stage_gate_package_section_templates (
    stage_gate_id,
    partner_type_id,
    partner_tier_id,
    section_type,
    title,
    description,
    is_required,
    display_order,
    is_active
)
select
    stage.id,
    null,
    null,
    seed.section_type,
    seed.title,
    seed.description,
    true,
    seed.display_order,
    true
from public.stage_gates stage
join (
    values
        ('solution_fit', 'Solution Fit', 'Describe how the partner solution fits the Blue Yonder alliance motion.', 10),
        ('integration_requirements', 'Integration Requirements', 'Document integration scope, dependencies, APIs, and constraints.', 20),
        ('technical_architecture', 'Technical Architecture', 'Capture the proposed technical architecture and validation assumptions.', 30),
        ('customer_use_case', 'Customer Use Case', 'Describe target customer use cases and value realization.', 40),
        ('commercial_structure', 'Commercial Structure', 'Document commercial model, ownership, and business structure.', 50),
        ('delivery_readiness', 'Delivery Readiness', 'Assess delivery readiness, support ownership, and operational readiness.', 60),
        ('sg3_recommendation', 'SG3 Recommendation', 'Recommend whether the partner should proceed to future SG3 validation.', 70)
) as seed(section_type, title, description, display_order)
    on true
where stage.code = 'SG2'
on conflict on constraint stage_gate_package_section_templates_unique do update
set
    title = excluded.title,
    description = excluded.description,
    is_required = true,
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

commit;
