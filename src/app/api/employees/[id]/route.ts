import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const employee = await prisma.hrEmployee.findUnique({
    where: { id: params.id },
    include: {
      checklists: { orderBy: { phase: "asc" } },
      complianceItems: { orderBy: { dueDate: "asc" } },
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(employee);
}

// Fields stored in hr_employees (Prisma model)
const EMP_FIELDS = ["name", "role", "level", "department", "isExpat", "nationality", "status", "notes"] as const;
const EMP_DATE_FIELDS = ["startDate", "iqamaExpiry"] as const;

// Fields stored in hr_employee_profiles (raw SQL) — all non-admin editable
const PROFILE_TEXT_FIELDS = [
  "first_name","last_name","job_family","sub_job_family","people_group",
  "division","sub_division","sub_department","squad","tribe","functional_team",
  "cost_center","city_region","country","grade","band",
  "team_lead","line_of_business","vendor_name","job_req_id",
  "payroll_status","exco","dotted_line_manager",
  "currency","pm_score_2026","pm_score_2027","pm_score_2028","pm_score_2029","pm_score_2030",
  "work_phone","personal_email","mobile","home_address",
  "national_id","iqama_number","passport_number","temp_permit_id",
  "bank_name","bank_country","iban","account_holder_name",
  "gosi_number","mol_file_number","sponsor_unified_no","visa_type",
  "full_name_arabic","nationality","religion","gender","marital_status",
  // Admin comp fields
  "comp_min_sar","comp_mid_sar","comp_max_sar",
] as const;

const PROFILE_DATE_FIELDS = [
  "seniority_date","latest_contract_start","latest_contract_end",
  "last_promotion","last_change_salary_date","last_change_equity_date",
  "probation_confirmation_date","iqama_expiry","passport_expiry","temp_permit_expiry",
  "date_of_birth","gosi_effective_date","medical_effective_date",
] as const;

const PROFILE_NUMERIC_FIELDS = [
  "monthly_salary","usd_conversion_rate","salary_usd",
  "grade_min","grade_mid","grade_max",
  "equity_grant","equity_refresh_1","equity_refresh_2","equity_refresh_3","equity_refresh_4",
  "equity_pct","comp_min_sar","comp_mid_sar","comp_max_sar",
] as const;

const PROFILE_BOOL_FIELDS = [
  "gosi_registered","saned_registered","absher_linked","qiwa_registered","mudad_linked",
  "tamm_registered","life_insurance","has_pre_existing",
  "id_submitted","contract_signed","bank_details_submitted","medical_form_submitted",
  "gosi_form_submitted","iqama_copy_submitted","onboarding_completed",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    // 1. Update hr_employees base fields
    const empData: Record<string, unknown> = {};
    for (const k of EMP_FIELDS) {
      if (k in body) empData[k] = body[k];
    }
    for (const k of EMP_DATE_FIELDS) {
      if (k in body) empData[k] = body[k] ? new Date(body[k]) : null;
    }

    let updated;
    if (Object.keys(empData).length > 0) {
      updated = await prisma.hrEmployee.update({ where: { id: params.id }, data: empData });
    } else {
      updated = await prisma.hrEmployee.findUnique({ where: { id: params.id } });
    }

    // 2. Update hr_employee_profiles
    const sets: string[] = ['"updatedAt" = NOW()'];
    const vals: unknown[] = [params.id];
    let idx = 2;

    for (const f of PROFILE_TEXT_FIELDS) {
      if (f in body) { sets.push(`${f} = $${idx++}`); vals.push(body[f] ?? null); }
    }
    for (const f of PROFILE_DATE_FIELDS) {
      if (f in body) { sets.push(`${f} = $${idx++}`); vals.push(body[f] ? body[f] : null); }
    }
    for (const f of PROFILE_NUMERIC_FIELDS) {
      if (f in body) { sets.push(`${f} = $${idx++}`); vals.push(body[f] !== "" && body[f] !== null ? Number(body[f]) : null); }
    }
    for (const f of PROFILE_BOOL_FIELDS) {
      if (f in body) { sets.push(`${f} = $${idx++}`); vals.push(Boolean(body[f])); }
    }

    if (sets.length > 1) {
      await prisma.$executeRawUnsafe(
        `UPDATE hr_employee_profiles SET ${sets.join(",")} WHERE employee_id = $1`, ...vals
      );
    }

    // 3. Sync name/role/dept to hr_directory if entry exists
    try {
      const [dir] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT d.id FROM hr_directory d JOIN hr_employees e ON lower(d.email) = lower(e.email) WHERE e.id = $1`, params.id
      );
      if (dir) {
        const dirUpdates: string[] = [];
        const dirVals: unknown[] = [dir.id];
        let di = 2;
        if ("name" in body) { dirUpdates.push(`name = $${di++}`); dirVals.push(body.name); }
        if ("role" in body) { dirUpdates.push(`title = $${di++}`); dirVals.push(body.role); }
        if ("department" in body) { dirUpdates.push(`department = $${di++}`); dirVals.push(body.department); }
        if (dirUpdates.length) {
          dirUpdates.push('"updatedAt" = NOW()');
          await prisma.$executeRawUnsafe(`UPDATE hr_directory SET ${dirUpdates.join(",")} WHERE id = $1`, ...dirVals);
        }
      }
    } catch { /* non-critical */ }

    return NextResponse.json(updated ?? { ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.hrEmployee.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
