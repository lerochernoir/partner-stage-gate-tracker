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

      <form className="space-y-6 rounded-lg border p-6">

        <div>
          <label className="mb-2 block text-sm font-medium">
            Partner
          </label>
          <select className="w-full rounded-md border p-2">
            <option>Select Partner...</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Stage
          </label>
          <select className="w-full rounded-md border p-2">
            <option>SG0</option>
            <option>SG1</option>
            <option>SG2</option>
            <option>SG3</option>
            <option>SG4</option>
            <option>SG5</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Evidence Type
          </label>
          <select className="w-full rounded-md border p-2">
            <option>Architecture</option>
            <option>Contract</option>
            <option>Security</option>
            <option>Financial</option>
            <option>Customer Validation</option>
            <option>Meeting Notes</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Title
          </label>
          <input
            className="w-full rounded-md border p-2"
            placeholder="Architecture Review"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Description
          </label>
          <textarea
            rows={5}
            className="w-full rounded-md border p-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Reference URL
          </label>
          <input
            className="w-full rounded-md border p-2"
            placeholder="https://sharepoint..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-md bg-slate-950 px-5 py-2 text-white hover:bg-slate-800"
          >
            Save Evidence
          </button>
        </div>

      </form>
    </div>
  );
}
