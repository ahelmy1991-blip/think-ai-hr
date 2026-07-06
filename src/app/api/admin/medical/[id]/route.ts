import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const FIELDS = [
    "action","member_type","relationship","full_name_english","full_name_arabic",
    "employee_staff_id","is_saudi","national_id_iqama","border_number",
    "nationality","gender","date_of_birth","marital_status","mobile","work_email",
    "city_region","sponsor_unified_no","effective_date","billing_frequency",
    "life_insurance","pre_existing","insurer_certificate_no",
    "original_effective_date","termination_date","reason","last_working_day",
    "days_covered","annual_premium_sar","pro_rata_refund_sar",
    "insurer_refund_approved_sar","status_remarks",
  ];
  const sets: string[] = [];
  const vals: unknown[] = [params.id];
  let idx = 2;
  for (const f of FIELDS) {
    if (f in body) { sets.push(`${f} = $${idx++}`); vals.push(body[f] ?? null); }
  }
  sets.push(`"updatedAt" = NOW()`);
  await prisma.$executeRawUnsafe(
    `UPDATE hr_medical_members SET ${sets.join(",")} WHERE id = $1`, ...vals
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.$executeRawUnsafe(`DELETE FROM hr_medical_members WHERE id = $1`, params.id);
  return NextResponse.json({ ok: true });
}
