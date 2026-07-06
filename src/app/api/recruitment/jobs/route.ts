import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs = await prisma.hrJob.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { candidates: true } },
    },
  });
  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, department, level, location, jobType, description,
      requirements, targetCountries, minYearsExp, maxYearsExp,
      specialty, preferAIExp, headcount,
      talent_preference, company_overview, values_expectations,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: "title and description required" }, { status: 400 });
    }

    const job = await prisma.hrJob.create({
      data: {
        title,
        department: department || "Engineering",
        level: level || "L7",
        location: location || "Riyadh, KSA",
        jobType: jobType || "full-time",
        description,
        requirements: requirements || [],
        targetCountries: targetCountries || [],
        minYearsExp: minYearsExp ? Number(minYearsExp) : 3,
        maxYearsExp: maxYearsExp ? Number(maxYearsExp) : 10,
        specialty: specialty || "",
        preferAIExp: Boolean(preferAIExp ?? true),
        headcount: headcount ? Number(headcount) : 1,
        status: "open",
      },
    });

    // Write extended columns that aren't in Prisma schema
    await prisma.$executeRawUnsafe(
      `UPDATE hr_jobs SET talent_preference=$1, company_overview=$2, values_expectations=$3 WHERE id=$4`,
      talent_preference ?? "open",
      company_overview ?? "",
      values_expectations ?? "",
      job.id
    );

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
