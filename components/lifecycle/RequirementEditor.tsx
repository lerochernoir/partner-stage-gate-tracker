"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  updateStageRequirementAction,
  type ActionState,
} from "@/lib/actions/lifecycle";
import type { StageRequirementRow } from "@/lib/data/lifecycle";

const initialState: ActionState = {};

export function RequirementEditor({
  partnerId,
  requirement,
  canEdit,
}: {
  partnerId: string;
  requirement: StageRequirementRow;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateStageRequirementAction,
    initialState,
  );

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row">
        <div>
          <h3 className="font-medium">{requirement.stage_requirements?.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {requirement.stage_requirements?.description ?? "No description."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Status: {requirement.status.replaceAll("_", " ")}
          </p>
        </div>
        {requirement.stage_requirements?.is_mandatory ? (
          <span className="text-xs font-medium text-destructive">Mandatory</span>
        ) : null}
      </div>

      {canEdit ? (
        <form action={formAction} className="mt-4 grid gap-3">
          <input name="partnerId" type="hidden" value={partnerId} />
          <input name="requirementId" type="hidden" value={requirement.id} />
          <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor={`status-${requirement.id}`}>Status</Label>
              <select
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
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
            <div className="grid gap-2">
              <Label htmlFor={`notes-${requirement.id}`}>Notes</Label>
              <input
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                defaultValue={requirement.notes ?? ""}
                id={`notes-${requirement.id}`}
                name="notes"
              />
            </div>
            <div className="flex items-end">
              <Button disabled={pending} type="submit" variant="outline">
                Save
              </Button>
            </div>
          </div>
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state.success ? (
            <p className="text-sm text-muted-foreground">{state.success}</p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
