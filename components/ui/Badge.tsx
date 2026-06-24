import { humanize } from "@/lib/format";
import type { PartnerStatus, RequirementStatus } from "@/lib/supabase/types";

type BadgeTone = "gray" | "blue" | "green" | "orange" | "red" | "purple";

const partnerStatusTone: Record<PartnerStatus, BadgeTone> = {
  draft: "gray",
  active: "blue",
  on_hold: "orange",
  rejected: "red",
};

const requirementStatusTone: Record<RequirementStatus, BadgeTone> = {
  not_started: "gray",
  in_progress: "blue",
  complete: "green",
  blocked: "red",
  not_applicable: "gray",
};

export function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  return <Badge tone={partnerStatusTone[status]}>{humanize(status)}</Badge>;
}

export function RequirementStatusBadge({
  status,
}: {
  status: RequirementStatus;
}) {
  return <Badge tone={requirementStatusTone[status]}>{humanize(status)}</Badge>;
}

export function StageBadge({ code }: { code: string }) {
  return <Badge tone="purple">{code}</Badge>;
}

export function TierBadge({ name }: { name: string }) {
  return <Badge tone="blue">{name}</Badge>;
}
