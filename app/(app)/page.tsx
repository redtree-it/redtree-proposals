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

export default async function DashboardPage() {
  const user = await requireUser();

  const proposals = await prisma.proposal.findMany({
    include: { client: true, pricingLines: true },
  });

  const statusCounts = Object.fromEntries(PROPOSAL_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  const valueByStatus = Object.fromEntries(PROPOSAL_STATUSES.map((s) => [s, 0])) as Record<string, number>;
  for (const proposal of proposals) {
    statusCounts[proposal.status]++;
    valueByStatus[proposal.status] += computeTotals(proposal.pricingLines).coreIncludedPence;
  }

  const recentlyEdited = [...proposals].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);

  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const expiringSoon = proposals
    .filter(
      (p) =>
        p.validUntil &&
        p.validUntil >= now &&
        p.validUntil <= in14Days &&
        p.status !== "DECLINED" &&
        p.status !== "EXPIRED"
    )
    .sort((a, b) => a.validUntil!.getTime() - b.validUntil!.getTime());

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Welcome, {user.name}</h1>

      <div className="mt-6 grid grid-cols-5 gap-3">
        {PROPOSAL_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/proposals?status=${status}`}
            className="rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
              {status}
            </span>
            <p className="mt-2 text-2xl font-bold text-neutral-900">{statusCounts[status]}</p>
            <p className="text-xs text-neutral-400">{formatPence(valueByStatus[status])} / mo</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Recently edited</h2>
          <div className="mt-3 space-y-2">
            {recentlyEdited.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
              >
                <span className="text-neutral-800">
                  {proposal.title} <span className="text-neutral-400">· {proposal.client.name}</span>
                </span>
                <span className="text-xs text-neutral-400">{proposal.updatedAt.toLocaleDateString("en-GB")}</span>
              </Link>
            ))}
            {recentlyEdited.length === 0 && <p className="text-sm text-neutral-400">No proposals yet.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Expiring within 14 days</h2>
          <div className="mt-3 space-y-2">
            {expiringSoon.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
              >
                <span className="text-neutral-800">
                  {proposal.title} <span className="text-neutral-400">· {proposal.client.name}</span>
                </span>
                <span className="text-xs font-medium text-amber-700">
                  {proposal.validUntil!.toLocaleDateString("en-GB")}
                </span>
              </Link>
            ))}
            {expiringSoon.length === 0 && <p className="text-sm text-neutral-400">Nothing expiring soon.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
