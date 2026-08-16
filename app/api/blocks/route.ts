import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { blockSchema } from "@/lib/validation/block";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest) {
  const user = await requireUser();

  const formData = await request.formData();
  const parsed = blockSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    bodyMarkdown: formData.get("bodyMarkdown"),
  });

  const blocksUrl = absoluteUrl(request, "/blocks");
  if (!parsed.success) {
    blocksUrl.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid block.");
    return NextResponse.redirect(blocksUrl, 303);
  }

  const maxSortOrder = await prisma.contentBlock.aggregate({ _max: { sortOrder: true } });

  const block = await prisma.contentBlock.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      versions: {
        create: {
          versionNo: 1,
          bodyMarkdown: parsed.data.bodyMarkdown,
          createdById: user.id,
        },
      },
    },
    include: { versions: true },
  });

  await prisma.contentBlock.update({
    where: { id: block.id },
    data: { currentVersionId: block.versions[0].id },
  });

  return NextResponse.redirect(absoluteUrl(request, `/blocks/${block.id}`), 303);
}
