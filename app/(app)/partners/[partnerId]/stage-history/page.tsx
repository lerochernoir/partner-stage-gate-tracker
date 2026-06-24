import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPartnerStageHistory } from "@/lib/data/lifecycle";
import { getPartnerById } from "@/lib/data/partners";
import { formatDateTime, humanize } from "@/lib/format";

export default async function PartnerStageHistoryPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const [partner, history] = await Promise.all([
    getPartnerById(partnerId),
    getPartnerStageHistory(partnerId),
  ]);

  if (!partner) notFound();

  return (
    <PageShell description={partner.name} title="Stage history">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/partners/${partner.id}`}>Back to partner</Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {history.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex flex-col justify-between gap-2 md:flex-row">
                <div>
                  <h3 className="font-medium">
                    {item.from_stage?.code ?? "Start"} → {item.to_stage?.code}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.to_stage?.name}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {humanize(item.transition_status)}
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Entered {formatDateTime(item.entered_at)} · Exited{" "}
                {formatDateTime(item.exited_at)}
              </p>
            </CardContent>
          </Card>
        ))}
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stage history yet.</p>
        ) : null}
      </div>
    </PageShell>
  );
}
