import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { pricingLineUpdateSchema } from "@/lib/validation/proposal";
import { poundsToPence } from "@/lib/validation/price-book";
import { logActivity } from "@/lib/proposal-activity";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const user = await requireUser();
  const { id: proposalId, lineId } = await params;
  const url = new URL(`/proposals/${proposalId}`, request.url);

  const existing = await prisma.proposalPricingLine.findUnique({ where: { id: lineId } });
  if (!existing || existing.proposalId !== proposalId) {
    return NextResponse.redirect(url, 303);
  }

  const formData = await request.formData();
  if (formData.get("action") === "delete") {
    await prisma.proposalPricingLine.delete({ where: { id: lineId } });
    await logActivity(proposalId, user.id, "EDITED", `Removed pricing line "${existing.name}"`);
    return NextResponse.redirect(url, 303);
  }

  const parsed = pricingLineUpdateSchema.safeParse({
    quantity: formData.get("quantity"),
    unitPricePounds: formData.get("unitPricePounds"),
    optional: formData.get("optional") === "on",
  });
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid pricing line.");
    return NextResponse.redirect(url, 303);
  }

  await prisma.proposalPricingLine.update({
    where: { id: lineId },
    data: {
      quantity: parsed.data.quantity,
      unitPricePence: poundsToPence(parsed.data.unitPricePounds),
      optional: parsed.data.optional,
    },
  });
  await logActivity(proposalId, user.id, "EDITED", `Updated pricing line "${existing.name}"`);

  return NextResponse.redirect(url, 303);
}
