import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { clientSchema } from "@/lib/validation/client";

export async function POST(request: NextRequest) {
  await requireUser();

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

  const clientsUrl = new URL("/clients", request.url);
  if (!parsed.success) {
    clientsUrl.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid client details.");
    return NextResponse.redirect(clientsUrl, 303);
  }

  const client = await prisma.client.create({ data: parsed.data });

  // Inline-create flows (e.g. starting a proposal) want the new client's id back.
  const wantsJson = request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json({ id: client.id, name: client.name });
  }

  return NextResponse.redirect(new URL(`/clients/${client.id}`, request.url), 303);
}
