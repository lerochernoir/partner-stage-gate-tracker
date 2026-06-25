"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { autosavePackageSectionAction } from "@/lib/actions/packages";
import type { StageRequirementRow } from "@/lib/data/lifecycle";
import type { PackageSectionRow } from "@/lib/data/packages";
import { humanize } from "@/lib/format";

type EditableSection = PackageSectionRow & {
  localContent: string;
  saveState?: "idle" | "saving" | "saved" | "error";
  error?: string;
  statusError?: string;
};

export function PackageEditor({
  packageId,
  initialPackageStatus,
  sections,
  requirements,
  editable,
  children,
}: {
  packageId: string;
  initialPackageStatus: string;
  sections: PackageSectionRow[];
  requirements: StageRequirementRow[];
  editable: boolean;
  children?: React.ReactNode;
}) {
  const [packageStatus, setPackageStatus] = useState(initialPackageStatus);
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  const [pendingSave, setPendingSave] = useState<{
    sectionId: string;
    content: string;
  } | null>(null);
  const [localSections, setLocalSections] = useState<EditableSection[]>(
    sections.map((section) => ({
      ...section,
      localContent: section.content,
      saveState: "idle",
    })),
  );
  const [isPending, startTransition] = useTransition();
  const activeSection = localSections.find((section) => section.id === activeSectionId);
  const progress = useMemo(
    () => calculateProgress(localSections, requirements),
    [localSections, requirements],
  );
  const canSubmit = editable && progress.ready;

  useEffect(() => {
    if (!editable || !pendingSave) return;

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        const result = await autosavePackageSectionAction({
          packageId,
          sectionId: pendingSave.sectionId,
          content: pendingSave.content,
        });

        setLocalSections((current) =>
          current.map((section) =>
            section.id === pendingSave.sectionId
              ? {
                  ...section,
                  content: result.error ? section.content : pendingSave.content,
                  status: result.sectionStatus ?? section.status,
                  saveState: result.error ? "error" : "saved",
                  error: result.error,
                  statusError: result.error ? undefined : result.statusError,
                }
              : section,
          ),
        );

        if (result.packageStatus) {
          setPackageStatus(result.packageStatus);
        }
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [editable, packageId, pendingSave]);

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Package progress</p>
            <p className="text-sm text-muted-foreground">
              {progress.completed} of {progress.total} checklist and section items complete
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{humanize(packageStatus)}</Badge>
            {progress.ready ? <Badge>Ready for Review</Badge> : null}
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-lg border bg-background p-3">
          <p className="mb-3 px-2 text-xs font-semibold uppercase text-muted-foreground">
            Sections
          </p>
          <nav className="grid gap-1">
            {localSections.map((section) => {
              const complete = Boolean(section.localContent.trim());
              return (
                <button
                  className={`rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${
                    section.id === activeSectionId ? "bg-muted font-medium" : ""
                  }`}
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  type="button"
                >
                  <span>{section.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {complete ? "Complete" : "Required"}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="rounded-lg border bg-background p-4">
          {activeSection ? (
            <div className="grid gap-4">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-xl font-semibold">{activeSection.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {editable
                      ? "Changes autosave shortly after you stop typing."
                      : "This package is read-only for your role or status."}
                  </p>
                </div>
                <SaveStateLabel section={activeSection} pending={isPending} />
              </div>

              {editable ? (
                <textarea
                  className="min-h-[360px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onChange={(event) => {
                    const value = event.target.value;
                    setLocalSections((current) =>
                      current.map((section) =>
                        section.id === activeSection.id
                          ? {
                              ...section,
                              localContent: value,
                              saveState: "saving",
                              error: undefined,
                            }
                          : section,
                      ),
                    );
                    setPendingSave({
                      sectionId: activeSection.id,
                      content: value,
                    });
                  }}
                  value={activeSection.localContent}
                />
              ) : (
                <div className="min-h-[240px] whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {activeSection.localContent || "No content entered."}
                </div>
              )}

              {activeSection.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{activeSection.error}</AlertDescription>
                </Alert>
              ) : null}

              {!activeSection.error && activeSection.statusError ? (
                <Alert>
                  <AlertDescription>{activeSection.statusError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No package sections are configured.
            </p>
          )}
        </main>
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">
              {progress.ready
                ? "Package is ready to submit."
                : "Complete all checklist items and package sections before submission."}
            </p>
            <p className="text-sm text-muted-foreground">
              Submission is blocked until required fields are complete.
            </p>
          </div>
          <div>{children}</div>
        </div>
        {!canSubmit && editable ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Required completion: {progress.completed}/{progress.total}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SaveStateLabel({
  section,
  pending,
}: {
  section: EditableSection;
  pending: boolean;
}) {
  if (section.saveState === "error") {
    return <Badge variant="destructive">Autosave failed</Badge>;
  }

  if (section.saveState === "saving" || pending) {
    return <Badge variant="secondary">Saving...</Badge>;
  }

  if (section.saveState === "saved") {
    return <Badge variant="secondary">Saved</Badge>;
  }

  return <Badge variant="outline">{humanize(section.status)}</Badge>;
}

function calculateProgress(
  sections: EditableSection[],
  requirements: StageRequirementRow[],
) {
  const completedSections = sections.filter((section) =>
    section.localContent.trim(),
  ).length;
  const mandatoryRequirements = requirements.filter(
    (requirement) => requirement.stage_requirements?.is_mandatory,
  );
  const completedRequirements = mandatoryRequirements.filter(
    (requirement) => requirement.status === "complete",
  ).length;
  const total = sections.length + mandatoryRequirements.length;
  const completed = completedSections + completedRequirements;

  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    ready: total > 0 && completed === total,
  };
}
