import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/proposal-activity";
import { getCompanySettings } from "@/lib/company-settings";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: proposalId } = await params;

  const source = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: { blocks: true, requirements: true, pricingLines: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const targetClientId = formData.get("clientId");
  const clientId = typeof targetClientId === "string" && targetClientId ? targetClientId : source.clientId;

  const settings = await getCompanySettings();
  const validUntil = new Date(Date.now() + settings.defaultValidityDays * 24 * 60 * 60 * 1000);

  const copy = await prisma.proposal.create({
    data: {
      clientId,
      title: `${source.title} (copy)`,
      templateId: source.templateId,
      validUntil,
      whatWeHeard: source.whatWeHeard,
      recommendation: source.recommendation,
      vatNoteOverride: source.vatNoteOverride,
      createdById: user.id,
      blocks: {
        create: source.blocks.map((b) => ({
          sourceBlockId: b.sourceBlockId,
          sourceVersionId: b.sourceVersionId,
          title: b.title,
          bodyMarkdown: b.bodyMarkdown,
          overridden: b.overridden,
          sortOrder: b.sortOrder,
        })),
      },
      requirements: {
        create: source.requirements.map((r) => ({
          requirement: r.requirement,
          delivery: r.delivery,
          sortOrder: r.sortOrder,
        })),
      },
      pricingLines: {
        create: source.pricingLines.map((line) => ({
          priceBookItemId: line.priceBookItemId,
          name: line.name,
          description: line.description,
          unitPricePence: line.unitPricePence,
          unitType: line.unitType,
          quantity: line.quantity,
          category: line.category,
          optional: line.optional,
          sortOrder: line.sortOrder,
        })),
      },
    },
  });

  await logActivity(copy.id, user.id, "DUPLICATED", `Duplicated from "${source.title}"`);

  return NextResponse.redirect(new URL(`/proposals/${copy.id}`, request.url), 303);
}
