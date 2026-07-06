import { prisma } from "./db";

export async function getActiveKnowledge(): Promise<string> {
  try {
    const entries = await prisma.$queryRawUnsafe<Array<{ title: string; category: string; content: string }>>(
      `SELECT title, category, content FROM hr_knowledge_entries WHERE active = true ORDER BY "createdAt" ASC`
    );
    if (!entries.length) return "";
    const sections = entries.map(e => `[${e.category.toUpperCase()}] ${e.title}\n${e.content}`).join("\n\n---\n\n");
    return `\n\n── ADDITIONAL KNOWLEDGE BASE ──\n${sections}`;
  } catch {
    return "";
  }
}
