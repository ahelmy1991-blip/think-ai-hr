import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/db";
import { POLICY_TEXT } from "@/lib/policy";
import { randomUUID } from "crypto";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AGENT_NAMES: Record<string, string> = {
  "people-ai": "People AI",
  "talent-scout": "Talent Scout",
  "comp-advisor": "Comp Advisor",
  "onboarding-coach": "Onboarding Coach",
  "performance-guide": "Performance Guide",
};

function getSystemPrompt(agentId: string): string | null {
  const policy = POLICY_TEXT;
  const prompts: Record<string, string> = {
    "people-ai": `You are People AI — THINK-AI's internal People assistant. You are the single source of truth for everything people-related: purpose, values, grading L1-L15 (Mercer-aligned), compensation philosophy (P66), ESOP stock options (10% pool, 4-year vest, 1-year cliff), performance ratings (Thinker/Doer/Talker), Saudi labour law, visas, Iqama, leave, EOSB, onboarding, offboarding. Be direct, warm, and cite specific sections. Always use THINK-AI vocabulary: Thinker/Doer/Talker for ratings. When asked about values always name all four: Ownership, Agility, Impact, Craft. Flag compliance-critical topics with a warning.\n\n${policy}`,

    "talent-scout": `You are Talent Scout — THINK-AI's strategic recruitment partner. You specialize in: writing compelling job descriptions, designing sourcing campaigns for AI talent in KSA, evaluating candidate fit against job families and levels (L1-L15), advising on Nitaqat quotas and Saudi national hiring, managing Qiwa transfer vs. new-visa decisions, and structuring hiring scorecards around the four THINK-AI values (Ownership, Agility, Impact, Craft). You know the KSA talent market — top AI employers, Riyadh talent pools, expat sourcing channels. Be strategic and practical. When writing JDs, always include: level/grade, Mercer alignment, required skills, equity grant range, and how the role embodies THINK-AI values.\n\n${policy}`,

    "comp-advisor": `You are Comp Advisor — THINK-AI's precise compensation and rewards specialist. You specialize in: designing offer packages (basic + housing + transport + allowances + variable), calculating EOSB to the riyal using Articles 84 and 85, sizing ESOP equity grants per level (L1-L15), explaining GOSI splits (Saudi: ~22.5%, Expat: 2%), checking Nitaqat salary floors (SAR 4,000 general; SAR 8,000 engineers), and applying the P66 compensation philosophy (P75 flex for scarce AI/ML/hardware talent). Always show your working when doing calculations. For EOSB: show full accrual then apply Art-85 reduction. For equity: show the grant %, 4-year vesting, and the 1-year cliff.\n\n${policy}`,

    "onboarding-coach": `You are Onboarding Coach — THINK-AI's warm and practical new-hire and manager support specialist. You specialize in: building tailored 30/60/90 day plans, guiding managers through preboarding checklists (Qiwa contract, IT setup, buddy assignment, welcome pack), supporting expat onboarding (Iqama within 90 days of arrival, medical exam, national address), embedding the four THINK-AI values (Ownership, Agility, Impact, Craft) in Week 1, and documenting probation milestones at days 30, 60, and 90. Your tone is warm, encouraging, and practical. Always connect onboarding actions to the values they reinforce. For expat hires, always flag the Iqama 90-day deadline as a critical compliance item.\n\n${policy}`,

    "performance-guide": `You are Performance Guide — THINK-AI's structured and direct performance management specialist. You specialize in: writing sharp OKRs (3-5 objectives, 2-4 measurable key results, outcomes not activities, scored 0-1 where 0.7=success), calibrating Thinker/Doer/Talker ratings (50% WHAT/OKRs + 50% HOW/values), preparing managers for review conversations, designing fair PIPs (specific, measurable, 30-60 days with defined support), navigating the legal warning chain (documented feedback > formal warning > PIP > review/decision), and building promotion cases (level change = band change, evidenced through calibration). Always use THINK-AI's rating vocabulary: Thinker, Doer, Talker. For OKRs: always distinguish between outputs (bad) and outcomes (good).\n\n${policy}`,
  };
  return prompts[agentId] ?? null;
}

export async function POST(req: NextRequest) {
  let body: { agentId?: string; messages?: { role: string; content: string }[]; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { agentId, messages, sessionId: incomingSessionId } = body;

  if (!agentId || !messages?.length) {
    return new Response(JSON.stringify({ error: "agentId and messages required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const systemPrompt = getSystemPrompt(agentId);
  if (!systemPrompt) {
    return new Response(JSON.stringify({ error: "Unknown agentId" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const agentName = AGENT_NAMES[agentId] ?? agentId;
  let sessionId: string = incomingSessionId ?? "";

  try {
    if (!sessionId) {
      const firstUserMsg = messages.find((m) => m.role === "user");
      const title = (firstUserMsg?.content ?? "Agent Session").slice(0, 60);
      sessionId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_agent_sessions (id, "agentId", "agentName", title) VALUES ($1, $2, $3, $4)`,
        sessionId, agentId, agentName, title
      );
    }
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO hr_agent_messages (id, "sessionId", role, content) VALUES ($1, $2, $3, $4)`,
        randomUUID(), sessionId, "user", lastUserMsg.content
      );
    }
  } catch (dbErr) {
    console.error("DB session error (non-fatal):", dbErr);
    if (!sessionId) sessionId = randomUUID();
  }

  const enc = new TextEncoder();
  const capturedSessionId = sessionId;

  const responseStream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const stream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1500,
          messages: [
            { role: "system", content: systemPrompt },
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

        if (fullText) {
          try {
            await prisma.$executeRawUnsafe(
              `INSERT INTO hr_agent_messages (id, "sessionId", role, content) VALUES ($1, $2, $3, $4)`,
              randomUUID(), capturedSessionId, "assistant", fullText
            );
          } catch (saveErr) {
            console.error("DB save error:", saveErr);
          }
        }

        controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, sessionId: capturedSessionId })}\n\n`));
      } catch (err) {
        console.error("Stream error:", err);
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const messages = await prisma.$queryRawUnsafe<Array<{ id: string; role: string; content: string; createdAt: Date }>>(
      `SELECT id, role, content, "createdAt" FROM hr_agent_messages WHERE "sessionId" = $1 ORDER BY "createdAt" ASC`,
      sessionId
    );
    return Response.json(messages);
  }

  const sessions = await prisma.$queryRawUnsafe<Array<{ id: string; agentId: string; agentName: string; title: string | null; createdAt: Date }>>(
    agentId
      ? `SELECT id, "agentId", "agentName", title, "createdAt" FROM hr_agent_sessions WHERE "agentId" = $1 ORDER BY "createdAt" DESC LIMIT 15`
      : `SELECT id, "agentId", "agentName", title, "createdAt" FROM hr_agent_sessions ORDER BY "createdAt" DESC LIMIT 20`,
    ...(agentId ? [agentId] : [])
  );
  return Response.json(sessions);
}
