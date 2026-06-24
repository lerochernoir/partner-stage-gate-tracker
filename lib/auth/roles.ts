export const ROLE_CODES = {
  systemAdmin: "system_admin",
  allianceManager: "alliance_manager",
  allianceLeadership: "alliance_leadership",
  executiveSponsor: "executive_sponsor",
  financeReviewer: "finance_reviewer",
  gtmReviewer: "gtm_reviewer",
  viewer: "viewer",
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];

export const ROLE_LABELS: Record<RoleCode, string> = {
  system_admin: "System Admin",
  alliance_manager: "Alliance Manager",
  alliance_leadership: "Alliance Leadership",
  executive_sponsor: "Executive Sponsor",
  finance_reviewer: "Finance Reviewer",
  gtm_reviewer: "GTM Reviewer",
  viewer: "Viewer",
};
