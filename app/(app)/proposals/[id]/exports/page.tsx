import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function ProposalExportsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    include: {
      client: true,
      exports: { orderBy: { versionNo: "desc" }, include: { createdBy: true } },
    },
  });
  if (!proposal) notFound();

  return (
    <div className="max-w-2xl">
      <Link href={`/proposals/${proposal.id}/preview`} className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Back to preview
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-neutral-900">Export history</h1>
      <p className="text-sm text-neutral-500">{proposal.title} · {proposal.client.name}</p>

      <div className="mt-6 space-y-2">
        {proposal.exports.map((exp) => (
          <div
            key={exp.id}
            className="flex items-center justify-between rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <span className="font-medium text-neutral-900">v{exp.versionNo} — {exp.filename}</span>
              <p className="text-xs text-neutral-400">
                {exp.createdBy.name} · {exp.createdAt.toLocaleString("en-GB")}
              </p>
            </div>
            <a
              href={`/api/proposals/${proposal.id}/exports/${exp.id}`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Download
            </a>
          </div>
        ))}
        {proposal.exports.length === 0 && (
          <p className="text-sm text-neutral-400">No exports yet — generate one from the preview page.</p>
        )}
      </div>
    </div>
  );
}
