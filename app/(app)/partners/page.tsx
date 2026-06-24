import Link from "next/link";
import { Badge, PartnerStatusBadge, StageBadge, TierBadge } from "@/components/ui/Badge";
import { ROLE_CODES } from "@/lib/auth/roles";
import { hasAnyRole, requireUser } from "@/lib/auth/session";
import { getPartners } from "@/lib/data/partners";
import { humanize } from "@/lib/format";

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const partners = await getPartners(params);
  const canCreate = hasAnyRole(user, [
    ROLE_CODES.systemAdmin,
    ROLE_CODES.allianceManager,
  ]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Partners</h1>
          <p className="page-description">
            Sprint 1 partner records and SG0 lifecycle readiness.
          </p>
        </div>
        {canCreate ? (
          <Link className="button primary" href="/partners/new">
            Create partner
          </Link>
        ) : null}
      </header>

      <form className="card" method="get">
        <div className="card-body grid three">
          <div className="field">
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              className="input"
              defaultValue={params.q ?? ""}
              id="q"
              name="q"
              placeholder="Partner name"
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              className="select"
              defaultValue={params.status ?? ""}
              id="status"
              name="status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="field action-field">
            <button className="button secondary" type="submit">
              Apply filters
            </button>
          </div>
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Partner</th>
              <th>Types</th>
              <th>Tier</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((partner) => (
              <tr key={partner.id}>
                <td>
                  <strong>{partner.name}</strong>
                  <p className="help">{partner.legal_name ?? "No legal name"}</p>
                </td>
                <td>
                  <div className="pill-row">
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
                </td>
                <td>
                  {partner.partner_tiers ? (
                    <TierBadge name={partner.partner_tiers.name} />
                  ) : (
                    "Not set"
                  )}
                </td>
                <td>
                  {partner.stage_gates ? (
                    <StageBadge code={partner.stage_gates.code} />
                  ) : (
                    "Not set"
                  )}
                </td>
                <td>
                  <PartnerStatusBadge status={partner.status} />
                </td>
                <td>
                  {partner.alliance_manager?.name ?? "Unassigned"}
                  <p className="help">{humanize(partner.region)}</p>
                </td>
                <td>
                  <Link className="button secondary" href={`/partners/${partner.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {partners.length === 0 ? (
          <div className="empty-state">No partners match the current filters.</div>
        ) : null}
      </div>
    </div>
  );
}
