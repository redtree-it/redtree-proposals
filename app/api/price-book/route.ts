import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { poundsToPence, priceBookItemSchema } from "@/lib/validation/price-book";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest) {
  await requireUser();

  const formData = await request.formData();
  const parsed = priceBookItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    unitPricePounds: formData.get("unitPricePounds"),
    unitType: formData.get("unitType"),
    category: formData.get("category"),
    defaultIncluded: formData.get("defaultIncluded") === "on",
  });

  const url = absoluteUrl(request, "/price-book");
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid price book item.");
    return NextResponse.redirect(url, 303);
  }

  const maxSortOrder = await prisma.priceBookItem.aggregate({ _max: { sortOrder: true } });

  await prisma.priceBookItem.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      unitPricePence: poundsToPence(parsed.data.unitPricePounds),
      unitType: parsed.data.unitType,
      category: parsed.data.category,
      defaultIncluded: parsed.data.defaultIncluded,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.redirect(url, 303);
}
