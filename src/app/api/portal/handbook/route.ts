import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // hr_knowledge items are company policies — appropriate for all employees
    const items = await prisma.$queryRawUnsafe<Array<{
      id: string; title: string; content: string; category: string; createdAt: string;
    }>>(
      `SELECT id, title, content, category, "createdAt"
       FROM hr_knowledge_entries
       WHERE active = true
       ORDER BY category ASC, title ASC`
    );
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
