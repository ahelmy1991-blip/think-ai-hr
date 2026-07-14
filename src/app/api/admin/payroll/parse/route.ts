import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Fixed SAR/USD peg used by the payroll sheet for any employee paid in a
// currency other than SAR — confirmed by back-solving every foreign-currency
// row in the reference workbook (e.g. 15,225 SAR / 3.75 = 4,060.00 USD exactly).
const SAR_PEG_RATE = 3.75;

// ── Saudi compliance constants (GOSI / Nitaqat) ─────────────────────────────
// Source: THINK-AI's own verified compliance brief (MHRSD/HRSD, Qiwa, GOSI,
// Mudad — current to mid-2026). GOSI's Saudi-national rate steps up every
// July under the new Social Insurance Law, so GOSI_NEW_REGIME below is a
// mid-2026 estimate, not a live-verified figure — re-check gosi.gov.sa before
// treating a mismatch as definitively wrong.
const GOSI_BASE_CAP_SAR = 45000; // basic + housing, capped
const GOSI_NEW_REGIME_CUTOFF = new Date("2024-07-03"); // first-ever GOSI contribution before this date = existing regime
const GOSI_SAUDI_EXISTING = { employer: 0.1175, employee: 0.0975 }; // 9% retirement + 2% occ. hazard + 0.75% SANED / 9% + 0.75% SANED
const GOSI_SAUDI_NEW_REGIME_2026 = { employer: 0.1225, employee: 0.1025 }; // existing + 0.5%/side step for 2025→2026 — VERIFY LIVE, increments each July
const GOSI_EXPAT = { employer: 0.02, employee: 0 }; // occupational hazard only, employer-paid
const NITAQAT_MIN_WAGE_SAR = 4000; // general Saudi floor to count toward Nitaqat
const GOSI_RECONCILIATION_TOLERANCE = 5; // SAR — sheet rounding, not flagged below this

type WorkerCategory = "saudi_ksa" | "expat_ksa_visa" | "expat_remote";

function classifyWorker(idType: string, location: string): WorkerCategory {
  const t = idType.toLowerCase();
  const loc = location.toLowerCase();
  if (t.includes("saudi")) return "saudi_ksa";
  if (t.includes("iqama") && (loc === "ksa" || loc.includes("saudi"))) return "expat_ksa_visa";
  return "expat_remote";
}

function parseSheetDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = str(v);
  if (!s || s === "—") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

type ColKey =
  | "employeeId" | "name" | "location" | "joiningDate" | "employmentType" | "qiwaId"
  | "idType" | "idNumber" | "iban" | "bank" | "contact" | "gosiPct" | "salaryUsdRef"
  | "basicSalary" | "housing" | "transport" | "othersIncome" | "totalIncome"
  | "employeeGosi" | "advancePayment" | "othersDeduction" | "totalDeductions"
  | "netSalaryNative" | "gosiEmployer" | "payableToGosi" | "toBeTransferred"
  | "currency" | "note" | "sarEquivalent";

const ALL_COL_KEYS: ColKey[] = [
  "employeeId", "name", "location", "joiningDate", "employmentType", "qiwaId",
  "idType", "idNumber", "iban", "bank", "contact", "gosiPct", "salaryUsdRef",
  "basicSalary", "housing", "transport", "othersIncome", "totalIncome",
  "employeeGosi", "advancePayment", "othersDeduction", "totalDeductions",
  "netSalaryNative", "gosiEmployer", "payableToGosi", "toBeTransferred",
  "currency", "note", "sarEquivalent",
];

// Columns required to produce a usable payslip — everything else degrades
// gracefully to blank/zero if genuinely absent from a given month's sheet.
const REQUIRED_COLS: ColKey[] = ["employeeId", "name", "basicSalary", "totalIncome", "totalDeductions", "netSalaryNative"];

