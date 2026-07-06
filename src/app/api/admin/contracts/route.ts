import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT c.*, e.name AS employee_name, e.email AS employee_email,
             e.role AS employee_role, e."isExpat" AS is_expat, e.status AS employee_status,
             e.level AS employee_level, e.department AS employee_department
      FROM hr_contracts c
      JOIN hr_employees e ON e.id = c.employee_id
      ORDER BY c."createdAt" DESC
    `);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /contracts:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      employee_id,
      contract_type = "fixed_term",
      status = "draft",
      start_date,
      end_date,
      joining_date,
      basic_salary_sar,
      housing_allowance_sar = 0,
      transport_allowance_sar = 0,
      total_monthly_sar,
      probation_days = 90,
      non_compete_scope,
      termination_compensation_sar,
      ssco_code,
      ssco_title_en,
      ssco_title_ar,
      functional_title_en,
      functional_title_ar,
      qiwa_reference,
      notes,
    } = body;

    if (!employee_id || employee_id.trim() === "") {
      return NextResponse.json({ error: "Please select an employee before saving" }, { status: 400 });
    }

    const computedTotal = total_monthly_sar ||
      ((parseFloat(basic_salary_sar) || 0) + (parseFloat(housing_allowance_sar) || 0) + (parseFloat(transport_allowance_sar) || 0)) ||
      null;

    const [inserted] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO hr_contracts (
         id, employee_id, contract_type, status,
         start_date, end_date, joining_date,
         basic_salary_sar, housing_allowance_sar, transport_allowance_sar, total_monthly_sar,
         probation_days, non_compete_scope, termination_compensation_sar,
         ssco_code, ssco_title_en, ssco_title_ar,
         functional_title_en, functional_title_ar,
         qiwa_reference, notes
       ) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING id`,
      employee_id,
      contract_type,
      status,
      start_date || null,
      end_date || null,
      joining_date || null,
      basic_salary_sar ? parseFloat(basic_salary_sar) : null,
      parseFloat(housing_allowance_sar) || 0,
      parseFloat(transport_allowance_sar) || 0,
      computedTotal,
      parseInt(probation_days) || 90,
      non_compete_scope || "Kingdom of Saudi Arabia, 1 year",
      termination_compensation_sar ? parseFloat(termination_compensation_sar) : null,
      ssco_code || null,
      ssco_title_en || null,
      ssco_title_ar || null,
      functional_title_en || null,
      functional_title_ar || null,
      qiwa_reference || null,
      notes || null
    );
    return NextResponse.json({ id: inserted.id }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /contracts:", msg);
    return NextResponse.json({ error: "Failed to save contract: " + msg }, { status: 500 });
  }
}
