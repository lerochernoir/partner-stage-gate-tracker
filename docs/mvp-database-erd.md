# CastleGate Partner Governance Platform MVP ERD

This ERD covers the MVP database scope:

- Authentication/user metadata
- Role-based access
- Partner management
- SG0-SG2 lifecycle tracking
- Stage Gate Packages
- Stage Gate Package templates and field templates
- Evidence requirements and submitted evidence
- Approvals
- Decision Logs
- Dashboard source tables
- Audit events

```mermaid
erDiagram
    auth_users ||--|| users : "maps to"
    users ||--o{ user_roles : has
    roles ||--o{ user_roles : grants

    users ||--o{ partners : "alliance_manager"
    users ||--o{ partners : "executive_sponsor"
    partner_tiers ||--o{ partners : "current_tier"
    stage_gates ||--o{ partners : "current_stage"

    partners ||--o{ partner_type_assignments : has
    partner_types ||--o{ partner_type_assignments : classifies

    stage_gates ||--o{ stage_requirements : defines
    partner_types ||--o{ stage_requirements : scopes
    partner_tiers ||--o{ stage_requirements : scopes
    roles ||--o{ stage_requirements : owns
    partners ||--o{ partner_stage_requirements : tracks
    stage_requirements ||--o{ partner_stage_requirements : instantiates
    users ||--o{ partner_stage_requirements : owns

    partners ||--o{ stage_gate_packages : submits
    stage_gates ||--o{ stage_gate_packages : packages
    users ||--o{ stage_gate_packages : submits
    stage_gate_packages ||--o{ stage_gate_package_sections : contains
    stage_gates ||--o{ stage_gate_package_section_templates : defines
    partner_types ||--o{ stage_gate_package_section_templates : scopes
    partner_tiers ||--o{ stage_gate_package_section_templates : scopes
    stage_gate_package_section_templates ||--o{ stage_gate_package_field_templates : defines
    stage_gates ||--o{ stage_gate_evidence_requirements : requires
    stage_requirements ||--o{ stage_gate_evidence_requirements : maps_to
    partner_types ||--o{ stage_gate_evidence_requirements : scopes
    partner_tiers ||--o{ stage_gate_evidence_requirements : scopes
    partners ||--o{ evidence : submits
    stage_gates ||--o{ evidence : stage
    stage_gate_packages ||--o{ evidence : package
    stage_gate_evidence_requirements ||--o{ evidence : satisfies
    evidence ||--o{ evidence_reviews : reviewed_by
    stage_gate_packages ||--o{ stage_gate_package_evidence : includes
    evidence ||--o{ stage_gate_package_evidence : included_in

    stage_gates ||--o{ approval_rules : configures
    partner_types ||--o{ approval_rules : scopes
    partner_tiers ||--o{ approval_rules : scopes
    roles ||--o{ approval_rules : routes_to

    partners ||--o{ approvals : has
    stage_gates ||--o{ approvals : reviews
    stage_gate_packages ||--|| approvals : creates
    users ||--o{ approvals : requests
    approvals ||--o{ approval_steps : contains
    roles ||--o{ approval_steps : approver_role
    users ||--o{ approval_steps : approver_user

    partners ||--o{ decision_logs : records
    stage_gates ||--o{ decision_logs : governs
    stage_gate_packages ||--o{ decision_logs : supports
    approvals ||--o{ decision_logs : produces
    users ||--o{ decision_logs : decided_by

    partners ||--o{ partner_stage_history : transitions
    stage_gates ||--o{ partner_stage_history : from_stage
    stage_gates ||--o{ partner_stage_history : to_stage
    stage_gate_packages ||--o{ partner_stage_history : transition_package
    decision_logs ||--o{ partner_stage_history : transition_decision

    users ||--o{ audit_events : actor

    users {
        uuid id PK
        citext email UK
        text name
        user_status status
        timestamptz created_at
        timestamptz updated_at
    }

    roles {
        uuid id PK
        text code UK
        text name
        boolean is_system
    }

    partners {
        uuid id PK
        text name
        partner_status status
        uuid current_stage_id FK
        uuid current_tier_id FK
        uuid alliance_manager_id FK
        uuid executive_sponsor_id FK
    }

    stage_gate_packages {
        uuid id PK
        uuid partner_id FK
        uuid stage_gate_id FK
        integer package_version
        package_status status
        uuid approval_id FK
        uuid decision_log_id FK
    }

    approvals {
        uuid id PK
        uuid partner_id FK
        uuid stage_gate_id FK
        uuid stage_gate_package_id FK
        approval_status status
        approval_decision final_decision
    }

    decision_logs {
        uuid id PK
        uuid partner_id FK
        uuid stage_gate_id FK
        uuid stage_gate_package_id FK
        uuid approval_id FK
        decision_type decision_type
        decision_outcome decision_outcome
    }

    evidence {
        uuid id PK
        uuid partner_id FK
        uuid stage_gate_id FK
        uuid stage_gate_package_id FK
        uuid evidence_requirement_id FK
        evidence_type evidence_type
        evidence_status status
    }
```

## Migration execution order

1. `20260624123000_001_extensions_enums_functions.sql`
2. `20260624123100_002_identity_reference_tables.sql`
3. `20260624123200_003_partner_lifecycle_tables.sql`
4. `20260624123300_004_packages_approvals_decisions.sql`
5. `20260624123400_005_rls_policies.sql`
6. `20260624123500_006_seed_mvp_reference_data.sql`
7. `20260624131700_007_governance_templates_evidence_schema.sql`
8. `20260624131800_008_governance_templates_evidence_rls.sql`
9. `20260624131900_009_seed_governance_templates_and_rules.sql`

## Row Level Security strategy

The MVP uses Supabase Row Level Security on every application table.

- Reference data is readable by authenticated users and mutable only by System Admins.
- Users can read user directory data needed for assignments; only System Admins manage users and roles.
- Partner records are visible to:
  - System Admins
  - Alliance Leadership
  - Viewers
  - Assigned Alliance Managers
  - Assigned Executive Sponsors
  - Users assigned to approval steps for that partner
- Partner mutation is limited to System Admins and assigned Alliance Managers.
- Stage Gate Packages are editable only while Draft or Rework Required, and only by users who can modify the partner.
- Package/evidence templates are readable by authenticated users and mutable only by System Admins.
- Evidence is visible to users with partner access, mutable by partner owners/admins, and reviewable by authorized reviewer roles.
- Approval steps can be decided only by the assigned approver or by a user holding the step's approver role when no specific approver is assigned.
- Decision Logs and Stage History are append-only from the client perspective.
- Audit events are insertable by authenticated users and visible to System Admins and Alliance Leadership.
