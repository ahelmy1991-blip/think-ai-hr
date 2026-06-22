import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobId } = await req.json();
    if (!candidateId || !jobId) {
      return NextResponse.json({ error: "candidateId and jobId required" }, { status: 400 });
    }

    const [candidate, job] = await Promise.all([
      prisma.hrCandidate.findUnique({ where: { id: candidateId } }),
      prisma.hrJob.findUnique({ where: { id: jobId } }),
    ]);

    if (!candidate || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 800,
      system: `You are a senior technical recruiter at THINK-AI, an AI software & hardware company in Riyadh, KSA.
Score candidates against job requirements and return ONLY a valid JSON object:
{
  "score": number (0-100),
  "verdict": "Strong Match" | "Good Fit" | "Potential" | "Not a Fit",
  "strengths": string[],
  "gaps": string[],
  "recommendation": string,
  "ksa_readiness": "Ready" | "Needs Support" | "Not Suitable",
  "ksa_notes": string
}

Consider: skills match, years of experience, AI company background, KSA work eligibility (visa, Iqama feasibility), cultural fit for Riyadh.
Return ONLY the JSON, no markdown.`,
      messages: [{
        role: "user",
        content: `JOB REQUIREMENTS:
Title: ${job.title}
Level: ${job.level}
Department: ${job.department}
Min Experience: ${job.minYearsExp} years
Max Experience: ${job.maxYearsExp} years
Specialty: ${job.specialty}
AI Experience Required: ${job.preferAIExp}
Target Countries: ${JSON.stringify(job.targetCountries)}
Requirements: ${JSON.stringify(job.requirements)}
Description: ${job.description}

CANDIDATE PROFILE:
Name: ${candidate.name}
Current Role: ${candidate.currentRole || "N/A"}
Current Company: ${candidate.currentCompany || "N/A"}
Country: ${candidate.country || "N/A"}
City: ${candidate.city || "N/A"}
Years of Experience: ${candidate.yearsExperience || "N/A"}
Specialty: ${candidate.specialty || "N/A"}
Cultural Background: ${candidate.culturalBackground || "N/A"}
AI Company Experience: ${candidate.hasAICompanyExp ? "Yes" : "No"}
AI Companies: ${JSON.stringify(candidate.aiCompanies)}
Skills: ${JSON.stringify(candidate.skills)}
Education: ${candidate.education || "N/A"}
Languages: ${JSON.stringify(candidate.languages)}
Profile Summary: ${candidate.notes || "N/A"}`,
      }],
    });

    const rawText = (response.content.find((b) => b.type === "text") as Anthropic.TextBlock | undefined)?.text ?? "{}";

    let matchData: Record<string, unknown> = {};
    try {
      matchData = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) matchData = JSON.parse(match[0]);
    }

    // Update candidate with match score
    const updated = await prisma.hrCandidate.update({
      where: { id: candidateId },
      data: {
        matchScore: matchData.score ? Number(matchData.score) : null,
        matchNotes: JSON.stringify(matchData),
        jobId,
      },
    });

    return NextResponse.json({ candidate: updated, match: matchData });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Matching failed" }, { status: 500 });
  }
}

// Batch match all unscored candidates for a job
export async function PUT(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    const job = await prisma.hrJob.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const candidates = await prisma.hrCandidate.findMany({
      where: { OR: [{ jobId: null }, { matchScore: null }] },
    });

    const results = [];
    for (const candidate of candidates.slice(0, 10)) {
      const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/recruitment/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id, jobId }),
      });
      if (res.ok) results.push(await res.json());
    }

    return NextResponse.json({ matched: results.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Batch match failed" }, { status: 500 });
  }
}
