import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Groq from "groq-sdk";
import { PDFParse } from "pdf-parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const employeeId = formData.get("employee_id") as string | null;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    // Fetch employee + profile data for comparison
    let empRow: Record<string, unknown> | null = null;
    if (employeeId) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
        SELECT e.*, p.first_name, p.last_name, p.full_name_arabic, p.national_id,
               p.iqama_number, p.iqama_expiry::text, p.passport_number, p.passport_expiry::text,
               p.gender, p.date_of_birth::text, p.nationality AS profile_nationality,
               p.mobile, p.iban, p.bank_name, p.grade, p.band, p.job_family,
               p.city_region, p.country
        FROM hr_employees e
        LEFT JOIN hr_employee_profiles p ON p.employee_id = e.id
        WHERE e.id = $1
      `, employeeId);
      empRow = rows[0] ?? null;
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "application/pdf";

    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: "Please upload a PDF or image file" }, { status: 400 });
    }

    const empContext = empRow ? `
EMPLOYEE DATA ON FILE:
- Full Name: ${empRow.name}
- Email: ${empRow.email}
- Role: ${empRow.role}
- Level: ${empRow.level}
- Department: ${empRow.department}
- Nationality: ${empRow.nationality || empRow.profile_nationality || "not recorded"}
- Is Expat: ${empRow.isExpat ? "Yes" : "No"}
- National ID / Iqama: ${empRow.national_id || empRow.iqama_number || "not recorded"}
- Iqama Expiry: ${empRow.iqama_expiry || "not recorded"}
- IBAN: ${empRow.iban || "not recorded"}
- Bank: ${empRow.bank_name || "not recorded"}
- Grade: ${empRow.grade || "not recorded"}
- Band: ${empRow.band || "not recorded"}
` : "No specific employee selected for comparison.";

    const systemPrompt = `You are a KSA Labour Law compliance expert. Analyze employment contracts uploaded by THINK-AI (a Saudi tech company).
Extract all contract fields and validate them against: (1) provided employee data, (2) Saudi Labour Law (Royal Decree M/51 as amended Feb 2025), (3) Qiwa platform requirements.

Current date: ${new Date().toLocaleDateString("en-GB")}
${empContext}

Return a structured JSON response with:
{
  "extracted": {
    "employee_name": "", "nationality": "", "id_number": "", "role": "", "ssco_code": "",
    "start_date": "", "end_date": "", "probation_days": null,
    "basic_salary": null, "housing_allowance": null, "transport_allowance": null, "total_monthly": null,
    "annual_leave_days": null, "work_hours_per_week": null, "non_compete": ""
  },
  "checks": [
    { "category": "Employee Data", "item": "Name matches HR records", "status": "pass|fail|warning|info", "detail": "" },
    ...more checks...
  ],
  "saudization": {
    "ssco_code": "", "ssco_title": "", "is_reserved_saudi_only": false, "saudization_tier": "",
    "next_review_date": "2026-10-01", "recommendation": ""
  },
  "overall": "compliant|issues_found|critical_issues",
  "summary": ""
}

Check these items:
EMPLOYEE DATA MATCH: name, nationality, ID/iqama number, role/position
KSA LABOUR LAW: probation max 90 days (extendable to 180 by written consent), annual leave min 21 days (30 after 5 yrs), work hours max 48/wk (40 in Ramadan), overtime rules, GOSI mention, WPS compliance, end-of-service formula
QIWA: both Arabic and English present, SSCO code present and valid, employer CR number, all signature fields
COMPENSATION: basic salary stated, housing/transport allowances if applicable, total correct
SAUDIZATION: check SSCO code against 2025 Nitaqat bands - codes 1212 (HR Manager) and 2423 (HR Specialist) reserved for Saudis NOW; code 3333 (HR Clerk) reserved Oct 2026; 1120 (Executive) open to all

Return ONLY valid JSON, no markdown.`;

    let responseText: string;

    if (isPdf) {
      const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
      const { text } = await parser.getText();
      await parser.destroy();

      if (!text?.trim()) {
        return NextResponse.json({ error: "Could not extract any text from this PDF — it may be a scanned image. Try uploading it as an image file instead." }, { status: 400 });
      }

      const completion = await groq.chat.completions.create({
        model: TEXT_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this employment contract text and return the JSON response described in your system instructions. Be thorough and specific in the checks.\n\nCONTRACT TEXT:\n${text.slice(0, 20000)}` },
        ],
      });

      responseText = completion.choices[0]?.message?.content ?? "{}";
    } else {
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const completion = await groq.chat.completions.create({
        model: VISION_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              { type: "text", text: "Analyze this employment contract image and return the JSON response described in your system instructions. Be thorough and specific in the checks." },
            ],
          },
        ],
      });

      responseText = completion.choices[0]?.message?.content ?? "{}";
    }

    // Parse JSON from response (strip markdown if present)
    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      parsed = { error: "Could not parse analysis", raw: responseText };
    }

    return NextResponse.json({
      analysis: parsed,
      employee: empRow ? { name: empRow.name, role: empRow.role, level: empRow.level } : null,
      filename: file.name,
      analyzed_at: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /contracts/verify:", msg);

    if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("billing")) {
      return NextResponse.json({
        error: "AI analysis is temporarily unavailable — the Groq API rate limit or quota has been reached. Please try again shortly or contact the system administrator.",
        error_type: "credit_balance",
      }, { status: 503 });
    }

    return NextResponse.json({ error: "Analysis failed: " + msg }, { status: 500 });
  }
}
