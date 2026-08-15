import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "USER"]),
});

export async function POST(request: NextRequest) {
  await requireAdmin();

  const formData = await request.formData();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  const usersUrl = new URL("/admin/users", request.url);
  if (!parsed.success) {
    usersUrl.searchParams.set(
      "error",
      "Please fill in all fields — password must be at least 8 characters."
    );
    return NextResponse.redirect(usersUrl, 303);
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    usersUrl.searchParams.set("error", "A user with that email already exists.");
    return NextResponse.redirect(usersUrl, 303);
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: hashPassword(parsed.data.password),
    },
  });

  usersUrl.searchParams.set("saved", "1");
  return NextResponse.redirect(usersUrl, 303);
}
