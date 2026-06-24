"use client";

import { useActionState, useMemo, useState } from "react";
import type { PartnerFormState } from "@/lib/actions/partners";

type ReferenceOption = {
  id: string;
  name: string;
  email?: string;
};

type PartnerFormProps = {
  action: (
    previousState: PartnerFormState,
    formData: FormData,
  ) => Promise<PartnerFormState>;
  submitLabel: string;
  partnerTypes: ReferenceOption[];
  partnerTiers: ReferenceOption[];
  users: ReferenceOption[];
  currentUserId: string;
  partner?: {
    name: string;
    legalName: string | null;
    website: string | null;
    headquartersCountry: string | null;
    region: string | null;
    industryFocus: string | null;
    status: string;
    currentTierId: string;
    allianceManagerId: string;
    executiveSponsorId: string | null;
    initialRationale: string | null;
    partnerTypeIds: string[];
    primaryPartnerTypeId: string;
  };
};

const initialState: PartnerFormState = {};

export function PartnerForm({
  action,
  submitLabel,
  partnerTypes,
  partnerTiers,
  users,
  currentUserId,
  partner,
}: PartnerFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const defaultTypeIds = useMemo(
    () => new Set(partner?.partnerTypeIds ?? []),
    [partner?.partnerTypeIds],
  );
  const [selectedTypes, setSelectedTypes] = useState(defaultTypeIds);

  function toggleType(partnerTypeId: string) {
    setSelectedTypes((previous) => {
      const next = new Set(previous);
      if (next.has(partnerTypeId)) {
        next.delete(partnerTypeId);
      } else {
        next.add(partnerTypeId);
      }
      return next;
    });
  }

  return (
    <form action={formAction} className="form">
      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="name">
            Partner name*
          </label>
          <input
            className="input"
            defaultValue={partner?.name}
            id="name"
            name="name"
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="legalName">
            Legal name
          </label>
          <input
            className="input"
            defaultValue={partner?.legalName ?? ""}
            id="legalName"
            name="legalName"
          />
        </div>
      </div>

      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="website">
            Website
          </label>
          <input
            className="input"
            defaultValue={partner?.website ?? ""}
            id="website"
            name="website"
            placeholder="https://example.com"
            type="url"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="headquartersCountry">
            Headquarters country
          </label>
          <input
            className="input"
            defaultValue={partner?.headquartersCountry ?? ""}
            id="headquartersCountry"
            name="headquartersCountry"
          />
        </div>
      </div>

      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="region">
            Region
          </label>
          <input
            className="input"
            defaultValue={partner?.region ?? ""}
            id="region"
            name="region"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="industryFocus">
            Industry focus
          </label>
          <input
            className="input"
            defaultValue={partner?.industryFocus ?? ""}
            id="industryFocus"
            name="industryFocus"
          />
        </div>
      </div>

      <fieldset className="fieldset">
        <legend className="label">Partner types*</legend>
        <div className="checkbox-grid">
          {partnerTypes.map((partnerType) => (
            <label key={partnerType.id} className="checkbox-label">
              <input
                checked={selectedTypes.has(partnerType.id)}
                name="partnerTypeIds"
                onChange={() => toggleType(partnerType.id)}
                type="checkbox"
                value={partnerType.id}
              />
              <span>{partnerType.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="primaryPartnerTypeId">
            Primary partner type*
          </label>
          <select
            className="select"
            defaultValue={partner?.primaryPartnerTypeId ?? ""}
            id="primaryPartnerTypeId"
            name="primaryPartnerTypeId"
            required
          >
            <option value="">Select type</option>
            {partnerTypes
              .filter((partnerType) => selectedTypes.has(partnerType.id))
              .map((partnerType) => (
                <option key={partnerType.id} value={partnerType.id}>
                  {partnerType.name}
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="currentTierId">
            Tier*
          </label>
          <select
            className="select"
            defaultValue={partner?.currentTierId ?? partnerTiers[0]?.id}
            id="currentTierId"
            name="currentTierId"
            required
          >
            {partnerTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid two">
        <div className="field">
          <label className="label" htmlFor="allianceManagerId">
            Alliance manager*
          </label>
          <select
            className="select"
            defaultValue={partner?.allianceManagerId ?? currentUserId}
            id="allianceManagerId"
            name="allianceManagerId"
            required
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="executiveSponsorId">
            Executive sponsor
          </label>
          <select
            className="select"
            defaultValue={partner?.executiveSponsorId ?? ""}
            id="executiveSponsorId"
            name="executiveSponsorId"
          >
            <option value="">Not assigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="status">
          Status*
        </label>
        <select
          className="select"
          defaultValue={partner?.status ?? "draft"}
          id="status"
          name="status"
          required
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor="initialRationale">
          Initial rationale
        </label>
        <textarea
          className="textarea"
          defaultValue={partner?.initialRationale ?? ""}
          id="initialRationale"
          name="initialRationale"
        />
      </div>

      {state.error ? <p className="error">{state.error}</p> : null}
      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
