import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const employee = await prisma.hrEmployee.findUnique({
    where: { id: params.id },
    include: {
      checklists: { orderBy: { phase: "asc" } },
      complianceItems: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const allowed = ["name", "role", "level", "department", "isExpat", "nationality", "startDate", "status", "iqamaExpiry", "notes"];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in body) {
        if (k === "startDate" || k === "iqamaExpiry") data[k] = body[k] ? new Date(body[k]) : null;
        else data[k] = body[k];
      }
    }
    const updated = await prisma.hrEmployee.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.hrEmployee.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