const FIELD_DESCRIPTIONS = `- employeeId: the employee's ID/code (e.g. "006")
- name: employee's full name
- location: work location/country (e.g. KSA, Pakistan, Tunisia)
- joiningDate: date joined the company
- employmentType: "Full time" / "Part time"
- qiwaId: Qiwa platform registration, Yes/No
- idType: TEXT label of the ID document type (e.g. "Passport", "KSA Iqama", "Saudi ID") — not the number itself
- idNumber: the ID/passport/iqama number
- iban: bank IBAN or account number
- bank: bank name
- contact: phone number
- gosiPct: GOSI contribution percentage rate
- salaryUsdRef: a reference/target salary already expressed in USD (informational only)
- basicSalary: basic salary amount, company's internal tracking currency (usually SAR)
- housing: housing allowance amount
- transport: transportation allowance amount
- othersIncome: an extra EARNINGS amount column, appears once among the earnings columns, right before "Total Income"
- totalIncome: gross/total income for the month before deductions
- employeeGosi: GOSI amount deducted from the employee
- advancePayment: advance payment recovered this month
- othersDeduction: an extra DEDUCTION amount column, appears once among the deduction columns, right before "Total Deductions"
- totalDeductions: total deductions for the month
- netSalaryNative: net salary after deductions, in the internal tracking currency (usually SAR)
- gosiEmployer: the EMPLOYER's (company-paid) GOSI contribution — not deducted from the employee
- payableToGosi: total amount payable to the GOSI authority
- toBeTransferred: the actual amount wired to the employee this month, in whatever the "currency" column says
- currency: currency code of the amount actually transferred (e.g. SAR, USD, GBP)
- note: free-text remarks about this employee's pay this month
- sarEquivalent: the transferred amount converted back to a SAR-equivalent figure, for internal reporting`;

const SYSTEM_PROMPT = `You are a meticulous Saudi payroll data analyst. You will be given the first rows of a company payroll spreadsheet as a JSON array of rows (each row is an array of cell values, 0-indexed columns). Some early rows may be titles or blank before the real header row.

Your job:
1. Identify the 0-based row index of the COLUMN HEADER row (the row containing labels like "Employee ID", "Basic Salary", etc).
2. Map every column index that corresponds to one of the canonical fields below to its exact field key. Use BOTH the header label text AND the sample values in the rows beneath it — header wording can vary month to month, so infer meaning from context, not just exact text match. Never invent a mapping for a column that doesn't semantically match any canonical field — omit it instead.

Canonical fields:
${FIELD_DESCRIPTIONS}

Two field keys often share literally identical header text and must be disambiguated by position/content:
- "employmentType" vs "idType": both may be labeled "Type". employmentType's column contains values like "Full time"/"Part time" and comes BEFORE the Qiwa column. idType's column contains values like "Passport"/"KSA Iqama"/"Saudi ID" and comes AFTER the Qiwa column.
- "othersIncome" vs "othersDeduction": both may be labeled "Others". othersIncome is among the earnings columns (numeric, small allowance-like values, before "Total Income"). othersDeduction is among the deduction columns (after "Advance Payment", before "Total Deductions").

Respond with ONLY this JSON shape, no markdown, no commentary, no explanation:
{"headerRowIndex": <int>, "columns": {"<0-based column index as string>": "<fieldKey>", ...}}`;

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeHeader(v: unknown): string {
  return str(v).toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
}

function fmtDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  const s = str(v);
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Matches the source workbook's own wording ("Passport" -> "PASSPORT NO.",
// "KSA Iqama" -> "KSA IQAMA NO.", "Saudi ID" -> "SAUDI ID NO.").
function idTypeLabel(idType: string): string {
  return idType ? `${idType.toUpperCase()} NO.` : "ID NO.";
}

// Best-effort work email guess from the name alone — first two words,
// lowercased, dot-joined (matches the observed "syed.faizan@think-ai.com"
// pattern). Purely a starting point: always editable in the review screen.
function guessEmail(name: string): string {
  const parts = name.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const local = parts.slice(0, 2).join(".");
  return `${local}@think-ai.com`;
}

