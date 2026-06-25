import { getEvidence } from "@/lib/data/evidence";

export default async function EvidencePage() {
  const evidence = await getEvidence();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Evidence Library
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Central repository for governance evidence.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Partner</th>
              <th className="px-4 py-3 text-left">Stage</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {evidence.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-10 text-center text-muted-foreground"
                >
                  No evidence has been submitted.
                </td>
              </tr>
            ) : (
              evidence.map((item: any) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.title}</td>
                  <td className="px-4 py-3">
                    {item.partners?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {item.stage_gates?.code ?? "-"}
                  </td>
                  <td className="px-4 py-3">{item.evidence_type}</td>
                  <td className="px-4 py-3">{item.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
