import { notFound } from "next/navigation";
import Link from "next/link";
import {
  PartnerStatusBadge,
  StageBadge,
  TierBadge,
} from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartnerById } from "@/lib/data/partners";
import { formatDateTime } from "@/lib/format";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const user = await requireUser();
  const { partnerId } = await params;
  const partner = await getPartnerById(partnerId);

  if (!partner) {
    notFound();
  }

  const canEdit =
    hasAnyRole(user, [ROLE_CODES.systemAdmin]) ||
    partner.alliance_manager_id === user.id;

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{partner.name}</h1>
              <p className="mt-2 text-muted-foreground">
                {partner.legal_name ?? "No legal name provided"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit ? (
                <Button asChild>
                  <Link href={`/partners/${partner.id}/edit`}>Edit partner</Link>
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href="/partners">Back to partners</Link>
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {partner.stage_gates ? (
              <StageBadge code={partner.stage_gates.code} />
            ) : null}
            {partner.partner_tiers ? (
              <TierBadge name={partner.partner_tiers.name} />
            ) : null}
            <PartnerStatusBadge status={partner.status} />
            {partner.partner_type_assignments.map((assignment) =>
              assignment.partner_types ? (
                <Badge
                  key={assignment.partner_types.id}
                  variant={assignment.is_primary ? "default" : "secondary"}
                >
                  {assignment.partner_types.name}
                </Badge>
              ) : null,
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Partner profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <dt>Website</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {partner.website ? (
                  <a href={partner.website} rel="noreferrer" target="_blank">
                    {partner.website}
                  </a>
                ) : (
                  "Not set"
                )}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Region</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{partner.region ?? "Not set"}</dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Headquarters country</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {partner.headquarters_country ?? "Not set"}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Industry focus</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {partner.industry_focus ?? "Not set"}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Alliance manager</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {partner.alliance_manager?.name ?? "Unassigned"}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Executive sponsor</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {partner.executive_sponsor?.name ?? "Unassigned"}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Created</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {formatDateTime(partner.created_at)}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt>Current stage</dt>
              <dd className="mt-1 text-sm text-muted-foreground">
                {partner.stage_gates?.name ?? "Not set"}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <h3 className="font-medium">Initial rationale</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {partner.initial_rationale || "No rationale entered yet."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
