import { NextRequest, NextResponse } from "next/server";
import { readUpload } from "@/lib/uploads";
import { requireUser } from "@/lib/session";

const SAFE_FILENAME = /^[a-f0-9-]+\.(png|jpg)$/i;

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  await requireUser();

  const { filename } = await params;
  if (!SAFE_FILENAME.test(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const bytes = await readUpload(filename);
    const ext = filename.split(".").pop()!.toLowerCase();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
