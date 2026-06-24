import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/data/dashboard";
import { humanize } from "@/lib/format";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <PageShell
      description="Executive view of partner stage-gate status and active workflow."
      title="Dashboard"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {dashboard.metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              {metric.detail ? (
                <p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Partner Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Partner</th>
                  <th className="px-4 py-3 text-left font-medium">Current Stage</th>
                  <th className="px-4 py-3 text-left font-medium">Package Status</th>
                  <th className="px-4 py-3 text-left font-medium">Approval Status</th>
                  <th className="px-4 py-3 text-left font-medium">Next Step Due</th>
                  <th className="px-4 py-3 text-left font-medium">Owner</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.pipeline.map((row) => (
                  <tr className="border-b last:border-0" key={row.partnerId}>
                    <td className="px-4 py-3">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/partners/${row.partnerId}`}
                      >
                        {row.partnerName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.currentStage}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{humanize(row.packageStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{humanize(row.approvalStatus)}</Badge>
                    </td>
                    <td className="px-4 py-3">{row.nextStepDue}</td>
                    <td className="px-4 py-3">{row.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dashboard.pipeline.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No active partners found.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
