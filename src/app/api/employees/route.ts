import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ONBOARDING_PHASES, buildChecklist } from "@/lib/onboarding-items";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Return employees joined with their extended profile data
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      e.id, e.name, e.email, e.role, e.level, e.department,
      e."isExpat", e.nationality, e.status,
      e."startDate"::text, e."iqamaExpiry"::text, e.notes,
      e."createdAt"::text,
      p.first_name, p.last_name, p.job_family, p.sub_job_family,
      p.people_group, p.division, p.sub_division, p.sub_department,
      p.squad, p.tribe, p.functional_team, p.cost_center,
      p.city_region, p.country, p.grade, p.band,
      p.seniority_date::text, p.team_lead, p.line_of_business,
      p.vendor_name, p.job_req_id,
      p.latest_contract_start::text, p.latest_contract_end::text,
      p.payroll_status, p.exco, p.dotted_line_manager,
      p.last_promotion::text, p.last_change_salary_date::text,
      p.last_change_equity_date::text, p.probation_confirmation_date::text,
      p.monthly_salary, p.currency, p.usd_conversion_rate, p.salary_usd,
      p.comp_min_sar AS grade_min_profile, p.comp_mid_sar AS grade_mid_profile, p.comp_max_sar AS grade_max_profile,
      p.grade_min, p.grade_mid, p.grade_max,
      p.equity_pct, p.equity_grant,
      p.equity_refresh_1, p.equity_refresh_2, p.equity_refresh_3, p.equity_refresh_4,
      p.pm_score_2026, p.pm_score_2027, p.pm_score_2028, p.pm_score_2029, p.pm_score_2030,
      p.gender, p.date_of_birth::text, p.home_address,
      p.full_name_arabic, p.religion, p.marital_status,
      p.mobile, p.work_phone, p.personal_email,
      p.national_id, p.iqama_number, p.iqama_expiry::text,
      p.passport_number, p.passport_expiry::text,
      p.temp_permit_id, p.temp_permit_expiry::text,
      p.bank_name, p.bank_country, p.iban, p.account_holder_name,
      p.gosi_number, p.gosi_registered, p.saned_registered,
      p.absher_linked, p.qiwa_registered, p.mudad_linked,
      p.onboarding_token, p.onboarding_completed,
      p.id_submitted, p.contract_signed, p.bank_details_submitted,
      p.medical_form_submitted, p.gosi_form_submitted, p.iqama_copy_submitted
    FROM hr_employees e
    LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id
    ORDER BY e."createdAt" DESC
  `);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, role, level, department, isExpat, nationality, startDate, iqamaExpiry, notes,
      // Profile fields captured at creation
      people_group, job_family, sub_job_family, grade, band,
      division, sub_division, sub_department, squad, tribe, functional_team, cost_center,
      city_region, country, team_lead, line_of_business, vendor_name, job_req_id, seniority_date,
    } = body;

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
      const items = buildChecklist(phase, Boolean(isExpat)).map((item) => ({ ...item, done: false, doneAt: null, doneBy: null }));
      await prisma.hrOnboardingChecklist.create({ data: { employeeId: employee.id, phase, items } });
    }

    // Auto-create compliance items
    const complianceItems = [
      { type: "probation_review", title: `${name} — 30-day probation review`, employeeId: employee.id, dueDate: new Date(new Date(startDate).getTime() + 30 * 86400000) },
      { type: "probation_review", title: `${name} — 60-day probation review`, employeeId: employee.id, dueDate: new Date(new Date(startDate).getTime() + 60 * 86400000) },
      { type: "probation_decision", title: `${name} — Probation decision (before day 180)`, employeeId: employee.id, dueDate: new Date(new Date(startDate).getTime() + 170 * 86400000) },
    ];
    if (isExpat && iqamaExpiry) {
      complianceItems.push({ type: "iqama_renewal", title: `${name} — Iqama renewal`, employeeId: employee.id, dueDate: new Date(new Date(iqamaExpiry).getTime() - 3 * 86400000) });
    }
    await prisma.hrComplianceItem.createMany({ data: complianceItems });

    // Auto-create profile row with all captured creation fields
    const { randomUUID } = await import("crypto");
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_employee_profiles (
         id, employee_id, onboarding_token,
         people_group, payroll_status, currency, usd_conversion_rate,
         job_family, sub_job_family, grade, band,
         division, sub_division, sub_department,
         squad, tribe, functional_team, cost_center,
         city_region, country, team_lead, line_of_business,
         vendor_name, job_req_id, seniority_date,
         "createdAt", "updatedAt"
       ) VALUES (
         $1, $2, $3,
         $4, 'Active', 'SAR', 3.75,
         $5, $6, $7, $8,
         $9, $10, $11,
         $12, $13, $14, $15,
         $16, $17, $18, $19,
         $20, $21, $22,
         NOW(), NOW()
       ) ON CONFLICT (employee_id) DO NOTHING`,
      randomUUID(), employee.id, randomUUID(),
      people_group || "FTE",
      job_family || null, sub_job_family || null, grade || null, band || null,
      division || null, sub_division || null, sub_department || null,
      squad || null, tribe || null, functional_team || null, cost_center || null,
      city_region || null, country || null, team_lead || null, line_of_business || null,
      vendor_name || null, job_req_id || null, seniority_date || null
    );

    return NextResponse.json(employee, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
