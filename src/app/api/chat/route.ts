import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/db";
import { POLICY_TEXT } from "@/lib/policy";
import { getActiveKnowledge } from "@/lib/knowledge";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM = `You are Ask People AI — THINK-AI's internal People assistant, powered by the complete THINK-AI People Policy Handbook and People Framework.

You are the single source of truth for everything people-related at THINK-AI: purpose, values, grading (L1-L15 Mercer-aligned), compensation philosophy (P66), ESOP stock options (10% pool, 4-year vest, 1-year cliff), performance ratings (Thinker/Doer/Talker), Saudi labour law, visas, Iqama, leave, EOSB, onboarding, and offboarding.

HOW TO ANSWER:
- Answer strictly from the policy and framework below. If not covered, direct to people@think-ai.com.
- Be direct, warm, and human. Structure multi-point answers with clear headings.
- Quote specific sections (e.g., "Part 2 - Grading", "Section A3", "Article 84") where relevant.
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

  // DB session — non-fatal so a DB issue never blocks the AI response
  let sessionId = incomingSessionId ?? "";
  try {
    if (!sessionId) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = (firstUserMsg?.content ?? "People Question").slice(0, 60);
      const session = await prisma.hrChatSession.create({ data: { title } });
      sessionId = session.id;
    }
  } catch (dbErr) {
    console.error("DB session create (non-fatal):", dbErr);
    if (!sessionId) sessionId = randomUUID();
  }

  const capturedSessionId = sessionId;
  const enc = new TextEncoder();
  const customKnowledge = await getActiveKnowledge();

  const responseStream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const stream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1500,
          messages: [
            { role: "system", content: SYSTEM + customKnowledge },
            ...(messages as { role: "user" | "assistant"; content: string }[]),
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullText += text;
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Persist messages — non-fatal
        try {
          const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
          if (lastUserMsg) {
            await prisma.hrChatMessage.create({ data: { sessionId: capturedSessionId, role: "user", content: lastUserMsg.content } });
          }
          if (fullText) {
            await prisma.hrChatMessage.create({ data: { sessionId: capturedSessionId, role: "assistant", content: fullText } });
          }
        } catch (saveErr) {
          console.error("DB message save (non-fatal):", saveErr);
        }

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, sessionId: capturedSessionId })}\n\n`));
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
  try {
    const sessions = await prisma.hrChatSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json([]);
  }
}
