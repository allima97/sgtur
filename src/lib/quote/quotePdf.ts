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
  raw?: Record<string, unknown> | null;
  segments?: Array<{
    segment_type: string;
    data: Record<string, unknown>;
    order_index?: number | null;
  }> | null;
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
  discount?: number;
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

function normalizeType(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

type CircuitMeta = {
  codigo?: string;
  serie?: string;
  itinerario?: string[];
  tags?: string[];
};

type CircuitDay = {
  dia: number;
  titulo: string;
  descricao: string;
};

function getCircuitMeta(item: QuotePdfItem): CircuitMeta {
  const raw = (item.raw || {}) as { circuito_meta?: CircuitMeta };
  return raw.circuito_meta || {};
}

function getCircuitDays(item: QuotePdfItem): CircuitDay[] {
  const segments = (item.segments || [])
    .filter((segment) => segment.segment_type === "circuit_day")
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return segments.map((segment, index) => {
    const data = (segment.data || {}) as { dia?: number; titulo?: string; descricao?: string };
    return {
      dia: Number(data.dia || index + 1),
      titulo: data.titulo || "",
      descricao: data.descricao || "",
    };
  });
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
  const metaLineHeight = 12;
  const tagsLineHeight = 18;
  const timelineTitleHeight = 12;
  const timelineDescHeight = 11;
  const timelineGap = 6;

  const orderedItems = [...items].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );
  const subtotal = orderedItems.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const taxesTotal = orderedItems.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0);
  const discountValue = Number(options.discount || 0);
  const discount = Number.isFinite(discountValue) ? Math.max(discountValue, 0) : 0;
  const total = Math.max(subtotal - discount, 0);
  const valorSemTaxas = Math.max(subtotal - taxesTotal, 0);
  const itemsCount = orderedItems.length;
  const createdAt = quote.created_at ? new Date(quote.created_at) : new Date();
  const dateLabel = createdAt.toLocaleDateString("pt-BR");
  const hasDiscount = discount > 0;

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
    const boxH = hasDiscount ? 90 : 70;
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
    doc.text(`R$ ${formatCurrency(valorSemTaxas)}`, valueX, boxY + 18, {
      align: "right",
    });
    doc.text("Taxas e impostos", labelX, boxY + 34);
    doc.text(`R$ ${formatCurrency(taxesTotal)}`, valueX, boxY + 34, { align: "right" });
    if (hasDiscount) {
      doc.text("Desconto", labelX, boxY + 50);
      doc.text(`R$ ${formatCurrency(-discount)}`, valueX, boxY + 50, { align: "right" });
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const totalLineY = hasDiscount ? boxY + 72 : boxY + 56;
    doc.text("Total de", labelX, totalLineY);
    doc.text(`R$ ${formatCurrency(total)}`, valueX, totalLineY, { align: "right" });
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

  function isCircuitItem(item: QuotePdfItem) {
    return normalizeType(item.item_type) === "circuito";
  }

  function buildCircuitLayout(item: QuotePdfItem, maxWidth: number) {
    const meta = getCircuitMeta(item);
    let metaLines: string[] = [];
    if (meta.codigo || meta.serie) {
      const parts: string[] = [];
      if (meta.codigo) parts.push(`Codigo: ${meta.codigo}`);
      if (meta.serie) parts.push(`Serie ${meta.serie}`);
      const metaText = parts.join(" | ");
      metaLines = metaText ? doc.splitTextToSize(metaText, maxWidth) : [];
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const itineraryText = meta.itinerario?.length ? meta.itinerario.join(" - ") : "";
    const itineraryLines = itineraryText ? doc.splitTextToSize(itineraryText, maxWidth) : [];
    const tags = meta.tags || [];

    const timelineTextWidth = maxWidth - 18;
    const days = getCircuitDays(item).map((day) => {
      const title = `Dia ${day.dia}: ${day.titulo}`.trim();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const titleLines = title ? doc.splitTextToSize(title, timelineTextWidth) : [];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const descLines = day.descricao ? doc.splitTextToSize(day.descricao, timelineTextWidth) : [];
      return { ...day, titleLines, descLines };
    });

    let height = 0;
    if (metaLines.length) height += metaLines.length * metaLineHeight + 4;
    if (itineraryLines.length) height += itineraryLines.length * metaLineHeight + 4;
    if (tags.length) height += tagsLineHeight + 4;
    if (days.length) {
      height += timelineGap;
      days.forEach((day, idx) => {
        height += day.titleLines.length * timelineTitleHeight;
        if (day.descLines.length) {
          height += day.descLines.length * timelineDescHeight;
        }
        if (idx < days.length - 1) height += timelineGap;
      });
    }

    return { metaLines, itineraryLines, tags, days, height };
  }

  function getItemCardContent(item: QuotePdfItem, cardInnerWidth: number) {
    const dateLine = formatDateRange(item.start_date, item.end_date);
    const title = item.title || item.product_name || "Item";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const titleLines = doc.splitTextToSize(title, cardInnerWidth);
    const cityLine = isCircuitItem(item) ? "" : item.city_name ? item.city_name : "";
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
    let totalHeight = Math.max(96, topSection + bodyHeight + bottomPadding);
    if (isCircuitItem(item)) {
      const layout = buildCircuitLayout(item, cardInnerWidth);
      totalHeight += layout.height;
    }
    return totalHeight;
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
        ? isCircuitItem(item)
          ? `Total (${item.quantity} Adulto${item.quantity === 1 ? "" : "s"})`
          : `Total (${item.quantity} item${item.quantity === 1 ? "" : "s"})`
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

    if (isCircuitItem(item)) {
      const layout = buildCircuitLayout(item, cardW - cardPadding * 2);
      const textX = cardX + cardPadding;
      if (layout.metaLines.length) {
        doc.setTextColor(...colors.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        layout.metaLines.forEach((line) => {
          doc.text(line, textX, currentY);
          currentY += metaLineHeight;
        });
        currentY += 4;
      }

      if (layout.itineraryLines.length) {
        doc.setTextColor(...colors.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        layout.itineraryLines.forEach((line) => {
          doc.text(line, textX, currentY);
          currentY += metaLineHeight;
        });
        currentY += 4;
      }

      if (layout.tags.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        let tagX = textX;
        let tagY = currentY + 2;
        const maxWidth = cardW - cardPadding * 2;
        layout.tags.forEach((tag) => {
          const tagText = String(tag);
          const tagWidth = doc.getTextWidth(tagText) + 12;
          if (tagX + tagWidth > textX + maxWidth) {
            tagX = textX;
            tagY += tagsLineHeight;
          }
          doc.setDrawColor(...colors.divider);
          doc.roundedRect(tagX, tagY - 12, tagWidth, 16, 6, 6);
          doc.setTextColor(...colors.text);
          doc.text(tagText, tagX + 6, tagY);
          tagX += tagWidth + 6;
        });
        currentY = tagY + 16;
      }

      if (layout.days.length) {
        const timelineX = cardX + cardPadding + 6;
        const timelineTextX = timelineX + 12;
        const lineTop = currentY + 2;
        let dayCursorY = currentY + 6;

        layout.days.forEach((day, dayIndex) => {
          const dayTitle = day.titleLines.length ? day.titleLines : [`Dia ${day.dia}`];
          doc.setDrawColor(...colors.divider);
          doc.circle(timelineX, dayCursorY - 3, 3);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(...colors.text);
          dayTitle.forEach((line) => {
            doc.text(line, timelineTextX, dayCursorY);
            dayCursorY += timelineTitleHeight;
          });

          if (day.descLines.length) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(...colors.muted);
            day.descLines.forEach((line) => {
              doc.text(line, timelineTextX, dayCursorY);
              dayCursorY += timelineDescHeight;
            });
          }

          if (dayIndex < layout.days.length - 1) {
            dayCursorY += timelineGap;
          }
        });

        const lineBottom = dayCursorY - 4;
        doc.setDrawColor(...colors.divider);
        doc.line(timelineX, lineTop, timelineX, Math.max(lineTop, lineBottom));
        currentY = dayCursorY + 2;
      }
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
    if (hasDiscount) {
      rows.push(["Desconto", -discount]);
    }
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
