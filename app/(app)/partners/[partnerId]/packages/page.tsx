import { notFound } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createStageGatePackageAction } from "@/lib/actions/packages";
import { getPartnerById } from "@/lib/data/partners";
import { getPartnerPackages } from "@/lib/data/packages";
import { formatDateTime, humanize } from "@/lib/format";

export default async function PartnerPackagesPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const [partner, packages] = await Promise.all([
    getPartnerById(partnerId),
    getPartnerPackages(partnerId),
  ]);

  if (!partner) notFound();
  const createAction = async () => {
    "use server";
    await createStageGatePackageAction(partner.id);
  };

  return (
    <PageShell description={partner.name} title="Stage Gate Packages">
      <div className="flex justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={`/partners/${partner.id}`}>Back to partner</Link>
        </Button>
        <form action={createAction}>
          <Button type="submit">Create {partner.stage_gates?.code} package</Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Version</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Current</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Submitted</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((stagePackage) => (
              <tr className="border-b last:border-0" key={stagePackage.id}>
                <td className="px-4 py-3">v{stagePackage.package_version}</td>
                <td className="px-4 py-3">{stagePackage.stage_gates?.code}</td>
                <td className="px-4 py-3">
                  {stagePackage.stage_gate_id === partner.current_stage_id ? (
                    <Badge>Current stage</Badge>
                  ) : (
                    <span className="text-muted-foreground">Prior stage</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{humanize(stagePackage.status)}</Badge>
                </td>
                <td className="px-4 py-3">{formatDateTime(stagePackage.submitted_at)}</td>
                <td className="px-4 py-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/packages/${stagePackage.id}`}>Open</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {packages.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No packages have been created for this partner.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
