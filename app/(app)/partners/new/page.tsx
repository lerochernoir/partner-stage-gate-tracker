import Link from "next/link";
import { PartnerForm } from "@/components/partners/PartnerForm";
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
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Create partner</h1>
          <p className="page-description">
            Create a partner record and initialize SG0 requirements.
          </p>
        </div>
        <Link className="button secondary" href="/partners">
          Back to partners
        </Link>
      </header>

      <section className="card">
        <div className="card-body">
          <PartnerForm
            action={createPartnerAction}
            currentUserId={user.id}
            partnerTiers={referenceData.partnerTiers}
            partnerTypes={referenceData.partnerTypes}
            submitLabel="Create partner"
            users={referenceData.users}
          />
        </div>
      </section>
    </div>
  );
}
