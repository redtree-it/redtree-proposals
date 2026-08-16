import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { poundsToPence, priceBookItemSchema } from "@/lib/validation/price-book";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const formData = await request.formData();
  const parsed = priceBookItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    unitPricePounds: formData.get("unitPricePounds"),
    unitType: formData.get("unitType"),
    category: formData.get("category"),
    defaultIncluded: formData.get("defaultIncluded") === "on",
  });
  const active = formData.get("active") === "on";

  const url = absoluteUrl(request, `/price-book/${id}`);
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid price book item.");
    return NextResponse.redirect(url, 303);
  }

  await prisma.priceBookItem.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      unitPricePence: poundsToPence(parsed.data.unitPricePounds),
      unitType: parsed.data.unitType,
      category: parsed.data.category,
      defaultIncluded: parsed.data.defaultIncluded,
      active,
    },
  });

  url.searchParams.set("saved", "1");
  return NextResponse.redirect(url, 303);
}
