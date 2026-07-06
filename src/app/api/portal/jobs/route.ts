import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await prisma.$queryRawUnsafe<Array<{
      id: string; title: string; department: string; level: string; location: string;
      jobType: string; description: string; requirements: unknown;
      minYearsExp: number; maxYearsExp: number; specialty: string; headcount: number;
      talent_preference: string; company_overview: string; values_expectations: string; createdAt: string;
    }>>(
      `SELECT id, title, department, level, location, "jobType", description,
              requirements, "minYearsExp", "maxYearsExp", specialty, headcount,
              talent_preference, company_overview, values_expectations, "createdAt"
       FROM hr_jobs WHERE status = 'open' ORDER BY "createdAt" DESC`
    );
    return NextResponse.json(jobs);
  } catch {
    return NextResponse.json([]);
  }
}
