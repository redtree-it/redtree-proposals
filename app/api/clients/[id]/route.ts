import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { clientSchema } from "@/lib/validation/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const formData = await request.formData();
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    sector: formData.get("sector"),
    userCount: formData.get("userCount"),
    deviceCount: formData.get("deviceCount"),
    notes: formData.get("notes"),
  });

  const clientUrl = new URL(`/clients/${id}`, request.url);
  if (!parsed.success) {
    clientUrl.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid client details.");
    return NextResponse.redirect(clientUrl, 303);
  }

  await prisma.client.update({ where: { id }, data: parsed.data });

  clientUrl.searchParams.set("saved", "1");
  return NextResponse.redirect(clientUrl, 303);
}
