import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPackages } from "@/lib/data/packages";
import { formatDateTime, humanize } from "@/lib/format";

export default async function PackagesPage() {
  let packages: Awaited<ReturnType<typeof getPackages>>;

  try {
    packages = await getPackages();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[route:/packages] Failed to load packages page.", error);

    return (
      <PageShell
        description="Review Stage Gate Packages across accessible partners."
        title="Stage Gate Packages"
      >
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm">
          <h2 className="font-semibold text-destructive">Packages could not load.</h2>
          <p className="mt-2 text-muted-foreground">
            The exact server error has been written to the Vercel logs for route
            <span className="font-mono"> /packages</span>.
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown server error"}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      description="Review Stage Gate Packages across accessible partners."
      title="Stage Gate Packages"
    >
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Partner</th>
              <th className="px-4 py-3 text-left font-medium">Stage</th>
              <th className="px-4 py-3 text-left font-medium">Version</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Submitted</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((stagePackage) => (
              <tr className="border-b last:border-0" key={stagePackage.id}>
                <td className="px-4 py-3">{stagePackage.partners?.name}</td>
                <td className="px-4 py-3">{stagePackage.stage_gates?.code}</td>
                <td className="px-4 py-3">v{stagePackage.package_version}</td>
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
            No packages are available.
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
