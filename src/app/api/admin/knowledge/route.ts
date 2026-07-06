import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const entries = await prisma.$queryRawUnsafe<Array<{
      id: string; title: string; category: string; content: string; active: boolean; createdAt: Date; updatedAt: Date;
    }>>(`SELECT id, title, category, content, active, "createdAt", "updatedAt" FROM hr_knowledge_entries ORDER BY "createdAt" DESC`);
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, category, content } = await req.json();
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "title and content required" }, { status: 400 });
    }
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO hr_knowledge_entries (id, title, category, content) VALUES ($1, $2, $3, $4)`,
      id, title.trim(), (category || "general").trim(), content.trim()
    );
    return NextResponse.json({ id, title, category, content, active: true }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
