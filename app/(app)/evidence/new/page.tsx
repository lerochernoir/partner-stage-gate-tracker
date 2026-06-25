import Link from "next/link";

import { createEvidenceAction } from "@/lib/actions/evidence";
import { getPartners } from "@/lib/data/partners";

export default async function NewEvidencePage() {
  const partners = await getPartners();

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

      <form action={createEvidenceAction} className="space-y-6 rounded-lg border p-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Partner</label>
          <select name="partner_id" required className="w-full rounded-md border p-2">
            <option value="">Select Partner...</option>
            {partners.map((partner: any) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Evidence Type</label>
          <select name="evidence_type" required className="w-full rounded-md border p-2">
           <option value="document">Document</option>
<option value="url">URL</option>
<option value="note">Note</option>
<option value="confirmation">Confirmation</option>
<option value="package_field">Package Field</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Title</label>
          <input
            name="title"
            required
            className="w-full rounded-md border p-2"
            placeholder="Architecture Review"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea name="description" rows={5} className="w-full rounded-md border p-2" />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Reference URL</label>
          <input
            name="url"
            type="url"
            className="w-full rounded-md border p-2"
            placeholder="https://sharepoint..."
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-md bg-slate-950 px-5 py-2 text-white hover:bg-slate-800"
          >
            Save Evidence
          </button>
        </div>
      </form>
    </div>
  );
}
