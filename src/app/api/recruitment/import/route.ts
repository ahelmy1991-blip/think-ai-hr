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
  "tencent ai","sensetime","face++","megvii","horizon robotics","momenta","autonomous",
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
    const { profileText, linkedinUrl, jobId } = await req.json();
    if (!profileText?.trim()) {
      return NextResponse.json({ error: "profileText required - paste the LinkedIn profile content" }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are an HR data extraction assistant. Extract structured information from LinkedIn profile text.
Return ONLY a valid JSON object with these exact fields (use null for missing data):
{
  "name": string,
  "email": string | null,
  "phone": string | null,
  "currentRole": string | null,
  "currentCompany": string | null,
  "country": string | null,
  "city": string | null,
  "yearsExperience": number | null,
  "specialty": string,
  "skills": string[],
  "education": string | null,
  "languages": string[],
  "aiCompanies": string[],
  "hasAICompanyExp": boolean,
  "culturalBackground": string | null,
  "summary": string | null
}

For "specialty": summarize the main area (e.g., "Computer Vision", "NLP", "MLOps", "Embedded AI").
For "culturalBackground": infer likely cultural/regional background for KSA visa planning.
For "aiCompanies": list any AI/ML companies from their experience.
Return ONLY the JSON object, no markdown, no code blocks, no explanation.`,
        },
        {
          role: "user",
          content: `Extract data from this LinkedIn profile:\n\n${profileText}`,
        },
      ],
    });

    const rawText = completion.choices[0]?.message?.content ?? "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = {}; }
      }
    }

    const detectedAICompanies = detectAICompanies(profileText);
    const aiSet = new Set<string>([
      ...((parsed.aiCompanies as string[]) || []),
      ...detectedAICompanies,
    ]);

    const candidateData = {
      jobId: jobId || null,
      name: (parsed.name as string) || "Unknown",
      email: (parsed.email as string) || null,
      phone: (parsed.phone as string) || null,
      linkedinUrl: linkedinUrl || null,
      currentRole: (parsed.currentRole as string) || null,
      currentCompany: (parsed.currentCompany as string) || null,
      country: (parsed.country as string) || null,
      city: (parsed.city as string) || null,
      yearsExperience: parsed.yearsExperience ? Number(parsed.yearsExperience) : null,
      specialty: (parsed.specialty as string) || null,
      culturalBackground: (parsed.culturalBackground as string) || null,
      hasAICompanyExp: Boolean(parsed.hasAICompanyExp) || aiSet.size > 0,
      aiCompanies: Array.from(aiSet),
      skills: (parsed.skills as string[]) || [],
      education: (parsed.education as string) || null,
      languages: (parsed.languages as string[]) || [],
      profileText,
      notes: (parsed.summary as string) || null,
      linkedinImported: true,
      stage: "sourced",
    };

    const candidate = await prisma.hrCandidate.create({ data: candidateData });
    return NextResponse.json({ candidate, extracted: parsed }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[import] error:", msg);
    return NextResponse.json({ error: "Import failed", detail: msg.slice(0, 200) }, { status: 500 });
  }
}
