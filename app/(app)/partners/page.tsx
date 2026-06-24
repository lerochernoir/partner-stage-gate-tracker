import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartnerWorkingList } from "@/lib/data/partners";
import { getReferenceData } from "@/lib/data/reference";
import { humanize } from "@/lib/format";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    packageStatus?: string;
    approvalStatus?: string;
    owner?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const [partners, referenceData] = await Promise.all([
    getPartnerWorkingList(params),
    getReferenceData(),
  ]);
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
          <form className="grid gap-4 md:grid-cols-3 xl:grid-cols-[1fr_160px_200px_180px_220px_auto]" method="get">
            <div className="grid gap-2">
              <Label htmlFor="q">Search</Label>
              <Input
                defaultValue={params.q ?? ""}
                id="q"
                name="q"
                placeholder="Partner, website, industry"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stage">Stage</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                defaultValue={params.stage ?? ""}
                id="stage"
                name="stage"
              >
                <option value="">All stages</option>
                <option value="SG0">SG0</option>
                <option value="SG1">SG1</option>
                <option value="SG2">SG2</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="packageStatus">Package Status</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                defaultValue={params.packageStatus ?? ""}
                id="packageStatus"
                name="packageStatus"
              >
                <option value="">All package statuses</option>
                <option value="not_created">Not Created</option>
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="ready_for_review">Ready for Review</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rework_required">Rework Required</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="approvalStatus">Approval Status</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                defaultValue={params.approvalStatus ?? ""}
                id="approvalStatus"
                name="approvalStatus"
              >
                <option value="">All approval statuses</option>
                <option value="not_started">Not Started</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rework_required">Rework Required</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner">Owner</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                defaultValue={params.owner ?? ""}
                id="owner"
                name="owner"
              >
                <option value="">All owners</option>
                {referenceData.users.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
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
              <th className="px-4 py-3 text-left font-medium">Current Stage</th>
              <th className="px-4 py-3 text-left font-medium">Package Status</th>
              <th className="px-4 py-3 text-left font-medium">Approval Status</th>
              <th className="px-4 py-3 text-left font-medium">Next Step Due</th>
              <th className="px-4 py-3 text-left font-medium">Owner</th>
              <th className="px-4 py-3 text-left font-medium">Updated Date</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr className="border-b last:border-0" key={partner.id}>
                <td className="px-4 py-3">
                  <strong>{partner.name}</strong>
                  <p className="text-muted-foreground">
                    {partner.website ?? partner.industry_focus ?? "No website or industry"}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {partner.stage
                    ? `${partner.stage.code} - ${partner.stage.name}`
                    : "Not set"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{humanize(partner.packageStatus)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{humanize(partner.approvalStatus)}</Badge>
                </td>
                <td className="px-4 py-3">
                  {partner.nextStepDue}
                </td>
                <td className="px-4 py-3">
                  {partner.owner?.name ?? "Unassigned"}
                </td>
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                    new Date(partner.updated_at),
                  )}
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/partners/${partner.id}`}>View Partner</Link>
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
