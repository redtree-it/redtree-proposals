import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/proposal-activity";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: proposalId } = await params;
  const url = new URL(`/proposals/${proposalId}`, request.url);

  const formData = await request.formData();
  const blockId = formData.get("blockId");
  if (typeof blockId !== "string" || !blockId) {
    url.searchParams.set("error", "Choose a block to add.");
    return NextResponse.redirect(url, 303);
  }

  const block = await prisma.contentBlock.findUnique({ where: { id: blockId }, include: { currentVersion: true } });
  if (!block?.currentVersion) {
    url.searchParams.set("error", "That block has no content yet.");
    return NextResponse.redirect(url, 303);
  }

  const maxSortOrder = await prisma.proposalBlock.aggregate({
    where: { proposalId },
    _max: { sortOrder: true },
  });

  await prisma.proposalBlock.create({
    data: {
      proposalId,
      sourceBlockId: block.id,
      sourceVersionId: block.currentVersion.id,
      title: block.title,
      bodyMarkdown: block.currentVersion.bodyMarkdown,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  await logActivity(proposalId, user.id, "EDITED", `Added block "${block.title}"`);

  return NextResponse.redirect(url, 303);
}
