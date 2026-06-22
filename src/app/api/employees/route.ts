import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ONBOARDING_PHASES, buildChecklist } from "@/lib/onboarding-items";

export const dynamic = 'force-dynamic';

export async function GET() {
  const employees = await prisma.hrEmployee.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      checklists: true,
      _count: { select: { complianceItems: true } },
    },
  });
  return NextResponse.json(employees);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, level, department, isExpat, nationality, startDate, iqamaExpiry, notes } = body;
    if (!name || !email || !role || !startDate) {
      return NextResponse.json({ error: "name, email, role, startDate required" }, { status: 400 });
    }

    const employee = await prisma.hrEmployee.create({
      data: {
        name, email, role,
        level: level || "L6",
        department: department || "Engineering",
        isExpat: Boolean(isExpat),
        nationality: nationality || null,
        startDate: new Date(startDate),
        iqamaExpiry: iqamaExpiry ? new Date(iqamaExpiry) : null,
        notes: notes || null,
        status: "probation",
      },
    });

    // Auto-create onboarding checklists for all phases
    for (const phase of Object.keys(ONBOARDING_PHASES)) {
      const items = buildChecklist(phase, Boolean(isExpat)).map((item) => ({
        ...item,
        done: false,
        doneAt: null,
        doneBy: null,
      }));
      await prisma.hrOnboardingChecklist.create({
        data: { employeeId: employee.id, phase, items },
      });
    }

    // Auto-create compliance items for this employee
    const now = new Date();
    const complianceItems = [
      {
        type: "probation_review",
        title: `${name} â€” 30-day probation review`,
        employeeId: employee.id,
        dueDate: new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        type: "probation_review",
        title: `${name} â€” 60-day probation review`,
        employeeId: employee.id,
        dueDate: new Date(new Date(startDate).getTime() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        type: "probation_decision",
        title: `${name} â€” Probation decision (before day 180)`,
        employeeId: employee.id,
        dueDate: new Date(new Date(startDate).getTime() + 170 * 24 * 60 * 60 * 1000),
      },
    ];

    if (isExpat && iqamaExpiry) {
      complianceItems.push({
        type: "iqama_renewal",
        title: `${name} â€” Iqama renewal`,
        employeeId: employee.id,
        dueDate: new Date(new Date(iqamaExpiry).getTime() - 3 * 24 * 60 * 60 * 1000),
      });
    }

    await prisma.hrComplianceItem.createMany({ data: complianceItems });

    return NextResponse.json(employee, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
