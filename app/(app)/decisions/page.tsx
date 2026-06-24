import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDecisionLogs } from "@/lib/data/decisions";
import { formatDateTime, humanize } from "@/lib/format";

export default async function DecisionLogsPage() {
  const decisions = await getDecisionLogs();

  return (
    <PageShell
      description="Formal decisions generated from approval outcomes."
      title="Decision Logs"
    >
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Decision</th>
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Outcome</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((decision) => (
              <tr className="border-b last:border-0" key={decision.id}>
                <td className="px-4 py-3">{decision.decision_title}</td>
                <td className="px-4 py-3">{decision.partners?.name}</td>
                <td className="px-4 py-3">{decision.stage_gates?.code}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{humanize(decision.decision_outcome)}</Badge>
                </td>
                <td className="px-4 py-3">{formatDateTime(decision.decided_at)}</td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/decisions/${decision.id}`}>Open</Link>
                  </Button>
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
