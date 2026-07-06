import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { status, manager_notes, approved_by } = await req.json();
  await prisma.$executeRawUnsafe(
    `UPDATE hr_absence_requests
     SET status=$1, manager_notes=$2, approved_by=$3,
         approved_at=CASE WHEN $1 IN ('approved','rejected') THEN NOW() ELSE NULL END,
         "updatedAt"=NOW()
     WHERE id=$4`,
    status, manager_notes ?? null, approved_by ?? "HR Admin", params.id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM hr_absence_requests WHERE id=$1`, params.id);
  return NextResponse.json({ ok: true });
}
