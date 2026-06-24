import { notFound } from "next/navigation";
import Link from "next/link";
import { PackageSectionEditor } from "@/components/packages/PackageSectionEditor";
import { SubmitPackageForm } from "@/components/packages/SubmitPackageForm";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPackageById } from "@/lib/data/packages";
import { humanize } from "@/lib/format";

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const user = await requireUser();
  const { packageId } = await params;
  const stagePackage = await getPackageById(packageId);

  if (!stagePackage) notFound();

  const canManage =
    hasAnyRole(user, [ROLE_CODES.systemAdmin]) ||
    stagePackage.partners?.alliance_manager_id === user.id;
  const editable = canManage && ["draft", "rework_required"].includes(stagePackage.status);

  return (
    <PageShell
      description={`${stagePackage.partners?.name ?? "Partner"} · ${stagePackage.stage_gates?.code} · v${stagePackage.package_version}`}
      title="Stage Gate Package"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={`/partners/${stagePackage.partner_id}/packages`}>
            Back to partner packages
          </Link>
        </Button>
        <Badge variant="secondary">{humanize(stagePackage.status)}</Badge>
      </div>

      {editable ? (
        <Card>
          <CardHeader>
            <CardTitle>Submit package</CardTitle>
          </CardHeader>
          <CardContent>
            <SubmitPackageForm packageId={stagePackage.id} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {stagePackage.stage_gate_package_sections.map((section) => (
          <PackageSectionEditor
            editable={editable}
            key={section.id}
            packageId={stagePackage.id}
            section={section}
          />
        ))}
      </div>
    </PageShell>
  );
}
