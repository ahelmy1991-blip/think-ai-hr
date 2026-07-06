import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action") ?? "";
  const search = searchParams.get("search") ?? "";

  let where = "WHERE 1=1";
  const args: unknown[] = [];
  let i = 1;
  if (action) { where += ` AND action = $${i++}`; args.push(action); }
  if (search) { where += ` AND (lower(full_name_english) LIKE lower($${i++}) OR lower(work_email) LIKE lower($${i++}) OR employee_staff_id LIKE $${i++})`; args.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT * FROM hr_medical_members ${where} ORDER BY "createdAt" DESC`, ...args
  );

  const stats = await prisma.$queryRawUnsafe<Array<{ action: string; cnt: number }>>(
    `SELECT action, COUNT(*)::int AS cnt FROM hr_medical_members GROUP BY action`
  );

  return NextResponse.json({ rows, stats });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    action, member_type, relationship, full_name_english, full_name_arabic,
    employee_staff_id, is_saudi, national_id_iqama, border_number,
    nationality, gender, date_of_birth, marital_status, mobile, work_email,
    city_region, sponsor_unified_no, effective_date, billing_frequency,
    life_insurance, pre_existing, insurer_certificate_no,
    original_effective_date, termination_date, reason, last_working_day,
    days_covered, annual_premium_sar, pro_rata_refund_sar,
    insurer_refund_approved_sar, status_remarks, submitted_by, batch_ref,
  } = body;

  if (!full_name_english) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO hr_medical_members
     (id, action, member_type, relationship, full_name_english, full_name_arabic,
      employee_staff_id, is_saudi, national_id_iqama, border_number,
      nationality, gender, date_of_birth, marital_status, mobile, work_email,
      city_region, sponsor_unified_no, effective_date, billing_frequency,
      life_insurance, pre_existing, insurer_certificate_no,
      original_effective_date, termination_date, reason, last_working_day,
      days_covered, annual_premium_sar, pro_rata_refund_sar,
      insurer_refund_approved_sar, status_remarks, submitted_by, batch_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
             $13::date,$14,$15,$16,$17,$18,
             $19::date,$20,$21,$22,$23,
             $24::date,$25::date,$26,$27::date,
             $28,$29,$30,$31,$32,$33,$34)`,
    id, action ?? "add", member_type ?? "employee", relationship ?? "self",
    full_name_english, full_name_arabic ?? null, employee_staff_id ?? null,
    Boolean(is_saudi), national_id_iqama ?? null, border_number ?? null,
    nationality ?? null, gender ?? null, date_of_birth || null, marital_status ?? null,
    mobile ?? null, work_email ?? null, city_region ?? null, sponsor_unified_no ?? null,
    effective_date || null, billing_frequency ?? "annual",
    Boolean(life_insurance), Boolean(pre_existing), insurer_certificate_no ?? null,
    original_effective_date || null, termination_date || null, reason ?? null,
    last_working_day || null,
    days_covered ? Number(days_covered) : null,
    annual_premium_sar ? Number(annual_premium_sar) : null,
    pro_rata_refund_sar ? Number(pro_rata_refund_sar) : null,
    insurer_refund_approved_sar ? Number(insurer_refund_approved_sar) : null,
    status_remarks ?? null, submitted_by ?? "HR Admin", batch_ref ?? null
  );
  return NextResponse.json({ id });
}
