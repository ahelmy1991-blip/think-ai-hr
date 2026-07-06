import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

interface AbsenceType {
  id: string; name: string; name_ar: string; category: string;
  max_days_per_year: number; paid_percentage: number; requires_document: boolean;
  saudi_only: boolean; expat_eligible: boolean; description: string;
}

// GET: fetch absence types + employee requests by email
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const email = searchParams.get("email");

  const types = await prisma.$queryRawUnsafe<AbsenceType[]>(
    `SELECT id, name, name_ar, category, max_days_per_year, paid_percentage,
            requires_document, saudi_only, expat_eligible, description
     FROM hr_absence_types WHERE is_active = true ORDER BY name`
  );

  if (!email) return NextResponse.json({ types, requests: [] });

  const requests = await prisma.$queryRawUnsafe<Array<{
    id: string; absence_type_id: string; type_name: string; start_date: string;
    end_date: string; days_requested: number; reason: string; status: string;
    manager_notes: string; createdAt: string;
  }>>(
    `SELECT r.id, r.absence_type_id, t.name AS type_name,
            r.start_date::text, r.end_date::text, r.days_requested,
            r.reason, r.status, r.manager_notes, r."createdAt"
     FROM hr_absence_requests r
     JOIN hr_absence_types t ON t.id = r.absence_type_id
     WHERE lower(r.employee_email) = lower($1)
     ORDER BY r."createdAt" DESC LIMIT 50`,
    email
  );

  // Calculate used days per type in current year
  const year = new Date().getFullYear();
  const usedDays = await prisma.$queryRawUnsafe<Array<{ absence_type_id: string; used: number }>>(
    `SELECT absence_type_id, SUM(days_requested)::int AS used
     FROM hr_absence_requests
     WHERE lower(employee_email) = lower($1)
       AND status = 'approved'
       AND EXTRACT(YEAR FROM start_date) = $2
     GROUP BY absence_type_id`,
    email, year
  );

  return NextResponse.json({ types, requests, usedDays });
}

// POST: submit new absence request
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { employee_name, employee_email, absence_type_id, start_date, end_date,
          days_requested, reason, is_saudi, document_submitted } = body;

  if (!employee_name || !employee_email || !absence_type_id || !start_date || !end_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (days_requested < 1) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  // Check for overlapping requests
  const overlap = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM hr_absence_requests
     WHERE lower(employee_email) = lower($1)
       AND status IN ('pending','approved')
       AND start_date <= $3::date
       AND end_date >= $2::date`,
    employee_email, start_date, end_date
  );
  if (overlap.length > 0) {
    return NextResponse.json({ error: "You already have a request overlapping these dates" }, { status: 409 });
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO hr_absence_requests
     (id, employee_name, employee_email, absence_type_id, start_date, end_date,
      days_requested, reason, is_saudi, document_submitted)
     VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8,$9,$10)`,
    id, employee_name.trim(), employee_email.toLowerCase().trim(), absence_type_id,
    start_date, end_date, Number(days_requested), reason ?? "", Boolean(is_saudi), Boolean(document_submitted)
  );

  return NextResponse.json({ id, status: "pending" });
}
