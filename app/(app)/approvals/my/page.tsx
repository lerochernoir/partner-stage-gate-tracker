import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getMyApprovals } from "@/lib/data/approvals";
import { formatDateTime, humanize } from "@/lib/format";

export default async function MyApprovalsPage() {
  const user = await requireUser();
  let approvals: Awaited<ReturnType<typeof getMyApprovals>>;

  try {
    approvals = await getMyApprovals(user);
  } catch (error) {
    console.error("[route:/approvals/my] Failed to load my approvals page.", error);

    return (
      <PageShell description="Approval steps assigned to you." title="My Approvals">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm">
          <h2 className="font-semibold text-destructive">
            My Approvals could not load.
          </h2>
          <p className="mt-2 text-muted-foreground">
            The exact server error has been written to the Vercel logs for route
            <span className="font-mono"> /approvals/my</span>.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown server error"}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell description="Approval steps assigned to you." title="My Approvals">
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Requested</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => (
              <tr className="border-b last:border-0" key={approval.id}>
                <td className="px-4 py-3">{approval.partners?.name}</td>
                <td className="px-4 py-3">{approval.stage_gates?.code}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{humanize(approval.status)}</Badge>
                </td>
                <td className="px-4 py-3">{formatDateTime(approval.requested_at)}</td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/approvals/${approval.id}`}>Review</Link>
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
