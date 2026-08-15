import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { requirementSchema } from "@/lib/validation/proposal";
import { logActivity } from "@/lib/proposal-activity";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: proposalId } = await params;
  const url = new URL(`/proposals/${proposalId}`, request.url);

  const formData = await request.formData();
  const parsed = requirementSchema.safeParse({
    requirement: formData.get("requirement"),
    delivery: formData.get("delivery"),
  });
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid requirement.");
    return NextResponse.redirect(url, 303);
  }

  const maxSortOrder = await prisma.proposalRequirement.aggregate({
    where: { proposalId },
    _max: { sortOrder: true },
  });

  await prisma.proposalRequirement.create({
    data: { proposalId, ...parsed.data, sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1 },
  });
  await logActivity(proposalId, user.id, "EDITED", "Added a requirement");

  return NextResponse.redirect(url, 303);
}