// True when the note describes a partial-period adjustment (mid-month join,
// half salary, hourly proration) rather than a normal deduction — the source
// workbook labels "Basic salary" as a full-month reference in these cases.
function looksPartialPeriod(note: string): boolean {
  const n = note.toLowerCase();
  return /partial|half salary|hourly|prorat|start(ing)? date|joined|days deducted/.test(n);
}

// Rule-based fallback / gap-filler: resolves columns by exact-ish header text
// match. Kept as a safety net for when the AI call fails or leaves gaps —
// verified robust to extra/reordered columns in testing.
function resolveColumnsRuleBased(headerRow: unknown[]): Partial<Record<ColKey, number>> {
  const cells = headerRow.map(normalizeHeader);
  const findAll = (pred: (c: string) => boolean) => cells.reduce<number[]>((acc, c, i) => (pred(c) ? [...acc, i] : acc), []);
  const find = (pred: (c: string) => boolean) => findAll(pred)[0] ?? -1;
  const set = (i: number) => (i === -1 ? undefined : i);

  const qiwaId = find(c => c.startsWith("qiwa"));
  const totalIncome = find(c => c.startsWith("total income"));
  const advancePayment = find(c => c.startsWith("advance payment"));

  const typeIdxs = findAll(c => c === "type" || c === "tyoe");
  const employmentType = typeIdxs.find(i => qiwaId === -1 || i < qiwaId) ?? typeIdxs[0];
  const idType = typeIdxs.find(i => qiwaId !== -1 && i > qiwaId) ?? typeIdxs[1];

  const othersIdxs = findAll(c => c === "others");
  const othersIncome = othersIdxs.find(i => totalIncome === -1 || i < totalIncome) ?? othersIdxs[0];
  const othersDeduction = othersIdxs.find(i => advancePayment !== -1 && i > advancePayment) ?? othersIdxs[othersIdxs.length - 1];

  return {
    employeeId: set(find(c => c === "employee id")),
    name: set(find(c => c === "employee name")),
    location: set(find(c => c === "location")),
    joiningDate: set(find(c => c.startsWith("joining date"))),
    employmentType: set(employmentType ?? -1),
    qiwaId: set(qiwaId),
    idType: set(idType ?? -1),
    idNumber: set(find(c => c.startsWith("ids number") || c === "id number")),
    iban: set(find(c => c === "iban")),
    bank: set(find(c => c === "bank")),
    contact: set(find(c => c === "contact")),
    gosiPct: set(find(c => c.startsWith("gosi") && c.includes("%"))),
    salaryUsdRef: set(find(c => c.startsWith("salary usd"))),
    basicSalary: set(find(c => c.startsWith("basic salary") || c === "basic")),
    housing: set(find(c => c.startsWith("housing"))),
    transport: set(find(c => c.startsWith("transportation") || c.startsWith("transport"))),
    othersIncome: set(othersIncome ?? -1),
    totalIncome: set(totalIncome === -1 ? find(c => c.startsWith("gross")) : totalIncome),
    employeeGosi: set(find(c => c.startsWith("employee gosi"))),
    advancePayment: set(advancePayment),
    othersDeduction: set(othersDeduction ?? -1),
    totalDeductions: set(find(c => c.startsWith("total deduction"))),
    netSalaryNative: set(find(c => c.startsWith("net salary") || c.startsWith("net pay") || c.startsWith("net amount"))),
    gosiEmployer: set(find(c => c.startsWith("gosi employer"))),
    payableToGosi: set(find(c => c.startsWith("payable to gosi"))),
    currency: set(find(c => c.startsWith("curran") || c.startsWith("currency"))),
    note: set(find(c => c === "note")),
    sarEquivalent: set(find(c => c.includes("sar") && (c.includes("equilevent") || c.includes("equivalent")))),
    toBeTransferred: set(find(c => c.startsWith("to be transfe") && !c.includes("sar") && !c.includes("equilevent") && !c.includes("equivalent"))),
  };
}

