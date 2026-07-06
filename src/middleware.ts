import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/test", "/api/test"];

// Only admins can reach these prefixes
const ADMIN_ONLY_PREFIXES = [
  "/admin", "/employees", "/compliance", "/recruitment",
  "/settings", "/onboarding", "/agents", "/company",
  "/policies", "/chat",
  "/api/admin", "/api/employees", "/api/compliance", "/api/recruitment",
  "/api/agents", "/api/onboarding", "/api/notion", "/api/stats", "/api/chat",
];

// Colleagues (and admins) can reach these prefixes
const PORTAL_PREFIXES = ["/portal", "/api/portal"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const adminPassword     = process.env.ADMIN_PASSWORD ?? "";
  const colleaguePassword = process.env.COLLEAGUE_PASSWORD ?? "";

  // If neither password is configured → dev mode, allow everything
  if (!adminPassword && !colleaguePassword) return NextResponse.next();

  const adminToken     = req.cookies.get("think-ai-auth")?.value ?? "";
  const colleagueToken = req.cookies.get("think-ai-colleague")?.value ?? "";

  const isAdmin     = !!adminPassword     && adminToken     === adminPassword;
  const isColleague = !!colleaguePassword && colleagueToken === colleaguePassword;

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  const portalUrl = new URL("/portal", req.url);

  // Portal paths: colleague OR admin allowed
  if (PORTAL_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!isAdmin && !isColleague) return NextResponse.redirect(loginUrl);
    return NextResponse.next();
  }

  // Admin-only paths
  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (isAdmin) return NextResponse.next();
    if (isColleague) return NextResponse.redirect(portalUrl);
    return NextResponse.redirect(loginUrl);
  }

  // Everything else (root "/") — admin only
  if (!isAdmin) {
    if (isColleague) return NextResponse.redirect(portalUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
