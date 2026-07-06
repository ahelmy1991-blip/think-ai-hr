import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const today = () => new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const SYSTEM_PROMPT = `You are an HR assistant for THINK-AI employees. Today's date is: ${today()}.

You help colleagues with:
- Company policies, benefits, and the employee handbook
- Questions about working at THINK-AI (culture, values, onboarding)
- Leave and absence: Saudi Labor Law entitlements, how to apply, what to expect
- Open roles and career development questions

## Absence / Leave Guidance
When an employee asks about leave or absence, guide them step by step:
1. Ask which type of leave they need (Annual, Sick, Hajj, Maternity, Paternity, Marriage, Bereavement, Unpaid, Study/Exam, Emergency)
2. Confirm their dates. Always tell them what TODAY's date is when relevant.
3. Calculate working days (Sunday–Thursday, KSA weekend is Friday–Saturday)
4. If they want to submit via chat, ask for: Full Name, Work Email, Leave Type, Start Date, End Date, Reason (if applicable), and whether they are a Saudi National
5. When all info is collected, include this EXACT JSON block at the end of your message so the system can auto-submit:
   SUBMIT_ABSENCE:{"employee_name":"...","employee_email":"...","absence_type_id":"...","start_date":"YYYY-MM-DD","end_date":"YYYY-MM-DD","days_requested":N,"reason":"...","is_saudi":false}
   Valid absence_type_id values: annual, sick, hajj, maternity, paternity, marriage, bereavement, unpaid, study, emergency

## Saudi Labor Law Quick Reference
- Annual Leave: 21 days/yr (<5 yrs service), 30 days/yr (5+ yrs)
- Sick Leave: 30d full pay → 60d 75% → 30d unpaid (120d max/yr, doctor cert required after 2 days)
- Maternity: 70 days paid (10 weeks)
- Paternity: 3 days paid
- Hajj: 10 days paid (once per employment, Muslim employees)
- Marriage: 3 days paid
- Bereavement: 5 days (spouse), 3 days (first-degree relatives)
- Study/Exam: 15 days/yr paid (proof required)
- Emergency: 3 days paid (deducted from annual balance)

You do NOT have access to: salary details, individual employee records, or confidential HR data.
For sensitive matters, direct employees to people@think-ai.com.

Be warm, helpful, and concise. Use bullet points for clarity.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    // Fetch policy context from knowledge base
    let context = "";
    try {
      const kb = await prisma.$queryRawUnsafe<Array<{ title: string; content: string }>>(
        `SELECT title, content FROM hr_knowledge WHERE active = true ORDER BY title LIMIT 20`
      );
      if (kb.length > 0) {
        context = "\n\n---\nKnowledge Base Policies:\n" +
          kb.map(k => `## ${k.title}\n${k.content}`).join("\n\n").slice(0, 6000);
      }
    } catch { /* ok */ }

    const systemContent = SYSTEM_PROMPT + context;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemContent },
        ...messages.slice(-14),
      ],
      max_tokens: 1200,
      temperature: 0.4,
    });

    let reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";

    // Auto-submit absence if AI embedded the JSON marker
    let submittedId: string | null = null;
    const match = reply.match(/SUBMIT_ABSENCE:(\{[\s\S]*?\})/);
    if (match) {
      try {
        const payload = JSON.parse(match[1]);
        // Validate required fields
        if (payload.employee_name && payload.employee_email && payload.absence_type_id && payload.start_date && payload.end_date) {
          // Check for overlaps
          const overlap = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id FROM hr_absence_requests
             WHERE lower(employee_email) = lower($1)
               AND status IN ('pending','approved')
               AND start_date <= $3::date AND end_date >= $2::date`,
            payload.employee_email, payload.start_date, payload.end_date
          );
          if (overlap.length === 0) {
            const id = randomUUID();
            await prisma.$executeRawUnsafe(
              `INSERT INTO hr_absence_requests
               (id, employee_name, employee_email, absence_type_id, start_date, end_date, days_requested, reason, is_saudi, document_submitted)
               VALUES ($1,$2,$3,$4,$5::date,$6::date,$7,$8,$9,$10)`,
              id, payload.employee_name, payload.employee_email.toLowerCase(),
              payload.absence_type_id, payload.start_date, payload.end_date,
              Number(payload.days_requested) || 1, payload.reason ?? "",
              Boolean(payload.is_saudi), false
            );
            submittedId = id.slice(0, 8).toUpperCase();
          }
        }
      } catch { /* malformed JSON — skip submit */ }
      // Strip the machine-readable marker from the displayed reply
      reply = reply.replace(/SUBMIT_ABSENCE:\{[\s\S]*?\}/, "").trim();
    }

    return NextResponse.json({ reply, submittedId });
  } catch (err) {
    console.error("Portal chat error:", err);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 });
  }
}
