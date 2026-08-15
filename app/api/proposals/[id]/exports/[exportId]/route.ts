import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { readExport } from "@/lib/exports";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; exportId: string }> }
) {
  await requireUser();
  const { id: proposalId, exportId } = await params;

  const record = await prisma.proposalExport.findUnique({ where: { id: exportId } });
  if (!record || record.proposalId !== proposalId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readExport(record.filePath);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${record.filename.replace(/"/g, "")}"`,
    },
  });
}
