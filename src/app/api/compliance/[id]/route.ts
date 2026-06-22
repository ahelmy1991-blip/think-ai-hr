import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if ("status" in body) {
      data.status = body.status;
      if (body.status === "done") data.completedAt = new Date();
    }
    if ("notes" in body) data.notes = body.notes;
    if ("dueDate" in body) data.dueDate = new Date(body.dueDate);
    const updated = await prisma.hrComplianceItem.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.hrComplianceItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
