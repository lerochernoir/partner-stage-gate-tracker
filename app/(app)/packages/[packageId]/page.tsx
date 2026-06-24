import { notFound } from "next/navigation";
import Link from "next/link";
import { PackageEditor } from "@/components/packages/PackageEditor";
import { SubmitPackageForm } from "@/components/packages/SubmitPackageForm";
import { PageShell } from "@/components/shared/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartnerRequirementsForStage } from "@/lib/data/lifecycle";
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

  const requirements = await getPartnerRequirementsForStage(
    stagePackage.partner_id,
    stagePackage.stage_gate_id,
  );

  const canManage =
    hasAnyRole(user, [ROLE_CODES.systemAdmin]) ||
    stagePackage.partners?.alliance_manager_id === user.id;
  const editable =
    canManage &&
    ["draft", "in_progress", "ready_for_review", "rework_required"].includes(
      stagePackage.status,
    );
  const readyToSubmit =
    stagePackage.stage_gate_package_sections.length > 0 &&
    stagePackage.stage_gate_package_sections.every((section) =>
      section.content.trim(),
    ) &&
    requirements
      .filter((requirement) => requirement.stage_requirements?.is_mandatory)
      .every((requirement) => requirement.status === "complete");

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

      <PackageEditor
        editable={editable}
        initialPackageStatus={stagePackage.status}
        packageId={stagePackage.id}
        requirements={requirements}
        sections={stagePackage.stage_gate_package_sections}
      >
        {editable ? (
          <SubmitPackageForm disabled={!readyToSubmit} packageId={stagePackage.id} />
        ) : null}
      </PackageEditor>
    </PageShell>
  );
}
