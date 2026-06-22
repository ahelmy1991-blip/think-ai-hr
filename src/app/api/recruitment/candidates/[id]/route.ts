import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const allowed = [
      "jobId","name","email","phone","linkedinUrl","currentRole","currentCompany",
      "country","city","yearsExperience","specialty","culturalBackground",
      "hasAICompanyExp","aiCompanies","skills","education","languages",
      "matchScore","matchNotes","stage","profileText","notes",
    ];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in body) {
        if (k === "yearsExperience") data[k] = body[k] ? Number(body[k]) : null;
        else if (k === "matchScore") data[k] = body[k] != null ? Number(body[k]) : null;
        else data[k] = body[k];
      }
    }
    const updated = await prisma.hrCandidate.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.hrCandidate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
