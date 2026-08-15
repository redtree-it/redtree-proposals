import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computeTotals } from "@/lib/pricing";
import { formatPence } from "@/lib/validation/price-book";
import { PROPOSAL_STATUSES } from "@/lib/validation/proposal";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-neutral-100 text-neutral-700",
  SENT: "bg-blue-50 text-blue-700",
  ACCEPTED: "bg-green-50 text-green-700",
  DECLINED: "bg-red-50 text-red-700",
  EXPIRED: "bg-amber-50 text-amber-700",
};

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireUser();
  const { status } = await searchParams;

  const proposals = await prisma.proposal.findMany({
    where: status ? { status: status as (typeof PROPOSAL_STATUSES)[number] } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { client: true, pricingLines: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Proposals</h1>
        <Link
          href="/proposals/new"
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          New proposal
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/proposals"
          className={`rounded-full px-3 py-1 ${!status ? "bg-brand-green text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
        >
          All
        </Link>
        {PROPOSAL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/proposals?status=${s}`}
            className={`rounded-full px-3 py-1 ${status === s ? "bg-brand-green text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
          >
            {s}
          </Link>
        ))}
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 font-medium">Title</th>
            <th className="py-2 font-medium">Client</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Monthly (core)</th>
            <th className="py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((proposal) => {
            const totals = computeTotals(proposal.pricingLines);
            return (
              <tr key={proposal.id} className="border-b border-neutral-100">
                <td className="py-2">
                  <Link href={`/proposals/${proposal.id}`} className="font-medium text-neutral-900 hover:underline">
                    {proposal.title}
                  </Link>
                </td>
                <td className="py-2 text-neutral-600">{proposal.client.name}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[proposal.status]}`}>
                    {proposal.status}
                  </span>
                </td>
                <td className="py-2 text-neutral-600">{formatPence(totals.coreIncludedPence)}</td>
                <td className="py-2 text-neutral-500">{proposal.updatedAt.toLocaleDateString("en-GB")}</td>
              </tr>
            );
          })}
          {proposals.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-400">
                No proposals yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
