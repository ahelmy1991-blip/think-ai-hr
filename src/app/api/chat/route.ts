import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { POLICY_TEXT } from "@/lib/policy";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic();

const SYSTEM = `You are Ask People AI — THINK-AI's internal People assistant, powered by the complete THINK-AI People Policy Handbook and People Framework.

You are the single source of truth for everything people-related at THINK-AI: purpose, values, grading (L1-L15 Mercer-aligned), compensation philosophy (P66), ESOP stock options (10% pool, 4-year vest, 1-year cliff), performance ratings (Thinker/Doer/Talker), Saudi labour law, visas, Iqama, leave, EOSB, onboarding, and offboarding.

HOW TO ANSWER:
- Answer strictly from the policy and framework below. If not covered, direct to people@think-ai.com.
- Be direct, warm, and human. Structure multi-point answers with clear headings.
- Quote specific sections (e.g., "Part 2 — Grading", "Section A3", "Article 84") where relevant.
- For compliance-critical topics (GOSI, WPS, EOSB, Iqama, Nitaqat, PIP chain), always flag with a warning and remind that official portals (Qiwa, GOSI, Mudad) and counsel should be the final check.
- Always use THINK-AI vocabulary: Thinker/Doer/Talker for ratings; Ownership/Agility/Impact/Craft for values.
- When asked about levels, use the full L1-L15 ladder with proper titles.

CONTEXT: THINK-AI is an AI software & hardware company headquartered in Riyadh, KSA. The year is 2026.

THINK-AI PEOPLE POLICY HANDBOOK & FRAMEWORK:
${POLICY_TEXT}`;

export async function POST(req: NextRequest) {
  let body: { messages?: { role: string; content: string }[]; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { messages, sessionId: incomingSessionId } = body;
  if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

  let session = incomingSessionId
    ? await prisma.hrChatSession.findUnique({ where: { id: incomingSessionId } })
    : null;

  if (!session) {
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = (firstUserMsg?.content ?? "People Question").slice(0, 60);
    session = await prisma.hrChatSession.create({ data: { title } });
  }

  const capturedSession = session;
  const enc = new TextEncoder();

  const responseStream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const aiStream = anthropic.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1500,
          system: SYSTEM,
          messages: messages as { role: "user" | "assistant"; content: string }[],
        });

        for await (const chunk of aiStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            fullText += text;
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Persist to DB
        const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
        if (lastUserMsg) {
          await prisma.hrChatMessage.create({ data: { sessionId: capturedSession.id, role: "user", content: lastUserMsg.content } });
        }
        if (fullText) {
          await prisma.hrChatMessage.create({ data: { sessionId: capturedSession.id, role: "assistant", content: fullText } });
        }

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, sessionId: capturedSession.id })}\n\n`));
      } catch (err) {
        console.error("chat stream error:", err);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "Stream failed. Please try again." })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  const sessions = await prisma.hrChatSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return NextResponse.json(sessions);
}
