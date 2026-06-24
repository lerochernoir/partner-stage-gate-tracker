import { notFound } from "next/navigation";
import Link from "next/link";
import { RequirementEditor } from "@/components/lifecycle/RequirementEditor";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import {
  getPartnerCurrentRequirements,
  getReadinessSummary,
} from "@/lib/data/lifecycle";
import { getPartnerById } from "@/lib/data/partners";

export default async function PartnerChecklistPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const user = await requireUser();
  const { partnerId } = await params;
  const [partner, requirements] = await Promise.all([
    getPartnerById(partnerId),
    getPartnerCurrentRequirements(partnerId),
  ]);

  if (!partner) notFound();

  const canEdit =
    hasAnyRole(user, [ROLE_CODES.systemAdmin, ROLE_CODES.allianceLeadership]) ||
    partner.alliance_manager_id === user.id;
  const readiness = getReadinessSummary(requirements);

  return (
    <PageShell
      description={`${partner.stage_gates?.code ?? "Stage"} readiness for ${partner.name}`}
      title="Stage checklist"
    >
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/partners/${partner.id}`}>Back to partner</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {readiness.ready ? "Ready for package submission" : "Not ready yet"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Mandatory requirements complete: {readiness.mandatoryComplete} of{" "}
          {readiness.mandatoryTotal}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {requirements.map((requirement) => (
          <RequirementEditor
            canEdit={canEdit}
            key={requirement.id}
            partnerId={partner.id}
            requirement={requirement}
          />
        ))}
      </div>
    </PageShell>
  );
}
