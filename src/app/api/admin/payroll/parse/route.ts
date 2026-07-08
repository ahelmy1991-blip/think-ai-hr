import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

function fmtDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  const s = str(v);
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function idTypeLabel(idType: string): string {
  const t = idType.toLowerCase();
  if (t.includes("passport")) return "Passport no.";
  if (t.includes("iqama")) return "Iqama no.";
  if (t.includes("saudi") || t.includes("national")) return "National ID no.";
  return idType ? `${idType} no.` : "ID no.";
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
      const othersIncome = num(row[COL.othersIncome]);
      const basicSalary = num(row[COL.basicSalary]);
      const housing = num(row[COL.housing]);
      const transport = num(row[COL.transport]);
      const totalIncome = num(row[COL.totalIncome]);
      const employeeGosi = num(row[COL.employeeGosi]);
      const advancePayment = num(row[COL.advancePayment]);
      const othersDeduction = num(row[COL.othersDeduction]);
      const totalDeductions = num(row[COL.totalDeductions]);
      const netSalaryNative = num(row[COL.netSalaryNative]);
      const toBeTransferredRaw = row[COL.toBeTransferred];
      const toBeTransferred = toBeTransferredRaw != null && str(toBeTransferredRaw) !== "" ? num(toBeTransferredRaw) : null;
      const note = str(row[COL.note]);

      let earnings: { label: string; amount: number }[];
      let deductions: { label: string; amount: number }[];
      let gross: number;
      let flagged = false;

      if (currency === "SAR") {
        // Native currency — every figure already reconciles exactly, no conversion needed.
        earnings = [
          { label: "Basic Salary", amount: basicSalary },
          { label: "Housing Allowance", amount: housing },
          { label: "Transportation Allowance", amount: transport },
          { label: "Other", amount: othersIncome },
        ].filter(l => l.amount !== 0);
        deductions = [
          { label: "GOSI (Employee)", amount: employeeGosi },
          { label: "Advance Payment", amount: advancePayment },
          { label: "Other", amount: othersDeduction },
        ].filter(l => l.amount !== 0);
        gross = totalIncome;
      } else {
        // Paid in a different currency than the sheet's SAR-tracked figures.
        // Base pay = net transfer amount minus "Others" (Others is carried
        // over as-is, already in the transfer currency in this sheet).
        const net = toBeTransferred ?? (totalIncome - totalDeductions);
        const base = net - othersIncome;
        earnings = [{ label: "Base pay", amount: base }];
        if (othersIncome !== 0) earnings.push({ label: "Other", amount: othersIncome });
        gross = net;
        if (totalDeductions !== 0) {
          // Not observed in the reference data (foreign-currency rows had
          // zero deductions) — surfaced as-is and flagged for manual check.
          deductions = [
            { label: "GOSI (Employee)", amount: employeeGosi },
            { label: "Advance Payment", amount: advancePayment },
            { label: "Other", amount: othersDeduction },
          ].filter(l => l.amount !== 0);
          flagged = true;
        } else {
          deductions = [];
        }
      }

      const totalDedComputed = deductions.reduce((s, l) => s + l.amount, 0);
      const netPay = toBeTransferred ?? (gross - totalDedComputed);
      if (toBeTransferred === null) flagged = true;
      if (note) flagged = true;

      const name = str(row[COL.name]);

      return {
        employeeIdCode: str(row[COL.employeeId]),
        name,
        workEmail: guessEmail(name),
        location: str(row[COL.location]),
        joiningDate: fmtDate(row[COL.joiningDate]),
        employmentType: str(row[COL.employmentType]) || "Full time",
        idType: str(row[COL.idType]),
        idTypeLabel: idTypeLabel(str(row[COL.idType])),
        idNumber: str(row[COL.idNumber]),
        iban: str(row[COL.iban]),
        bank: str(row[COL.bank]),
        contact: str(row[COL.contact]),
        currency,
        earnings,
        deductions,
        gross,
        totalDeductions: totalDedComputed,
        netPay,
        note: note || undefined,
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
