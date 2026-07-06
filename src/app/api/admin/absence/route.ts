import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status     = searchParams.get("status") ?? "";
  const type       = searchParams.get("type") ?? "";
  const email      = searchParams.get("email") ?? "";
  const year       = searchParams.get("year") ?? String(new Date().getFullYear());

  let where = `WHERE EXTRACT(YEAR FROM r.start_date) = $1`;
  const args: (string | number)[] = [Number(year)];
  let i = 2;

  if (status) { where += ` AND r.status = $${i++}`; args.push(status); }
  if (type)   { where += ` AND r.absence_type_id = $${i++}`; args.push(type); }
  if (email)  { where += ` AND lower(r.employee_email) LIKE lower($${i++})`; args.push(`%${email}%`); }

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string; employee_name: string; employee_email: string;
    type_name: string; category: string; start_date: string; end_date: string;
    days_requested: number; reason: string; status: string; is_saudi: boolean;
    document_submitted: boolean; manager_notes: string | null;
    approved_by: string | null; approved_at: string | null; createdAt: string;
  }>>(
    `SELECT r.id, r.employee_name, r.employee_email,
            t.name AS type_name, t.category,
            r.start_date::text, r.end_date::text, r.days_requested,
            r.reason, r.status, r.is_saudi, r.document_submitted,
            r.manager_notes, r.approved_by, r.approved_at::text, r."createdAt"
     FROM hr_absence_requests r
     JOIN hr_absence_types t ON t.id = r.absence_type_id
     ${where}
     ORDER BY r."createdAt" DESC`,
    ...args
  );

  // Summary stats
  const stats = await prisma.$queryRawUnsafe<Array<{ status: string; cnt: number; days: number }>>(
    `SELECT status, COUNT(*)::int AS cnt, COALESCE(SUM(days_requested),0)::int AS days
     FROM hr_absence_requests
     WHERE EXTRACT(YEAR FROM start_date) = $1
     GROUP BY status`,
    Number(year)
  );

  // Types for filter dropdown
  const types = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
    `SELECT id, name FROM hr_absence_types WHERE is_active = true ORDER BY name`
  );

  return NextResponse.json({ rows, stats, types });
}
