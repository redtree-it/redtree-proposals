import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getResolvedProposal } from "@/lib/proposal-validation";
import { applyMergeFields } from "@/lib/merge-fields";
import { computeTotals } from "@/lib/pricing";
import { buildProposalDocx } from "@/lib/docx/buildProposalDocx";
import { readUpload } from "@/lib/uploads";
import { saveExport, sanitizeFilenamePart } from "@/lib/exports";
import { logActivity } from "@/lib/proposal-activity";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const data = await getResolvedProposal(id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const previewUrl = absoluteUrl(request, `/proposals/${id}/preview`);
  if (data.issues.length > 0) {
    previewUrl.searchParams.set("error", "Fix the issues above before exporting.");
    return NextResponse.redirect(previewUrl, 303);
  }

  const { proposal, settings, fields } = data;
  const resolve = (text: string) => applyMergeFields(text, fields).resolved;

  const totals = computeTotals(proposal.pricingLines);

  let logo: { buffer: Buffer; extension: "png" | "jpg" } | null = null;
  if (settings.logoPath) {
    const extension = settings.logoPath.toLowerCase().endsWith(".jpg") ? "jpg" : "png";
    logo = { buffer: await readUpload(settings.logoPath), extension };
  }

  const docxBuffer = await buildProposalDocx({
    clientName: resolve(proposal.client.name),
    proposalTitle: proposal.title,
    validUntilLabel: fields.valid_until ?? "—",
    whatWeHeard: proposal.whatWeHeard ? resolve(proposal.whatWeHeard) : null,
    recommendation: proposal.recommendation ? resolve(proposal.recommendation) : null,
    requirements: proposal.requirements.map((r) => ({
      requirement: resolve(r.requirement),
      delivery: resolve(r.delivery),
    })),
    blocks: proposal.blocks.map((b) => ({ title: resolve(b.title), bodyMarkdown: resolve(b.bodyMarkdown) })),
    coreLines: proposal.pricingLines
      .filter((l) => l.category === "CORE")
      .map((l) => ({ name: l.name, description: l.description, unitPricePence: l.unitPricePence, quantity: l.quantity, optional: l.optional })),
    phase2Lines: proposal.pricingLines
      .filter((l) => l.category === "PHASE_2")
      .map((l) => ({ name: l.name, description: l.description, unitPricePence: l.unitPricePence, quantity: l.quantity, optional: l.optional })),
    coreTotalPence: totals.coreIncludedPence,
    vatNote: proposal.vatNoteOverride || settings.vatNoteText,
    logo,
    company: {
      name: settings.companyName,
      addressLine: settings.addressLine,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
    },
  });

  const storedName = await saveExport(docxBuffer);
  const dateLabel = new Date().toISOString().slice(0, 10);
  const filename = `Redtree Proposal - ${sanitizeFilenamePart(proposal.client.name)} - ${dateLabel}.docx`;

  const lastExport = await prisma.proposalExport.findFirst({
    where: { proposalId: id },
    orderBy: { versionNo: "desc" },
  });
  const versionNo = (lastExport?.versionNo ?? 0) + 1;

  await prisma.proposalExport.create({
    data: { proposalId: id, versionNo, filename, filePath: storedName, createdById: user.id },
  });
  await logActivity(id, user.id, "EXPORTED", filename);

  return new NextResponse(new Uint8Array(docxBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
