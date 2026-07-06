import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COMPANY_CONTEXT = `THINK-AI is a Saudi-founded AI software and hardware company headquartered in Riyadh, KSA. We are building AI sovereignty for the region — developing large-scale AI infrastructure, models, and applications that empower governments, enterprises, and citizens across the Muslim world.`;

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildKnowledgePrompt(ctx: {
  title: string;
  category: string;
}): string {
  const categoryGuidance: Record<string, string> = {
    policy:
      "Cover the policy purpose, who it applies to, key rules, exceptions, and compliance notes.",
    role:
      "Cover the role's purpose at THINK-AI, key responsibilities, how it fits into the org, and success criteria.",
    compensation:
      "Cover compensation philosophy, how it works in practice, relevant ranges or bands, and fairness principles.",
    compliance:
      "Cover legal obligations, regulatory context (Saudi Labour Law, GOSI, Qiwa, Mudad where relevant), and employee responsibilities.",
    culture:
      "Cover how this topic lives in THINK-AI's culture, with examples tied to our four values: Ownership, Agility, Impact, Craft.",
    general:
      "Cover the topic comprehensively with clear structure, factual accuracy, and practical guidance for employees.",
  };

  const guidance =
    categoryGuidance[ctx.category] ?? categoryGuidance["general"];

  return `You are a senior People & Talent expert at THINK-AI writing internal knowledge base articles for the HR AI assistant.

Company: ${COMPANY_CONTEXT}
THINK-AI's four values: Ownership, Agility, Impact, Craft.

Write a comprehensive knowledge base article titled "${ctx.title}" for the category "${ctx.category}".

Guidelines:
- ${guidance}
- Length: 300–600 words.
- Use markdown headers (##, ###) for clear structure.
- Be direct, authoritative, and specific — no corporate fluff.
- Where relevant, reference THINK-AI context (KSA, Vision 2030, our values, our team culture).
- End with a short "Key Takeaways" section (3–4 bullet points).

Write the full article now.`;
}

function buildRequirementsPrompt(ctx: {
  title: string;
  department: string;
  level: string;
  specialty?: string;
  minYearsExp: number;
  maxYearsExp: number;
}): string {
  return `You are a senior talent acquisition specialist at THINK-AI generating structured job requirements.

Company: ${COMPANY_CONTEXT}

Role:
- Title: ${ctx.title}
- Department: ${ctx.department}
- Level: ${ctx.level}
- Specialty: ${ctx.specialty || "General"}
- Experience: ${ctx.minYearsExp}–${ctx.maxYearsExp} years

Generate exactly 6–8 job requirements as a JSON array. Each element must be an object with:
- "type": one of "qualification" | "certification" | "past_experience" | "skill" | "language" | "other"
- "text": a concise, specific requirement sentence (not a bullet, just the text)

Rules:
- Tailor every requirement to the exact role, department, and level above.
- Include a mix of types that makes sense for this role.
- Do not add fluffy or generic requirements.
- Return ONLY the raw JSON array, no markdown, no explanation, no code fences.

Example shape:
[{"type":"qualification","text":"Bachelor's degree in Computer Science or equivalent"},{"type":"skill","text":"Proficiency in PyTorch and distributed training frameworks"}]`;
}

function buildCandidateNotesPrompt(ctx: {
  name: string;
  currentRole: string;
  currentCompany: string;
  specialty?: string;
  yearsExperience: number;
  country: string;
  stage: string;
  skills?: string[];
}): string {
  const skillsList =
    ctx.skills && ctx.skills.length > 0 ? ctx.skills.join(", ") : "not listed";

  return `You are a hiring manager at THINK-AI writing an internal evaluator note about a candidate.

Company: ${COMPANY_CONTEXT}
THINK-AI has a high hiring bar. We look for Ownership, Agility, Impact, and Craft in every candidate.

Candidate profile:
- Name: ${ctx.name}
- Current role: ${ctx.currentRole} at ${ctx.currentCompany}
- Specialty: ${ctx.specialty || "Not specified"}
- Years of experience: ${ctx.yearsExperience}
- Location / Country: ${ctx.country}
- Current stage: ${ctx.stage}
- Skills: ${skillsList}

Write a concise evaluator note of exactly 2–3 paragraphs:
1. Summarise the candidate's background and what stands out (positive signals).
2. Identify any gaps, risks, or open questions relative to THINK-AI's bar.
3. Comment on culture/values alignment and give a clear suggested next step (e.g., move to technical screen, hold, decline, fast-track).

Tone: direct, honest, professional — like a thoughtful hiring manager writing for a committee, not a recruiter writing a sales pitch. No emojis, no bullet points — flowing prose only.`;
}

