import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { proposalBlockOverrideSchema } from "@/lib/validation/proposal";
import { logActivity } from "@/lib/proposal-activity";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; proposalBlockId: string }> }
) {
  const user = await requireUser();
  const { id: proposalId, proposalBlockId } = await params;
  const url = absoluteUrl(request, `/proposals/${proposalId}`);

  const current = await prisma.proposalBlock.findUnique({ where: { id: proposalBlockId } });
  if (!current || current.proposalId !== proposalId) {
    return NextResponse.redirect(url, 303);
  }

  const formData = await request.formData();
  const action = formData.get("action");

  if (action === "remove") {
    await prisma.proposalBlock.delete({ where: { id: proposalBlockId } });
    await logActivity(proposalId, user.id, "EDITED", `Removed block "${current.title}"`);
    return NextResponse.redirect(url, 303);
  }

  if (action === "move_up" || action === "move_down") {
    const direction = action === "move_up" ? "desc" : "asc";
    const comparator = action === "move_up" ? { lt: current.sortOrder } : { gt: current.sortOrder };
    const neighbor = await prisma.proposalBlock.findFirst({
      where: { proposalId, sortOrder: comparator },
      orderBy: { sortOrder: direction },
    });
    if (neighbor) {
      await prisma.$transaction([
        prisma.proposalBlock.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
        prisma.proposalBlock.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
      ]);
    }
    return NextResponse.redirect(url, 303);
  }

  // action === "save": edit the proposal-local copy. Never touches the shared library block.
  const parsed = proposalBlockOverrideSchema.safeParse({
    title: formData.get("title"),
    bodyMarkdown: formData.get("bodyMarkdown"),
  });
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid block.");
    return NextResponse.redirect(url, 303);
  }

  await prisma.proposalBlock.update({
    where: { id: proposalBlockId },
    data: { title: parsed.data.title, bodyMarkdown: parsed.data.bodyMarkdown, overridden: true },
  });
  await logActivity(proposalId, user.id, "EDITED", `Edited block "${parsed.data.title}"`);

  return NextResponse.redirect(url, 303);
}