// Locate a plausible header row by searching every cell for "Employee ID" —
// used to pick which sheet to hand to the AI resolver. Not the final word:
// the AI independently confirms/corrects the header row index too.
function findHeaderRowHeuristic(raw: unknown[][]): number {
  for (let r = 0; r < raw.length; r++) {
    if (raw[r].some(c => normalizeHeader(c).includes("employee id"))) return r;
  }
  return -1;
}

// AI-based "smart reader": semantically maps columns to canonical fields
// using both header text and sample data, so month-to-month wording drift
// (e.g. "Net Salary" vs "Net Pay" vs "Net Amount") doesn't silently break
// the mapping the way exact-text matching did.
async function resolveColumnsWithAI(raw: unknown[][]): Promise<{ headerRowIndex: number; map: Partial<Record<ColKey, number>> } | null> {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const sample = raw.slice(0, 15).map(row =>
      row.map(c => {
        if (c instanceof Date) return c.toISOString().slice(0, 10);
        const s = String(c ?? "");
        return s.length > 60 ? s.slice(0, 60) : s;
      })
    );

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(sample) },
      ],
    });

    const raw_ = completion.choices[0]?.message?.content ?? "";
    const match = raw_.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw_);

    const headerRowIndex = Number(parsed.headerRowIndex);
    if (!Number.isInteger(headerRowIndex) || headerRowIndex < 0 || headerRowIndex >= raw.length) return null;

    const validKeys = new Set(ALL_COL_KEYS);
    const map: Partial<Record<ColKey, number>> = {};
    for (const [idxStr, key] of Object.entries(parsed.columns || {})) {
      const idx = Number(idxStr);
      if (Number.isInteger(idx) && idx >= 0 && typeof key === "string" && validKeys.has(key as ColKey) && map[key as ColKey] === undefined) {
        map[key as ColKey] = idx;
      }
    }
    return { headerRowIndex, map };
  } catch (e) {
    console.error("AI column resolution failed (falling back to rule-based):", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const period = str(formData.get("period")) || "";

    if (!file) return NextResponse.json({ error: "No payroll file uploaded" }, { status: 400 });

    const XLSX = await import("xlsx");
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

    // Pick the sheet most likely to contain payroll data (heuristic scan),
    // falling back to the first sheet if nothing obviously matches.
    let raw: unknown[][] = [];
    let heuristicHeaderIdx = -1;
    for (const sheetName of wb.SheetNames) {
      const candidate: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
      const idx = findHeaderRowHeuristic(candidate);
      if (idx !== -1) { raw = candidate; heuristicHeaderIdx = idx; break; }
    }
    if (raw.length === 0) {
      raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
    }

    // Smart (AI) column resolution first; rule-based fills any gaps it leaves
    // and is the sole fallback if the AI call fails outright.
    const ai = await resolveColumnsWithAI(raw);
    let headerIdx: number;
    let col: Partial<Record<ColKey, number>>;

    if (ai) {
      headerIdx = ai.headerRowIndex;
      const ruleMap = resolveColumnsRuleBased(raw[headerIdx]);
      col = { ...ruleMap, ...ai.map };
    } else if (heuristicHeaderIdx !== -1) {
      headerIdx = heuristicHeaderIdx;
      col = resolveColumnsRuleBased(raw[headerIdx]);
    } else {
      return NextResponse.json({ error: "Could not find an 'Employee ID' column header in this file — is this the standard payroll workbook?" }, { status: 400 });
    }

    const missing = REQUIRED_COLS.filter(k => col[k] === undefined);
    if (missing.length > 0) {
      const detectedHeaders = raw[headerIdx].map(str).filter(s => s !== "");
      return NextResponse.json({
        error: `Could not confidently map these required columns: ${missing.join(", ")}. Check the file hasn't dropped or heavily renamed them.`,
        detectedHeaders,
      }, { status: 400 });
    }

    const at = (row: unknown[], key: ColKey) => (col[key] !== undefined ? row[col[key] as number] : "");
    const columnMapping: Record<string, string> = {};
    for (const key of ALL_COL_KEYS) {
      if (col[key] !== undefined) columnMapping[key] = str(raw[headerIdx][col[key] as number]);
    }

    const dataRows = raw.slice(headerIdx + 1).filter(row => {
      const name = str(at(row, "name"));
      return str(at(row, "employeeId")) !== "" && name !== "" && name.toLowerCase() !== "employee name";
    });

    if (dataRows.length === 0) {
      return NextResponse.json({ error: "Found the header row but no employee rows underneath it — check the file has data below the header." }, { status: 400 });
    }

    const rows = dataRows.map(row => {
      const currency = (str(at(row, "currency")) || "SAR").toUpperCase();
      const basicSalary = num(at(row, "basicSalary"));
      const housing = num(at(row, "housing"));
      const transport = num(at(row, "transport"));
      const othersIncome = num(at(row, "othersIncome"));
      const totalIncome = num(at(row, "totalIncome")) || (basicSalary + housing + transport + othersIncome);
      const employeeGosi = num(at(row, "employeeGosi"));
      const advancePayment = num(at(row, "advancePayment"));
      const othersDeduction = num(at(row, "othersDeduction"));
      const statedTotalDeductions = num(at(row, "totalDeductions"));
      const statedNetSalary = num(at(row, "netSalaryNative")) || round2(totalIncome - statedTotalDeductions);
      const gosiEmployer = num(at(row, "gosiEmployer"));
      const toBeTransferredRaw = at(row, "toBeTransferred");
      const toBeTransferred = toBeTransferredRaw != null && str(toBeTransferredRaw) !== "" ? num(toBeTransferredRaw) : null;
      const qiwaRegistered = str(at(row, "qiwaId")).toLowerCase() === "yes";
      const note = str(at(row, "note"));
      const partialPeriod = note ? looksPartialPeriod(note) : false;
      const gosiPctRaw = at(row, "gosiPct");

      // Earnings always stay in the sheet's native SAR-tracked figures —
      // never force-converted into a foreign transfer currency.
      const earnings = [
        { label: partialPeriod ? "Basic salary (full-month ref.)" : "Basic salary", amount: basicSalary },
        { label: "Housing allowance", amount: housing },
        { label: "Transportation allowance", amount: transport },
        { label: "Other", amount: othersIncome },
      ].filter(l => l.amount !== 0);
      const gross = round2(totalIncome);

      // Deductions: start from the sheet's own itemized columns.
      const deductionItems = [
        { key: "gosi", label: `Employee GOSI${gosiPctRaw ? ` (${(num(gosiPctRaw) < 1 ? num(gosiPctRaw) * 100 : num(gosiPctRaw)).toFixed(2).replace(/\.00$/, "")}%)` : ""}`, amount: employeeGosi },
        { key: "advance", label: "Advance payment recovery", amount: advancePayment },
        { key: "other", label: partialPeriod ? (note || "Partial-period adjustment") : "Other deduction", amount: othersDeduction },
      ].filter(l => l.amount !== 0);

      // Reconciliation: if the sheet's own stated deductions don't add up to
      // its own stated net salary, trust the net salary (the figure that
      // actually gets wired) and adjust the catch-all "other" deduction line
      // to match — flagging the discrepancy instead of silently hiding it.
      let deductions = deductionItems;
      let reconciliationNote: string | undefined;
      const impliedTotal = deductionItems.reduce((s, l) => s + l.amount, 0);
      const neededTotal = round2(gross - statedNetSalary);
      if (Math.abs(impliedTotal - neededTotal) > 0.01 && statedTotalDeductions > 0) {
        const fixedOther = round2(neededTotal - employeeGosi - advancePayment);
        deductions = [
          ...deductionItems.filter(l => l.key !== "other"),
          { key: "other", label: partialPeriod ? (note || "Partial-period adjustment") : "Adjustment (see note)", amount: fixedOther },
        ].filter(l => l.amount !== 0);
        reconciliationNote = `Source sheet lists total deductions of SAR ${statedTotalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })} but a net of SAR ${statedNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}; this payslip reconciles to the net (adjustment shown as SAR ${fixedOther.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Confirm the correct deduction split before issuing.`;
      }

      const totalDeductions = round2(deductions.reduce((s, l) => s + l.amount, 0));
      const netSalarySar = round2(gross - totalDeductions);

      // Transfer amount: SAR employees are paid netSalarySar directly.
      // Foreign-currency employees are paid netSalarySar converted at the
      // fixed 3.75 peg — preferring the sheet's own stated figure when present.
      const isForeign = currency !== "SAR" && currency !== "";
      const transferAmount = isForeign
        ? (toBeTransferred ?? round2(netSalarySar / SAR_PEG_RATE))
        : (toBeTransferred ?? netSalarySar);

      const name = str(at(row, "name"));
      const employmentType = str(at(row, "employmentType")) || "Full time";
      const location = str(at(row, "location"));
      const idTypeRaw = str(at(row, "idType"));
      const isPartTime = employmentType.toLowerCase().includes("part");

      // ── Compliance classification ────────────────────────────────────
      const workerCategory = classifyWorker(idTypeRaw, location);
      const categoryLabel = {
        saudi_ksa: "Saudi National — THINK-AI KSA entity",
        expat_ksa_visa: "Expatriate — KSA entity, work visa (Iqama)",
        expat_remote: "Expatriate — remote, home country (no KSA visa)",
      }[workerCategory];

      const gosiBase = round2(Math.min(basicSalary + housing, GOSI_BASE_CAP_SAR));
      let gosiRegimeNote: string | undefined;
      let expectedEmployeeGosi = 0;
      let expectedEmployerGosi = 0;

      if (workerCategory === "saudi_ksa") {
        const joinDate = parseSheetDate(at(row, "joiningDate"));
        const newRegime = !joinDate || joinDate >= GOSI_NEW_REGIME_CUTOFF;
        const rate = newRegime ? GOSI_SAUDI_NEW_REGIME_2026 : GOSI_SAUDI_EXISTING;
        expectedEmployeeGosi = round2(gosiBase * rate.employee);
        expectedEmployerGosi = round2(gosiBase * rate.employer);
        gosiRegimeNote = newRegime
          ? `Saudi — new GOSI regime (post-3-Jul-2024): employee ${(rate.employee * 100).toFixed(2)}% / employer ${(rate.employer * 100).toFixed(2)}% of basic+housing (capped ${GOSI_BASE_CAP_SAR.toLocaleString()}). Rate steps up each July — verify current % on gosi.gov.sa.`
          : `Saudi — existing GOSI regime (pre-3-Jul-2024): employee ${(rate.employee * 100).toFixed(2)}% / employer ${(rate.employer * 100).toFixed(2)}% of basic+housing (capped ${GOSI_BASE_CAP_SAR.toLocaleString()}).`;
      } else if (workerCategory === "expat_ksa_visa") {
        expectedEmployeeGosi = 0;
        expectedEmployerGosi = round2(gosiBase * GOSI_EXPAT.employer);
        gosiRegimeNote = `Expatriate on KSA payroll — GOSI is employer-paid only (${(GOSI_EXPAT.employer * 100).toFixed(0)}% occupational hazard), no employee deduction, no pension/unemployment accrual.`;
      } else {
        gosiRegimeNote = "Remote/home-country employee — not GOSI-registered in KSA (no Saudi employment relationship for social-insurance purposes).";
      }

      const gosiFlags: string[] = [];
      if (workerCategory !== "expat_remote") {
        if (Math.abs(employeeGosi - expectedEmployeeGosi) > GOSI_RECONCILIATION_TOLERANCE) {
          gosiFlags.push(`Employee GOSI in sheet (SAR ${employeeGosi.toLocaleString(undefined, { minimumFractionDigits: 2 })}) doesn't match the expected ${gosiBase.toLocaleString()} × rate = SAR ${expectedEmployeeGosi.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
        }
        if (Math.abs(gosiEmployer - expectedEmployerGosi) > GOSI_RECONCILIATION_TOLERANCE) {
          gosiFlags.push(`Employer GOSI in sheet (SAR ${gosiEmployer.toLocaleString(undefined, { minimumFractionDigits: 2 })}) doesn't match the expected SAR ${expectedEmployerGosi.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`);
        }
      }

      // WPS/Mudad only covers KSA-payroll employees paid in SAR via a local IBAN.
      const wpsNote = workerCategory === "expat_remote"
        ? "Outside WPS/Mudad scope — international payment to a non-KSA bank account, not a Saudi labor-law employment relationship."
        : "Subject to WPS: must be paid in SAR via a KSA-bank IBAN in the employee's name, reported on the monthly Mudad wage file.";

      // Nitaqat only counts Saudi nationals paid via KSA payroll, at/above the wage floor.
      let nitaqatNote: string | undefined;
      if (workerCategory === "saudi_ksa") {
        const belowFloor = basicSalary > 0 && basicSalary < NITAQAT_MIN_WAGE_SAR;
        if (belowFloor) {
          nitaqatNote = `⚠ Basic salary (SAR ${basicSalary.toLocaleString()}) is below the SAR ${NITAQAT_MIN_WAGE_SAR.toLocaleString()}/month Nitaqat floor — counts as 0.5 or not at all. Some professions (e.g. engineering) have a higher floor (SAR 8,000) not derivable from this sheet — verify by role.`;
        } else if (isPartTime) {
          nitaqatNote = "Part-time Saudi — counts as 0.5 toward Nitaqat if hours are ≥50% of full-time / ≥160 hrs per month (verify actual hours worked).";
        } else if (!qiwaRegistered) {
          nitaqatNote = "⚠ Not marked Qiwa-registered — a Saudi employee without a digitally countersigned Qiwa contract does not count toward Nitaqat.";
        } else {
          nitaqatNote = "Meets the general wage floor and is Qiwa-registered — counts toward Nitaqat (subject to profession-level quota rules not derivable from payroll data alone).";
        }
      }

      const flagged = !!reconciliationNote || gosiFlags.length > 0 || (isForeign ? false : toBeTransferred === null && netSalarySar !== 0);

      return {
        employeeIdCode: str(at(row, "employeeId")),
        name,
        workEmail: guessEmail(name),
        location,
        joiningDate: fmtDate(at(row, "joiningDate")),
        employmentType,
        subtitle: [employmentType.toUpperCase(), location.toUpperCase(), qiwaRegistered ? "QIWA REGISTERED" : ""].filter(Boolean).join(" · "),
        qiwaRegistered,
        idType: str(at(row, "idType")),
        idTypeLabel: idTypeLabel(str(at(row, "idType"))),
        idNumber: str(at(row, "idNumber")),
        iban: str(at(row, "iban")),
        bank: str(at(row, "bank")),
        contact: str(at(row, "contact")),
        currency: isForeign ? currency : "SAR",
        isForeign,
        earnings,
        deductions,
        gross,
        totalDeductions,
        netSalarySar,
        transferAmount,
        gosiEmployer,
        note: note || undefined,
        reconciliationNote,
        flagged,
        payPeriod: period,
        workerCategory,
        categoryLabel,
        gosiRegimeNote,
        gosiFlags,
        wpsNote,
        nitaqatNote,
      };
    });

    return NextResponse.json({ rows, columnMapping, mappedByAI: !!ai });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /admin/payroll/parse:", msg);
    return NextResponse.json({ error: "Failed to parse payroll file: " + msg }, { status: 500 });
  }
}
