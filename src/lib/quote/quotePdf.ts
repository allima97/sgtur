import { jsPDF } from "jspdf";

export type QuotePdfSettings = {
  logo_url?: string | null;
  consultor_nome?: string | null;
  filial_nome?: string | null;
  endereco_linha1?: string | null;
  endereco_linha2?: string | null;
  endereco_linha3?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  rodape_texto?: string | null;
};

export type QuotePdfItem = {
  item_type?: string | null;
  title?: string | null;
  product_name?: string | null;
  city_name?: string | null;
  quantity?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  total_amount?: number | null;
  taxes_amount?: number | null;
  order_index?: number | null;
};

export type QuotePdfData = {
  id: string;
  created_at?: string | null;
  total?: number | null;
  currency?: string | null;
};

type ExportOptions = {
  showItemValues: boolean;
  showSummary: boolean;
};

const DEFAULT_FOOTER = [
  "Precos em real (R$) convertido ao cambio do dia sujeito a alteracao e disponibilidade da tarifa.",
  "Valor da crianca valido somente quando acompanhada de dois adultos pagantes no mesmo apartamento.",
  "Este orcamento e apenas uma tomada de preco.",
  "Os servicos citados nao estao reservados; a compra somente podera ser confirmada apos a confirmacao dos fornecedores.",
  "Este orcamento foi feito com base na menor tarifa para os servicos solicitados, podendo sofrer alteracao devido a disponibilidade de lugares no ato da compra.",
  "As regras de cancelamento de cada produto podem ser consultadas por meio do link do QR Code.",
];

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function formatDateRange(start?: string | null, end?: string | null) {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  if (!startLabel && !endLabel) return "";
  if (!endLabel || startLabel === endLabel) return startLabel || endLabel;
  if (!startLabel) return endLabel;
  return `${startLabel} - ${endLabel}`;
}

function toLines(text?: string | null) {
  return (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveImageFormat(mime: string) {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("jpg") || mime.includes("jpeg")) return "JPEG";
  return "PNG";
}

function decodeDataUrl(dataUrl: string) {
  const parts = dataUrl.split(",");
  if (parts.length < 2) return "";
  const meta = parts[0] || "";
  const data = parts.slice(1).join(",");
  if (meta.includes("base64")) {
    try {
      return atob(data);
    } catch {
      return "";
    }
  }
  try {
    return decodeURIComponent(data);
  } catch {
    return "";
  }
}

function parseSvgNumber(value?: string | null) {
  if (!value) return null;
  const match = value.match(/[\d.]+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSvgSize(svgText: string) {
  if (!svgText) return {};
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  const width = parseSvgNumber(svg.getAttribute("width"));
  const height = parseSvgNumber(svg.getAttribute("height"));
  if (width && height) return { width, height };
  const viewBox = svg.getAttribute("viewBox");
  if (!viewBox) return {};
  const parts = viewBox.split(/[\s,]+/).map((part) => Number(part));
  if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
    return { width: parts[2], height: parts[3] };
  }
  return {};
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar logo."));
    img.src = src;
  });
}

async function svgToPngDataUrl(svgDataUrl: string) {
  const img = await loadImage(svgDataUrl);
  const svgText = decodeDataUrl(svgDataUrl);
  const svgSize = parseSvgSize(svgText);
  const width = svgSize.width || img.naturalWidth || 320;
  const height = svgSize.height || img.naturalHeight || 120;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Falha ao converter logo.");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

async function fetchImageData(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Falha ao carregar logo.");
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao ler logo."));
    reader.readAsDataURL(blob);
  });
  const type = blob.type || "";
  if (type.includes("svg")) {
    const pngDataUrl = await svgToPngDataUrl(dataUrl);
    return { dataUrl: pngDataUrl, format: "PNG" };
  }
  return { dataUrl, format: resolveImageFormat(type) };
}

