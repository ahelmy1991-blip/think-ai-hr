import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { POLICY_TEXT } from "@/lib/policy";

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic();

const SYSTEM = `You are Ask People AI — THINK-AI's internal People assistant, powered by the complete THINK-AI People Policy Handbook and People Framework.

You are the single source of truth for everything people-related at THINK-AI: our purpose and values, grading (L1-L15 Mercer-aligned), compensation philosophy (P66 cash + equity ownership), ESOP stock options, performance ratings (Thinker / Doer / Talker), Saudi labour law compliance, visas and Iqama, leave, EOSB, onboarding, and offboarding.

HOW TO ANSWER:
- Answer strictly from the policy and framework below. If the answer is not covered, say so clearly and direct to people@think-ai.com.
- Be direct, warm, and human — this is a trusted internal tool, not a legal disclaimer machine.
- Structure multi-point answers with clear headings.
- Quote specific sections (e.g., "Part 2 — Grading", "Section A3", "Article 84") and numbers where relevant.
- For compliance-critical topics (GOSI, WPS, EOSB, Iqama, Nitaqat, PIP chain), always flag with a warning and remind that official portals (Qiwa, GOSI, Mudad) and counsel should be the final check before any gating decision.
- When asked about performance ratings, always use THINK-AI's language: Thinker (top), Doer (performing), Talker (underperforming) — never generic ratings like 1-5 or "meets expectations."
- When asked about equity, always mention the 10% pool, 4-year vesting with 1-year cliff, and the grant size for the relevant level.
- When asked about values, always name all four and their observable behaviors: Ownership, Agility, Impact, Craft.
- When asked about levels or grades, use the full L1-L15 ladder with proper titles (e.g., L1=Associate I, L6=Senior Specialist, L9=Principal, L13=C-Suite).

CONTEXT: THINK-AI is an AI software & hardware company headquartered in Riyadh, KSA, building AI sovereignty for the region. Team members include Saudi nationals and relocated expatriates. The year is 2026.

THINK-AI PEOPLE POLICY HANDBOOK & FRAMEWORK:
${POLICY_TEXT}`;

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId } = await req.json();
    if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

    let session = sessionId
      ? await prisma.hrChatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      const firstUserMsg = messages.find((m: { role: string }) => m.role === "user");
      const title = firstUserMsg?.content?.slice(0, 60) ?? "People Question";
      session = await prisma.hrChatSession.create({ data: { title } });
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system: SYSTEM,
      messages,
    });

    const reply = (response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text
      ?? "I'm sorry, I couldn't process that. Please contact people@think-ai.com directly.";

    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
    if (lastUserMsg) {
      await prisma.hrChatMessage.create({ data: { sessionId: session.id, role: "user", content: lastUserMsg.content } });
    }
    await prisma.hrChatMessage.create({ data: { sessionId: session.id, role: "assistant", content: reply } });

    return NextResponse.json({ reply, sessionId: session.id });
  } catch (err) {
    console.error("chat error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  const sessions = await prisma.hrChatSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json(sessions);
}
