import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const job = await prisma.hrJob.findUnique({
    where: { id: params.id },
    include: {
      candidates: { orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }] },
      _count: { select: { candidates: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const allowed = ["title","department","level","location","jobType","description","requirements","status","targetCountries","minYearsExp","maxYearsExp","specialty","preferAIExp","headcount"];
    const data: Record<string, unknown> = {};
    for (const k of allowed) if (k in body) data[k] = body[k];
    const updated = await prisma.hrJob.update({ where: { id: params.id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.hrJob.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