export async function exportQuoteToPdf(params: {
  quote: QuotePdfData;
  items: QuotePdfItem[];
  settings: QuotePdfSettings;
  options: ExportOptions;
}) {
  const { quote, items, settings, options } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const headerHeight = 200;
  const footerHeight = 190;
  const contentTop = margin + headerHeight;
  const contentBottom = pageHeight - footerHeight;
  const cardGap = 18;
  const cardPadding = 14;
  const cardRadius = 10;
  const bodyLineHeight = 16;
  const bodyGapAfterDate = 6;
  const bodyGapAfterTitle = 6;

  const orderedItems = [...items].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const subtotal = orderedItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const taxesTotal = orderedItems.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0);
  const total = subtotal + taxesTotal;
  const itemsCount = orderedItems.length;
  const createdAt = quote.created_at ? new Date(quote.created_at) : new Date();
  const dateLabel = createdAt.toLocaleDateString("pt-BR");

  let logoData: { dataUrl: string; format: string } | null = null;
  if (settings.logo_url) {
    try {
      logoData = await fetchImageData(settings.logo_url);
    } catch {
      logoData = null;
    }
  }

  const colors = {
    border: [171, 167, 214],
    divider: [210, 214, 227],
    muted: [100, 116, 139],
    text: [15, 23, 42],
  } as const;

  function drawHeader() {
    const topY = margin;
    const logoSize = 70;
    const leftX = margin;
    let textX = leftX;

    doc.setTextColor(...colors.text);

    if (logoData) {
      doc.addImage(logoData.dataUrl, logoData.format, leftX, topY, logoSize, logoSize);
      textX = leftX + logoSize + 12;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const leftLines = [
      settings.filial_nome ? `Filial: ${settings.filial_nome}` : null,
      settings.endereco_linha1 || null,
      settings.endereco_linha2 || null,
      settings.endereco_linha3 || null,
    ].filter(Boolean) as string[];

    leftLines.forEach((line, idx) => {
      doc.text(line, textX, topY + 12 + idx * 14);
    });

    const rightX = pageWidth - margin - 220;
    const rightLines = [
      settings.consultor_nome ? `Consultor: ${settings.consultor_nome}` : null,
      settings.telefone ? `Telefone: ${settings.telefone}` : null,
      settings.whatsapp ? `WhatsApp: ${settings.whatsapp}` : null,
      settings.email ? `E-mail: ${settings.email}` : null,
    ].filter(Boolean) as string[];

    rightLines.forEach((line, idx) => {
      doc.text(line, rightX, topY + 12 + idx * 14);
    });

    const lineY = topY + logoSize + 16;
    doc.setDrawColor(180);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Orcamento da sua viagem", margin, lineY + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(dateLabel, margin, lineY + 44);

    const boxW = 190;
    const boxH = 70;
    const boxX = pageWidth - margin - boxW;
    const boxY = lineY + 6;
    doc.setDrawColor(150);
    doc.roundedRect(boxX, boxY, boxW, boxH, 8, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const labelX = boxX + 12;
    const valueX = boxX + boxW - 12;
    doc.text(
      `Valor (${itemsCount} produto${itemsCount === 1 ? "" : "s"})`,
      labelX,
      boxY + 18
    );
    doc.text(`R$ ${formatCurrency(subtotal)}`, valueX, boxY + 18, { align: "right" });
    doc.text("Taxas e impostos", labelX, boxY + 34);
    doc.text(`R$ ${formatCurrency(taxesTotal)}`, valueX, boxY + 34, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total de", labelX, boxY + 56);
    doc.text(`R$ ${formatCurrency(total)}`, valueX, boxY + 56, { align: "right" });
  }

  function drawFooter() {
    const footerY = pageHeight - footerHeight + 18;
    doc.setDrawColor(200);
    doc.line(margin, footerY - 18, pageWidth - margin, footerY - 18);

    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Informacoes importantes", margin, footerY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const footerLines = settings.rodape_texto
      ? toLines(settings.rodape_texto)
      : DEFAULT_FOOTER;
    let currentY = footerY + 14;
    const maxWidth = pageWidth - margin * 2 - 10;
    footerLines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxWidth);
      wrapped.forEach((chunk, idx) => {
        const prefix = idx === 0 ? "- " : "  ";
        doc.text(`${prefix}${chunk}`, margin, currentY);
        currentY += 12;
      });
    });

    currentY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Formas de pagamento", margin, currentY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      "Cartao de credito, Pix, pontos ou boleto conforme disponibilidade.",
      margin,
      currentY + 14
    );
  }

  function getItemCardContent(item: QuotePdfItem, cardInnerWidth: number) {
    const dateLine = formatDateRange(item.start_date, item.end_date);
    const title = item.title || item.product_name || "Item";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const titleLines = doc.splitTextToSize(title, cardInnerWidth);
    const cityLine = item.city_name ? item.city_name : "";
    return { dateLine, titleLines, cityLine };
  }

  function measureItemCardHeight(item: QuotePdfItem) {
    const cardInnerWidth = pageWidth - margin * 2 - cardPadding * 2;
    const content = getItemCardContent(item, cardInnerWidth);
    const linesCount =
      (content.dateLine ? 1 : 0) + content.titleLines.length + (content.cityLine ? 1 : 0);
    const topSection = 52;
    const bottomPadding = 18;
    const extraGap = (content.dateLine ? bodyGapAfterDate : 0) + (content.cityLine ? bodyGapAfterTitle : 0);
    const bodyHeight = linesCount * bodyLineHeight + extraGap;
    return Math.max(96, topSection + bodyHeight + bottomPadding);
  }

  function drawItemCard(item: QuotePdfItem, y: number) {
    const cardX = margin;
    const cardW = pageWidth - margin * 2;
    const cardH = measureItemCardHeight(item);
    const content = getItemCardContent(item, cardW - cardPadding * 2);

    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.8);
    doc.roundedRect(cardX, y, cardW, cardH, cardRadius, cardRadius);

    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(item.item_type || "Item", cardX + cardPadding, y + 20);

    if (options.showItemValues) {
      const qtyLabel = item.quantity
        ? `Total (${item.quantity} item${item.quantity === 1 ? "" : "s"})`
        : "Total";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(qtyLabel, cardX + cardW - cardPadding, y + 14, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(
        `R$ ${formatCurrency(Number(item.total_amount || 0))}`,
        cardX + cardW - cardPadding,
        y + 28,
        { align: "right" }
      );
    }

    const dividerY = y + 40;
    doc.setDrawColor(...colors.divider);
    doc.line(cardX + cardPadding, dividerY, cardX + cardW - cardPadding, dividerY);

    let currentY = dividerY + 16;
    doc.setTextColor(...colors.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (content.dateLine) {
      doc.text(content.dateLine, cardX + cardPadding, currentY);
      currentY += bodyLineHeight + bodyGapAfterDate;
    }

    doc.setTextColor(...colors.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    content.titleLines.forEach((line) => {
      doc.text(line, cardX + cardPadding, currentY);
      currentY += bodyLineHeight;
    });

    if (content.cityLine) {
      doc.setTextColor(...colors.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      currentY += bodyGapAfterTitle;
      doc.text(content.cityLine, cardX + cardPadding, currentY);
      currentY += bodyLineHeight;
    }

    return cardH;
  }

  function drawSummaryBox(startY: number) {
    const totalsByType = orderedItems.reduce<Record<string, number>>((acc, item) => {
      const key = item.item_type || "Outros";
      acc[key] = (acc[key] || 0) + Number(item.total_amount || 0);
      return acc;
    }, {});
    const rows = Object.entries(totalsByType);
    rows.push(["Taxas e impostos", taxesTotal]);
    rows.push(["Total", total]);

    const boxX = margin;
    const boxW = pageWidth - margin * 2;
    const padding = 12;
    const lineHeight = 12;
    const headerHeight = 20;
    const bodyHeight = rows.length * lineHeight + 8;
    const boxH = headerHeight + bodyHeight + 12;

    doc.setDrawColor(...colors.border);
    doc.roundedRect(boxX, startY, boxW, boxH, 8, 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.text);
    doc.text("Resumo de servicos", boxX + padding, startY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let rowY = startY + headerHeight + 6;
    rows.forEach(([label, value]) => {
      doc.text(String(label), boxX + padding, rowY);
      doc.text(`R$ ${formatCurrency(Number(value))}`, boxX + boxW - padding, rowY, {
        align: "right",
      });
      rowY += lineHeight;
    });

    return boxH;
  }

  function initPage() {
    drawHeader();
    drawFooter();
    return contentTop;
  }

  let cursorY = initPage();

  orderedItems.forEach((item) => {
    const cardHeight = measureItemCardHeight(item);
    if (cursorY + cardHeight > contentBottom) {
      doc.addPage();
      cursorY = initPage();
    }
    drawItemCard(item, cursorY);
    cursorY += cardHeight + cardGap;
  });

  if (options.showSummary) {
    const summaryHeight = 84;
    if (cursorY + summaryHeight > contentBottom) {
      doc.addPage();
      cursorY = initPage();
    }
    const actualHeight = drawSummaryBox(cursorY);
    cursorY += actualHeight + cardGap;
  }

  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  doc.save(`orcamento-${quote.id}-${timestamp}.pdf`);
}
