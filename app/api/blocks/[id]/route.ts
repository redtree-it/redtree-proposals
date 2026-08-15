import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { blockSchema } from "@/lib/validation/block";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const formData = await request.formData();
  const parsed = blockSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    bodyMarkdown: formData.get("bodyMarkdown"),
  });
  const active = formData.get("active") === "on";

  const blockUrl = new URL(`/blocks/${id}`, request.url);
  if (!parsed.success) {
    blockUrl.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid block.");
    return NextResponse.redirect(blockUrl, 303);
  }

  const existing = await prisma.contentBlock.findUnique({
    where: { id },
    include: { currentVersion: true, versions: { orderBy: { versionNo: "desc" }, take: 1 } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only bump a new version when the actual content changed — title/category/
  // active toggles are metadata, not "content", so they update in place.
  const contentChanged = existing.currentVersion?.bodyMarkdown !== parsed.data.bodyMarkdown;

  await prisma.$transaction(async (tx) => {
    if (contentChanged) {
      const nextVersionNo = (existing.versions[0]?.versionNo ?? 0) + 1;
      const version = await tx.contentBlockVersion.create({
        data: {
          blockId: id,
          versionNo: nextVersionNo,
          bodyMarkdown: parsed.data.bodyMarkdown,
          createdById: user.id,
        },
      });
      await tx.contentBlock.update({
        where: { id },
        data: {
          title: parsed.data.title,
          category: parsed.data.category,
          active,
          currentVersionId: version.id,
        },
      });
    } else {
      await tx.contentBlock.update({
        where: { id },
        data: { title: parsed.data.title, category: parsed.data.category, active },
      });
    }
  });

  blockUrl.searchParams.set("saved", "1");
  return NextResponse.redirect(blockUrl, 303);
}
