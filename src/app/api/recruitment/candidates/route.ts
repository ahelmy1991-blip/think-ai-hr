import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  const stage = req.nextUrl.searchParams.get("stage");
  const country = req.nextUrl.searchParams.get("country");
  const minExp = req.nextUrl.searchParams.get("minExp");
  const maxExp = req.nextUrl.searchParams.get("maxExp");
  const hasAIExp = req.nextUrl.searchParams.get("hasAIExp");

  const where: Record<string, unknown> = {};
  if (jobId) where.jobId = jobId;
  if (stage) where.stage = stage;
  if (country) where.country = { contains: country, mode: "insensitive" };
  if (minExp) where.yearsExperience = { gte: Number(minExp) };
  if (maxExp) {
    where.yearsExperience = { ...(where.yearsExperience as object || {}), lte: Number(maxExp) };
  }
  if (hasAIExp === "true") where.hasAICompanyExp = true;

  const candidates = await prisma.hrCandidate.findMany({
    where,
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
    include: { job: { select: { id: true, title: true } } },
  });
  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jobId, name, email, phone, linkedinUrl, currentRole, currentCompany,
      country, city, yearsExperience, specialty, culturalBackground,
      hasAICompanyExp, aiCompanies, skills, education, languages,
      profileText, notes,
    } = body;

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const candidate = await prisma.hrCandidate.create({
      data: {
        jobId: jobId || null,
        name, email: email || null, phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        currentRole: currentRole || null,
        currentCompany: currentCompany || null,
        country: country || null,
        city: city || null,
        yearsExperience: yearsExperience ? Number(yearsExperience) : null,
        specialty: specialty || null,
        culturalBackground: culturalBackground || null,
        hasAICompanyExp: Boolean(hasAICompanyExp),
        aiCompanies: aiCompanies || [],
        skills: skills || [],
        education: education || null,
        languages: languages || [],
        profileText: profileText || null,
        notes: notes || null,
        stage: "sourced",
      },
    });
    return NextResponse.json(candidate, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
