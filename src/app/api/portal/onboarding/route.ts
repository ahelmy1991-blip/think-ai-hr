import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface EmpRow {
  id: string; name: string; email: string; role: string; level: string;
  department: string; isExpat: boolean; status: string; startDate: string;
}

interface ChecklistRow {
  id: string; employeeId: string; phase: string; items: unknown;
  createdAt: string; updatedAt: string;
}

// Default checklists seeded when an employee has none
const DEFAULT_CHECKLISTS = [
  {
    phase: "preboarding",
    items: [
      { id: "pb1", label: "Sign employment contract", owner: "employee", done: false, doneAt: null, doneBy: null, required: true },
      { id: "pb2", label: "Complete PRO documentation (Iqama / work permit for expats)", owner: "pro", done: false, doneAt: null, doneBy: null, expatOnly: true },
      { id: "pb3", label: "IT account provisioning (email, Slack, Jira)", owner: "it", done: false, doneAt: null, doneBy: null, required: true },
      { id: "pb4", label: "Welcome kit sent / collected", owner: "people", done: false, doneAt: null, doneBy: null },
      { id: "pb5", label: "Review offer letter & benefits summary", owner: "employee", done: false, doneAt: null, doneBy: null, required: true },
      { id: "pb6", label: "Confirm first-day logistics with manager", owner: "manager", done: false, doneAt: null, doneBy: null },
    ],
  },
  {
    phase: "week1",
    items: [
      { id: "w1a", label: "Complete THINK-AI induction & culture session", owner: "people", done: false, doneAt: null, doneBy: null, required: true },
      { id: "w1b", label: "Meet your direct team and key stakeholders", owner: "manager", done: false, doneAt: null, doneBy: null },
      { id: "w1c", label: "Set up all required system access (HRMS, VPN, tools)", owner: "it", done: false, doneAt: null, doneBy: null, required: true },
      { id: "w1d", label: "Review HR policies: leave, code of conduct, data privacy", owner: "employee", done: false, doneAt: null, doneBy: null, required: true },
      { id: "w1e", label: "First 1:1 with manager — set 30-day expectations", owner: "manager", done: false, doneAt: null, doneBy: null },
      { id: "w1f", label: "Complete mandatory compliance training", owner: "employee", done: false, doneAt: null, doneBy: null, required: true },
    ],
  },
  {
    phase: "day30",
    items: [
      { id: "d30a", label: "30-day check-in meeting with People team", owner: "people", done: false, doneAt: null, doneBy: null },
      { id: "d30b", label: "First project / deliverable milestone achieved", owner: "employee", done: false, doneAt: null, doneBy: null },
      { id: "d30c", label: "Role clarity confirmed — KPIs and OKRs agreed", owner: "manager", done: false, doneAt: null, doneBy: null, required: true },
      { id: "d30d", label: "THINK-AI knowledge base and AI tools orientation complete", owner: "it", done: false, doneAt: null, doneBy: null },
      { id: "d30e", label: "Cross-functional introductions done", owner: "employee", done: false, doneAt: null, doneBy: null },
    ],
  },
  {
    phase: "day60",
    items: [
      { id: "d60a", label: "Mid-probation formal review with manager", owner: "manager", done: false, doneAt: null, doneBy: null, required: true },
      { id: "d60b", label: "Written feedback session completed", owner: "people", done: false, doneAt: null, doneBy: null },
      { id: "d60c", label: "Performance vs. KPIs reviewed and documented", owner: "manager", done: false, doneAt: null, doneBy: null },
      { id: "d60d", label: "Training / development needs identified", owner: "employee", done: false, doneAt: null, doneBy: null },
    ],
  },
  {
    phase: "day90",
    items: [
      { id: "d90a", label: "Probation completion review meeting held", owner: "manager", done: false, doneAt: null, doneBy: null, required: true },
      { id: "d90b", label: "People team probation decision form submitted", owner: "people", done: false, doneAt: null, doneBy: null, required: true },
      { id: "d90c", label: "Employee receives written confirmation / outcome letter", owner: "people", done: false, doneAt: null, doneBy: null },
      { id: "d90d", label: "Benefits enrollment confirmed (GOSI, medical, etc.)", owner: "people", done: false, doneAt: null, doneBy: null },
    ],
  },
];

function parseItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

// GET /api/portal/onboarding?email=...
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const [emp] = await prisma.$queryRawUnsafe<EmpRow[]>(
    `SELECT id, name, email, role, level, department, "isExpat", status, "startDate"::text
     FROM hr_employees
     WHERE lower(email) = lower($1)`, email
  );
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  let rows = await prisma.$queryRawUnsafe<ChecklistRow[]>(
    `SELECT id, "employeeId", phase, items, "createdAt"::text, "updatedAt"::text
     FROM hr_onboarding_checklists
     WHERE "employeeId" = $1
     ORDER BY phase ASC`, emp.id
  );

  // Auto-seed default checklists if none exist
  if (rows.length === 0) {
    for (const tpl of DEFAULT_CHECKLISTS) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_onboarding_checklists (id, "employeeId", phase, items, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3::jsonb, NOW(), NOW())`,
        emp.id,
        tpl.phase,
        JSON.stringify(tpl.items)
      );
    }
    // Re-fetch after seeding
    rows = await prisma.$queryRawUnsafe<ChecklistRow[]>(
      `SELECT id, "employeeId", phase, items, "createdAt"::text, "updatedAt"::text
       FROM hr_onboarding_checklists
       WHERE "employeeId" = $1
       ORDER BY phase ASC`, emp.id
    );
  }

  // Parse items JSONB field (Neon/Prisma may return it as string)
  const checklists = rows.map(cl => ({
    ...cl,
    items: parseItems(cl.items),
  }));

  return NextResponse.json({ employee: emp, checklists });
}

// PATCH /api/portal/onboarding?email=...
export async function PATCH(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { checklistId, items } = await req.json();
  if (!checklistId || !items) return NextResponse.json({ error: "checklistId and items required" }, { status: 400 });

  const [emp] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM hr_employees WHERE lower(email) = lower($1)`, email
  );
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const [cl] = await prisma.$queryRawUnsafe<Array<{ id: string; employeeId: string }>>(
    `SELECT id, "employeeId" FROM hr_onboarding_checklists WHERE id = $1`, checklistId
  );
  if (!cl || cl.employeeId !== emp.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE hr_onboarding_checklists SET items = $1::jsonb, "updatedAt" = NOW() WHERE id = $2`,
    JSON.stringify(items), checklistId
  );

  return NextResponse.json({ ok: true });
}
