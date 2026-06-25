import Link from "next/link";

export default function NewEvidencePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Add Evidence
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Attach supporting evidence to a partner stage gate.
          </p>
        </div>

        <Link
          href="/evidence"
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Cancel
        </Link>
      </div>

      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">
          Evidence creation is temporarily paused while the save action is fixed.
        </p>
      </div>
    </div>
  );
}
