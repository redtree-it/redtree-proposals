import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

// A relative, same-origin path only — an unchecked `next` value would let an
// attacker craft a login link that redirects a signed-in user off-site.
function safeNextPath(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  const loginUrl = new URL("/login", request.url);
  if (!parsed.success) {
    loginUrl.searchParams.set("error", "Enter a valid email and password.");
    return NextResponse.redirect(loginUrl, 303);
  }

  const { email, password, next } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    loginUrl.searchParams.set("error", "Incorrect email or password.");
    if (next) loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl, 303);
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL(safeNextPath(next), request.url), 303);
}
