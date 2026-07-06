import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const bands = await prisma.$queryRawUnsafe<Array<{
      id: string; grade: string; track: string; midpoint_sar: number;
      equity_pct: number; label: string | null; active: boolean;
    }>>(
      `SELECT id, grade, track, midpoint_sar::int, equity_pct::float, label, active
       FROM hr_salary_bands WHERE active = true
       ORDER BY (regexp_replace(grade, '[^0-9]', '', 'g'))::int, track`
    );
    return NextResponse.json(bands);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const { grade, track, midpoint_sar, equity_pct, label } = await req.json();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO hr_salary_bands (id, grade, track, midpoint_sar, equity_pct, label)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    id, grade, track, Number(midpoint_sar), Number(equity_pct), label ?? null
  );
  return NextResponse.json({ id });
}
