import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const where = type ? { type } : {};
  const items = await prisma.hrComplianceItem.findMany({
    where,
    orderBy: { dueDate: "asc" },
    include: { employee: { select: { id: true, name: true, isExpat: true } } },
  });

  // Auto-update statuses
  const now = new Date();
  const updatedItems = items.map((item) => {
    if (item.status === "done") return item;
    const daysUntilDue = Math.ceil((item.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status = "pending";
    if (daysUntilDue < 0) status = "overdue";
    else if (daysUntilDue <= 7) status = "at_risk";
    return { ...item, status };
  });

  return NextResponse.json(updatedItems);
}

export async function POST(req: NextRequest) {
  try {
    const { type, title, employeeId, dueDate, notes } = await req.json();
    if (!type || !title || !dueDate) {
      return NextResponse.json({ error: "type, title, dueDate required" }, { status: 400 });
    }
    const item = await prisma.hrComplianceItem.create({
      data: {
        type, title,
        employeeId: employeeId || null,
        dueDate: new Date(dueDate),
        notes: notes || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
