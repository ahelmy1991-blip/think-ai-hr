import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, category, content, active } = await req.json();
    await prisma.$executeRawUnsafe(
      `UPDATE hr_knowledge_entries SET title=$1, category=$2, content=$3, active=$4, "updatedAt"=NOW() WHERE id=$5`,
      title, category || "general", content, active !== false, params.id
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM hr_knowledge_entries WHERE id=$1`, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
