import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fixed SAR/USD peg used by the payroll sheet for any employee paid in a
// currency other than SAR — confirmed by back-solving every foreign-currency
// row in the reference workbook (e.g. 15,225 SAR / 3.75 = 4,060.00 USD exactly).
const SAR_PEG_RATE = 3.75;

type ColKey =
  | "employeeId" | "name" | "location" | "joiningDate" | "employmentType" | "qiwaId"
  | "idType" | "idNumber" | "iban" | "bank" | "contact" | "gosiPct" | "salaryUsdRef"
  | "basicSalary" | "housing" | "transport" | "othersIncome" | "totalIncome"
  | "employeeGosi" | "advancePayment" | "othersDeduction" | "totalDeductions"
  | "netSalaryNative" | "gosiEmployer" | "payableToGosi" | "toBeTransferred"
  | "currency" | "note" | "sarEquivalent";

// Columns required to produce a usable payslip — everything else degrades
// gracefully to blank/zero if genuinely absent from a given month's sheet.
const REQUIRED_COLS: ColKey[] = ["employeeId", "name", "basicSalary", "totalIncome", "totalDeductions", "netSalaryNative"];

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

// Resolves each field to a column INDEX by matching header text, instead of
// assuming a fixed position — the sheet's exact column count/order has
// changed between months, which silently broke position-based mapping.
// Two header labels repeat ("Type" for employment type vs. ID type, "Others"
// for income vs. deduction) and are disambiguated by their position relative
// to landmark columns (Qiwa ID / Total Income / Advance Payment).
function resolveColumns(headerRow: unknown[]): { map: Partial<Record<ColKey, number>>; missing: ColKey[] } {
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

  const map: Partial<Record<ColKey, number>> = {
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
    basicSalary: set(find(c => c.startsWith("basic salary"))),
    housing: set(find(c => c.startsWith("housing"))),
    transport: set(find(c => c.startsWith("transportation"))),
    othersIncome: set(othersIncome ?? -1),
    totalIncome: set(totalIncome),
    employeeGosi: set(find(c => c.startsWith("employee gosi"))),
    advancePayment: set(advancePayment),
    othersDeduction: set(othersDeduction ?? -1),
    totalDeductions: set(find(c => c.startsWith("total deductions"))),
    netSalaryNative: set(find(c => c.startsWith("net salary"))),
    gosiEmployer: set(find(c => c.startsWith("gosi employer"))),
    payableToGosi: set(find(c => c.startsWith("payable to gosi"))),
    currency: set(find(c => c.startsWith("curran") || c.startsWith("currency"))),
    note: set(find(c => c === "note")),
    sarEquivalent: set(find(c => c.includes("sar") && (c.includes("equilevent") || c.includes("equivalent")))),
    toBeTransferred: set(find(c => c.startsWith("to be transfe") && !c.includes("sar") && !c.includes("equilevent") && !c.includes("equivalent"))),
  };

  const missing = REQUIRED_COLS.filter(k => map[k] === undefined);
  return { map, missing };
}

// Locate the header row by searching every cell (not just column 0) for
// "Employee ID" — some exports have a leading "Month" row or blank column.
function findHeaderRow(raw: unknown[][]): number {
  for (let r = 0; r < raw.length; r++) {
    if (raw[r].some(c => normalizeHeader(c) === "employee id")) return r;
  }
  return -1;
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

    // Search every sheet for the header row, not just the first — some
    // workbooks have a cover/summary sheet before the actual data sheet.
    let raw: unknown[][] = [];
    let headerIdx = -1;
    for (const sheetName of wb.SheetNames) {
      const candidate: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
      const idx = findHeaderRow(candidate);
      if (idx !== -1) { raw = candidate; headerIdx = idx; break; }
    }

    if (headerIdx === -1) {
      return NextResponse.json({ error: "Could not find an 'Employee ID' column header in this file — is this the standard payroll workbook?" }, { status: 400 });
    }

    const { map: col, missing } = resolveColumns(raw[headerIdx]);
    if (missing.length > 0) {
      const detectedHeaders = raw[headerIdx].map(str).filter(s => s !== "");
      return NextResponse.json({
        error: `Could not find these expected columns in the header row: ${missing.join(", ")}. Check the file hasn't dropped or renamed them.`,
        detectedHeaders,
      }, { status: 400 });
    }
    const at = (row: unknown[], key: ColKey) => (col[key] !== undefined ? row[col[key] as number] : "");

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

      const flagged = !!reconciliationNote || (isForeign ? false : toBeTransferred === null && netSalarySar !== 0);

      const name = str(at(row, "name"));
      const employmentType = str(at(row, "employmentType")) || "Full time";
      const location = str(at(row, "location"));

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
      };
    });

    return NextResponse.json({ rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /admin/payroll/parse:", msg);
    return NextResponse.json({ error: "Failed to parse payroll file: " + msg }, { status: 500 });
  }
}
