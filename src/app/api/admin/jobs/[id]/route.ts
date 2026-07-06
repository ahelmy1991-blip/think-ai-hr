import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const {
      title, department, level, location, jobType, description,
      requirements, targetCountries, minYearsExp, maxYearsExp,
      specialty, preferAIExp, headcount, status,
      talent_preference, company_overview, values_expectations,
    } = body;

    // Update standard Prisma-managed fields
    await prisma.hrJob.update({
      where: { id: params.id },
      data: {
        title, department, level, location, jobType, description,
        requirements: requirements ?? [],
        targetCountries: targetCountries ?? [],
        minYearsExp: minYearsExp ? Number(minYearsExp) : undefined,
        maxYearsExp: maxYearsExp ? Number(maxYearsExp) : undefined,
        specialty, preferAIExp: Boolean(preferAIExp),
        headcount: headcount ? Number(headcount) : undefined,
        status: status || "open",
      },
    });

    // Update extended columns via raw SQL
    await prisma.$executeRawUnsafe(
      `UPDATE hr_jobs SET talent_preference=$1, company_overview=$2, values_expectations=$3 WHERE id=$4`,
      talent_preference ?? "open",
      company_overview ?? "",
      values_expectations ?? "",
      params.id
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.hrJob.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
