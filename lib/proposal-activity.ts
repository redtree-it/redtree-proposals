import { prisma } from "./db";
import type { ActivityAction } from "./generated/prisma/enums";

export async function logActivity(
  proposalId: string,
  userId: string,
  action: ActivityAction,
  detail?: string
) {
  await prisma.proposalActivity.create({ data: { proposalId, userId, action, detail } });
}
