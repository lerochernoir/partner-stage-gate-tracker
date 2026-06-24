import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDecisionLogs } from "@/lib/data/decisions";
import { formatDateTime, humanize } from "@/lib/format";

export default async function DecisionLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    partner?: string;
    stage?: string;
    decision?: string;
  }>;
}) {
  const filters = await searchParams;
  const decisions = await getDecisionLogs(filters);

  return (
    <PageShell
      description="Audit view of approval decisions across partners and stages."
      title="Decision Logs"
    >
      <form className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-[1fr_180px_220px_auto]" method="get">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="partner">
            Partner
          </label>
          <input
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue={filters.partner ?? ""}
            id="partner"
            name="partner"
            placeholder="Filter by partner"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="stage">
            Stage
          </label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue={filters.stage ?? ""}
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
          <label className="text-sm font-medium" htmlFor="decision">
            Decision
          </label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue={filters.decision ?? ""}
            id="decision"
            name="decision"
          >
            <option value="">All decisions</option>
            <option value="approved">Approved</option>
            <option value="rework_required">Rework Requested</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline">
            Apply
          </Button>
          <Button asChild variant="ghost">
            <Link href="/decisions">Clear</Link>
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Decision</th>
              <th className="px-4 py-3 text-left font-medium">Approver</th>
              <th className="px-4 py-3 text-left font-medium">Decision Date</th>
              <th className="px-4 py-3 text-left font-medium">Comments</th>
              <th className="px-4 py-3 text-left font-medium">Links</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision) => (
              <tr className="border-b last:border-0" key={decision.id}>
                <td className="px-4 py-3">
                  {decision.partners ? (
                    <Link className="font-medium underline-offset-4 hover:underline" href={`/partners/${decision.partner_id}`}>
                      {decision.partners.name}
                    </Link>
                  ) : (
                    "Unknown partner"
                  )}
                </td>
                <td className="px-4 py-3">{decision.stage_gates?.code}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {formatDecision(decision.decision_outcome)}
                  </Badge>
                </td>
                <td className="px-4 py-3">{decision.users?.name ?? "System"}</td>
                <td className="px-4 py-3">{formatDateTime(decision.decided_at)}</td>
                <td className="max-w-md px-4 py-3 text-muted-foreground">
                  {decision.rationale || decision.decision_summary || "No comments recorded."}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/partners/${decision.partner_id}`}>Partner</Link>
                    </Button>
                    {decision.approval_id ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/approvals/${decision.approval_id}`}>Approval</Link>
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/decisions/${decision.id}`}>Details</Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {decisions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No decisions have been recorded.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

function formatDecision(outcome: string) {
  if (outcome === "rework_required") {
    return "Rework Requested";
  }

  return humanize(outcome);
}
