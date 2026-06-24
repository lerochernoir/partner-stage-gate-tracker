import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  PartnerStatusBadge,
  StageBadge,
  TierBadge,
} from "@/components/ui/Badge";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartnerById } from "@/lib/data/partners";
import { formatDateTime } from "@/lib/format";

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const user = await requireUser();
  const { partnerId } = await params;
  const partner = await getPartnerById(partnerId);

  if (!partner) {
    notFound();
  }

  const canEdit =
    hasAnyRole(user, [ROLE_CODES.systemAdmin]) ||
    partner.alliance_manager_id === user.id;

  return (
    <div className="page">
      <section className="card">
        <div className="card-body">
          <div className="detail-header">
            <div>
              <h1 className="page-title">{partner.name}</h1>
              <p className="page-description">
                {partner.legal_name ?? "No legal name provided"}
              </p>
            </div>
            <div className="button-row">
              {canEdit ? (
                <Link className="button primary" href={`/partners/${partner.id}/edit`}>
                  Edit partner
                </Link>
              ) : null}
              <Link className="button secondary" href="/partners">
                Back to partners
              </Link>
            </div>
          </div>

          <div className="pill-row" style={{ marginTop: "1rem" }}>
            {partner.stage_gates ? (
              <StageBadge code={partner.stage_gates.code} />
            ) : null}
            {partner.partner_tiers ? (
              <TierBadge name={partner.partner_tiers.name} />
            ) : null}
            <PartnerStatusBadge status={partner.status} />
            {partner.partner_type_assignments.map((assignment) =>
              assignment.partner_types ? (
                <Badge
                  key={assignment.partner_types.id}
                  tone={assignment.is_primary ? "blue" : "gray"}
                >
                  {assignment.partner_types.name}
                </Badge>
              ) : null,
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body">
          <h2>Partner profile</h2>
          <dl className="metadata-list">
            <div className="metadata-item">
              <dt>Website</dt>
              <dd>
                {partner.website ? (
                  <a href={partner.website} rel="noreferrer" target="_blank">
                    {partner.website}
                  </a>
                ) : (
                  "Not set"
                )}
              </dd>
            </div>
            <div className="metadata-item">
              <dt>Region</dt>
              <dd>{partner.region ?? "Not set"}</dd>
            </div>
            <div className="metadata-item">
              <dt>Headquarters country</dt>
              <dd>{partner.headquarters_country ?? "Not set"}</dd>
            </div>
            <div className="metadata-item">
              <dt>Industry focus</dt>
              <dd>{partner.industry_focus ?? "Not set"}</dd>
            </div>
            <div className="metadata-item">
              <dt>Alliance manager</dt>
              <dd>{partner.alliance_manager?.name ?? "Unassigned"}</dd>
            </div>
            <div className="metadata-item">
              <dt>Executive sponsor</dt>
              <dd>{partner.executive_sponsor?.name ?? "Unassigned"}</dd>
            </div>
            <div className="metadata-item">
              <dt>Created</dt>
              <dd>{formatDateTime(partner.created_at)}</dd>
            </div>
            <div className="metadata-item">
              <dt>Current stage</dt>
              <dd>{partner.stage_gates?.name ?? "Not set"}</dd>
            </div>
          </dl>

          <h3>Initial rationale</h3>
          <p>{partner.initial_rationale || "No rationale entered yet."}</p>
        </div>
      </section>
    </div>
  );
}
