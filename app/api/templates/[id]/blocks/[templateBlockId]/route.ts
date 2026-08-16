import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; templateBlockId: string }> }
) {
  await requireUser();
  const { id: templateId, templateBlockId } = await params;
  const url = absoluteUrl(request, `/templates/${templateId}`);

  const formData = await request.formData();
  const action = formData.get("action");

  const current = await prisma.templateBlock.findUnique({ where: { id: templateBlockId } });
  if (!current || current.templateId !== templateId) {
    return NextResponse.redirect(url, 303);
  }

  if (action === "remove") {
    await prisma.templateBlock.delete({ where: { id: templateBlockId } });
    return NextResponse.redirect(url, 303);
  }

  if (action === "move_up" || action === "move_down") {
    const direction = action === "move_up" ? "desc" : "asc";
    const comparator = action === "move_up" ? { lt: current.sortOrder } : { gt: current.sortOrder };
    const neighbor = await prisma.templateBlock.findFirst({
      where: { templateId, sortOrder: comparator },
      orderBy: { sortOrder: direction },
    });
    if (neighbor) {
      await prisma.$transaction([
        prisma.templateBlock.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
        prisma.templateBlock.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
      ]);
    }
  }

  return NextResponse.redirect(url, 303);
}
