import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { saveUpload, UnsupportedFileTypeError } from "@/lib/uploads";
import { absoluteUrl } from "@/lib/request-url";

const schema = z.object({
  companyName: z.string().min(1),
  addressLine: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  website: z.string().min(1),
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
  vatNoteText: z.string().min(1),
});

export async function POST(request: NextRequest) {
  await requireAdmin();

  const formData = await request.formData();
  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
    addressLine: formData.get("addressLine"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    website: formData.get("website"),
    defaultValidityDays: formData.get("defaultValidityDays"),
    vatNoteText: formData.get("vatNoteText"),
  });

  const settingsUrl = absoluteUrl(request, "/admin/settings");
  if (!parsed.success) {
    settingsUrl.searchParams.set("error", "Please fill in all fields correctly.");
    return NextResponse.redirect(settingsUrl, 303);
  }

  const logo = formData.get("logo");
  let logoPath: string | undefined;
  if (logo instanceof File && logo.size > 0) {
    try {
      logoPath = await saveUpload(logo);
    } catch (error) {
      if (error instanceof UnsupportedFileTypeError) {
        settingsUrl.searchParams.set("error", "Logo must be a PNG or JPG image.");
        return NextResponse.redirect(settingsUrl, 303);
      }
      throw error;
    }
  }

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: { ...parsed.data, ...(logoPath ? { logoPath } : {}) },
    create: { id: "singleton", ...parsed.data, ...(logoPath ? { logoPath } : {}) },
  });

  settingsUrl.searchParams.set("saved", "1");
  return NextResponse.redirect(settingsUrl, 303);
}
