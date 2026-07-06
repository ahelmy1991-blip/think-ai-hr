import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COOKIE_OPTS = (prod: boolean) => ({
  httpOnly: true,
  secure: prod,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
});

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword     = process.env.ADMIN_PASSWORD;
  const colleaguePassword = process.env.COLLEAGUE_PASSWORD;
  const prod              = process.env.NODE_ENV === "production";

  // Dev mode — no passwords configured
  if (!adminPassword && !colleaguePassword) {
    const res = NextResponse.json({ ok: true, role: "admin" });
    res.cookies.set("think-ai-auth", "dev", COOKIE_OPTS(prod));
    return res;
  }

  if (adminPassword && password === adminPassword) {
    const res = NextResponse.json({ ok: true, role: "admin" });
    res.cookies.set("think-ai-auth", adminPassword, COOKIE_OPTS(prod));
    return res;
  }

  if (colleaguePassword && password === colleaguePassword) {
    const res = NextResponse.json({ ok: true, role: "colleague" });
    res.cookies.set("think-ai-colleague", colleaguePassword, COOKIE_OPTS(prod));
    return res;
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("think-ai-auth");
  res.cookies.delete("think-ai-colleague");
  return res;
}
