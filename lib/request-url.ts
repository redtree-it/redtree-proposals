import type { NextRequest } from "next/server";

// Behind a reverse proxy (Render, and most PaaS hosts), request.url reflects
// the app's own internal address (e.g. http://localhost:10000, the port the
// container actually listens on) rather than the public origin the visitor
// used — the proxy sets X-Forwarded-Host/-Proto instead, so prefer those when
// present. Falls back to request.url for local dev, where there's no proxy.
export function absoluteUrl(request: NextRequest, path: string): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const base = forwardedHost ? `${forwardedProto ?? "https"}://${forwardedHost}` : request.url;
  return new URL(path, base);
}
