import { prisma } from "./db";
import { resolveMergeFields, validateProposal } from "./merge-fields";
import { getCompanySettings } from "./company-settings";

export async function getResolvedProposal(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      client: true,
      blocks: { orderBy: { sortOrder: "asc" } },
      requirements: { orderBy: { sortOrder: "asc" } },
      pricingLines: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!proposal) return null;

  const [settings, otherClients] = await Promise.all([
    getCompanySettings(),
    prisma.client.findMany({ where: { id: { not: proposal.clientId } }, select: { name: true } }),
  ]);

  const fields = resolveMergeFields(proposal.client, proposal);
  const issues = validateProposal(
    proposal,
    fields,
    otherClients.map((c) => c.name)
  );

  return { proposal, settings, fields, issues };
}

export type ResolvedProposal = NonNullable<Awaited<ReturnType<typeof getResolvedProposal>>>;
