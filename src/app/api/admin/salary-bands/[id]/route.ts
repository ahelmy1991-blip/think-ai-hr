import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { grade, track, midpoint_sar, equity_pct, label, active } = await req.json();
  await prisma.$executeRawUnsafe(
    `UPDATE hr_salary_bands
     SET grade=$1, track=$2, midpoint_sar=$3, equity_pct=$4, label=$5, active=$6, "updatedAt"=NOW()
     WHERE id=$7`,
    grade, track, Number(midpoint_sar), Number(equity_pct), label ?? null, active ?? true, params.id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM hr_salary_bands WHERE id=$1`, params.id);
  return NextResponse.json({ ok: true });
}
