import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { title, body, category, pinned, author } = await req.json();
  await prisma.$executeRawUnsafe(
    `UPDATE hr_announcements SET title=$1, body=$2, category=$3, pinned=$4, author=$5, "updatedAt"=NOW() WHERE id=$6`,
    title, body, category ?? "general", pinned ?? false, author ?? "People Team", params.id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM hr_announcements WHERE id=$1`, params.id);
  return NextResponse.json({ ok: true });
}
