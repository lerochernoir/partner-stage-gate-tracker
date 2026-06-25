"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  updatePackageSectionAction,
  type PackageActionState,
} from "@/lib/actions/packages";
import type { PackageSectionRow } from "@/lib/data/packages";

const initialState: PackageActionState = {};

export function PackageSectionEditor({
  packageId,
  section,
  editable,
}: {
  packageId: string;
  section: PackageSectionRow;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updatePackageSectionAction,
    initialState,
  );

  return (
    <section className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{section.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Status: {section.status}
          </p>
        </div>
      </div>

      {editable ? (
        <form action={formAction} className="mt-4 grid gap-3">
          <input name="packageId" type="hidden" value={packageId} />
          <input name="sectionId" type="hidden" value={section.id} />
          <textarea
            className="min-h-40 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            defaultValue={section.content}
            name="content"
          />
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {!state.error && state.statusError ? (
            <Alert>
              <AlertDescription>{state.statusError}</AlertDescription>
            </Alert>
          ) : null}
          {state.success ? (
            <p className="text-sm text-muted-foreground">{state.success}</p>
          ) : null}
          <Button disabled={pending} type="submit" variant="outline">
            Save section
          </Button>
        </form>
      ) : (
        <div className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
          {section.content || "No content entered."}
        </div>
      )}
    </section>
  );
}
