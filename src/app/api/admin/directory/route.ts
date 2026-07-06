import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; name: string; title: string; department: string; team: string | null;
      location: string; avatar_url: string | null; linkedin_url: string | null;
      bio: string | null; email: string | null; start_year: number | null;
      sort_order: number; is_active: boolean;
    }>>(
      `SELECT id, name, title, department, team, location,
              avatar_url, linkedin_url, bio, email, start_year, sort_order, is_active
       FROM hr_directory ORDER BY sort_order ASC, name ASC`
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, title, department, team, location, avatar_url, linkedin_url, bio, email, start_year, sort_order } = body;
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO hr_directory (id, name, title, department, team, location, avatar_url, linkedin_url, bio, email, start_year, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    id, name, title, department ?? "", team ?? null, location ?? "Riyadh, KSA",
    avatar_url ?? null, linkedin_url ?? null, bio ?? null, email ?? null,
    start_year ? Number(start_year) : null, sort_order ? Number(sort_order) : 0
  );
  return NextResponse.json({ id });
}
