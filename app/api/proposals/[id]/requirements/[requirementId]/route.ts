import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/proposal-activity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  const user = await requireUser();
  const { id: proposalId, requirementId } = await params;
  const url = new URL(`/proposals/${proposalId}`, request.url);

  const existing = await prisma.proposalRequirement.findUnique({ where: { id: requirementId } });
  if (!existing || existing.proposalId !== proposalId) {
    return NextResponse.redirect(url, 303);
  }

  const formData = await request.formData();
  if (formData.get("action") === "delete") {
    await prisma.proposalRequirement.delete({ where: { id: requirementId } });
    await logActivity(proposalId, user.id, "EDITED", "Removed a requirement");
    return NextResponse.redirect(url, 303);
  }

  const requirement = formData.get("requirement");
  const delivery = formData.get("delivery");
  if (typeof requirement === "string" && requirement && typeof delivery === "string" && delivery) {
    await prisma.proposalRequirement.update({
      where: { id: requirementId },
      data: { requirement, delivery },
    });
    await logActivity(proposalId, user.id, "EDITED", "Updated a requirement");
  }

  return NextResponse.redirect(url, 303);
}
