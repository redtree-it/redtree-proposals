import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { absoluteUrl } from "@/lib/request-url";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
});

export async function POST(request: NextRequest) {
  await requireUser();

  const formData = await request.formData();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  const url = absoluteUrl(request, "/templates");
  if (!parsed.success) {
    url.searchParams.set("error", parsed.error.issues[0]?.message ?? "Invalid template.");
    return NextResponse.redirect(url, 303);
  }

  const template = await prisma.template.create({ data: parsed.data });
  return NextResponse.redirect(absoluteUrl(request, `/templates/${template.id}`), 303);
}
