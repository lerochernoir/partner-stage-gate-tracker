"use client";

import { useActionState, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const textareaClass =
  "min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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
    <form action={formAction} className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Partner name*</Label>
          <Input defaultValue={partner?.name} id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="legalName">Legal name</Label>
          <Input
            defaultValue={partner?.legalName ?? ""}
            id="legalName"
            name="legalName"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="website">Website</Label>
          <Input
            defaultValue={partner?.website ?? ""}
            id="website"
            name="website"
            placeholder="https://example.com"
            type="url"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="headquartersCountry">Headquarters country</Label>
          <Input
            defaultValue={partner?.headquartersCountry ?? ""}
            id="headquartersCountry"
            name="headquartersCountry"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="region">Region</Label>
          <Input defaultValue={partner?.region ?? ""} id="region" name="region" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="industryFocus">Industry focus</Label>
          <Input
            defaultValue={partner?.industryFocus ?? ""}
            id="industryFocus"
            name="industryFocus"
          />
        </div>
      </div>

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Partner types*</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {partnerTypes.map((partnerType) => (
            <label className="flex items-center gap-2 text-sm" key={partnerType.id}>
              <input
                checked={selectedTypes.has(partnerType.id)}
                className="h-4 w-4 rounded border-input"
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="primaryPartnerTypeId">Primary partner type*</Label>
          <select
            className={selectClass}
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
        <div className="grid gap-2">
          <Label htmlFor="currentTierId">Tier*</Label>
          <select
            className={selectClass}
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="allianceManagerId">Alliance manager*</Label>
          <select
            className={selectClass}
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
        <div className="grid gap-2">
          <Label htmlFor="executiveSponsorId">Executive sponsor</Label>
          <select
            className={selectClass}
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

      <div className="grid gap-2">
        <Label htmlFor="status">Status*</Label>
        <select
          className={selectClass}
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

      <div className="grid gap-2">
        <Label htmlFor="initialRationale">Initial rationale</Label>
        <textarea
          className={textareaClass}
          defaultValue={partner?.initialRationale ?? ""}
          id="initialRationale"
          name="initialRationale"
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button disabled={pending} type="submit">
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
