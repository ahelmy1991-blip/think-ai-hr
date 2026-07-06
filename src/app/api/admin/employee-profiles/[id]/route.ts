import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// GET: full profile (admin view — includes admin-only fields + compliance)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [emp] = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT e.id, e.name, e.email, e.role, e.level, e.department, e."isExpat",
            e.nationality, e.status, e."startDate"::text, e."iqamaExpiry"::text,
            e.onboarding_token, e.notes,
            p.*
     FROM hr_employees e
     LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id
     WHERE e.id = $1`, params.id
  );
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(emp);
}

// PUT: update profile (admin can update all fields including admin-only)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  // Upsert profile row
  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM hr_employee_profiles WHERE employee_id = $1`, params.id
  );

  const profileId = existing[0]?.id ?? randomUUID();
  const token = existing[0] ? undefined : randomUUID();

  const PROFILE_FIELDS = [
    "full_name_arabic","date_of_birth","gender","marital_status","nationality","religion",
    "national_id","iqama_number","iqama_expiry","border_number","passport_number","passport_expiry",
    "sponsor_unified_no","visa_type","personal_email","mobile","city_region","home_address",
    "emergency_name","emergency_phone","emergency_relationship",
    "bank_name","iban","account_holder_name",
    "gosi_number","gosi_registered","gosi_effective_date","saned_registered","absher_linked",
    "qiwa_registered","mudad_linked","mol_file_number","tamm_registered",
    "insurer_certificate_no","medical_effective_date","billing_frequency","life_insurance","has_pre_existing",
    "grade","comp_min_sar","comp_mid_sar","comp_max_sar","equity_pct",
    "id_submitted","contract_signed","bank_details_submitted","medical_form_submitted",
    "gosi_form_submitted","iqama_copy_submitted","onboarding_completed",
  ] as const;

  const sets: string[] = [];
  const vals: unknown[] = [profileId, params.id];
  if (token) vals.push(token);
  let idx = vals.length + 1;

  for (const f of PROFILE_FIELDS) {
    if (f in body) { sets.push(`${f} = $${idx++}`); vals.push(body[f] ?? null); }
  }
  sets.push(`"updatedAt" = NOW()`);

  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE hr_employee_profiles SET ${sets.join(",")} WHERE employee_id = $2`, ...vals
    );
  } else {
    const tokenPlaceholder = token ? `, onboarding_token` : "";
    const tokenVal = token ? `, $3` : "";
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_employee_profiles (id, employee_id${tokenPlaceholder}) VALUES ($1, $2${tokenVal})
       ON CONFLICT (employee_id) DO UPDATE SET ${sets.join(",")}`, ...vals
    );
  }

  // Also sync basic fields to hr_employees + hr_directory
  const empFields: Record<string, unknown> = {};
  for (const k of ["name","role","level","department","isExpat","nationality","status","notes"] as const) {
    if (k in body) empFields[k] = body[k];
  }
  if (Object.keys(empFields).length) {
    await prisma.hrEmployee.update({ where: { id: params.id }, data: empFields as Parameters<typeof prisma.hrEmployee.update>[0]["data"] });
  }

  // Sync to hr_directory if entry exists
  const dirEntry = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM hr_directory WHERE lower(email) = lower((SELECT email FROM hr_employees WHERE id=$1))`, params.id
  );
  if (dirEntry[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE hr_directory SET
         name = COALESCE($2, name),
         title = COALESCE($3, title),
         department = COALESCE($4, department),
         location = COALESCE($5, location),
         "updatedAt" = NOW()
       WHERE id = $1`,
      dirEntry[0].id,
      body.name ?? null,
      body.role ?? null,
      body.department ?? null,
      body.city_region ?? null,
    );
  }

  return NextResponse.json({ ok: true });
}
