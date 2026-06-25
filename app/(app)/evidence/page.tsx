import { PageShell } from "@/components/page-shell";

export default function EvidencePage() {
  return (
    <PageShell
      title="Evidence Library"
      description="View and manage evidence supporting stage gate decisions."
    >
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Evidence Library is coming next. This page will show uploaded documents,
          links, notes, and artifacts tied to partners, stages, packages, and
          checklist requirements.
        </p>
      </div>
    </PageShell>
  );
}
