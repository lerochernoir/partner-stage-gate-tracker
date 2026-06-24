"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  submitApprovalDecisionAction,
  type ApprovalActionState,
} from "@/lib/actions/approvals";

const initialState: ApprovalActionState = {};

export function ApprovalDecisionForm({
  approvalId,
  stepId,
}: {
  approvalId: string;
  stepId: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitApprovalDecisionAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <input name="approvalId" type="hidden" value={approvalId} />
      <input name="stepId" type="hidden" value={stepId} />
      <textarea
        className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        name="comments"
        placeholder="Comments are required for reject or rework decisions."
      />
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <p className="text-sm text-muted-foreground">{state.success}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} name="decision" type="submit" value="approved">
          Approve
        </Button>
        <Button
          disabled={pending}
          name="decision"
          type="submit"
          value="rework_required"
          variant="outline"
        >
          Request rework
        </Button>
        <Button
          disabled={pending}
          name="decision"
          type="submit"
          value="rejected"
          variant="destructive"
        >
          Reject
        </Button>
      </div>
    </form>
  );
}
