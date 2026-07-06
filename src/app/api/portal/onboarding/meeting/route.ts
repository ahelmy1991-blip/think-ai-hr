import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface MeetingRecord {
  month: number;
  manager: string;
  date: string;
  notes: string;
  status: "scheduled" | "completed" | "missed";
  createdAt: string;
}

// GET /api/portal/onboarding/meeting?email=...
// Returns all 1:1 meeting records for the employee
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    const [emp] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM hr_employees WHERE lower(email) = lower($1)`, email
    );
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const rows = await prisma.$queryRawUnsafe<Array<{ id: string; items: unknown }>>(
      `SELECT id, items FROM hr_onboarding_checklists
       WHERE "employeeId" = $1 AND phase LIKE 'performance_%'
       ORDER BY phase ASC`, emp.id
    );

    const meetings: MeetingRecord[] = rows.flatMap(row => {
      const items = Array.isArray(row.items)
        ? row.items
        : typeof row.items === "string"
        ? (() => { try { return JSON.parse(row.items as string); } catch { return []; } })()
        : [];
      return items as MeetingRecord[];
    });

    return NextResponse.json({ meetings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/portal/onboarding/meeting:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/portal/onboarding/meeting
// Body: { email, month, manager, date, notes, status? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, month, manager, date, notes, status = "scheduled" } = body;

    if (!email || !month || !manager || !date) {
      return NextResponse.json({ error: "email, month, manager, date are required" }, { status: 400 });
    }

    const [emp] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM hr_employees WHERE lower(email) = lower($1)`, email
    );
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const phase = `performance_m${month}`;
    const record: MeetingRecord = {
      month: parseInt(month),
      manager,
      date,
      notes: notes ?? "",
      status: status as "scheduled" | "completed" | "missed",
      createdAt: new Date().toISOString(),
    };

    // Upsert the performance phase row
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM hr_onboarding_checklists
       WHERE "employeeId" = $1 AND phase = $2`, emp.id, phase
    );

    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE hr_onboarding_checklists
         SET items = $1::jsonb, "updatedAt" = NOW()
         WHERE "employeeId" = $2 AND phase = $3`,
        JSON.stringify([record]), emp.id, phase
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_onboarding_checklists (id, "employeeId", phase, items, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3::jsonb, NOW(), NOW())`,
        emp.id, phase, JSON.stringify([record])
      );
    }

    return NextResponse.json({ ok: true, record });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/portal/onboarding/meeting:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/portal/onboarding/meeting
// Update status/notes for a specific month's 1:1
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, month, status, notes } = body;

    if (!email || !month) {
      return NextResponse.json({ error: "email and month are required" }, { status: 400 });
    }

    const [emp] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM hr_employees WHERE lower(email) = lower($1)`, email
    );
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

    const phase = `performance_m${month}`;
    const [row] = await prisma.$queryRawUnsafe<Array<{ id: string; items: unknown }>>(
      `SELECT id, items FROM hr_onboarding_checklists
       WHERE "employeeId" = $1 AND phase = $2`, emp.id, phase
    );
    if (!row) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });

    const items: MeetingRecord[] = Array.isArray(row.items)
      ? row.items as MeetingRecord[]
      : typeof row.items === "string"
      ? (() => { try { return JSON.parse(row.items as string); } catch { return []; } })()
      : [];

    const updated = items.map((item: MeetingRecord) => ({
      ...item,
      ...(status !== undefined ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
    }));

    await prisma.$executeRawUnsafe(
      `UPDATE hr_onboarding_checklists
       SET items = $1::jsonb, "updatedAt" = NOW()
       WHERE "employeeId" = $2 AND phase = $3`,
      JSON.stringify(updated), emp.id, phase
    );

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("PATCH /api/portal/onboarding/meeting:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
