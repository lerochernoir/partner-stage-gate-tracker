import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import type { PartnerStatus } from "@/lib/supabase/types";

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const variant = status === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant}>{humanize(status)}</Badge>;
}

export function StageBadge({ code }: { code: string }) {
  return <Badge>{code}</Badge>;
}

export function TierBadge({ name }: { name: string }) {
  return <Badge variant="outline">{name}</Badge>;
}
