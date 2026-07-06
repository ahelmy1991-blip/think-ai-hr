// ── Universal Export Utility ──────────────────────────────────────────────────
// exportToExcel  — uses 'xlsx'
// exportToPDF    — uses 'jspdf' + 'jspdf-autotable'
// exportToWord   — HTML blob as .doc

export async function exportToExcel(
  filename: string,
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>
): Promise<void> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    if (sheet.data.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([["No data"]]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
      continue;
    }
    const ws = XLSX.utils.json_to_sheet(sheet.data);

    // Auto-size columns
    const cols = Object.keys(sheet.data[0]);
    ws["!cols"] = cols.map((col) => {
      const maxLen = sheet.data.reduce((max, row) => {
        const val = String(row[col] ?? "");
        return Math.max(max, val.length);
      }, col.length);
      return { wch: Math.min(maxLen + 2, 50) };
    });

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  subtitle?: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(10, 22, 40); // #0a1628
  doc.rect(0, 0, pageW, 54, "F");

  // THINK-AI label
  doc.setFontSize(8);
  doc.setTextColor(232, 201, 122); // #e8c97a
  doc.text("THINK-AI · HR SYSTEM", 32, 20);

  // Title
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 32, 38);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    doc.text(subtitle, 32, 50);
  }

  // Date top-right
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 210);
  doc.text(`Exported: ${today}`, pageW - 32, 20, { align: "right" });

  // Table
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 66,
    styles: { fontSize: 8, cellPadding: 4, font: "helvetica" },
    headStyles: {
      fillColor: [10, 22, 40],
      textColor: [232, 201, 122],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 32, right: 32 },
    didDrawPage: () => {
      // Footer
      const pN = doc.internal as unknown as { getCurrentPageInfo: () => { pageNumber: number }; getNumberOfPages: () => number };
      const pageNum = pN.getCurrentPageInfo().pageNumber;
      const totalPages = pN.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `THINK-AI Confidential · ${today} · Page ${pageNum} of ${totalPages}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 14,
        { align: "center" }
      );
    },
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportToWord(filename: string, title: string, html: string): void {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const wordDoc = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="THINK-AI HR">
<meta name="Originator" content="THINK-AI HR">
<title>${title}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a2540; margin: 40pt; }
  h1 { font-family: Georgia, serif; font-size: 18pt; color: #0a1628; border-bottom: 2pt solid #e8c97a; padding-bottom: 6pt; margin-bottom: 12pt; }
  .subtitle { font-size: 9pt; color: #6b7a99; margin-bottom: 20pt; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  th { background: #0a1628; color: #e8c97a; padding: 6pt 8pt; text-align: left; font-weight: bold; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 5pt 8pt; border-bottom: 0.5pt solid #e2e8f0; color: #374151; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 24pt; font-size: 8pt; color: #94a3b8; border-top: 0.5pt solid #e2e8f0; padding-top: 8pt; }
</style>
</head>
<body>
<h1>${title}</h1>
<div class="subtitle">THINK-AI HR System · Exported ${today}</div>
${html}
<div class="footer">THINK-AI Confidential · Generated ${today}</div>
</body>
</html>`;

  const blob = new Blob([wordDoc], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
