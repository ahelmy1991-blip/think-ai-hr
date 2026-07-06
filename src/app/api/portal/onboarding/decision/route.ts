import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/portal/onboarding/decision
// Body: { email, decision: "confirm"|"extend"|"terminate", notes?, new_end_date? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, decision, notes, new_end_date } = body;

    if (!email || !decision) {
      return NextResponse.json({ error: "email and decision are required" }, { status: 400 });
    }
    if (!["confirm", "extend", "terminate"].includes(decision)) {
      return NextResponse.json({ error: "decision must be confirm, extend, or terminate" }, { status: 400 });
    }

    const [emp] = await prisma.$queryRawUnsafe<Array<{ id: string; name: string; status: string }>>(
      `SELECT id, name, status FROM hr_employees WHERE lower(email) = lower($1)`, email
    );
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    // Map decision to new status
    const statusMap: Record<string, string> = {
      confirm: "active",
      extend: "probation_extended",
      terminate: "terminated",
    };
    const newStatus = statusMap[decision];

    // Update employee status
    await prisma.$executeRawUnsafe(
      `UPDATE hr_employees SET status = $1, "updatedAt" = NOW() WHERE id = $2`,
      newStatus, emp.id
    );

    // If extending, update contract end date
    if (decision === "extend" && new_end_date) {
      await prisma.$executeRawUnsafe(
        `UPDATE hr_contracts SET end_date = $1, "updatedAt" = NOW()
         WHERE employee_id = $2 AND status != 'terminated'
         ORDER BY "createdAt" DESC
         LIMIT 1`,
        new_end_date, emp.id
      );
    }

    // Store the decision as a special checklist phase entry for audit trail
    const decisionRecord = {
      decision,
      notes: notes ?? null,
      new_end_date: new_end_date ?? null,
      decidedAt: new Date().toISOString(),
    };

    // Upsert a "probation_decision" phase checklist row as audit record
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM hr_onboarding_checklists
       WHERE "employeeId" = $1 AND phase = 'probation_decision'`, emp.id
    );
    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE hr_onboarding_checklists
         SET items = $1::jsonb, "updatedAt" = NOW()
         WHERE "employeeId" = $2 AND phase = 'probation_decision'`,
        JSON.stringify([decisionRecord]), emp.id
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_onboarding_checklists (id, "employeeId", phase, items, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'probation_decision', $2::jsonb, NOW(), NOW())`,
        emp.id, JSON.stringify([decisionRecord])
      );
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/portal/onboarding/decision:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
