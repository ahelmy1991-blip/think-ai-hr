import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; title: string; body: string; category: string;
      pinned: boolean; author: string; createdAt: string;
    }>>(
      `SELECT id, title, body, category, pinned, author, "createdAt"
       FROM hr_announcements ORDER BY pinned DESC, "createdAt" DESC`
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const { title, body, category, pinned, author } = await req.json();
  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO hr_announcements (id, title, body, category, pinned, author)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    id, title, body, category ?? "general", pinned ?? false, author ?? "People Team"
  );
  return NextResponse.json({ id });
}
