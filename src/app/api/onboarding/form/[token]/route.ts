import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ProfileRow { employee_id: string; onboarding_completed: boolean; [key: string]: unknown; }
interface EmpRow { id: string; name: string; email: string; role: string; level: string; department: string; "startDate": string; [key: string]: unknown; }

// GET: load onboarding context for this token
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const [emp] = await prisma.$queryRawUnsafe<EmpRow[]>(
    `SELECT e.id, e.name, e.email, e.role, e.level, e.department, e."startDate"::text, e."isExpat"
     FROM hr_employees e
     WHERE e.onboarding_token = $1`, params.token
  );
  if (!emp) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const [profile] = await prisma.$queryRawUnsafe<ProfileRow[]>(
    `SELECT * FROM hr_employee_profiles WHERE employee_id = $1`, emp.id
  );

  return NextResponse.json({ employee: emp, profile: profile ?? {} });
}

// POST: submit onboarding form data (public — no auth)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const [emp] = await prisma.$queryRawUnsafe<EmpRow[]>(
    `SELECT e.id FROM hr_employees e WHERE e.onboarding_token = $1`, params.token
  );
  if (!emp) return NextResponse.json({ error: "Invalid token" }, { status: 404 });

  const body = await req.json();

  // Fields employees can submit themselves (not admin-only fields)
  const ALLOWED = [
    "full_name_arabic","date_of_birth","gender","marital_status","nationality","religion",
    "national_id","iqama_number","iqama_expiry","border_number","passport_number","passport_expiry",
    "sponsor_unified_no","visa_type","personal_email","mobile","city_region","home_address",
    "emergency_name","emergency_phone","emergency_relationship",
    "bank_name","iban","account_holder_name",
    "gosi_number","gosi_registered","saned_registered","absher_linked",
    "qiwa_registered","mudad_linked","mol_file_number",
    "billing_frequency","life_insurance","has_pre_existing",
  ];

  const sets: string[] = ["onboarding_completed = true", "onboarding_submitted_at = NOW()", '"updatedAt" = NOW()'];
  const vals: unknown[] = [emp.id];
  let idx = 2;
  for (const f of ALLOWED) {
    if (f in body && body[f] !== undefined) {
      sets.push(`${f} = $${idx++}`);
      vals.push(body[f] ?? null);
    }
  }

  await prisma.$executeRawUnsafe(
    `UPDATE hr_employee_profiles SET ${sets.join(",")} WHERE employee_id = $1`, ...vals
  );

  // Auto-create medical member record for this employee (Addition)
  if (body.full_name_english || body.name) {
    try {
      const [existing] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `SELECT id FROM hr_medical_members WHERE work_email = $1 AND action = 'add' AND member_type = 'employee'`,
        body.personal_email ?? ""
      );
      if (!existing && (body.personal_email || body.mobile)) {
        const { randomUUID } = await import("crypto");
        await prisma.$executeRawUnsafe(
          `INSERT INTO hr_medical_members
           (id, action, member_type, relationship, full_name_english, full_name_arabic,
            employee_staff_id, is_saudi, national_id_iqama, border_number,
            nationality, gender, date_of_birth, marital_status, mobile, work_email,
            city_region, sponsor_unified_no, billing_frequency, life_insurance, pre_existing)
           VALUES ($1,'add','employee','self',$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12,$13,$14,$15,$16,$17,$18)`,
          randomUUID(), body.full_name_english ?? body.name ?? "",
          body.full_name_arabic ?? null, body.employee_staff_id ?? null,
          body.is_saudi ?? !body.iqama_number, body.national_id ?? body.iqama_number ?? null,
          body.border_number ?? null, body.nationality ?? null, body.gender ?? null,
          body.date_of_birth || null, body.marital_status ?? null, body.mobile ?? null,
          body.personal_email ?? null, body.city_region ?? null, body.sponsor_unified_no ?? null,
          body.billing_frequency ?? "annual", Boolean(body.life_insurance), Boolean(body.has_pre_existing)
        );
      }
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ ok: true, message: "Onboarding data submitted successfully" });
}
