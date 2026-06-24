export const ROLE_CODES = {
  systemAdmin: "system_admin",
  allianceManager: "alliance_manager",
  allianceLeadership: "alliance_leadership",
  executiveSponsor: "executive_sponsor",
  financeReviewer: "finance_reviewer",
  gtmReviewer: "gtm_reviewer",
  viewer: "viewer",
  productTechnicalReviewer: "product_technical_reviewer",
  deliveryOperationsReviewer: "delivery_operations_reviewer",
  marketplaceOperationsReviewer: "marketplace_operations_reviewer",
  legalComplianceReviewer: "legal_compliance_reviewer",
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
  product_technical_reviewer: "Product / Technical Reviewer",
  delivery_operations_reviewer: "Delivery / Operations Reviewer",
  marketplace_operations_reviewer: "Marketplace Operations Reviewer",
  legal_compliance_reviewer: "Legal / Compliance Reviewer",
};
