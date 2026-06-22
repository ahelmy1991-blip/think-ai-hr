import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic();

// Known AI companies list for detection
const AI_COMPANIES = [
  "openai","anthropic","google deepmind","deepmind","google ai","meta ai","microsoft ai",
  "mistral","cohere","stability ai","midjourney","hugging face","scale ai",
  "databricks","nvidia","intel ai","qualcomm ai","arm ai","baidu ai","alibaba damo",
  "tencent ai","sensetime","face++","megvii","horizon robotics","momenta","autonomous",
  "waymo","cruise","nuro","zoox","argo ai","aurora","mobileye","comma ai",
  "palantir","c3.ai","h2o.ai","datarobot","sas","dataiku","anyscale","weights & biases",
  "think-ai","thinklogic","inceptiontech","elm", "stc", "sdaia",
];

function detectAICompanies(text: string): string[] {
  const lower = text.toLowerCase();
  return AI_COMPANIES.filter((co) => lower.includes(co));
}

export async function POST(req: NextRequest) {
  try {
    const { profileText, linkedinUrl, jobId } = await req.json();
    if (!profileText?.trim()) {
      return NextResponse.json({ error: "profileText required â€” paste the LinkedIn profile content" }, { status: 400 });
    }

    // Use Claude to extract structured data from the profile text
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1000,
      system: `You are an HR data extraction assistant. Extract structured information from LinkedIn profile text.
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

For "specialty": summarize the main area (e.g., "Computer Vision", "NLP", "MLOps", "Embedded AI", "Full-Stack AI", "Hardware Design").
For "culturalBackground": based on the name and background, infer likely cultural/regional background (e.g., "Arab/Middle Eastern", "South Asian", "East Asian", "Western", "North African"). This is used for cultural fit and KSA work visa planning. Be respectful and factual.
For "aiCompanies": list any companies that work in AI/ML from their experience.
For "languages": include Arabic if name/background suggests Arabic speaker.
Return ONLY the JSON, no markdown, no explanation.`,
      messages: [{ role: "user", content: `Extract data from this LinkedIn profile:\n\n${profileText}` }],
    });

    const rawText = (response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text ?? "{}";

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from response
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    // Also detect AI companies from the raw text
    const detectedAICompanies = detectAICompanies(profileText);
    const aiSet = new Set<string>([
      ...((parsed.aiCompanies as string[]) || []),
      ...detectedAICompanies,
    ]);
    const allAICompanies = Array.from(aiSet);

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
      hasAICompanyExp: Boolean(parsed.hasAICompanyExp) || allAICompanies.length > 0,
      aiCompanies: allAICompanies,
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
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
