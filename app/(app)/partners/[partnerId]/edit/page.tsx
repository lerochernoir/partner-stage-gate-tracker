import { notFound } from "next/navigation";
import Link from "next/link";
import { PartnerForm } from "@/components/partners/PartnerForm";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updatePartnerAction } from "@/lib/actions/partners";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartnerById } from "@/lib/data/partners";
import { getReferenceData } from "@/lib/data/reference";

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const user = await requireUser();
  const { partnerId } = await params;
  const [partner, referenceData] = await Promise.all([
    getPartnerById(partnerId),
    getReferenceData(),
  ]);

  if (!partner) {
    notFound();
  }

  const canEdit =
    hasAnyRole(user, [ROLE_CODES.systemAdmin]) ||
    partner.alliance_manager_id === user.id;

  if (!canEdit) {
    notFound();
  }

  const primaryAssignment = partner.partner_type_assignments.find(
    (assignment) => assignment.is_primary,
  );
  const boundAction = updatePartnerAction.bind(null, partner.id);

  return (
    <PageShell description={partner.name} title="Edit partner">
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href={`/partners/${partner.id}`}>Back to partner</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <PartnerForm
            action={boundAction}
            currentUserId={user.id}
            partner={{
              name: partner.name,
              legalName: partner.legal_name,
              website: partner.website,
              headquartersCountry: partner.headquarters_country,
              region: partner.region,
              industryFocus: partner.industry_focus,
              status: partner.status,
              currentTierId: partner.current_tier_id,
              allianceManagerId: partner.alliance_manager_id,
              executiveSponsorId: partner.executive_sponsor_id,
              initialRationale: partner.initial_rationale,
              partnerTypeIds: partner.partner_type_assignments
                .map((assignment) => assignment.partner_types?.id)
                .filter((partnerTypeId): partnerTypeId is string =>
                  Boolean(partnerTypeId),
                ),
              primaryPartnerTypeId: primaryAssignment?.partner_types?.id ?? "",
            }}
            partnerTiers={referenceData.partnerTiers}
            partnerTypes={referenceData.partnerTypes}
            submitLabel="Save changes"
            users={referenceData.users}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
