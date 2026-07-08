export interface PayslipLine { label: string; amount: number; }

export interface PayslipData {
  employeeIdCode: string;
  name: string;
  idTypeLabel: string; // e.g. "Passport no.", "Iqama no.", "National ID no."
  idNumber: string;
  employmentType: string;
  location: string;
  joiningDate: string; // display-ready, e.g. "2 Feb 2026"
  payPeriod: string; // e.g. "June 2026"
  bank: string;
  iban: string;
  contact: string;
  workEmail: string;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  gross: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  note?: string;
  transferReference?: string;
}

// THINK-AI brand tokens (authoritative — see thinkai-brand skill)
const INK = "#0A0A0F";
const INK_2 = "#14141C";
const BONE = "#F7F5F0";
const SOVEREIGN_BLUE = "#2F6FFF";
const ICE_BLUE = "#6FB4FF";
const WHITE = "#FFFFFF";
const SLATE = "#8B8D98";
const SLATE_DARK = "#5B5D68";
const LINE_LIGHT = "#DEDAD0";

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// The one recurring THINK-AI motif — a small connected node cluster, corner-anchored.
function nodeCluster(): string {
  const nodes = [
    { x: 4, y: 6, r: 2.5, c: ICE_BLUE }, { x: 18, y: 3, r: 2.5, c: SOVEREIGN_BLUE },
    { x: 30, y: 12, r: 3.5, c: SOVEREIGN_BLUE }, { x: 14, y: 18, r: 2.5, c: ICE_BLUE },
    { x: 34, y: 26, r: 2.5, c: ICE_BLUE }, { x: 6, y: 26, r: 2, c: SOVEREIGN_BLUE },
  ];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [3, 5]];
  const lines = edges.map(([a, b]) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}" stroke="${SOVEREIGN_BLUE}" stroke-width="0.6" opacity="0.5"/>`).join("");
  const dots = nodes.map(n => `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="${n.c}"/>`).join("");
  return `<svg width="40" height="32" viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg">${lines}${dots}</svg>`;
}

