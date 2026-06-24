import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getMyApprovals, type MyApprovalsTab } from "@/lib/data/approvals";
import { formatDateTime, humanize } from "@/lib/format";

export default async function MyApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab: rawTab } = await searchParams;
  const tab: MyApprovalsTab =
    rawTab === "completed" || rawTab === "all" ? rawTab : "pending";
  const approvals = await getMyApprovals(user, tab);

  return (
    <PageShell description="Approval steps assigned to you." title="My Approvals">
      <div className="flex flex-wrap gap-2">
        <TabLink active={tab === "pending"} href="/approvals/my" label="Pending" />
        <TabLink
          active={tab === "completed"}
          href="/approvals/my?tab=completed"
          label="Completed"
        />
        <TabLink active={tab === "all"} href="/approvals/my?tab=all" label="All" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Requested Date</th>
              <th className="px-4 py-3 text-left font-medium">Submitted By</th>
              <th className="px-4 py-3 text-left font-medium">Package Status</th>
              <th className="px-4 py-3 text-left font-medium">Approval Status</th>
              <th className="px-4 py-3 text-left font-medium">Decision Status</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => (
              <tr className="border-b last:border-0" key={approval.id}>
                <td className="px-4 py-3">
                  {approval.partners ? (
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/partners/${approval.partner_id}`}
                    >
                      {approval.partners.name}
                    </Link>
                  ) : (
                    "Unknown partner"
                  )}
                </td>
                <td className="px-4 py-3">{approval.stage_gates?.code}</td>
                <td className="px-4 py-3">{formatDateTime(approval.requested_at)}</td>
                <td className="px-4 py-3">
                  {approval.requested_by_user?.name ?? "Unknown"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {humanize(approval.stage_gate_packages?.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{humanize(approval.status)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {formatDecisionStatus(approval.final_decision)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/approvals/${approval.id}`}>Review Approval</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {approvals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            You have no pending approvals.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

function TabLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Button asChild variant={active ? "default" : "outline"}>
      <Link href={href}>{label}</Link>
    </Button>
  );
}

function formatDecisionStatus(decision: string | null) {
  if (!decision) return "Pending";
  if (decision === "rework_required") return "Rework Requested";
  return humanize(decision);
}
