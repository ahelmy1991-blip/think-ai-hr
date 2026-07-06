import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const COMPANY_BIO = `THINK-AI is a Saudi-founded AI software and hardware company headquartered in Riyadh, KSA. We are building AI sovereignty for the region — developing large-scale AI infrastructure, models, and applications that empower governments, enterprises, and citizens across the Muslim world. Our team is a high-velocity, high-ownership group of builders who believe in the transformative power of AI in the region.`;

const VALUES = `Our four core values — Ownership (owners, not staff: own the outcome not the task, be frugal with resources, mission over comfort), Agility (move with velocity: bias for action, ship quickly and reiterate, disagree then commit), Impact (builders, not talkers: build for the customer, think big and execute with simplicity, outcomes not activity), and Craft (go deep on the hard problem: excellence as the default, dive deep, delight the customer) — are non-negotiable and define how we work.`;

export async function POST(req: NextRequest) {
  const { title, department, level, specialty, minYearsExp, maxYearsExp,
          talentPreference, preferAIExp } = await req.json();

  const talentNote = talentPreference === "saudi"
    ? "This role is open to Saudi nationals. We actively support Vision 2030 Saudization goals."
    : talentPreference === "expat"
    ? "This role is open to international candidates with strong regional expertise."
    : "This role is open to both Saudi nationals and international candidates.";

  const prompt = `You are a senior talent acquisition specialist at THINK-AI. Generate a complete, compelling job description for the following role.

Company: THINK-AI — ${COMPANY_BIO}

Role Details:
- Title: ${title}
- Department: ${department}
- Grade/Level: ${level}
- Specialty: ${specialty || "General"}
- Experience: ${minYearsExp}–${maxYearsExp} years
- AI company experience preferred: ${preferAIExp ? "Yes" : "No"}
- Talent preference: ${talentNote}

Output a structured job description with these exact sections (use markdown headers):

## About THINK-AI
(2–3 sentences about THINK-AI, mission, KSA context — use the company bio above)

## The Role
(3–5 sentences: what this person will own, why the role matters, what success looks like in 6 months)

## What You'll Do
(5–7 bullet points of key responsibilities — specific and outcome-oriented)

## What We're Looking For
### Experience & Qualifications
(5–6 bullet points covering required experience, education, technical skills for this specific role)

### Values Fit
(4 bullet points — one for each THINK-AI value: Ownership, Agility, Impact, Craft — showing what living each value looks like in this role specifically)

## Why THINK-AI
(3 bullet points: what makes this opportunity compelling — mission, team quality, impact, equity/growth)

## Talent Note
(1 sentence about: ${talentNote})

Keep the tone: confident, direct, no corporate fluff. Avoid clichés like "fast-paced environment" or "passionate team player". Be specific to the role.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content ?? "";

    // Extract sections for structured response
    const extract = (header: string) => {
      const re = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`, "i");
      return text.match(re)?.[1]?.trim() ?? "";
    };

    return NextResponse.json({
      full: text,
      companyOverview:     extract("About THINK-AI"),
      description:         extract("The Role") + "\n\n**What You'll Do**\n" + extract("What You'll Do"),
      valuesExpectations:  extract("Values Fit"),
      whyThinkAI:         extract("Why THINK-AI"),
      talentNote:          extract("Talent Note"),
    });
  } catch (err) {
    console.error("AI job gen error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
