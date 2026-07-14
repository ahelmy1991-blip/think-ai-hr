export interface PayslipLine { label: string; amount: number; }

export interface PayslipData {
  employeeIdCode: string;
  name: string;
  subtitle: string; // e.g. "FULL TIME · KSA · QIWA REGISTERED"
  idTypeLabel: string; // e.g. "PASSPORT NO.", "KSA IQAMA NO.", "SAUDI ID NO."
  idNumber: string;
  employmentType: string;
  location: string;
  joiningDate: string; // display-ready, e.g. "2 Feb 2026" or "—"
  payPeriod: string; // e.g. "June 2026"
  qiwaRegistered: boolean;
  bank: string;
  iban: string;
  contact: string;
  earnings: PayslipLine[];
  deductions: PayslipLine[];
  gross: number;
  totalDeductions: number;
  netSalarySar: number;
  transferAmount: number;
  currency: string; // "SAR" or the foreign transfer currency
  isForeign: boolean;
  gosiEmployer?: number;
  note?: string;
  reconciliationNote?: string;
  transferReference?: string;
  categoryLabel?: string;
  gosiRegimeNote?: string;
  wpsNote?: string;
  nitaqatNote?: string;
  gosiFlags?: string[];
}

const NAVY = "#0a1628";
const NAVY_2 = "#14213e";

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generatePayslipHTML(d: PayslipData): string {
  const earningsRows = d.earnings.length
    ? d.earnings.map(l => `<tr><td class="li">${l.label}</td><td class="amt">${money(l.amount)}</td></tr>`).join("")
    : `<tr><td class="li muted">None</td><td class="amt muted">0.00</td></tr>`;

  const deductionRows = d.deductions.length
    ? d.deductions.map(l => `<tr><td class="li">${l.label}</td><td class="amt">${money(l.amount)}</td></tr>`).join("")
    : `<tr><td class="li muted">None</td><td class="amt muted">0.00</td></tr>`;

  const netBand = d.isForeign
    ? `<div class="net-wrap">
         <div class="net-label">Amount Transferred</div>
         <div class="net-amount">${money(d.transferAmount)}<span class="cur">${d.currency}</span></div>
       </div>
       <div class="fx-caption">Net salary ${money(d.netSalarySar)} SAR · transferred in ${d.currency} at SAR 3.75 = 1 ${d.currency}</div>`
    : `<div class="net-wrap">
         <div class="net-label">Net Pay Transferred</div>
         <div class="net-amount">${money(d.transferAmount)}<span class="cur">SAR</span></div>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>THINK-AI Payslip — ${d.name} — ${d.payPeriod}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, Segoe UI, Arial, sans-serif; color: #0a1628; background: #fff; max-width: 760px; margin: 0 auto; }
@media print { .no-print { display: none !important; } @page { size: A4; margin: 0; } }
.print-bar { background: ${NAVY}; color: white; padding: 12px 20px; display: flex; gap: 12px; }
.print-bar button { padding: 8px 18px; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; }
.btn-print { background: #e8c97a; color: ${NAVY}; }
.btn-close { background: rgba(255,255,255,0.15); color: white; }

.band { background: linear-gradient(135deg, ${NAVY}, ${NAVY_2}); padding: 26px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
.brand { display: flex; align-items: center; gap: 10px; }
.chip { width: 26px; height: 26px; flex: none; }
.wordmark { font-size: 22px; font-weight: 800; color: white; letter-spacing: 0.01em; }
.wordmark sup { font-size: 10px; }
.subtitle { font-size: 11px; color: #8fa3c9; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 4px; font-family: monospace; }
.band-right { text-align: right; }
.period-label { font-size: 10px; color: #8fa3c9; text-transform: uppercase; letter-spacing: 0.14em; font-family: monospace; }
.period-value { font-size: 18px; font-weight: 700; color: white; margin-top: 4px; }

.body { padding: 28px 40px 22px; background: #fff; }
.name { font-size: 24px; font-weight: 700; color: ${NAVY}; margin-bottom: 4px; }
.emp-subtitle { font-size: 11px; color: #6b7a99; letter-spacing: 0.1em; text-transform: uppercase; font-family: monospace; margin-bottom: 20px; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; margin-bottom: 24px; font-size: 13px; }
.info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #eef1f6; padding: 7px 0; }
.info-row .k { color: #8b93a7; font-family: monospace; font-size: 11px; letter-spacing: 0.04em; }
.info-row .v { font-weight: 700; color: ${NAVY}; text-align: right; }
.info-row.wide { grid-column: 1 / -1; }

.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 22px; }
.col-head { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; }
.col-head.earn { color: #2563eb; border-bottom: 2px solid #2563eb; }
.col-head.ded { color: #b91c1c; border-bottom: 2px solid #b91c1c; }
table.lines { width: 100%; border-collapse: collapse; font-size: 13px; }
table.lines td { padding: 6px 0; border-bottom: 1px solid #f1f4f9; }
table.lines td.li { color: ${NAVY}; }
table.lines td.li.muted, table.lines td.amt.muted { color: #a3adc2; }
table.lines td.amt { text-align: right; font-variant-numeric: tabular-nums; }
table.lines tr.total td { border-top: 2px solid ${NAVY}; border-bottom: none; font-weight: 700; padding-top: 9px; }

.net-wrap { background: ${NAVY}; border-radius: 8px; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
.net-label { font-size: 12px; color: #8fa3c9; letter-spacing: 0.1em; text-transform: uppercase; font-family: monospace; }
.net-amount { font-size: 30px; font-weight: 800; color: white; }
.net-amount .cur { font-size: 14px; font-weight: 700; color: #8fa3c9; margin-left: 8px; }
.fx-caption { text-align: right; font-size: 11px; color: #8b93a7; margin-top: 8px; font-family: monospace; }

.remark-box { margin-top: 18px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; color: #92400e; }
.remark-box strong { color: #78350f; }
.warn-box { margin-top: 12px; padding: 12px 16px; background: #fef2f2; border-left: 3px solid #dc2626; font-size: 12px; color: #7f1d1d; }
.warn-box strong { color: #991b1b; }

.compliance { margin-top: 20px; padding: 14px 16px; background: #f8fafc; border: 1px solid #eef1f6; border-radius: 8px; }
.compliance-head { font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8b93a7; margin-bottom: 8px; }
.compliance-row { font-size: 11px; color: #475569; line-height: 1.6; margin-bottom: 4px; }
.compliance-row b { color: ${NAVY}; }
.compliance-row.warn { color: #92400e; }

.footer { margin-top: 26px; border-top: 1px solid #eef1f6; padding: 12px 40px 20px; font-size: 11px; color: #94a3b8; }
.footer-row { display: flex; justify-content: space-between; }
.footer-gosi { margin-top: 6px; color: #a3adc2; }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">Close</button>
  </div>

  <div class="band">
    <div class="brand">
      <svg class="chip" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="#e8c97a" stroke-width="1.4"/>
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.5 4.5l3 3M16.5 16.5l3 3M19.5 4.5l-3 3M7.5 16.5l-3 3" stroke="#e8c97a" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      <div>
        <div class="wordmark">think<sup>™</sup></div>
        <div class="subtitle">› Salary Payslip</div>
      </div>
    </div>
    <div class="band-right">
      <div class="period-label">Pay Period</div>
      <div class="period-value">${d.payPeriod}</div>
    </div>
  </div>

  <div class="body">
    <div class="name">${d.name}</div>
    <div class="emp-subtitle">${d.subtitle}</div>

    <div class="info-grid">
      <div class="info-row"><span class="k">EMPLOYEE ID</span><span class="v">${d.employeeIdCode}</span></div>
      <div class="info-row"><span class="k">${d.idTypeLabel}</span><span class="v">${d.idNumber}</span></div>
      <div class="info-row"><span class="k">EMPLOYMENT TYPE</span><span class="v">${d.employmentType}</span></div>
      <div class="info-row"><span class="k">LOCATION</span><span class="v">${d.location}</span></div>
      <div class="info-row"><span class="k">JOINING DATE</span><span class="v">${d.joiningDate}</span></div>
      <div class="info-row"><span class="k">QIWA REGISTERED</span><span class="v">${d.qiwaRegistered ? "Yes" : "No"}</span></div>
      <div class="info-row"><span class="k">PAY PERIOD</span><span class="v">${d.payPeriod}</span></div>
      <div class="info-row"><span class="k">CONTACT</span><span class="v">${d.contact}</span></div>
      <div class="info-row"><span class="k">BANK</span><span class="v">${d.bank}</span></div>
      <div class="info-row wide"><span class="k">IBAN / ACCOUNT</span><span class="v">${d.iban}</span></div>
    </div>

    <div class="cols">
      <div>
        <div class="col-head earn">Earnings</div>
        <table class="lines">
          ${earningsRows}
          <tr class="total"><td>Gross (SAR)</td><td class="amt">${money(d.gross)}</td></tr>
        </table>
      </div>
      <div>
        <div class="col-head ded">Deductions</div>
        <table class="lines">
          ${deductionRows}
          <tr class="total"><td>Total deductions (SAR)</td><td class="amt">${money(d.totalDeductions)}</td></tr>
        </table>
      </div>
    </div>

    ${netBand}

    ${d.note ? `<div class="remark-box"><strong>Remark:</strong> ${d.note}</div>` : ""}
    ${d.reconciliationNote ? `<div class="warn-box"><strong>Check before issuing:</strong> ${d.reconciliationNote}</div>` : ""}

    ${(d.categoryLabel || d.gosiRegimeNote || d.wpsNote || d.nitaqatNote) ? `
    <div class="compliance">
      <div class="compliance-head">Saudi Labor Law Compliance</div>
      ${d.categoryLabel ? `<div class="compliance-row"><b>Basis:</b> ${d.categoryLabel}</div>` : ""}
      ${d.gosiRegimeNote ? `<div class="compliance-row"><b>GOSI:</b> ${d.gosiRegimeNote}</div>` : ""}
      ${d.wpsNote ? `<div class="compliance-row"><b>WPS / Mudad:</b> ${d.wpsNote}</div>` : ""}
      ${d.nitaqatNote ? `<div class="compliance-row"><b>Nitaqat:</b> ${d.nitaqatNote}</div>` : ""}
    </div>` : ""}
    ${d.gosiFlags && d.gosiFlags.length > 0 ? `<div class="warn-box"><strong>GOSI check:</strong> ${d.gosiFlags.join(" ")}</div>` : ""}
  </div>

  <div class="footer">
    <div class="footer-row">
      <span>THINK-AI · Computer-generated payslip · ${d.payPeriod}</span>
      <span>Transfer reference: ${d.transferReference || "pending"}</span>
    </div>
    ${d.gosiEmployer ? `<div class="footer-gosi">Employer GOSI contribution (company-paid, not deducted from you): ${money(d.gosiEmployer)} SAR</div>` : ""}
  </div>
</body>
</html>`;
}
