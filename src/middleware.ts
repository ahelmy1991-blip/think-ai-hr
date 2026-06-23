import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/test", "/api/test"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets and public paths unconditionally
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  // If no password configured, allow everything (dev mode)
  if (!adminPassword) return NextResponse.next();

  const token = req.cookies.get("think-ai-auth")?.value;
  if (token === adminPassword) return NextResponse.next();

  // Not authenticated — redirect to login, preserving destination
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