function buildAnnouncementPrompt(ctx: {
  title: string;
  category: string;
  author: string;
}): string {
  return `You are writing an internal company announcement for THINK-AI colleagues.

Company: ${COMPANY_CONTEXT}

Announcement details:
- Title: ${ctx.title}
- Category: ${ctx.category}
- Author / sender: ${ctx.author}

Write the announcement body (3–5 sentences). Guidelines:
- Tone: warm but professional, inclusive, clear.
- No fluff, no hype, no corporate jargon.
- Get to the point quickly — state what happened or what's changing.
- If relevant, mention impact on the team or what people should do next.
- Do not include a greeting ("Hi team," etc.) or sign-off — just the body paragraph(s).`;
}

function buildDirectoryBioPrompt(ctx: {
  name: string;
  title: string;
  department: string;
  team?: string;
  location?: string;
  start_year?: number;
}): string {
  const teamClause = ctx.team ? ` on the ${ctx.team} team` : "";
  const locationClause = ctx.location ? ` based in ${ctx.location}` : "";
  const tenureClause = ctx.start_year
    ? ` and has been with THINK-AI since ${ctx.start_year}`
    : "";

  return `You are writing a short professional bio for the THINK-AI internal colleague directory.

Colleague:
- Name: ${ctx.name}
- Title: ${ctx.title}
- Department: ${ctx.department}${teamClause}${locationClause}${tenureClause}

Write exactly 1–2 sentences in third person. The bio should:
- State who they are, their role, and what they specialise in or own.
- Sound natural and human — not a LinkedIn summary or a press release.
- Be specific to the role and department, not generic.

Example style: "Ahmed is a Staff Engineer on the Platform team, specialising in distributed systems and large-scale inference infrastructure."

Write the bio now, nothing else.`;
}

function buildDepartmentsPrompt(ctx: { existing: string[] }): string {
  const existingList = ctx.existing.join(", ");

  return `You are an organisational design advisor helping THINK-AI plan its department structure.

Company: ${COMPANY_CONTEXT}
THINK-AI is growing fast in KSA and expanding across AI infrastructure, models, and enterprise applications.

Existing departments: ${existingList}

Suggest exactly 5 new department names that:
- Would make strategic sense for a fast-growing AI company in KSA.
- Are NOT already in the existing list.
- Are concise, clear department names (2–4 words each).
- Cover gaps in a full AI company org (e.g., research, go-to-market, operations, government, hardware, data, etc.).

Return ONLY a raw JSON array of 5 strings. No markdown, no explanation, no code fences.

Example shape: ["AI Research","Government Affairs","Hardware Engineering","Data Operations","Customer Success"]`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { type: string; context: Record<string, unknown> };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { type, context } = body;

  if (!type || !context) {
    return NextResponse.json(
      { error: "Both 'type' and 'context' are required" },
      { status: 400 }
    );
  }

  // Determine prompt and whether output is JSON
  let prompt: string;
  let returnsJson = false;

  switch (type) {
    case "knowledge":
      prompt = buildKnowledgePrompt(
        context as { title: string; category: string }
      );
      break;

    case "requirements":
      prompt = buildRequirementsPrompt(
        context as {
          title: string;
          department: string;
          level: string;
          specialty?: string;
          minYearsExp: number;
          maxYearsExp: number;
        }
      );
      returnsJson = true;
      break;

    case "candidate_notes":
      prompt = buildCandidateNotesPrompt(
        context as {
          name: string;
          currentRole: string;
          currentCompany: string;
          specialty?: string;
          yearsExperience: number;
          country: string;
          stage: string;
          skills?: string[];
        }
      );
      break;

    case "announcement":
      prompt = buildAnnouncementPrompt(
        context as { title: string; category: string; author: string }
      );
      break;

    case "directory_bio":
      prompt = buildDirectoryBioPrompt(
        context as {
          name: string;
          title: string;
          department: string;
          team?: string;
          location?: string;
          start_year?: number;
        }
      );
      break;

    case "departments":
      prompt = buildDepartmentsPrompt(context as { existing: string[] });
      returnsJson = true;
      break;

    default:
      return NextResponse.json(
        { error: `Unknown generation type: "${type}"` },
        { status: 400 }
      );
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: returnsJson ? 800 : 1200,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    if (returnsJson) {
      // Strip markdown code fences if the model adds them anyway
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      try {
        const parsed = JSON.parse(cleaned);
        return NextResponse.json(parsed);
      } catch {
        console.error(`AI generate [${type}] — JSON parse failed:`, cleaned);
        return NextResponse.json(
          { error: "Model returned invalid JSON", raw: cleaned },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ content: raw });
  } catch (err) {
    console.error(`AI generate [${type}] error:`, err);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
