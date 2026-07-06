import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ADMIN_ONLY = new Set([
  "grade","comp_min_sar","comp_mid_sar","comp_max_sar","equity_pct",
  "onboarding_token","id","employee_id",
]);

// GET: employee's own non-sensitive profile by email
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const [row] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT e.id, e.name, e.email, e.role, e.level, e.department, e."isExpat",
            e.nationality, e.status, e."startDate"::text,
            p.full_name_arabic, p.date_of_birth::text, p.gender, p.marital_status,
            p.nationality AS profile_nationality, p.religion,
            p.national_id, p.iqama_number, p.iqama_expiry::text, p.border_number,
            p.passport_number, p.passport_expiry::text, p.personal_email, p.mobile,
            p.city_region, p.home_address,
            p.emergency_name, p.emergency_phone, p.emergency_relationship,
            p.bank_name, p.iban, p.account_holder_name,
            p.gosi_number, p.gosi_registered, p.saned_registered, p.absher_linked,
            p.qiwa_registered, p.mudad_linked, p.mol_file_number,
            p.insurer_certificate_no, p.medical_effective_date::text, p.billing_frequency,
            p.life_insurance, p.has_pre_existing,
            p.id_submitted, p.contract_signed, p.bank_details_submitted,
            p.medical_form_submitted, p.gosi_form_submitted, p.iqama_copy_submitted,
            p.onboarding_completed
     FROM hr_employees e
     LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id
     WHERE lower(e.email) = lower($1)`, email
  );

  if (!row) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  return NextResponse.json(row);
}

// PUT: employee updates their own non-admin fields
export async function PUT(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const [emp] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM hr_employees WHERE lower(email) = lower($1)`, email
  );
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const EDITABLE = [
    "personal_email","mobile","city_region","home_address",
    "emergency_name","emergency_phone","emergency_relationship",
    "bank_name","iban","account_holder_name",
  ];

  const sets: string[] = ['"updatedAt" = NOW()'];
  const vals: unknown[] = [emp.id];
  let idx = 2;
  for (const f of EDITABLE) {
    if (f in body && !ADMIN_ONLY.has(f)) { sets.push(`${f} = $${idx++}`); vals.push(body[f] ?? null); }
  }

  await prisma.$executeRawUnsafe(
    `UPDATE hr_employee_profiles SET ${sets.join(",")} WHERE employee_id = $1`, ...vals
  );

  return NextResponse.json({ ok: true });
}
