import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

// CSV columns: name, email, role, level, department, isExpat, nationality, startDate, iqamaExpiry, notes
// isExpat: true/false/yes/no/1/0

function parseBoolean(val: string): boolean {
  return ["true", "yes", "1"].includes((val ?? "").toLowerCase().trim());
}

function parseRow(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => { row[h.trim().toLowerCase()] = (values[i] ?? "").trim(); });
  return row;
}

function parseCSV(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      // Handle quoted fields
      const result: string[] = [];
      let current = "";
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === "," && !inQuote) { result.push(current); current = ""; }
        else { current += ch; }
      }
      result.push(current);
      return result;
    });
}

const ONBOARDING_PHASES = [
  { phase: "preboarding", label: "Pre-boarding", days: "Before Day 1", items: [
    { label: "Qiwa contract generated and e-signed", owner: "people" },
    { label: "Documents collected (ID, certificates, photo, IBAN)", owner: "people" },
    { label: "IT accounts provisioned and laptop prepared", owner: "it" },
    { label: "Buddy assigned and 30/60/90 plan drafted by manager", owner: "manager" },
    { label: "Welcome pack sent", owner: "people" },
    { label: "GOSI and WPS cycle set up", owner: "people" },
  ]},
  { phase: "week1", label: "Week 1", days: "Days 1–7", items: [
    { label: "Welcome, workspace setup and IT access confirmed", owner: "it" },
    { label: "Compliance walkthrough: contract, probation, leave, CoC, IP", owner: "people" },
    { label: "Values module: Ownership, Agility, Impact, Craft", owner: "manager" },
    { label: "Manager 1:1 on role purpose and 30/60/90 goals", owner: "manager" },
    { label: "Buddy and team introductions", owner: "employee" },
    { label: "Security and data-handling basics completed", owner: "it" },
  ]},
  { phase: "day30", label: "Day 30 Review", days: "Day 30", items: [
    { label: "Productive on core tools and stack", owner: "employee" },
    { label: "30/60/90 goals documented and aligned", owner: "manager" },
    { label: "Required compliance training completed", owner: "employee" },
    { label: "30-day check-in documented by manager", owner: "manager" },
  ]},
  { phase: "day60", label: "Day 60 Review", days: "Day 60", items: [
    { label: "Owns at least one deliverable end-to-end", owner: "employee" },
    { label: "Mid-probation review documented", owner: "manager" },
    { label: "Feedback shared and development goal set", owner: "manager" },
  ]},
  { phase: "day90", label: "Day 90 Review", days: "Day 90", items: [
    { label: "At role expectations — probation decision documented", owner: "manager" },
    { label: "OKRs set for the current half", owner: "employee" },
    { label: "GOSI and payroll confirmed correct", owner: "people" },
  ]},
];

async function createEmployeeWithOnboarding(row: Record<string, string>): Promise<string> {
  const name = row["name"];
  const email = row["email"];
  const role = row["role"] || row["title"] || "Team Member";
  const level = row["level"] || "L6";
  const department = row["department"] || "Engineering";
  const isExpat = parseBoolean(row["isexpat"] || row["is_expat"] || "false");
  const nationality = row["nationality"] || (isExpat ? "" : "Saudi Arabia");
  const startDate = row["startdate"] || row["start_date"] || row["startdate"] || new Date().toISOString().split("T")[0];
  const iqamaExpiry = row["iqamaexpiry"] || row["iqama_expiry"] || row["iqamaexpiry"] || null;
  const notes = row["notes"] || null;

  if (!name || !email) throw new Error(`Missing name or email`);
  if (!startDate || isNaN(new Date(startDate).getTime())) throw new Error(`Invalid startDate: "${startDate}"`);

  const employee = await prisma.hrEmployee.create({
    data: {
      name, email, role, level, department, isExpat,
      nationality: nationality || null,
      startDate: new Date(startDate),
      iqamaExpiry: iqamaExpiry && !isNaN(new Date(iqamaExpiry).getTime()) ? new Date(iqamaExpiry) : null,
      notes,
      status: "probation",
    },
  });

  // Create onboarding checklists
  for (const phase of ONBOARDING_PHASES) {
    const items = phase.items
      .filter((it) => !("expatOnly" in it) || isExpat)
      .map((it) => ({ label: it.label, owner: it.owner, done: false }));
    if (items.length > 0) {
      await prisma.hrOnboardingChecklist.create({
        data: { employeeId: employee.id, phase: phase.phase, items },
      });
    }
  }

  // Create compliance items
  const start = new Date(startDate);
  await prisma.hrComplianceItem.createMany({
    data: [
      { type: "probation_review", title: `${name} — 30-day probation review`, employeeId: employee.id, dueDate: new Date(start.getTime() + 30 * 86400000) },
      { type: "probation_review", title: `${name} — 60-day probation review`, employeeId: employee.id, dueDate: new Date(start.getTime() + 60 * 86400000) },
      { type: "probation_decision", title: `${name} — Probation decision (before day 180)`, employeeId: employee.id, dueDate: new Date(start.getTime() + 170 * 86400000) },
    ],
  });

  if (isExpat && iqamaExpiry && !isNaN(new Date(iqamaExpiry).getTime())) {
    await prisma.hrComplianceItem.create({
      data: { type: "iqama_renewal", title: `${name} — Iqama renewal`, employeeId: employee.id, dueDate: new Date(new Date(iqamaExpiry).getTime() - 3 * 86400000) },
    });
  }

  return employee.id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { csv?: string; filename?: string };
    const { csv, filename } = body;

    if (!csv?.trim()) {
      return NextResponse.json({ error: "csv field required" }, { status: 400 });
    }

    const rows = parseCSV(csv.trim());
    if (rows.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      if (dataRows[i].every((cell) => !cell.trim())) continue; // skip blank rows
      try {
        const row = parseRow(headers, dataRows[i]);
        await createEmployeeWithOnboarding(row);
        created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Row ${i + 2}: ${msg}`);
      }
    }

    // Log the upload
    const logId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_upload_logs (id, filename, "totalRows", created, failed, errors) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      logId, filename ?? null, dataRows.length, created, errors.length, JSON.stringify(errors)
    );

    return NextResponse.json({ created, failed: errors.length, total: dataRows.length, errors });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  const logs = await prisma.$queryRawUnsafe<Array<{
    id: string; filename: string | null; totalRows: number; created: number; failed: number; createdAt: Date;
  }>>(`SELECT id, filename, "totalRows", created, failed, "createdAt" FROM hr_upload_logs ORDER BY "createdAt" DESC LIMIT 20`);
  return NextResponse.json(logs);
}
