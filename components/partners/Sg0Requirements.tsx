"use client";

import { useActionState } from "react";
import type { PartnerFormState } from "@/lib/actions/partners";
import { RequirementStatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import type { PartnerRequirementRow } from "@/lib/data/partners";

type RequirementAction = (
  previousState: PartnerFormState,
  formData: FormData,
) => Promise<PartnerFormState>;

export function Sg0Requirements({
  requirements,
  action,
  canEdit,
}: {
  requirements: PartnerRequirementRow[];
  action: RequirementAction;
  canEdit: boolean;
}) {
  const completeCount = requirements.filter(
    (requirement) => requirement.status === "complete",
  ).length;
  const completion =
    requirements.length > 0 ? Math.round((completeCount / requirements.length) * 100) : 0;

  return (
    <section className="card">
      <div className="card-body">
        <div className="section-header">
          <div>
            <h2>SG0 Requirements</h2>
            <p className="help">
              {completeCount} of {requirements.length} complete
            </p>
          </div>
          <strong>{completion}%</strong>
        </div>
        <div className="progress-bar" aria-label={`SG0 completion ${completion}%`}>
          <span style={{ width: `${completion}%` }} />
        </div>

        <div className="requirement-list">
          {requirements.map((requirement) => (
            <RequirementCard
              action={action}
              canEdit={canEdit}
              key={requirement.id}
              requirement={requirement}
            />
          ))}
          {requirements.length === 0 ? (
            <div className="empty-state">No requirements are configured.</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function RequirementCard({
  requirement,
  action,
  canEdit,
}: {
  requirement: PartnerRequirementRow;
  action: RequirementAction;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const template = requirement.stage_requirements;

  return (
    <article className="requirement-card">
      <div className="requirement-card-header">
        <div>
          <h3>{template?.name ?? "Requirement"}</h3>
          <p className="help">{template?.description ?? "No description."}</p>
        </div>
        <RequirementStatusBadge status={requirement.status} />
      </div>
      <p className="help">
        Owner: {requirement.owner?.name ?? "Unassigned"} | Completed:{" "}
        {formatDateTime(requirement.completed_at)}
      </p>

      {canEdit ? (
        <form action={formAction} className="requirement-form">
          <input name="requirementId" type="hidden" value={requirement.id} />
          <div className="grid two">
            <div className="field">
              <label className="label" htmlFor={`status-${requirement.id}`}>
                Status
              </label>
              <select
                className="select"
                defaultValue={requirement.status}
                id={`status-${requirement.id}`}
                name="status"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="blocked">Blocked</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor={`notes-${requirement.id}`}>
                Notes
              </label>
              <input
                className="input"
                defaultValue={requirement.notes ?? ""}
                id={`notes-${requirement.id}`}
                name="notes"
              />
            </div>
          </div>
          {state.error ? <p className="error">{state.error}</p> : null}
          <button className="button secondary" disabled={pending} type="submit">
            {pending ? "Saving..." : "Save requirement"}
          </button>
        </form>
      ) : requirement.notes ? (
        <p>{requirement.notes}</p>
      ) : null}
    </article>
  );
}
