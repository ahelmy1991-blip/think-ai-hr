import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; title: string; body: string; category: string;
      pinned: boolean; author: string; createdAt: string;
    }>>(
      `SELECT id, title, body, category, pinned, author, "createdAt"
       FROM hr_announcements
       ORDER BY pinned DESC, "createdAt" DESC
       LIMIT 20`
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}
