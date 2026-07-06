import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

// Returns employees in probation/active with their onboarding checklists and profile token
export async function GET() {
  try {
    const employees = await prisma.hrEmployee.findMany({
      where: { status: { in: ["probation", "active"] } },
      include: {
        checklists: { orderBy: { phase: "asc" } },
      },
      orderBy: { startDate: "desc" },
    });

    // Attach onboarding token from profiles
    const ids = employees.map(e => e.id);
    let tokens: Array<{ employee_id: string; onboarding_token: string | null; onboarding_completed: boolean | null }> = [];
    if (ids.length > 0) {
      tokens = await prisma.$queryRawUnsafe<typeof tokens>(
        `SELECT employee_id, onboarding_token, onboarding_completed FROM hr_employee_profiles WHERE employee_id = ANY($1::uuid[])`,
        ids
      );
    }
    const tokenMap = Object.fromEntries(tokens.map(t => [t.employee_id, t]));

    const result = employees.map(e => ({
      ...e,
      startDate: e.startDate?.toISOString() ?? null,
      iqamaExpiry: e.iqamaExpiry?.toISOString() ?? null,
      createdAt: e.createdAt?.toISOString() ?? null,
      onboarding_token: tokenMap[e.id]?.onboarding_token ?? null,
      onboarding_completed: tokenMap[e.id]?.onboarding_completed ?? false,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
