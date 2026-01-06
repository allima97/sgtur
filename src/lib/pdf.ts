import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfTableOptions = {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | null)[][];
  fileName?: string;
  orientation?: "portrait" | "landscape";
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "relatorio"
  );
}

export function exportTableToPDF(options: PdfTableOptions) {
  const {
    title,
    subtitle,
    headers,
    rows,
    fileName,
    orientation = "portrait",
  } = options;
  const doc = new jsPDF({ orientation, unit: "pt" });
  const margin = 40;
  const lineHeight = 14;

  doc.setFontSize(14);
  doc.text(title, margin, margin);
  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, margin, margin + lineHeight);
  }

  autoTable(doc, {
    startY: margin + (subtitle ? lineHeight * 2 : lineHeight),
    head: [headers],
    body: rows.map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))),
    margin: { left: margin, right: margin },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 4, valign: "middle" },
    headStyles: { fillColor: "#ede9fe", textColor: "#1e1b4b", fontStyle: "bold" },
  });

  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  const safeBase = fileName ? fileName.replace(/\.pdf$/i, "") : slugify(title);
  doc.save(`${safeBase}-${timestamp}.pdf`);
}
