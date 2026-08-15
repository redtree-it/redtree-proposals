import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { proposalCreateSchema } from "@/lib/validation/proposal";
import { logActivity } from "@/lib/proposal-activity";
import { getCompanySettings } from "@/lib/company-settings";

export async function POST(request: NextRequest) {
  const user = await requireUser();

  const formData = await request.formData();
  const parsed = proposalCreateSchema.safeParse({
    clientId: formData.get("clientId"),
    newClientName: formData.get("newClientName"),
    title: formData.get("title"),
    templateId: formData.get("templateId"),
  });

  const newUrl = new URL("/proposals/new", request.url);
  if (!parsed.success) {
    newUrl.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid proposal.");
    return NextResponse.redirect(newUrl, 303);
  }

  const clientId = parsed.data.clientId
    ? parsed.data.clientId
    : (await prisma.client.create({ data: { name: parsed.data.newClientName! } })).id;

  const settings = await getCompanySettings();
  const validUntil = new Date(Date.now() + settings.defaultValidityDays * 24 * 60 * 60 * 1000);

  const templateBlocks = parsed.data.templateId
    ? await prisma.templateBlock.findMany({
        where: { templateId: parsed.data.templateId },
        orderBy: { sortOrder: "asc" },
        include: { block: { include: { currentVersion: true } } },
      })
    : [];

  const proposal = await prisma.proposal.create({
    data: {
      clientId,
      title: parsed.data.title,
      templateId: parsed.data.templateId,
      validUntil,
      createdById: user.id,
      blocks: {
        create: templateBlocks
          .filter((tb) => tb.block.currentVersion)
          .map((tb, index) => ({
            sourceBlockId: tb.blockId,
            sourceVersionId: tb.block.currentVersionId!,
            title: tb.block.title,
            bodyMarkdown: tb.block.currentVersion!.bodyMarkdown,
            sortOrder: index,
          })),
      },
    },
  });

  await logActivity(proposal.id, user.id, "CREATED", parsed.data.templateId ? "Created from template" : "Created blank");

  return NextResponse.redirect(new URL(`/proposals/${proposal.id}`, request.url), 303);
}