export function generatePayslipHTML(d: PayslipData): string {
  const earningsRows = d.earnings.length
    ? d.earnings.map(l => `<tr><td class="li">${l.label}</td><td class="amt">${money(l.amount)}</td></tr>`).join("")
    : `<tr><td class="li">None</td><td class="amt">0.00</td></tr>`;

  const deductionRows = d.deductions.length
    ? d.deductions.map(l => `<tr><td class="li">${l.label}</td><td class="amt">${money(l.amount)}</td></tr>`).join("")
    : `<tr><td class="li">None</td><td class="amt">0.00</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>THINK-AI Payslip — ${d.name} — ${d.payPeriod}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Calibri, Arial, sans-serif; color: ${INK}; background: ${WHITE}; max-width: 760px; margin: 0 auto; }
@media print { .no-print { display: none !important; } @page { size: A4; margin: 0; } }
.print-bar { background: ${INK}; color: ${WHITE}; padding: 12px 20px; display: flex; gap: 12px; }
.print-bar button { padding: 8px 18px; border: none; border-radius: 4px; font-family: Arial, sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-print { background: ${SOVEREIGN_BLUE}; color: ${WHITE}; }
.btn-close { background: ${INK_2}; color: ${WHITE}; border: 1px solid #2a2a36; }

.band { background: ${INK}; padding: 30px 44px; display: flex; justify-content: space-between; align-items: flex-start; }
.wordmark { font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${WHITE}; letter-spacing: 0.01em; }
.wordmark span { color: ${SOVEREIGN_BLUE}; }
.subtitle { font-family: Arial, sans-serif; font-size: 11px; color: ${SLATE}; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 6px; }
.band-right { text-align: right; }
.period-label { font-family: Arial, sans-serif; font-size: 10px; color: ${SLATE}; text-transform: uppercase; letter-spacing: 0.12em; }
.period-value { font-family: Arial, sans-serif; font-size: 16px; font-weight: 700; color: ${WHITE}; margin-top: 4px; }
.node-wrap { margin-top: 10px; opacity: 0.9; }

.body { padding: 32px 44px 24px; background: ${WHITE}; }
.name { font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; color: ${INK}; margin-bottom: 20px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; margin-bottom: 26px; font-size: 13px; }
.info-row { display: flex; justify-content: space-between; border-bottom: 1px solid ${LINE_LIGHT}; padding: 7px 0; }
.info-row .k { color: ${SLATE_DARK}; }
.info-row .v { font-weight: 700; color: ${INK}; text-align: right; }

.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 26px; background: ${BONE}; padding: 20px 24px; border-radius: 2px; }
.col-head { font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: ${SLATE_DARK}; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
table.lines { width: 100%; border-collapse: collapse; font-size: 13px; }
table.lines td { padding: 5px 0; }
table.lines td.li { color: ${INK}; }
table.lines td.amt { text-align: right; font-variant-numeric: tabular-nums; }
table.lines tr.total td { border-top: 1px solid ${INK}; font-family: Arial, sans-serif; font-weight: 700; padding-top: 9px; }

.net-wrap { padding-top: 22px; border-top: 2px solid ${INK}; display: flex; justify-content: space-between; align-items: baseline; }
.net-label { font-family: Arial, sans-serif; font-size: 12px; color: ${SLATE_DARK}; letter-spacing: 0.1em; text-transform: uppercase; }
.net-amount { font-family: Arial, sans-serif; font-size: 34px; font-weight: 700; color: ${SOVEREIGN_BLUE}; }
.net-amount .cur { font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; color: ${SLATE_DARK}; margin-left: 8px; }

.note-box { margin-top: 20px; padding: 12px 16px; background: ${BONE}; border-left: 2px solid ${SOVEREIGN_BLUE}; font-size: 12px; color: ${SLATE_DARK}; }
.note-box strong { color: ${INK}; }

.footer { margin-top: 30px; border-top: 1px solid ${LINE_LIGHT}; padding: 14px 44px 22px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; font-size: 10px; color: ${SLATE}; letter-spacing: 0.03em; }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="band">
    <div>
      <div class="wordmark">think<span>ai</span></div>
      <div class="subtitle">Salary Payslip</div>
    </div>
    <div class="band-right">
      <div class="period-label">Pay Period</div>
      <div class="period-value">${d.payPeriod}</div>
      <div class="node-wrap">${nodeCluster()}</div>
    </div>
  </div>

  <div class="body">
    <div class="name">${d.name}</div>

    <div class="info-grid">
      <div class="info-row"><span class="k">Employee ID</span><span class="v">${d.employeeIdCode}</span></div>
      <div class="info-row"><span class="k">${d.idTypeLabel}</span><span class="v">${d.idNumber}</span></div>
      <div class="info-row"><span class="k">Employment type</span><span class="v">${d.employmentType}</span></div>
      <div class="info-row"><span class="k">Location</span><span class="v">${d.location}</span></div>
      <div class="info-row"><span class="k">Joining date</span><span class="v">${d.joiningDate}</span></div>
      <div class="info-row"><span class="k">Pay period</span><span class="v">${d.payPeriod}</span></div>
      <div class="info-row"><span class="k">Bank</span><span class="v">${d.bank}</span></div>
      <div class="info-row"><span class="k">IBAN</span><span class="v">${d.iban}</span></div>
      <div class="info-row"><span class="k">Contact</span><span class="v">${d.contact}</span></div>
      <div class="info-row"><span class="k">Work email</span><span class="v">${d.workEmail}</span></div>
    </div>

    <div class="cols">
      <div>
        <div class="col-head">Earnings</div>
        <table class="lines">
          ${earningsRows}
          <tr class="total"><td>Gross</td><td class="amt">${money(d.gross)}</td></tr>
        </table>
      </div>
      <div>
        <div class="col-head">Deductions</div>
        <table class="lines">
          ${deductionRows}
          <tr class="total"><td>Total deductions</td><td class="amt">${money(d.totalDeductions)}</td></tr>
        </table>
      </div>
    </div>

    <div class="net-wrap">
      <div class="net-label">Net Pay Transferred</div>
      <div class="net-amount">${money(d.netPay)}<span class="cur">${d.currency}</span></div>
    </div>

    ${d.note ? `<div class="note-box"><strong>Note:</strong> ${d.note}</div>` : ""}
  </div>

  <div class="footer">
    <span>think<span style="color:${SOVEREIGN_BLUE}">ai</span> · This is a computer-generated payslip</span>
    <span>Transfer reference: ${d.transferReference || "pending"}</span>
  </div>
</body>
</html>`;
}
