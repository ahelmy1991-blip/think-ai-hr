import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { POLICY_TEXT } from "@/lib/policy";

const anthropic = new Anthropic();

const SYSTEM = `You are Ask People — THINK-AI's internal HR assistant, powered by the official People Policy Handbook.

You are the single source of truth for how THINK-AI works. Answer every question based strictly on the policy handbook below. If the answer is not in the handbook, say so clearly and suggest the team member contacts the People Team at people@think-ai.com.

Be concise, direct, and friendly. Structure answers with clear headings when covering multiple points. Quote specific policy sections and numbers (e.g., "Article 84", "Section A3") where relevant. For compliance-critical questions (GOSI, WPS, EOSB, Iqama), always add the ⚑ compliance flag from the policy.

Context: THINK-AI is an AI software & hardware company headquartered in Riyadh, KSA, with both Saudi national and expatriate team members. The year is 2026.

THINK-AI PEOPLE POLICY HANDBOOK:
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
      const title = firstUserMsg?.content?.slice(0, 60) ?? "HR Question";
      session = await prisma.hrChatSession.create({ data: { title } });
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: SYSTEM,
      messages,
    });

    const reply = (response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text
      ?? "I'm sorry, I couldn't process that. Please contact people@think-ai.com directly.";

    // Persist messages
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
