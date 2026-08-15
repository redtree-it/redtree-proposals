import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id: templateId } = await params;

  const formData = await request.formData();
  const blockId = formData.get("blockId");
  const url = new URL(`/templates/${templateId}`, request.url);

  if (typeof blockId !== "string" || !blockId) {
    url.searchParams.set("error", "Choose a block to add.");
    return NextResponse.redirect(url, 303);
  }

  const already = await prisma.templateBlock.findUnique({
    where: { templateId_blockId: { templateId, blockId } },
  });
  if (already) {
    url.searchParams.set("error", "That block is already in this template.");
    return NextResponse.redirect(url, 303);
  }

  const maxSortOrder = await prisma.templateBlock.aggregate({
    where: { templateId },
    _max: { sortOrder: true },
  });

  await prisma.templateBlock.create({
    data: { templateId, blockId, sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1 },
  });

  return NextResponse.redirect(url, 303);
}
