import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSessionToken, SESSION_COOKIE } from "@/lib/session";

// Optimistic check only (cookie signature verify, no DB hit) — the real
// enforcement is requireUser()/requireAdmin() in lib/session.ts, called by
// every protected page and route handler.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth/");
  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = await decryptSessionToken(token);

  if (!sessionId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
