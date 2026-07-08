import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Fixed SAR/USD peg used by the payroll sheet for any employee paid in a
// currency other than SAR — confirmed by back-solving every foreign-currency
// row in the reference workbook (e.g. 15,225 SAR / 3.75 = 4,060.00 USD exactly).
const SAR_PEG_RATE = 3.75;

// Fixed column layout of the monthly payroll workbook (0-indexed).
// Kept index-based (not header-name lookup) because the sheet has two
// columns both literally named "Others" (income vs. deduction) and two
// named "Type" (employment type vs. ID type) — header lookup would collide.
const COL = {
  employeeId: 0, name: 1, location: 2, joiningDate: 3, employmentType: 4,
  qiwaId: 5, idType: 6, idNumber: 7, iban: 8, bank: 9, contact: 10,
  gosiPct: 11, salaryUsdRef: 12, basicSalary: 13, housing: 14, transport: 15,
  othersIncome: 16, totalIncome: 17, employeeGosi: 18, advancePayment: 19,
  othersDeduction: 20, totalDeductions: 21, netSalaryNative: 22, gosiEmployer: 23,
  payableToGosi: 24, toBeTransferred: 25, currency: 26, note: 27, sarEquivalent: 28,
} as const;

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

// Locate the header row + starting column by searching for a cell that
// says "Employee ID", instead of assuming row 0 / column 0 — some exports
// have a leading "Month" row or a blank first column.
function findHeader(raw: unknown[][]): { rowIdx: number; colOffset: number } | null {
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r];
    for (let c = 0; c < Math.min(row.length, 6); c++) {
      if (str(row[c]).toLowerCase() === "employee id") {
        return { rowIdx: r, colOffset: c };
      }
    }
  }
  return null;
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
    let header: { rowIdx: number; colOffset: number } | null = null;
    for (const sheetName of wb.SheetNames) {
      const candidate: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: "" });
      const found = findHeader(candidate);
      if (found) { raw = candidate; header = found; break; }
    }

    if (!header) {
      return NextResponse.json({ error: "Could not find an 'Employee ID' column header in this file — is this the standard payroll workbook?" }, { status: 400 });
    }

    const { rowIdx: headerIdx, colOffset } = header;
    const at = (row: unknown[], key: keyof typeof COL) => row[COL[key] + colOffset];

    const dataRows = raw.slice(headerIdx + 1).filter(row => {
      const name = str(at(row, "name"));
      return str(at(row, "employeeId")) !== "" && name !== "" && name.toLowerCase() !== "employee name";
    });

    if (dataRows.length === 0) {
      return NextResponse.json({ error: "Found the header row but no employee rows underneath it — check the file has data below the header." }, { status: 400 });
    }

    const rows = dataRows.map(fullRow => {
      const row = fullRow.slice(colOffset);
      const currency = (str(row[COL.currency]) || "SAR").toUpperCase();
      const basicSalary = num(row[COL.basicSalary]);
      const housing = num(row[COL.housing]);
      const transport = num(row[COL.transport]);
      const othersIncome = num(row[COL.othersIncome]);
      const totalIncome = num(row[COL.totalIncome]) || (basicSalary + housing + transport + othersIncome);
      const employeeGosi = num(row[COL.employeeGosi]);
      const advancePayment = num(row[COL.advancePayment]);
      const othersDeduction = num(row[COL.othersDeduction]);
      const statedTotalDeductions = num(row[COL.totalDeductions]);
      const statedNetSalary = num(row[COL.netSalaryNative]) || round2(totalIncome - statedTotalDeductions);
      const gosiEmployer = num(row[COL.gosiEmployer]);
      const toBeTransferredRaw = row[COL.toBeTransferred];
      const toBeTransferred = toBeTransferredRaw != null && str(toBeTransferredRaw) !== "" ? num(toBeTransferredRaw) : null;
      const qiwaRegistered = str(row[COL.qiwaId]).toLowerCase() === "yes";
      const note = str(row[COL.note]);
      const partialPeriod = note ? looksPartialPeriod(note) : false;

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
        { key: "gosi", label: `Employee GOSI${row[COL.gosiPct] ? ` (${(num(row[COL.gosiPct]) < 1 ? num(row[COL.gosiPct]) * 100 : num(row[COL.gosiPct])).toFixed(2).replace(/\.00$/, "")}%)` : ""}`, amount: employeeGosi },
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

      const name = str(row[COL.name]);
      const employmentType = str(row[COL.employmentType]) || "Full time";
      const location = str(row[COL.location]);

      return {
        employeeIdCode: str(row[COL.employeeId]),
        name,
        workEmail: guessEmail(name),
        location,
        joiningDate: fmtDate(row[COL.joiningDate]),
        employmentType,
        subtitle: [employmentType.toUpperCase(), location.toUpperCase(), qiwaRegistered ? "QIWA REGISTERED" : ""].filter(Boolean).join(" · "),
        qiwaRegistered,
        idType: str(row[COL.idType]),
        idTypeLabel: idTypeLabel(str(row[COL.idType])),
        idNumber: str(row[COL.idNumber]),
        iban: str(row[COL.iban]),
        bank: str(row[COL.bank]),
        contact: str(row[COL.contact]),
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
