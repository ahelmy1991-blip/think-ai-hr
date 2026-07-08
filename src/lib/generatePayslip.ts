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

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
body { font-family: -apple-system, Segoe UI, Outfit, Arial, sans-serif; color: #1a2540; background: #fff; padding: 36px 44px; max-width: 720px; margin: 0 auto; }
@media print { body { padding: 10px 20px; } .no-print { display: none !important; } @page { size: A4; margin: 15mm; } }
.print-bar { background: #0a1628; color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; display: flex; gap: 12px; }
.print-bar button { padding: 8px 18px; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-print { background: #e8c97a; color: #0a1628; }
.btn-close { background: rgba(255,255,255,0.15); color: white; }
.top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
.wordmark { font-size: 22px; font-weight: 800; color: #0a1628; }
.wordmark span { color: #2563eb; }
.subtitle { font-size: 12px; color: #6b7a99; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 2px; }
.period-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; text-align: right; }
.period-value { font-size: 15px; font-weight: 700; color: #1a2540; text-align: right; }
.name { font-size: 22px; font-weight: 700; color: #0a1628; margin: 8px 0 20px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 32px; margin-bottom: 24px; font-size: 13px; }
.info-grid .k { color: #6b7a99; }
.info-grid .v { font-weight: 700; float: right; }
.info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding: 4px 0; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
.col-head { font-size: 11px; font-weight: 700; color: #6b7a99; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; }
table.lines { width: 100%; border-collapse: collapse; font-size: 13px; }
table.lines td { padding: 5px 0; }
table.lines td.li { color: #1a2540; }
table.lines td.amt { text-align: right; font-variant-numeric: tabular-nums; }
table.lines tr.total td { border-top: 2px solid #0a1628; font-weight: 700; padding-top: 8px; }
.net-wrap { border-top: 1px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: baseline; }
.net-label { font-size: 13px; color: #6b7a99; letter-spacing: 0.06em; text-transform: uppercase; }
.net-amount { font-size: 30px; font-weight: 800; color: #2563eb; }
.net-amount .cur { font-size: 15px; font-weight: 700; color: #6b7a99; margin-left: 6px; }
.note-box { margin-top: 18px; padding: 10px 14px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; color: #92400e; }
.footer { margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn-print" onclick="window.print()">🖨 Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="top">
    <div>
      <div class="wordmark">think<span>ai</span></div>
      <div class="subtitle">Salary Payslip</div>
    </div>
    <div>
      <div class="period-label">Pay Period</div>
      <div class="period-value">${d.payPeriod}</div>
    </div>
  </div>

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

  <div class="footer">
    <span>THINK-AI · This is a computer-generated payslip.</span>
    <span>Transfer reference: ${d.transferReference || "pending"}</span>
  </div>
</body>
</html>`;
}
