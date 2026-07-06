import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT c.*,
             e.name, e.email, e.role, e.level, e.department,
             e."isExpat", e.nationality, e.status,
             e."startDate"::text AS employee_start_date,
             p.first_name, p.last_name, p.full_name_arabic,
             p.mobile, p.work_phone, p.personal_email,
             p.national_id, p.iqama_number, p.iqama_expiry::text,
             p.passport_number, p.passport_expiry::text,
             p.gender, p.date_of_birth::text, p.religion, p.marital_status,
             p.iban, p.bank_name, p.bank_country,
             p.grade, p.band, p.people_group, p.job_family,
             p.city_region, p.country, p.home_address
      FROM hr_contracts c
      JOIN hr_employees e ON e.id = c.employee_id
      LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id
      WHERE c.id = $1
    `, params.id);
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const fields = [
      "contract_type","status","start_date","end_date","joining_date",
      "basic_salary_sar","housing_allowance_sar","transport_allowance_sar","total_monthly_sar",
      "probation_days","non_compete_scope","termination_compensation_sar",
      "ssco_code","ssco_title_en","ssco_title_ar","functional_title_en","functional_title_ar",
      "qiwa_reference","notes","signed_at",
    ];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const f of fields) {
      if (body[f] !== undefined) { sets.push(`"${f}" = $${idx++}`); vals.push(body[f]); }
    }
    if (!sets.length) return NextResponse.json({ ok: true });
    sets.push(`"updatedAt" = NOW()`);
    vals.push(params.id);
    await prisma.$executeRawUnsafe(
      `UPDATE hr_contracts SET ${sets.join(", ")} WHERE id = $${idx}`,
      ...vals
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM hr_contracts WHERE id = $1`, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
