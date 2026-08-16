import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  pricingLineCustomSchema,
  pricingLineFromBookSchema,
} from "@/lib/validation/proposal";
import { poundsToPence } from "@/lib/validation/price-book";
import { logActivity } from "@/lib/proposal-activity";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: proposalId } = await params;
  const url = absoluteUrl(request, `/proposals/${proposalId}`);

  const formData = await request.formData();
  const source = formData.get("source");
  const maxSortOrder = await prisma.proposalPricingLine.aggregate({
    where: { proposalId },
    _max: { sortOrder: true },
  });
  const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  if (source === "book") {
    const parsed = pricingLineFromBookSchema.safeParse({
      priceBookItemId: formData.get("priceBookItemId"),
      quantity: formData.get("quantity"),
    });
    if (!parsed.success) {
      url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid pricing line.");
      return NextResponse.redirect(url, 303);
    }

    const item = await prisma.priceBookItem.findUnique({ where: { id: parsed.data.priceBookItemId } });
    if (!item) {
      url.searchParams.set("error", "Price book item not found.");
      return NextResponse.redirect(url, 303);
    }

    await prisma.proposalPricingLine.create({
      data: {
        proposalId,
        priceBookItemId: item.id,
        name: item.name,
        description: item.description,
        unitPricePence: item.unitPricePence,
        unitType: item.unitType,
        quantity: parsed.data.quantity,
        category: item.category,
        optional: !item.defaultIncluded,
        sortOrder: nextSortOrder,
      },
    });
    await logActivity(proposalId, user.id, "EDITED", `Added pricing line "${item.name}"`);
    return NextResponse.redirect(url, 303);
  }

  const parsed = pricingLineCustomSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    unitPricePounds: formData.get("unitPricePounds"),
    unitType: formData.get("unitType"),
    category: formData.get("category"),
    quantity: formData.get("quantity"),
    optional: formData.get("optional") === "on",
  });
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid pricing line.");
    return NextResponse.redirect(url, 303);
  }

  await prisma.proposalPricingLine.create({
    data: {
      proposalId,
      name: parsed.data.name,
      description: parsed.data.description,
      unitPricePence: poundsToPence(parsed.data.unitPricePounds),
      unitType: parsed.data.unitType,
      category: parsed.data.category,
      quantity: parsed.data.quantity,
      optional: parsed.data.optional,
      sortOrder: nextSortOrder,
    },
  });
  await logActivity(proposalId, user.id, "EDITED", `Added custom pricing line "${parsed.data.name}"`);

  return NextResponse.redirect(url, 303);
}
