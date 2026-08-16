import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/session";
import { absoluteUrl } from "@/lib/request-url";

export async function POST(request: NextRequest) {
  await deleteSession();
  return NextResponse.redirect(absoluteUrl(request, "/login"), 303);
}
