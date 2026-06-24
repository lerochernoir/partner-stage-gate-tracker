import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDecisionLogById } from "@/lib/data/decisions";
import { formatDateTime, humanize } from "@/lib/format";

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = await params;
  const decision = await getDecisionLogById(decisionId);

  if (!decision) notFound();

  return (
    <PageShell description={decision.partners?.name ?? ""} title={decision.decision_title}>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/decisions">Back to decisions</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/partners/${decision.partner_id}`}>View partner</Link>
        </Button>
        {decision.stage_gate_package_id ? (
          <Button asChild variant="outline">
            <Link href={`/packages/${decision.stage_gate_package_id}`}>View package</Link>
          </Button>
        ) : null}
        {decision.approval_id ? (
          <Button asChild variant="outline">
            <Link href={`/approvals/${decision.approval_id}`}>View approval</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Outcome
            <Badge variant="secondary">{humanize(decision.decision_outcome)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground">
          <p>Stage: {decision.stage_gates?.code}</p>
          <p>Decided by: {decision.users?.name ?? "System"}</p>
          <p>Decided at: {formatDateTime(decision.decided_at)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rationale</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
          {decision.rationale || decision.decision_summary || "No rationale recorded."}
        </CardContent>
      </Card>
    </PageShell>
  );
}
