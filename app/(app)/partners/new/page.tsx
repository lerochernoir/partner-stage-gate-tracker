import Link from "next/link";
import { PartnerForm } from "@/components/partners/PartnerForm";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createPartnerAction } from "@/lib/actions/partners";
import { ROLE_CODES } from "@/lib/auth/roles";
import { requireAnyRole } from "@/lib/auth/session";
import { getReferenceData } from "@/lib/data/reference";

export default async function NewPartnerPage() {
  const user = await requireAnyRole([
    ROLE_CODES.systemAdmin,
    ROLE_CODES.allianceManager,
  ]);
  const referenceData = await getReferenceData();

  return (
    <PageShell
      description="Create a partner record and assign ownership, type, tier, and status."
      title="Create partner"
    >
      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/partners">Back to partners</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <PartnerForm
            action={createPartnerAction}
            currentUserId={user.id}
            partnerTiers={referenceData.partnerTiers}
            partnerTypes={referenceData.partnerTypes}
            submitLabel="Create partner"
            users={referenceData.users}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
