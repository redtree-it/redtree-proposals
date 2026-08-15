import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { proposalUpdateSchema } from "@/lib/validation/proposal";
import { logActivity } from "@/lib/proposal-activity";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const formData = await request.formData();
  const parsed = proposalUpdateSchema.safeParse({
    title: formData.get("title"),
    status: formData.get("status"),
    validUntil: formData.get("validUntil"),
    whatWeHeard: formData.get("whatWeHeard"),
    recommendation: formData.get("recommendation"),
    vatNoteOverride: formData.get("vatNoteOverride"),
  });

  const url = new URL(`/proposals/${id}`, request.url);
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid proposal.");
    return NextResponse.redirect(url, 303);
  }

  const existing = await prisma.proposal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.proposal.update({ where: { id }, data: parsed.data });

  if (parsed.data.status !== existing.status) {
    await logActivity(id, user.id, "STATUS_CHANGED", `${existing.status} → ${parsed.data.status}`);
  } else {
    await logActivity(id, user.id, "EDITED", "Updated proposal details");
  }

  url.searchParams.set("saved", "1");
  return NextResponse.redirect(url, 303);
}
