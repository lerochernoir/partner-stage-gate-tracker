"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { submitPackageAction, type PackageActionState } from "@/lib/actions/packages";

const initialState: PackageActionState = {};

export function SubmitPackageForm({
  packageId,
  disabled = false,
}: {
  packageId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitPackageAction, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <input name="packageId" type="hidden" value={packageId} />
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <p className="text-sm text-muted-foreground">{state.success}</p>
      ) : null}
      <Button disabled={pending || disabled} type="submit">
        {pending ? "Submitting..." : "Submit for approval"}
      </Button>
    </form>
  );
}
