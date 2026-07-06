import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, title, department, team, location, avatar_url, linkedin_url, bio, email, start_year, sort_order, is_active } = await req.json();
  await prisma.$executeRawUnsafe(
    `UPDATE hr_directory SET name=$1, title=$2, department=$3, team=$4, location=$5,
     avatar_url=$6, linkedin_url=$7, bio=$8, email=$9, start_year=$10, sort_order=$11,
     is_active=$12, "updatedAt"=NOW() WHERE id=$13`,
    name, title, department ?? "", team ?? null, location ?? "Riyadh, KSA",
    avatar_url ?? null, linkedin_url ?? null, bio ?? null, email ?? null,
    start_year ? Number(start_year) : null, sort_order ? Number(sort_order) : 0,
    is_active ?? true, params.id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM hr_directory WHERE id=$1`, params.id);
  return NextResponse.json({ ok: true });
}
