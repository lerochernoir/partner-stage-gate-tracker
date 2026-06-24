import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import {
  PartnerStatusBadge,
  StageBadge,
  TierBadge,
} from "@/components/shared/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartners } from "@/lib/data/partners";
import { humanize } from "@/lib/format";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const partners = await getPartners(params);
  const canCreate = hasAnyRole(user, [
    ROLE_CODES.systemAdmin,
    ROLE_CODES.allianceManager,
  ]);

  return (
    <PageShell
      description="Search and manage Blue Yonder alliance partner records."
      title="Partners"
    >
      <div className="flex justify-end">
        {canCreate ? (
          <Button asChild>
            <Link href="/partners/new">Create partner</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-6">
          <form className="grid gap-4 md:grid-cols-[1fr_220px_auto]" method="get">
            <div className="grid gap-2">
              <Label htmlFor="q">Search</Label>
              <Input
              defaultValue={params.q ?? ""}
              id="q"
              name="q"
              placeholder="Partner name"
            />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
            <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              defaultValue={params.status ?? ""}
              id="status"
              name="status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="rejected">Rejected</option>
            </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="outline">
                Apply filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Types</th>
              <th className="px-4 py-3 text-left font-medium">Tier</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Owner</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr className="border-b last:border-0" key={partner.id}>
                <td className="px-4 py-3">
                  <strong>{partner.name}</strong>
                  <p className="text-muted-foreground">{partner.legal_name ?? "No legal name"}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
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
                </td>
                <td className="px-4 py-3">
                  {partner.partner_tiers ? (
                    <TierBadge name={partner.partner_tiers.name} />
                  ) : (
                    "Not set"
                  )}
                </td>
                <td className="px-4 py-3">
                  {partner.stage_gates ? (
                    <StageBadge code={partner.stage_gates.code} />
                  ) : (
                    "Not set"
                  )}
                </td>
                <td className="px-4 py-3">
                  <PartnerStatusBadge status={partner.status} />
                </td>
                <td className="px-4 py-3">
                  {partner.alliance_manager?.name ?? "Unassigned"}
                  <p className="text-muted-foreground">{humanize(partner.region)}</p>
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/partners/${partner.id}`}>Open</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partners.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No partners match the current filters.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
