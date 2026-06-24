export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserStatus = "pending" | "active" | "inactive";
export type PartnerStatus = "draft" | "active" | "on_hold" | "rejected";
export type RequirementStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "blocked"
  | "not_applicable";
export type RequirementType =
  | "profile"
  | "strategic"
  | "business_case"
  | "review"
  | "risk"
  | "recommendation";

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
      };
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          department: string | null;
          region: string | null;
          status: UserStatus;
          last_login_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          department?: string | null;
          region?: string | null;
          status?: UserStatus;
          last_login_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Insert"]>;
      };
      partner_types: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partner_types"]["Insert"]>;
      };
      partner_tiers: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          rank: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          rank: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partner_tiers"]["Insert"]>;
      };
      stage_gates: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          sequence: number;
          entry_criteria: string | null;
          exit_criteria: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          sequence: number;
          entry_criteria?: string | null;
          exit_criteria?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stage_gates"]["Insert"]>;
      };
      stage_requirements: {
        Row: {
          id: string;
          stage_gate_id: string;
          partner_type_id: string | null;
          partner_tier_id: string | null;
          name: string;
          description: string | null;
          requirement_type: RequirementType;
          is_mandatory: boolean;
          owner_role_id: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          stage_gate_id: string;
          partner_type_id?: string | null;
          partner_tier_id?: string | null;
          name: string;
          description?: string | null;
          requirement_type: RequirementType;
          is_mandatory?: boolean;
          owner_role_id?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stage_requirements"]["Insert"]
        >;
      };
      partners: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          website: string | null;
          headquarters_country: string | null;
          region: string | null;
          industry_focus: string | null;
          status: PartnerStatus;
          current_stage_id: string;
          current_tier_id: string;
          alliance_manager_id: string;
          executive_sponsor_id: string | null;
          initial_rationale: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          website?: string | null;
          headquarters_country?: string | null;
          region?: string | null;
          industry_focus?: string | null;
          status?: PartnerStatus;
          current_stage_id: string;
          current_tier_id: string;
          alliance_manager_id: string;
          executive_sponsor_id?: string | null;
          initial_rationale?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["partners"]["Insert"]>;
      };
      partner_type_assignments: {
        Row: {
          id: string;
          partner_id: string;
          partner_type_id: string;
          is_primary: boolean;
          assigned_by: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          partner_type_id: string;
          is_primary?: boolean;
          assigned_by?: string | null;
          assigned_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["partner_type_assignments"]["Insert"]
        >;
      };
      partner_stage_requirements: {
        Row: {
          id: string;
          partner_id: string;
          stage_requirement_id: string;
          status: RequirementStatus;
          owner_id: string | null;
          completed_by: string | null;
          completed_at: string | null;
          notes: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          stage_requirement_id: string;
          status?: RequirementStatus;
          owner_id?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["partner_stage_requirements"]["Insert"]
        >;
      };
      audit_events: {
        Row: {
          id: string;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          old_value: Json | null;
          new_value: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          old_value?: Json | null;
          new_value?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_events"]["Insert"]>;
      };
      stage_gate_packages: {
        Row: {
          id: string;
          partner_id: string;
          stage_gate_id: string;
          package_version: number;
          status: string;
          submitted_by: string | null;
          submitted_at: string | null;
          review_started_at: string | null;
          review_completed_at: string | null;
          summary: string | null;
          strategic_fit_summary: string | null;
          business_case_summary: string | null;
          risk_summary: string | null;
          recommendation: string | null;
          approval_id: string | null;
          decision_log_id: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          stage_gate_id: string;
          package_version?: number;
          status?: string;
          submitted_by?: string | null;
          submitted_at?: string | null;
          review_started_at?: string | null;
          review_completed_at?: string | null;
          summary?: string | null;
          strategic_fit_summary?: string | null;
          business_case_summary?: string | null;
          risk_summary?: string | null;
          recommendation?: string | null;
          approval_id?: string | null;
          decision_log_id?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stage_gate_packages"]["Insert"]
        >;
      };
      partner_stage_history: {
        Row: {
          id: string;
          partner_id: string;
          from_stage_id: string | null;
          to_stage_id: string;
          stage_gate_package_id: string | null;
          decision_log_id: string | null;
          transition_status: string;
          entered_at: string;
          exited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          partner_id: string;
          from_stage_id?: string | null;
          to_stage_id: string;
          stage_gate_package_id?: string | null;
          decision_log_id?: string | null;
          transition_status?: string;
          entered_at?: string;
          exited_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["partner_stage_history"]["Insert"]
        >;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_status: UserStatus;
      partner_status: PartnerStatus;
      requirement_status: RequirementStatus;
      requirement_type: RequirementType;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
