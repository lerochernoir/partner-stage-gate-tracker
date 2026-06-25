export const EDITABLE_PACKAGE_STATUSES = [
  "draft",
  "in_progress",
  "ready_for_review",
  "rework_required",
] as const;

export const ACTIVE_PACKAGE_STATUSES = [
  ...EDITABLE_PACKAGE_STATUSES,
  "submitted",
  "in_review",
] as const;

export function isEditablePackageStatus(status: string) {
  return (EDITABLE_PACKAGE_STATUSES as readonly string[]).includes(status);
}
