import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const AI_COMPANIES = [
  "openai","anthropic","google deepmind","deepmind","google ai","meta ai","microsoft ai",
  "mistral","cohere","stability ai","midjourney","hugging face","scale ai",
  "databricks","nvidia","intel ai","qualcomm ai","arm ai","baidu ai","alibaba damo",
  "tencent ai","sensetime","face++","megvii","horizon robotics","momenta",
  "waymo","cruise","nuro","zoox","argo ai","aurora","mobileye","comma ai",
  "palantir","c3.ai","h2o.ai","datarobot","sas","dataiku","anyscale","weights & biases",
  "think-ai","thinklogic","inceptiontech","elm","stc","sdaia","accenture","aramco",
];

function detectAICompanies(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_COMPANIES.filter((co) => lower.includes(co));
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const previewOnly = url.searchParams.get("preview") === "true";

    const body = await req.json();
    const { profileText, linkedinUrl, jobId, overrideExtracted } = body;

    if (!profileText?.trim()) {
      return NextResponse.json({ error: "profileText required" }, { status: 400 });
    }

    // If caller already confirmed/edited the extraction, use that directly
    let extracted: Record<string, unknown>;
    if (overrideExtracted) {
      extracted = overrideExtracted;
    } else {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: `You are an HR data extraction assistant. Extract information ONLY about the PRIMARY person whose profile this is — ignore "People also viewed", suggested connections, or any other profiles.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "name": string,
  "email": string | null,
  "phone": string | null,
  "currentRole": string | null,
  "currentCompany": string | null,
  "country": string | null,
  "city": string | null,
  "yearsExperience": number | null,
  "specialty": string | null,
  "skills": string[],
  "education": string | null,
  "languages": string[],
  "aiCompanies": string[],
  "hasAICompanyExp": boolean,
  "culturalBackground": string | null,
  "summary": string | null
}

Rules:
- "name": the person's full name shown at the top of the profile
- "specialty": one-phrase summary (e.g. "Computer Vision", "NLP / LLMs", "MLOps", "Embedded AI")
- "yearsExperience": calculate from earliest job to present
- "culturalBackground": infer for KSA visa planning (e.g. "Arab/Middle Eastern", "South Asian")
- "aiCompanies": AI/ML companies only from THIS person's experience
- Return ONLY the JSON object`,
          },
          {
            role: "user",
            content: `Extract the primary person's data from this LinkedIn profile text:\n\n${profileText.slice(0, 8000)}`,
          },
        ],
      });

      const rawText = completion.choices[0]?.message?.content ?? "{}";
      try {
        extracted = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        try { extracted = match ? JSON.parse(match[0]) : {}; } catch { extracted = {}; }
      }
    }

    // If preview-only, return extracted data without saving
    if (previewOnly) {
      return NextResponse.json({ extracted }, { status: 200 });
    }

    // Build and save candidate
    const detectedAI = detectAICompanies(profileText);
    const aiSet = new Set<string>([
      ...((extracted.aiCompanies as string[]) || []),
      ...detectedAI,
    ]);

    const candidate = await prisma.hrCandidate.create({
      data: {
        jobId: jobId || null,
        name: (extracted.name as string) || "Unknown",
        email: (extracted.email as string) || null,
        phone: (extracted.phone as string) || null,
        linkedinUrl: linkedinUrl || null,
        currentRole: (extracted.currentRole as string) || null,
        currentCompany: (extracted.currentCompany as string) || null,
        country: (extracted.country as string) || null,
        city: (extracted.city as string) || null,
        yearsExperience: extracted.yearsExperience ? Number(extracted.yearsExperience) : null,
        specialty: (extracted.specialty as string) || null,
        culturalBackground: (extracted.culturalBackground as string) || null,
        hasAICompanyExp: Boolean(extracted.hasAICompanyExp) || aiSet.size > 0,
        aiCompanies: Array.from(aiSet),
        skills: (extracted.skills as string[]) || [],
        education: (extracted.education as string) || null,
        languages: (extracted.languages as string[]) || [],
        profileText,
        notes: (extracted.summary as string) || null,
        linkedinImported: true,
        stage: "sourced",
      },
    });

    return NextResponse.json({ candidate, extracted }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[import] error:", msg);
    return NextResponse.json({ error: "Import failed", detail: msg.slice(0, 200) }, { status: 500 });
  }
}
