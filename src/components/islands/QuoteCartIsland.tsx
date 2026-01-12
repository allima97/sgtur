import React, { useEffect, useMemo, useState } from "react";
import AddHotelModal from "./quote/AddHotelModal";
import AddServiceModal from "./quote/AddServiceModal";
import DiscountModal from "./quote/DiscountModal";
import ModalShell from "./quote/ModalShell";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { titleCaseWithExceptions } from "../../lib/titleCase";

type Quote = {
  id: string;
  client_id: string;
  seller_id: string;
  status: string;
  currency: string;
  valid_until: string;
  total: number;
};

type QuoteItem = {
  id: string;
  quote_id: string;
  product_id: string;
  item_type: string;
  quantity: number;
  description_snapshot: string;
  unit_price_snapshot: number;
  taxes_snapshot: number;
  total_item: number;
  supplier_snapshot?: string | null;
  policy_snapshot?: string | null;
  commission_type?: string | null;
  commission_value?: number | null;
  commission_amount_snapshot?: number | null;
  created_at?: string;
};

type QuoteDiscount = {
  id: string;
  quote_id: string;
  discount_type: "FIXED" | "PERCENT";
  value: number;
  reason?: string | null;
  created_at?: string;
};

type TipoProduto = {
  id: string;
  nome: string | null;
  tipo?: string | null;
};

type Produto = {
  id: string;
  nome: string | null;
  tipo_produto?: string | null;
  cidade_id?: string | null;
  todas_as_cidades?: boolean | null;
};

type Cidade = {
  id: string;
  nome: string;
};

type FlightSegment = {
  airline: string;
  flight: string;
  type: string;
  from: string;
  depart: string;
  to: string;
  arrive: string;
};

type ItemFormState = {
  id?: string | null;
  tipoProdutoId: string;
  tipoProdutoLabel: string;
  pax: number;
  dataInicio: string;
  dataFim: string;
  cidadeNome: string;
  cidadeId: string;
  produtoNome: string;
  produtoId: string;
  endereco: string;
  valor: number;
  observacoes: string;
  voos: FlightSegment[];
};

type ParsedBudgetItem = {
  item_type: string;
  description_snapshot: string;
  quantity: number;
  unit_price_snapshot: number;
  total_item: number;
  taxes_snapshot?: number;
  tipo_label?: string;
};

type ParsedBudget = {
  items: ParsedBudgetItem[];
  taxes: number;
  discount: number;
  total: number | null;
};

type CardBBox = {
  pageIndex: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type TextItemBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text: string;
};

type OcrRegionResult = {
  text: string;
  confidence: number;
};

type ExtractedCardItem = {
  tipo_produto: string;
  qte_pax: number;
  periodo_inicio: string;
  periodo_fim: string;
  cidade: string | null;
  produto: string;
  valor: number;
  valor_formatado: string;
  moeda: string;
  pagina: number;
  bbox_card: [number, number, number, number];
  confidence: number;
  needs_review: boolean;
};

function normalizeOcrText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseCurrencyValue(value: string) {
  const cleaned = (value || "").replace(/[^0-9,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

function extractCurrencyFromLine(line: string) {
  const match = line.match(/R\$\s*([0-9.,-]+)/i);
  if (match?.[1]) return parseCurrencyValue(match[1]);
  const fallback = line.match(/([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/);
  if (fallback?.[1]) return parseCurrencyValue(fallback[1]);
  return null;
}

function extractAllCurrencyValues(line: string) {
  const matches = line.match(/R\$\s*([0-9.,-]+)/gi) || [];
  const values = matches
    .map((m) => m.replace(/R\$/i, "").trim())
    .map(parseCurrencyValue)
    .filter((v) => Number.isFinite(v) && v > 0);
  return values;
}

const OCR_CARD_REGIONS = {
  titleLeft: { x1: 0, y1: 0, x2: 0.7, y2: 0.35 },
  topRight: { x1: 0.7, y1: 0, x2: 1, y2: 0.45 },
  middle: { x1: 0, y1: 0.3, x2: 1, y2: 0.65 },
  product: { x1: 0, y1: 0.55, x2: 1, y2: 1 },
};

const PAGE_SKIP_KEYWORDS = [
  "informacoes importantes",
  "informações importantes",
  "formas de pagamento",
  "pagamento com cartao",
  "pagamento com cartão",
  "outras formas de pagamento",
  "id do carrinho",
];

const TIPO_PRODUTO_WHITELIST = [
  "seguro viagem",
  "servicos",
  "serviços",
  "aereo",
  "aéreo",
  "hoteis",
  "hotéis",
  "hotel",
  "hospedagem",
  "traslado",
  "transfer",
  "pacote",
  "ingresso",
  "passeio",
];

const ITEM_KEYWORDS = [
  "seguro",
  "servic",
  "aereo",
  "hotel",
  "hosped",
  "traslad",
  "transfer",
  "pacote",
  "ingress",
  "passei",
];

const MONTHS_PT: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  março: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toIsoDate(day: number, month: number, year: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parsePtMonth(raw: string) {
  const key = normalizeOcrText(raw || "").replace(/[^a-z]/g, "");
  if (!key) return null;
  if (MONTHS_PT[key]) return MONTHS_PT[key];
  const shortened = key.slice(0, 3);
  return MONTHS_PT[shortened] || null;
}

function isTipoProdutoValido(text: string) {
  const normalized = normalizeOcrText(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  const compact = normalized.replace(/\s+/g, "");
  if (TIPO_PRODUTO_WHITELIST.some((tipo) => normalized.includes(normalizeOcrText(tipo)))) {
    return true;
  }
  if (
    TIPO_PRODUTO_WHITELIST.some((tipo) =>
      compact.includes(normalizeOcrText(tipo).replace(/\s+/g, ""))
    )
  ) {
    return true;
  }
  return ITEM_KEYWORDS.some((keyword) => normalized.includes(keyword) || compact.includes(keyword));
}

function normalizeProdutoKey(text: string) {
  return normalizeOcrText(text || "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePeriodoIso(text: string, baseYear: number) {
  const normalized = normalizeOcrText(text || "");
  const rangeMatch = normalized.match(
    /(\d{1,2})\s*de\s*([a-zçãõáéíóú]+)\s*-\s*(\d{1,2})\s*de\s*([a-zçãõáéíóú]+)/i
  );
  if (rangeMatch) {
    const startDay = Number(rangeMatch[1]);
    const startMonth = parsePtMonth(rangeMatch[2]);
    const endDay = Number(rangeMatch[3]);
    const endMonth = parsePtMonth(rangeMatch[4]);
    if (startMonth && endMonth) {
      let endYear = baseYear;
      if (endMonth < startMonth) endYear += 1;
      return {
        start: toIsoDate(startDay, startMonth, baseYear),
        end: toIsoDate(endDay, endMonth, endYear),
      };
    }
  }

  const singleMatch = normalized.match(/(\d{1,2})\s*de\s*([a-zçãõáéíóú]+)/i);
  if (singleMatch) {
    const day = Number(singleMatch[1]);
    const month = parsePtMonth(singleMatch[2]);
    if (month) {
      const iso = toIsoDate(day, month, baseYear);
      return { start: iso, end: iso };
    }
  }

  return { start: "", end: "" };
}

function parseQuantidadePax(text: string) {
  const match =
    text.match(/total\s*\(\s*(\d+)\s*adulto/i) ||
    text.match(/total\s*\(\s*(\d+)\s*pax/i) ||
    text.match(/total\s*\(\s*(\d+)\s*passageiro/i) ||
    text.match(/total\s*\(\s*(\d+)/i);
  if (!match) return 1;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function parseValor(text: string) {
  const matches = text.match(/R\$\s*[0-9]{1,3}(?:\.[0-9]{3})*,\d{2}/gi) || [];
  if (matches.length === 0) return { valor: 0, valor_formatado: "", moeda: "" };
  const last = matches[matches.length - 1];
  return {
    valor: parseCurrencyValue(last),
    valor_formatado: last.replace(/\s+/g, " ").trim(),
    moeda: /R\$/i.test(last) ? "BRL" : "",
  };
}

function parseCidade(text: string) {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (!/ - /i.test(line)) continue;
    const first = line.split(" - ")[0].trim();
    if (first && /[A-Za-zÀ-ÿ]/.test(first)) return first;
  }
  return null;
}

function parseProduto(text: string) {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const cleaned = lines.filter((line) => {
    const normalized = normalizeOcrText(line);
    if (!/[A-Za-zÀ-ÿ]/.test(line)) return false;
    if (/^r\$/i.test(normalized)) return false;
    if (normalized.includes("total")) return false;
    if (normalized.includes("periodo")) return false;
    if (normalized.includes("diarias")) return false;
    if (normalized.includes("reembols")) return false;
    if (normalized.includes("nao reembols")) return false;
    if (normalized.includes("informacoes")) return false;
    if (normalized.includes("adulto")) return false;
    if (normalized.includes("pax")) return false;
    if (normalized.includes("taxas")) return false;
    return true;
  });
  if (cleaned.length === 0) return "";
  const withScore = cleaned.map((line) => {
    const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, "").length;
    return { line, score: letters };
  });
  withScore.sort((a, b) => b.score - a.score);
  return withScore[0]?.line || cleaned[0] || "";
}

function parseTipoProduto(text: string) {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const candidate = lines.find((line) => /[A-Za-zÀ-ÿ]/.test(line)) || "";
  return candidate ? titleCaseWithExceptions(candidate) : "";
}

function preprocessOcrCanvas(input: HTMLCanvasElement, mode: "text" | "numbers") {
  const scale = mode === "numbers" ? 2 : 1.6;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(input.width * scale));
  canvas.height = Math.max(1, Math.round(input.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return input;
  ctx.drawImage(input, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    sum += gray;
  }
  const avg = sum / (data.length / 4);
  const threshold = avg + (mode === "numbers" ? 10 : 0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const value = mode === "numbers" ? (gray > threshold ? 255 : 0) : gray;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function cropCanvas(
  source: HTMLCanvasElement,
  bbox: { x1: number; y1: number; x2: number; y2: number }
) {
  const x1 = clamp(Math.floor(bbox.x1), 0, source.width - 1);
  const y1 = clamp(Math.floor(bbox.y1), 0, source.height - 1);
  const x2 = clamp(Math.ceil(bbox.x2), x1 + 1, source.width);
  const y2 = clamp(Math.ceil(bbox.y2), y1 + 1, source.height);
  const width = Math.max(1, x2 - x1);
  const height = Math.max(1, y2 - y1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(source, x1, y1, width, height, 0, 0, width, height);
  return canvas;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

async function renderImageFileToCanvas(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Falha ao carregar imagem."));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(img, 0, 0);
  return canvas;
}

async function ocrCanvasRegion(
  worker: any,
  canvas: HTMLCanvasElement,
  mode: "text" | "numbers"
): Promise<OcrRegionResult> {
  if (typeof worker.setParameters === "function") {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist:
        mode === "numbers" ? "0123456789R$.,()AdultoPaxTotal" : "",
      preserve_interword_spaces: "1",
    });
  }
  const processed = preprocessOcrCanvas(canvas, mode);
  const { data } = await worker.recognize(processed);
  return {
    text: data?.text || "",
    confidence: typeof data?.confidence === "number" ? data.confidence / 100 : 0,
  };
}

function extractTextItemsFromPdfPage(page: any, viewport: any, pdfjsLib: any): Promise<TextItemBox[]> {
  return page.getTextContent().then((content: any) => {
    const items = (content.items || []) as Array<{ str?: string; transform?: number[]; width?: number; height?: number }>;
    const boxes: TextItemBox[] = [];
    items.forEach((item) => {
      const text = (item.str || "").trim();
      if (!text) return;
      const transform = pdfjsLib.Util.transform(viewport.transform, item.transform || [1, 0, 0, 1, 0, 0]);
      const x = transform[4];
      const y = transform[5];
      const height = Math.hypot(transform[2], transform[3]) || 0;
      const width = (item.width || 0) * viewport.scale;
      const yTop = y - height;
      if (width <= 0 || height <= 0) return;
      boxes.push({
        x1: x,
        y1: yTop,
        x2: x + width,
        y2: yTop + height,
        text,
      });
    });
    return boxes;
  });
}

function detectCardsFromTextItems(
  boxes: TextItemBox[],
  pageWidth: number,
  pageHeight: number,
  pageIndex = 0
): CardBBox[] {
  if (!boxes.length) return [];
  const lineGap = Math.max(8, pageHeight * 0.004);
  const sorted = [...boxes].sort((a, b) => a.y1 - b.y1);
  const lines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    centerY: number;
    count: number;
  }> = [];

  sorted.forEach((item) => {
    const centerY = (item.y1 + item.y2) / 2;
    const line = lines.find((l) => Math.abs(l.centerY - centerY) <= lineGap);
    if (!line) {
      lines.push({
        x1: item.x1,
        y1: item.y1,
        x2: item.x2,
        y2: item.y2,
        centerY,
        count: 1,
      });
    } else {
      line.x1 = Math.min(line.x1, item.x1);
      line.y1 = Math.min(line.y1, item.y1);
      line.x2 = Math.max(line.x2, item.x2);
      line.y2 = Math.max(line.y2, item.y2);
      line.centerY = (line.centerY * line.count + centerY) / (line.count + 1);
      line.count += 1;
    }
  });

  const sortedLines = lines.sort((a, b) => a.y1 - b.y1);
  const cardGap = Math.max(18, pageHeight * 0.03);
  const cards: Array<{ x1: number; y1: number; x2: number; y2: number; lines: number }> = [];
  let current: { x1: number; y1: number; x2: number; y2: number; lines: number } | null = null;

  sortedLines.forEach((line) => {
    if (!current) {
      current = { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, lines: 1 };
      return;
    }
    if (line.y1 - current.y2 > cardGap) {
      cards.push(current);
      current = { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, lines: 1 };
      return;
    }
    current.x1 = Math.min(current.x1, line.x1);
    current.y1 = Math.min(current.y1, line.y1);
    current.x2 = Math.max(current.x2, line.x2);
    current.y2 = Math.max(current.y2, line.y2);
    current.lines += 1;
  });
  if (current) cards.push(current);

  const minHeight = Math.max(70, pageHeight * 0.07);
  const minWidth = Math.max(220, pageWidth * 0.45);
  return cards
    .filter((card) => card.lines >= 2)
    .filter((card) => card.y2 - card.y1 >= minHeight && card.x2 - card.x1 >= minWidth)
    .map((card, index) => ({
      pageIndex,
      x1: clamp(card.x1 - 10, 0, pageWidth),
      y1: clamp(card.y1 - 10, 0, pageHeight),
      x2: clamp(card.x2 + 10, 0, pageWidth),
      y2: clamp(card.y2 + 10, 0, pageHeight),
    }));
}

function groupTextLines(boxes: TextItemBox[], pageHeight: number) {
  if (!boxes.length) return [];
  const lineGap = Math.max(6, pageHeight * 0.0035);
  const sorted = [...boxes].sort((a, b) => a.y1 - b.y1);
  const lines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    centerY: number;
    texts: Array<{ x: number; text: string }>;
    count: number;
  }> = [];
  sorted.forEach((item) => {
    const centerY = (item.y1 + item.y2) / 2;
    const line = lines.find((l) => Math.abs(l.centerY - centerY) <= lineGap);
    if (!line) {
      lines.push({
        x1: item.x1,
        y1: item.y1,
        x2: item.x2,
        y2: item.y2,
        centerY,
        texts: [{ x: item.x1, text: item.text }],
        count: 1,
      });
    } else {
      line.x1 = Math.min(line.x1, item.x1);
      line.y1 = Math.min(line.y1, item.y1);
      line.x2 = Math.max(line.x2, item.x2);
      line.y2 = Math.max(line.y2, item.y2);
      line.centerY = (line.centerY * line.count + centerY) / (line.count + 1);
      line.texts.push({ x: item.x1, text: item.text });
      line.count += 1;
    }
  });
  return lines
    .sort((a, b) => a.y1 - b.y1)
    .map((line) => ({
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
      text: line.texts.sort((a, b) => a.x - b.x).map((t) => t.text).join(" ").trim(),
    }));
}

function detectCardsFromTypeLabels(
  boxes: TextItemBox[],
  pageWidth: number,
  pageHeight: number,
  pageIndex = 0
) {
  const lines = groupTextLines(boxes, pageHeight);
  if (lines.length === 0) return [];
  const anchors = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => isTipoProdutoValido(line.text));
  if (anchors.length === 0) return [];
  const cards: CardBBox[] = [];
  const padding = Math.max(12, pageHeight * 0.012);
  const minHeight = Math.max(90, pageHeight * 0.09);
  const gapLimit = Math.max(24, pageHeight * 0.02);

  anchors.forEach(({ line: anchorLine, idx }, anchorIdx) => {
    const nextAnchor = anchors[anchorIdx + 1];
    let endIndex = lines.length - 1;
    for (let i = idx + 1; i < lines.length; i += 1) {
      if (nextAnchor && i >= nextAnchor.idx) {
        endIndex = nextAnchor.idx - 1;
        break;
      }
      const prev = lines[i - 1];
      if (lines[i].y1 - prev.y2 > gapLimit) {
        endIndex = i - 1;
        break;
      }
    }
    const slice = lines.slice(idx, endIndex + 1);
    if (!slice.length) return;
    let x1 = pageWidth;
    let x2 = 0;
    slice.forEach((line) => {
      x1 = Math.min(x1, line.x1);
      x2 = Math.max(x2, line.x2);
    });
    const y1 = Math.max(0, anchorLine.y1 - padding);
    const y2 = Math.min(pageHeight, slice[slice.length - 1].y2 + padding);
    if (y2 - y1 < minHeight) return;
    cards.push({
      pageIndex,
      x1: clamp(x1 - padding, 0, pageWidth),
      y1,
      x2: clamp(x2 + padding, 0, pageWidth),
      y2,
    });
  });
  return cards;
}

function detectCardsFromImageData(
  imageData: ImageData,
  pageWidth: number,
  pageHeight: number,
  pageIndex = 0
): CardBBox[] {
  const data = imageData.data;
  const step = 2;
  const rowContent: boolean[] = new Array(pageHeight).fill(false);
  const rowThreshold = 0.015;
  for (let y = 0; y < pageHeight; y += step) {
    let darkCount = 0;
    let samples = 0;
    for (let x = 0; x < pageWidth; x += step) {
      const idx = (y * pageWidth + x) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
      if (gray < 220) darkCount += 1;
      samples += 1;
    }
    if (samples > 0 && darkCount / samples > rowThreshold) rowContent[y] = true;
  }

  const blocks: Array<{ y1: number; y2: number }> = [];
  let inBlock = false;
  let start = 0;
  let gap = 0;
  const gapMax = Math.max(6, Math.round(pageHeight * 0.01));
  for (let y = 0; y < pageHeight; y += step) {
    if (rowContent[y]) {
      if (!inBlock) {
        inBlock = true;
        start = y;
      }
      gap = 0;
      continue;
    }
    if (!inBlock) continue;
    gap += step;
    if (gap <= gapMax) continue;
    const end = y - gap;
    if (end > start) blocks.push({ y1: start, y2: end });
    inBlock = false;
    gap = 0;
    start = 0;
  }
  if (inBlock && start > 0) {
    blocks.push({ y1: start, y2: pageHeight });
  }

  const minHeight = Math.max(70, pageHeight * 0.07);
  const cards: CardBBox[] = [];
  blocks.forEach((block, idx) => {
    if (block.y2 - block.y1 < minHeight) return;
    let minX = pageWidth;
    let maxX = 0;
    for (let x = 0; x < pageWidth; x += step) {
      let darkCount = 0;
      let samples = 0;
      for (let y = block.y1; y <= block.y2; y += step) {
        const idx2 = (y * pageWidth + x) * 4;
        const gray = data[idx2] * 0.299 + data[idx2 + 1] * 0.587 + data[idx2 + 2] * 0.114;
        if (gray < 220) darkCount += 1;
        samples += 1;
      }
      if (samples > 0 && darkCount / samples > 0.02) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
    if (maxX - minX < pageWidth * 0.4) return;
    cards.push({
      pageIndex,
      x1: clamp(minX - 10, 0, pageWidth),
      y1: clamp(block.y1 - 10, 0, pageHeight),
      x2: clamp(maxX + 10, 0, pageWidth),
      y2: clamp(block.y2 + 10, 0, pageHeight),
    });
  });
  return cards;
}

function filtrarCardsPorZona(cards: CardBBox[], zona?: { x1: number; y1: number; x2: number; y2: number }) {
  if (!zona) return cards;
  return cards.filter((card) => card.y1 >= zona.y2 || card.y2 <= zona.y1);
}

function buildCardRegions(card: CardBBox) {
  const width = card.x2 - card.x1;
  const height = card.y2 - card.y1;
  return {
    titleLeft: {
      x1: card.x1 + OCR_CARD_REGIONS.titleLeft.x1 * width,
      y1: card.y1 + OCR_CARD_REGIONS.titleLeft.y1 * height,
      x2: card.x1 + OCR_CARD_REGIONS.titleLeft.x2 * width,
      y2: card.y1 + OCR_CARD_REGIONS.titleLeft.y2 * height,
    },
    topRight: {
      x1: card.x1 + OCR_CARD_REGIONS.topRight.x1 * width,
      y1: card.y1 + OCR_CARD_REGIONS.topRight.y1 * height,
      x2: card.x1 + OCR_CARD_REGIONS.topRight.x2 * width,
      y2: card.y1 + OCR_CARD_REGIONS.topRight.y2 * height,
    },
    middle: {
      x1: card.x1 + OCR_CARD_REGIONS.middle.x1 * width,
      y1: card.y1 + OCR_CARD_REGIONS.middle.y1 * height,
      x2: card.x1 + OCR_CARD_REGIONS.middle.x2 * width,
      y2: card.y1 + OCR_CARD_REGIONS.middle.y2 * height,
    },
    product: {
      x1: card.x1 + OCR_CARD_REGIONS.product.x1 * width,
      y1: card.y1 + OCR_CARD_REGIONS.product.y1 * height,
      x2: card.x1 + OCR_CARD_REGIONS.product.x2 * width,
      y2: card.y1 + OCR_CARD_REGIONS.product.y2 * height,
    },
  };
}

function pageHasSkipKeywords(text: string) {
  const normalized = normalizeOcrText(text || "");
  return PAGE_SKIP_KEYWORDS.some((keyword) => normalized.includes(normalizeOcrText(keyword)));
}

function pageHasItemKeywords(text: string) {
  const normalized = normalizeOcrText(text || "");
  return ITEM_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

async function shouldSkipPage(
  page: any,
  viewport: any,
  canvas: HTMLCanvasElement,
  pdfjsLib: any,
  ocrWorker: any
) {
  try {
    const textBoxes = await extractTextItemsFromPdfPage(page, viewport, pdfjsLib);
    const topLimit = canvas.height * 0.45;
    const topText = textBoxes
      .filter((b) => b.y2 <= topLimit)
      .map((b) => b.text)
      .join(" ");
    const allText = textBoxes.map((b) => b.text).join(" ");
    if (pageHasSkipKeywords(topText) && !pageHasItemKeywords(allText)) return true;
  } catch (e) {
    // ignore and fallback to OCR
  }

  const topRegion = cropCanvas(canvas, {
    x1: 0,
    y1: 0,
    x2: canvas.width,
    y2: canvas.height * 0.45,
  });
  const topOcr = await ocrCanvasRegion(ocrWorker, topRegion, "text");
  return pageHasSkipKeywords(topOcr.text) && !pageHasItemKeywords(topOcr.text);
}

async function shouldSkipCanvas(canvas: HTMLCanvasElement, ocrWorker: any) {
  const topRegion = cropCanvas(canvas, {
    x1: 0,
    y1: 0,
    x2: canvas.width,
    y2: canvas.height * 0.45,
  });
  const topOcr = await ocrCanvasRegion(ocrWorker, topRegion, "text");
  return pageHasSkipKeywords(topOcr.text) && !pageHasItemKeywords(topOcr.text);
}

async function extractItemsFromCards(
  canvas: HTMLCanvasElement,
  cards: CardBBox[],
  ocrWorker: any,
  baseYear: number,
  pageNumber: number,
  onStatus?: (value: string) => void
): Promise<ExtractedCardItem[]> {
  const result: ExtractedCardItem[] = [];
  const sortedCards = [...cards].sort((a, b) => a.y1 - b.y1);
  for (let idx = 0; idx < sortedCards.length; idx += 1) {
    const card = sortedCards[idx];
    if (onStatus) {
      onStatus(`OCR do card ${idx + 1}/${sortedCards.length} (página ${pageNumber})`);
    }
    const regions = buildCardRegions(card);
    const titleCanvas = cropCanvas(canvas, regions.titleLeft);
    const titleOcr = await ocrCanvasRegion(ocrWorker, titleCanvas, "text");
    let tipo_produto = parseTipoProduto(titleOcr.text);
    let tipoValido = isTipoProdutoValido(tipo_produto) || isTipoProdutoValido(titleOcr.text);
    let middleOcr: OcrRegionResult | null = null;
    if (!tipoValido) {
      const middleCanvasPre = cropCanvas(canvas, regions.middle);
      middleOcr = await ocrCanvasRegion(ocrWorker, middleCanvasPre, "text");
      tipo_produto = parseTipoProduto(middleOcr.text);
      tipoValido = isTipoProdutoValido(tipo_produto) || isTipoProdutoValido(middleOcr.text);
      if (!tipoValido) {
        continue;
      }
    }

    const topRightCanvas = cropCanvas(canvas, regions.topRight);
    const productCanvas = cropCanvas(canvas, regions.product);
    const topRightOcr = await ocrCanvasRegion(ocrWorker, topRightCanvas, "numbers");
    if (!middleOcr) {
      const middleCanvas = cropCanvas(canvas, regions.middle);
      middleOcr = await ocrCanvasRegion(ocrWorker, middleCanvas, "text");
    }
    const productOcr = await ocrCanvasRegion(ocrWorker, productCanvas, "text");

    const qte_pax = parseQuantidadePax(topRightOcr.text);
    const valorInfo = parseValor(topRightOcr.text);
    let periodoInfo = parsePeriodoIso(middleOcr.text, baseYear);
    if (!periodoInfo.start) {
      periodoInfo = parsePeriodoIso(productOcr.text, baseYear);
    }
    const cidade = parseCidade(middleOcr.text) || parseCidade(productOcr.text);
    const produto = parseProduto(productOcr.text) || parseProduto(middleOcr.text);

    if (!tipoValido || valorInfo.valor <= 0) {
      continue;
    }

    const missingFields =
      (tipo_produto ? 0 : 1) +
      (valorInfo.valor > 0 ? 0 : 1) +
      (periodoInfo.start ? 0 : 1) +
      (produto ? 0 : 1);
    const avgConfidence =
      (titleOcr.confidence + topRightOcr.confidence + middleOcr.confidence + productOcr.confidence) /
      4;
    const confidence = clamp(avgConfidence - missingFields * 0.12, 0, 1);
    const needs_review = confidence < 0.6 || missingFields > 0;

    result.push({
      tipo_produto,
      qte_pax,
      periodo_inicio: periodoInfo.start,
      periodo_fim: periodoInfo.end || periodoInfo.start,
      cidade,
      produto,
      valor: valorInfo.valor,
      valor_formatado: valorInfo.valor_formatado || "",
      moeda: valorInfo.moeda || "BRL",
      pagina: pageNumber,
      bbox_card: [card.x1, card.y1, card.x2, card.y2],
      confidence,
      needs_review,
    });
  }
  return result;
}

function buildParsedBudgetFromExtractedItems(items: ExtractedCardItem[]) {
  const dedupedMap = new Map<string, ExtractedCardItem>();
  items.forEach((item) => {
    const key = [
      normalizeProdutoKey(item.tipo_produto),
      normalizeProdutoKey(item.produto),
      normalizeProdutoKey(item.cidade || ""),
      item.periodo_inicio || "",
      item.valor_formatado || item.valor.toFixed(2),
    ].join("|");
    if (!dedupedMap.has(key)) dedupedMap.set(key, item);
  });

  const filtered = Array.from(dedupedMap.values()).filter(
    (item) => item.valor > 0 && isTipoProdutoValido(item.tipo_produto)
  );
  const parsedItems: ParsedBudgetItem[] = filtered.map((item) => {
    const observacoes = item.needs_review
      ? `Revisar importacao (conf ${item.confidence.toFixed(2)})`
      : "";
    const form: ItemFormState = {
      id: null,
      tipoProdutoId: "",
      tipoProdutoLabel: item.tipo_produto || "",
      pax: item.qte_pax || 1,
      dataInicio: item.periodo_inicio || "",
      dataFim: item.periodo_fim || item.periodo_inicio || "",
      cidadeNome: item.cidade || "",
      cidadeId: "",
      produtoNome: item.produto || "",
      produtoId: "",
      endereco: "",
      valor: item.valor || 0,
      observacoes,
      voos: [],
    };
    const description = buildItemDescription(form);
    const quantity = form.pax || 1;
    const total = Number(item.valor || 0);
    return {
      item_type: item.tipo_produto || "TRANSFER",
      tipo_label: item.tipo_produto || "",
      description_snapshot: description,
      quantity,
      unit_price_snapshot: quantity ? total / quantity : total,
      total_item: total,
      taxes_snapshot: 0,
    };
  });

  const total = parsedItems.reduce((sum, item) => sum + Number(item.total_item || 0), 0);
  const reviewCount = filtered.filter((item) => item.needs_review).length;
  return {
    parsed: {
      items: parsedItems,
      taxes: 0,
      discount: 0,
      total,
    },
    reviewCount,
  };
}


function extractSummary(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const findValue = (label: RegExp) => {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!label.test(line)) continue;
      const lineValues = extractAllCurrencyValues(line);
      if (lineValues.length) return lineValues[lineValues.length - 1];
      for (let j = i + 1; j < Math.min(lines.length, i + 4); j += 1) {
        const nextValues = extractAllCurrencyValues(lines[j]);
        if (nextValues.length) return nextValues[nextValues.length - 1];
      }
    }
    return null;
  };

  const subtotal = findValue(/valor/i);
  const taxes = findValue(/taxas\s*e\s*impostos/i);
  const discount = findValue(/desconto/i);
  const total = findValue(/total\s*de/i);

  return {
    subtotal: subtotal ?? 0,
    taxes: taxes ?? 0,
    discount: discount ?? 0,
    total: total ?? null,
  };
}

function isNoiseLine(line: string) {
  const normalized = normalizeOcrText(line);
  if (!normalized) return true;
  if (normalized === "detalhes") return true;
  if (/^total/.test(normalized)) return true;
  if (["seguro viagem", "servicos", "aereo", "hoteis"].includes(normalized)) return true;
  if (normalized.includes("preferencial")) return true;
  if (normalized.includes("reembols")) return true;
  if (normalized.includes("assist card")) return true;
  if (normalized.includes("id do carrinho")) return true;
  if (normalized.includes("informacoes importantes")) return true;
  if (normalized.includes("formas de pagamento")) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (normalized.includes("facil")) return true;
  if (normalized.includes("nao reembolsavel")) return true;
  if (normalized.includes("nao reembols")) return true;
  return false;
}

function extractQuantity(text: string) {
  const match = text.match(/(\d+)\s*adulto/i) || text.match(/(\d+)\s*passageiro/i);
  if (!match) return 1;
  const qty = Number.parseInt(match[1], 10);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function extractPeriod(lines: string[]) {
  const line =
    lines.find((l) => /\d{1,2}\s+de\s+[a-z]{3,}\s*-\s*\d{1,2}\s+de\s+[a-z]{3,}/i.test(l)) ||
    lines.find((l) => /\d{1,2}\s+de\s+[a-z]{3,}/i.test(l));
  return line || "";
}

function extractDateTokens(text: string) {
  const tokens: string[] = [];
  const regex = /(\d{1,2})\s*de\s*([a-zçãõáéíóú]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const day = match[1];
    const month = match[2];
    tokens.push(`${day} de ${month}`);
  }
  return tokens;
}

function extractCardDateRange(lines: string[]) {
  const tokens: string[] = [];
  for (const line of lines) {
    tokens.push(...extractDateTokens(line));
  }
  const unique: string[] = [];
  tokens.forEach((t) => {
    if (!unique.includes(t)) unique.push(t);
  });
  if (unique.length === 0) return { start: "", end: "" };
  const start = unique[0];
  const end = unique[1] || unique[0];
  return { start, end };
}

function extractSectionTotal(lines: string[]) {
  const values: number[] = [];
  for (const line of lines) {
    const lineValues = extractAllCurrencyValues(line);
    if (lineValues.length) {
      values.push(...lineValues);
      continue;
    }
    const fallback = extractCurrencyFromLine(line);
    if (fallback !== null) values.push(fallback);
  }
  if (values.length) return values[values.length - 1];
  return null;
}

function buildDescription(lines: string[]) {
  const cleaned = lines
    .map((l) => l.trim())
    .filter((l) => !isNoiseLine(l))
    .filter((l) => !/R\$/i.test(l));
  return cleaned.join(" ").replace(/\s+/g, " ").trim();
}

function explodeTextLines(text: string) {
  const expanded = text
    .replace(
      /(seguro\s*viagem|servi[cç][oó]s?|a[eé]r[eé]o|hot[eé]is?)/gi,
      "\n$1\n"
    )
    .replace(/(total\s*\([^)]*\)\s*R\$\s*[0-9.,-]+)/gi, "\n$1\n")
    .replace(/(detalhes)/gi, "\n$1\n");
  return expanded
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function isSummaryBlock(text: string) {
  const normalized = normalizeOcrText(text);
  return (
    normalized.includes("valor (") ||
    normalized.includes("taxas e impostos") ||
    normalized.includes("total de") ||
    normalized.includes("orcamento da sua viagem") ||
    normalized.includes("orcamento da viagem")
  );
}

function detectCardTypeLabel(lines: string[]) {
  for (const line of lines) {
    const normalized = normalizeOcrText(line);
    if (normalized.includes("seguro") && normalized.includes("viagem")) return "Seguro viagem";
    if (normalized.includes("servi")) return "Serviços";
    if (normalized.includes("aereo")) return "Aéreo";
    if (normalized.includes("hote")) return "Hotel";
  }
  return "";
}

function detectTypeFromLine(line: string) {
  return detectCardTypeLabel([line]);
}

function extractCardQuantity(text: string) {
  const match =
    text.match(/total\s*\((\d+)\s*adulto/i) ||
    text.match(/total\s*\((\d+)\s*passageiro/i) ||
    text.match(/\((\d+)\s*adulto/i);
  if (!match) return extractQuantity(text);
  const qty = Number.parseInt(match[1], 10);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function extractCityLine(lines: string[]) {
  for (const line of lines) {
    const normalized = normalizeOcrText(line);
    if (!line.includes("-")) continue;
    if (normalized.includes("ida") || normalized.includes("volta")) continue;
    if (normalized.includes("detalhes")) continue;
    if (normalized.includes("total")) continue;
    if (normalized.includes("reembols")) continue;
    if (!/[A-Za-zÀ-ÿ]/.test(line)) continue;
    let cleaned = line.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/\s*-\s*$/, "");
    const parts = cleaned.split("-").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) continue;
    let firstPart = parts[0];
    const repeatedMatch = cleaned.match(/^(.+?)\s*-\s*\1\s*$/i);
    if (repeatedMatch?.[1]) {
      firstPart = repeatedMatch[1].trim();
    }
    if (firstPart.length < 3) continue;
    return firstPart;
  }
  return "";
}

function extractCardTitle(lines: string[], typeLabel: string, cityLine: string, period: string) {
  for (const line of lines) {
    const normalized = normalizeOcrText(line);
    if (!line) continue;
    if (line === cityLine) continue;
    if (line === period) continue;
    if (/R\$/i.test(line)) continue;
    if (normalized === "detalhes") continue;
    if (normalized.includes("total")) continue;
    if (normalized.includes("seguro viagem") || normalized.includes("servicos") || normalized.includes("aereo") || normalized.includes("hoteis")) {
      continue;
    }
    if (line.length < 3) continue;
    return line.trim();
  }
  return typeLabel || "";
}

function stripTrailingDate(text: string) {
  return text.replace(/\s*-\s*\d{1,2}\s*de\s*[a-zçãõáéíóú]+.*$/i, "").trim();
}

function cleanServiceProductName(text: string) {
  const cleaned = stripTrailingDate(text);
  const parts = cleaned.split(/\s*-\s*/);
  const result: string[] = [];
  for (const part of parts) {
    const normalized = normalizeOcrText(part);
    if (
      normalized.includes("exclusiv") ||
      normalized.includes("passageiro") ||
      normalized.includes("hosped") ||
      normalized.includes("chegada") ||
      normalized.includes("saida")
    ) {
      break;
    }
    result.push(part.trim());
  }
  return result.join(" - ").trim();
}

function extractHotelAddress(lines: string[], productLine: string) {
  const startIndex = productLine ? lines.indexOf(productLine) : -1;
  const slice = startIndex >= 0 ? lines.slice(startIndex + 1) : lines;
  for (const line of slice) {
    if (!line) continue;
    if (/R\$/i.test(line)) continue;
    if (!/[0-9]/.test(line)) continue;
    if (!/[A-Za-zÀ-ÿ]/.test(line)) continue;
    if (!/,/.test(line) && !/\d{3,}/.test(line)) continue;
    return line.trim();
  }
  return "";
}

function extractAirRouteFromLine(line: string) {
  if (!line || !line.includes("-")) return null;
  if (/R\$/i.test(line)) return null;
  const cleaned = line.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/([A-Za-zÀ-ÿ\s]+)\s*-\s*([A-Za-zÀ-ÿ\s]+)/);
  if (!match?.[1] || !match?.[2]) return null;
  let origem = match[1].trim();
  let destino = match[2].trim();
  origem = origem.replace(/^(ida|volta)\s+/i, "").trim();
  destino = destino.replace(/^(ida|volta)\s+/i, "").trim();
  const limparCauda = (value: string) =>
    value
      .replace(/\bvoo\b.*$/i, "")
      .replace(/\b(segunda|terca|terça|quarta|quinta|sexta|sabado|sábado|domingo)-feira\b.*$/i, "")
      .replace(/\b\d{1,2}\s+de\s+[a-zçãõáéíóú]+.*$/i, "")
      .trim();
  origem = limparCauda(origem);
  destino = limparCauda(destino);
  if (origem.length < 3 || destino.length < 3) return null;
  return { origem, destino };
}

function extractAirlineName(line: string) {
  const normalized = normalizeOcrText(line);
  if (
    /(latam|gol|azul|avianca|aerolineas|american|delta|united|tap|copa|air france|klm|iberia)/i.test(
      normalized
    )
  ) {
    return line.trim();
  }
  return "";
}

function extractAirType(line: string) {
  const normalized = normalizeOcrText(line);
  if (normalized.includes("direto")) return "Direto";
  if (normalized.includes("conexao")) return "Conexão";
  return "";
}

function extractTimes(line: string) {
  return line.match(/\b\d{2}:\d{2}\b/g) || [];
}

function extractIataCodes(line: string) {
  return line.match(/\b[A-Z]{3}\b/g) || [];
}

function extractTimeIataPairs(line: string) {
  const pairs: Array<{ time: string; iata: string }> = [];
  const regex = /(\d{2}:\d{2})\s*([A-Z]{3})|([A-Z]{3})\s*(\d{2}:\d{2})/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const time = match[1] || match[4] || "";
    const iata = match[2] || match[3] || "";
    if (time && iata) {
      pairs.push({ time, iata });
    }
  }
  return pairs;
}

function collectTimeIataPairs(lines: string[]) {
  const pairs: Array<{ time: string; iata: string }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const directPairs = extractTimeIataPairs(line);
    if (directPairs.length) {
      pairs.push(...directPairs);
      continue;
    }
    const times = extractTimes(line);
    const iatas = extractIataCodes(line);
    if (times.length && iatas.length) {
      pairs.push({ time: times[0], iata: iatas[0] });
      continue;
    }
    if (times.length) {
      const nextIatas = extractIataCodes(lines[i + 1] || "");
      if (nextIatas.length) {
        pairs.push({ time: times[0], iata: nextIatas[0] });
      }
      continue;
    }
    if (iatas.length) {
      const nextTimes = extractTimes(lines[i + 1] || "");
      if (nextTimes.length) {
        pairs.push({ time: nextTimes[0], iata: iatas[0] });
      }
    }
  }
  return pairs.filter(
    (pair, idx) =>
      idx === 0 ||
      pair.time !== pairs[idx - 1].time ||
      pair.iata !== pairs[idx - 1].iata
  );
}

function extractFlightSegments(lines: string[]) {
  const routes: Array<{ origem: string; destino: string }> = [];
  const flights: string[] = [];
  const airlines: string[] = [];
  let defaultType = "";

  lines.forEach((line) => {
    const route = extractAirRouteFromLine(line);
    if (route) routes.push(route);

    const airline = extractAirlineName(line);
    if (airline) airlines.push(airline);

    if (!defaultType) {
      const type = extractAirType(line);
      if (type) defaultType = type;
    }

    const flightMatches = line.match(/\b[A-Z]{2}\s*\d{3,4}\b/g);
    if (flightMatches?.length) {
      flightMatches.forEach((flight) => {
        const normalizedFlight = flight.replace(/\s+/g, " ").trim();
        if (normalizedFlight) flights.push(normalizedFlight);
      });
    }
  });

  const timePairs = collectTimeIataPairs(lines);
  const segments: FlightSegment[] = [];
  let timeIndex = 0;
  let routeIndex = 0;
  const defaultAirline = airlines[0] || "";

  flights.forEach((flight) => {
    const route = routes[routeIndex] || routes[routes.length - 1];
    if (routes[routeIndex]) routeIndex += 1;
    const departPair = timePairs[timeIndex];
    const arrivePair = timePairs[timeIndex + 1];
    if (departPair) timeIndex += 1;
    if (arrivePair) timeIndex += 1;
    segments.push({
      airline: defaultAirline,
      flight,
      type: defaultType || "",
      from: route?.origem || departPair?.iata || "",
      depart: departPair?.time || "",
      to: route?.destino || arrivePair?.iata || "",
      arrive: arrivePair?.time || "",
    });
  });

  if (!segments.length && timePairs.length >= 2) {
    const route = routes[0];
    segments.push({
      airline: defaultAirline,
      flight: "",
      type: defaultType || "",
      from: route?.origem || timePairs[0]?.iata || "",
      depart: timePairs[0]?.time || "",
      to: route?.destino || timePairs[1]?.iata || "",
      arrive: timePairs[1]?.time || "",
    });
  }

  return segments.filter((seg) =>
    [seg.airline, seg.flight, seg.type, seg.from, seg.depart, seg.to, seg.arrive].some(Boolean)
  );
}

function extractAirDetails(lines: string[]) {
  const routes: string[] = [];
  const flights: string[] = [];
  const times: string[] = [];
  const airlines: string[] = [];
  const notes: string[] = [];

  for (const line of lines) {
    const normalized = normalizeOcrText(line);
    if (!line) continue;
    if (/R\$/i.test(line)) continue;
    if (normalized.includes("detalhes")) continue;
    if (normalized.includes("total")) continue;
    if (normalized.includes("aereo")) continue;
    if (normalized.includes("facil")) continue;
    if (normalized.includes("reembols")) continue;

    const route = extractAirRouteFromLine(line);
    if (route) {
      const label = `${route.origem} → ${route.destino}`;
      if (!routes.includes(label)) routes.push(label);
    }

    const flightMatches = line.match(/[A-Z]{2}\s*\d{3,4}/g);
    if (flightMatches) {
      flightMatches.forEach((f) => {
        const normalizedFlight = f.replace(/\s+/g, " ").trim();
        if (!flights.includes(normalizedFlight)) flights.push(normalizedFlight);
      });
    }

    const timeMatches = line.match(/\b\d{2}:\d{2}\b/g);
    if (timeMatches) {
      timeMatches.forEach((t) => {
        if (!times.includes(t)) times.push(t);
      });
    }

    const airlineName = extractAirlineName(line);
    if (airlineName && !airlines.includes(airlineName)) {
      airlines.push(airlineName);
    }

    if (
      normalized.includes("bolsa") ||
      normalized.includes("mochila") ||
      normalized.includes("bagagem") ||
      normalized.includes("atencao") ||
      normalized.includes("inclui")
    ) {
      notes.push(line.trim());
    }
  }

  const segments = extractFlightSegments(lines);
  return { routes, flights, times, airlines, notes, segments };
}

function inferTipoLabelFromText(text: string, fallbackLabel: string) {
  const normalized = normalizeOcrText(text);
  if (normalized.includes("ingresso")) return "Serviços";
  if (normalized.includes("seguro")) return "Seguro viagem";
  if (normalized.includes("aereo") || normalized.includes("voo") || normalized.includes("passagem")) return "Aéreo";
  if (normalized.includes("hotel") || normalized.includes("pousada") || normalized.includes("resort") || normalized.includes("flat")) return "Hotel";
  if (normalized.includes("passeio")) return "Serviços";
  if (normalized.includes("transporte") || normalized.includes("transfer") || normalized.includes("traslado")) return "Serviços";
  return fallbackLabel || "Serviços";
}

function parseCardItemsFromText(text: string) {
  const lines = explodeTextLines(text);
  const blocks: Array<{ lines: string[]; typeHint: string }> = [];
  let current: string[] = [];
  let lastType = "";
  let currentHasTotal = false;

  for (const line of lines) {
    const typeFromLine = detectTypeFromLine(line);
    const isSummary = isSummaryBlock(line);
    if (isSummary) continue;
    const normalizedLine = normalizeOcrText(line);
    if (normalizedLine.includes("informacoes importantes") || normalizedLine.includes("formas de pagamento")) {
      if (current.length > 0) {
        blocks.push({ lines: current, typeHint: lastType });
        current = [];
      }
      break;
    }

    const isTotalLine = /total/i.test(line) && /R\$/i.test(line);
    if (isTotalLine && current.length > 0 && currentHasTotal) {
      blocks.push({ lines: current, typeHint: lastType });
      current = [];
      if (lastType) current.push(lastType);
      currentHasTotal = false;
    }

    if (typeFromLine) {
      if (current.length > 0) {
        blocks.push({ lines: current, typeHint: lastType });
        current = [];
      }
      lastType = typeFromLine;
      current.push(line);
      if (/R\$/i.test(line)) currentHasTotal = true;
      continue;
    }

    if (current.length > 0) {
      current.push(line);
      if (/R\$/i.test(line)) currentHasTotal = true;
    }
  }

  if (current.length > 0) {
    blocks.push({ lines: current, typeHint: lastType });
  }

  if (blocks.length === 0 && lines.length > 0) {
    const fallbackLines = lines.filter((line) => !isSummaryBlock(line));
    let buffer: string[] = [];
    let bufferHasTotal = false;
    for (const line of fallbackLines) {
      const hasMoney =
        /R\$/i.test(line) ||
        /[0-9]{1,3}(?:\.[0-9]{3})*,\d{2}/.test(line);
      const isTotalLine =
        /total\s*\(/i.test(line) || (/total/i.test(line) && hasMoney);
      if (isTotalLine && buffer.length > 0 && bufferHasTotal) {
        blocks.push({ lines: buffer, typeHint: "" });
        buffer = [];
        bufferHasTotal = false;
      }
      buffer.push(line);
      if (isTotalLine) bufferHasTotal = true;
    }
    if (buffer.length > 0) {
      blocks.push({ lines: buffer, typeHint: "" });
    }
  }

  const items: ParsedBudgetItem[] = [];
  for (const block of blocks) {
    const totalValue = extractSectionTotal(block.lines);
    const blockText = block.lines.join(" ");
    if (!/[A-Za-zÀ-ÿ]/.test(blockText)) continue;
    const baseTypeLabel = detectCardTypeLabel(block.lines) || block.typeHint;
    const typeLabel = inferTipoLabelFromText(blockText, baseTypeLabel) || baseTypeLabel || "Serviços";
    if (!typeLabel || totalValue === null) continue;
    const quantity = extractCardQuantity(blockText);
    const { start: dataInicio, end: dataFim } = extractCardDateRange(block.lines);
    const cityLine = extractCityLine(block.lines);
    const tipoLabel = inferTipoLabelFromText(blockText, typeLabel) || typeLabel;
    let produto = "";
    let endereco = "";
    let detalhesExtra: string[] = [];
    let cidadeAereo = "";
    let voosExtraidos: FlightSegment[] = [];

    if (normalizeOcrText(typeLabel).includes("seguro")) {
      const periodIndex = block.lines.findIndex((line) => extractDateTokens(line).length > 1);
      const candidates = (periodIndex >= 0 ? block.lines.slice(periodIndex + 1) : block.lines).filter(
        (line) => !isNoiseLine(line) && /[A-Za-zÀ-ÿ]/.test(line) && !/R\$/i.test(line)
      );
      produto = candidates.find((line) => !/^\d+$/.test(line.trim())) || "";
    } else if (normalizeOcrText(typeLabel).includes("hote")) {
      const periodIndex = block.lines.findIndex((line) => extractDateTokens(line).length > 1);
      const candidates = (periodIndex >= 0 ? block.lines.slice(periodIndex + 1) : block.lines).filter(
        (line) => !isNoiseLine(line) && /[A-Za-zÀ-ÿ]/.test(line) && !/R\$/i.test(line)
      );
      produto = candidates.find((line) => !/[0-9]/.test(line)) || candidates[0] || "";
      endereco = extractHotelAddress(block.lines, produto);
    } else if (normalizeOcrText(typeLabel).includes("aereo")) {
      produto = "Passagem aérea";
      const airDetails = extractAirDetails(block.lines);
      voosExtraidos = airDetails.segments || [];
      const firstRoute = airDetails.routes[0] || "";
      const routeParts = firstRoute.split("→").map((p) => p.trim());
      const destinoPrincipal =
        voosExtraidos[0]?.to || routeParts[1] || "";
      cidadeAereo = destinoPrincipal;
      if (destinoPrincipal) {
        detalhesExtra.push(`Destino principal: ${destinoPrincipal}`);
      }
      if (!voosExtraidos.length) {
        if (airDetails.routes.length) {
          detalhesExtra.push(`Trechos: ${airDetails.routes.join(" | ")}`);
        }
        if (airDetails.flights.length) {
          detalhesExtra.push(`Voos: ${airDetails.flights.join(", ")}`);
        }
        if (airDetails.times.length) {
          detalhesExtra.push(`Horarios: ${airDetails.times.join(", ")}`);
        }
        if (airDetails.airlines.length) {
          detalhesExtra.push(`Cia: ${airDetails.airlines.join(", ")}`);
        }
      }
      if (airDetails.notes.length) {
        detalhesExtra.push(`Info: ${airDetails.notes.join(" ")}`);
      }
    } else {
      const candidates = block.lines.filter(
        (line) => !isNoiseLine(line) && /[A-Za-zÀ-ÿ]/.test(line) && !/R\$/i.test(line)
      );
      const sorted = [...candidates].sort((a, b) => b.length - a.length);
      const rawProduto = sorted[0] || "";
      produto = cleanServiceProductName(rawProduto);
    }

    const produtoLimpo = stripTrailingDate(produto);
    const isAereo = normalizeOcrText(typeLabel).includes("aereo");
    const itemFields: ItemFormState = {
      id: null,
      tipoProdutoId: "",
      tipoProdutoLabel: tipoLabel,
      pax: quantity || 1,
      dataInicio: dataInicio || "",
      dataFim: dataFim || dataInicio || "",
      cidadeNome: isAereo ? cidadeAereo : cityLine,
      cidadeId: "",
      produtoNome: produtoLimpo,
      produtoId: "",
      endereco: endereco || "",
      valor: totalValue,
      observacoes: detalhesExtra.join(" "),
      voos: voosExtraidos,
    };
    const description = buildItemDescription(itemFields) || buildDescription(block.lines);

    items.push({
      item_type: tipoLabel,
      description_snapshot: description,
      quantity,
      unit_price_snapshot: quantity ? totalValue / quantity : totalValue,
      total_item: totalValue,
      taxes_snapshot: 0,
      tipo_label: tipoLabel,
    });
  }

  return items;
}

function parseBudgetFromTexts(texts: string[]): ParsedBudget {
  const items: ParsedBudgetItem[] = [];
  let summary = { subtotal: 0, taxes: 0, discount: 0, total: null as number | null };
  let summaryFound = false;

  for (const text of texts) {
    if (!text?.trim()) continue;
    items.push(...parseCardItemsFromText(text));
    if (isSummaryBlock(text)) {
      summary = extractSummary(text);
      summaryFound = true;
    }
  }

  if (!summaryFound) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total_item || 0), 0);
    summary = { subtotal, taxes: 0, discount: 0, total: subtotal };
  }

  return {
    items,
    taxes: summary.taxes,
    discount: summary.discount,
    total: summary.total,
  };
}

function dataUrlToFile(dataUrl: string, name: string, type: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    return new File([], name, { type: type || "application/octet-stream" });
  }
  const mime = type || match[1] || "application/octet-stream";
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], name, { type: mime });
}

function serializeVoos(voos: FlightSegment[]) {
  return (voos || [])
    .map((v) =>
      [
        v.airline,
        v.flight,
        v.type,
        v.from,
        v.depart,
        v.to,
        v.arrive,
      ]
        .map((s) => (s || "").trim())
        .filter(Boolean)
        .join(" | ")
    )
    .filter(Boolean)
    .join(" ; ");
}

function parseVoos(text: string) {
  if (!text) return [];
  const segments = text
    .split(";")
    .map((seg) => seg.trim())
    .filter(Boolean);
  return segments.map((seg) => {
    const cols = seg.split("|").map((c) => c.trim());
    return {
      airline: cols[0] || "",
      flight: cols[1] || "",
      type: cols[2] || "",
      from: cols[3] || "",
      depart: cols[4] || "",
      to: cols[5] || "",
      arrive: cols[6] || "",
    } as FlightSegment;
  });
}

function buildItemDescription(fields: ItemFormState) {
  const parts: string[] = [];
  if (fields.tipoProdutoLabel) parts.push(`Tipo: ${fields.tipoProdutoLabel}`);
  if (fields.produtoNome) parts.push(`Produto: ${fields.produtoNome}`);
  if (fields.cidadeNome) parts.push(`Cidade: ${fields.cidadeNome}`);
  if (fields.dataInicio) parts.push(`Inicio: ${fields.dataInicio}`);
  if (fields.dataFim) parts.push(`Fim: ${fields.dataFim}`);
  if (fields.endereco) parts.push(`Endereco: ${fields.endereco}`);
  if (fields.pax) parts.push(`Pax: ${fields.pax}`);
  if (fields.voos && fields.voos.length > 0) parts.push(`Voos: ${serializeVoos(fields.voos)}`);
  if (fields.observacoes) parts.push(`Obs: ${fields.observacoes}`);
  return parts.join(" — ").trim();
}

function parseItemDescription(description: string) {
  const parsed: Partial<ItemFormState> = {
    voos: [],
  };
  if (!description) return parsed;
  const pieces = description
    .split("—")
    .map((p) => p.trim())
    .filter(Boolean);
  pieces.forEach((piece) => {
    if (/^tipo:/i.test(piece)) parsed.tipoProdutoLabel = piece.replace(/^tipo:/i, "").trim();
    else if (/^produto:/i.test(piece)) parsed.produtoNome = piece.replace(/^produto:/i, "").trim();
    else if (/^cidade:/i.test(piece)) parsed.cidadeNome = piece.replace(/^cidade:/i, "").trim();
    else if (/^destino principal:/i.test(piece)) parsed.cidadeNome = piece.replace(/^destino principal:/i, "").trim();
    else if (/^inicio:/i.test(piece)) parsed.dataInicio = piece.replace(/^inicio:/i, "").trim();
    else if (/^fim:/i.test(piece)) parsed.dataFim = piece.replace(/^fim:/i, "").trim();
    else if (/^endereco:/i.test(piece)) parsed.endereco = piece.replace(/^endereco:/i, "").trim();
    else if (/^pax:/i.test(piece)) {
      const value = Number.parseInt(piece.replace(/^pax:/i, "").trim(), 10);
      if (Number.isFinite(value)) parsed.pax = value;
    } else if (/^passageiros:/i.test(piece)) {
      const match = piece.match(/(\d+)/);
      if (match) parsed.pax = Number.parseInt(match[1], 10);
    } else if (/^voos:/i.test(piece)) {
      parsed.voos = parseVoos(piece.replace(/^voos:/i, "").trim());
    } else if (/^trechos:/i.test(piece) || /^cia:/i.test(piece) || /^horarios:/i.test(piece) || /^info:/i.test(piece)) {
      const texto = piece.replace(/^[^:]+:/i, "").trim();
      const atual = parsed.observacoes ? `${parsed.observacoes} ` : "";
      parsed.observacoes = `${atual}${texto}`.trim();
    } else if (/^obs:/i.test(piece) || /^observa/i.test(piece)) {
      parsed.observacoes = piece.replace(/^obs:/i, "").replace(/^observa\w*:/i, "").trim();
    }
  });

  if (!parsed.dataInicio || !parsed.dataFim) {
    const tokens = extractDateTokens(description);
    if (!parsed.dataInicio && tokens[0]) parsed.dataInicio = tokens[0];
    if (!parsed.dataFim) parsed.dataFim = tokens[1] || tokens[0] || "";
  }

  if (!parsed.pax) {
    parsed.pax = extractQuantity(description);
  }

  return parsed;
}

function fallbackProdutoNome(description: string) {
  if (!description) return "";
  const parts = description
    .split("—")
    .map((p) => p.trim())
    .filter(Boolean);
  const candidate = parts.find((part) => {
    const normalized = normalizeOcrText(part);
    return (
      !normalized.startsWith("tipo:") &&
      !normalized.startsWith("produto:") &&
      !normalized.startsWith("cidade:") &&
      !normalized.startsWith("inicio:") &&
      !normalized.startsWith("fim:") &&
      !normalized.startsWith("endereco:") &&
      !normalized.startsWith("pax:") &&
      !normalized.startsWith("obs:") &&
      !normalized.startsWith("voos:")
    );
  });
  if (candidate) return candidate.replace(/^Tipo:/i, "").trim();
  return description;
}

function extractTipoLabel(description: string) {
  const match = (description || "").match(/^\s*Tipo:\s*([^—-]+)(?:—|$)/i);
  if (!match) return "";
  return match[1].trim();
}

function resolveItemTypeFromLabel(label: string, fallback: string) {
  const normalized = (label || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/(hotel|pousada|resort|flat)/i.test(normalized)) return "HOTEL";
  if (/(passeio|tour|circuito|cruzeiro|ingresso)/i.test(normalized)) return "TOUR";
  if (/(aereo|voo|passagem)/i.test(normalized)) return "TOUR";
  if (/(servic|transfer|seguro|aluguel|chip)/i.test(normalized)) return "TRANSFER";
  const fallbackNormalized = (fallback || "").toUpperCase();
  if (["HOTEL", "TRANSFER", "TOUR"].includes(fallbackNormalized)) return fallbackNormalized;
  return "TRANSFER";
}

export default function QuoteCartIsland(props: {
  initialQuote: Quote;
  initialItems: QuoteItem[];
  initialDiscounts: QuoteDiscount[];
  userId: string;
  clientName?: string | null;
}) {
  const [quote, setQuote] = useState<Quote>(props.initialQuote);
  const [items, setItems] = useState<QuoteItem[]>(props.initialItems);
  const [discounts, setDiscounts] = useState<QuoteDiscount[]>(
    props.initialDiscounts
  );

  const [openHotel, setOpenHotel] = useState(false);
  const [openService, setOpenService] = useState(false);
  const [openDiscount, setOpenDiscount] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [mostrarImportacaoArquivo, setMostrarImportacaoArquivo] = useState(false);
  const [arquivosImportacao, setArquivosImportacao] = useState<File[]>([]);
  const [importandoArquivo, setImportandoArquivo] = useState(false);
  const [statusImportacaoArquivo, setStatusImportacaoArquivo] = useState<string | null>(null);
  const [erroImportacaoArquivo, setErroImportacaoArquivo] = useState<string | null>(null);
  const [sucessoImportacaoArquivo, setSucessoImportacaoArquivo] = useState<string | null>(null);
  const [mostrarImportacaoTexto, setMostrarImportacaoTexto] = useState(false);
  const [textoImportacao, setTextoImportacao] = useState("");
  const [importandoTexto, setImportandoTexto] = useState(false);
  const [erroImportacaoTexto, setErroImportacaoTexto] = useState<string | null>(null);
  const [sucessoImportacaoTexto, setSucessoImportacaoTexto] = useState<string | null>(null);
  const [modalItemAberto, setModalItemAberto] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>({
    id: null,
    tipoProdutoId: "",
    tipoProdutoLabel: "",
    pax: 1,
    dataInicio: "",
    dataFim: "",
    cidadeNome: "",
    cidadeId: "",
    produtoNome: "",
    produtoId: "",
    endereco: "",
    valor: 0,
    observacoes: "",
    voos: [],
  });
  const [erroItemForm, setErroItemForm] = useState<string | null>(null);
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [produtoBusca, setProdutoBusca] = useState("");
  const [produtosSugestoes, setProdutosSugestoes] = useState<Produto[]>([]);
  const [buscandoProdutos, setBuscandoProdutos] = useState(false);
  const [mostrarSugestoesProduto, setMostrarSugestoesProduto] = useState(false);
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [cidadesSugestoes, setCidadesSugestoes] = useState<Cidade[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
  const [erroCidadeBusca, setErroCidadeBusca] = useState<string | null>(null);
  const [tipoProdutos, setTipoProdutos] = useState<TipoProduto[]>([]);
  const currency = quote.currency || "BRL";
  const clienteLabel = props.clientName?.trim() || quote.client_id || "—";
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat("pt-BR", { style: "currency", currency }),
    [currency]
  );
  const formatCurrency = (value: number) =>
    currencyFormatter.format(Number(value || 0)).replace(/\u00a0/g, " ");

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.total_item || 0), 0),
    [items]
  );

  const discountTotal = useMemo(() => {
    // estratégia: descontos ficam em quote_discount e são subtraídos do subtotal
    return discounts.reduce((sum, d) => {
      const v = Number(d.value || 0);
      if (d.discount_type === "FIXED") return sum + v;
      // percent sobre subtotal atual (simples)
      return sum + (subtotal * v) / 100;
    }, 0);
  }, [discounts, subtotal]);

  const total = useMemo(() => Math.max(0, subtotal - discountTotal), [subtotal, discountTotal]);
  const tipoProdutosMap = useMemo(() => {
    const map = new Map<string, TipoProduto>();
    tipoProdutos.forEach((tp) => map.set(tp.id, tp));
    return map;
  }, [tipoProdutos]);

  function criarItemFormVazio(): ItemFormState {
    return {
      id: null,
      tipoProdutoId: "",
      tipoProdutoLabel: "",
      pax: 1,
      dataInicio: "",
      dataFim: "",
      cidadeNome: "",
      cidadeId: "",
      produtoNome: "",
      produtoId: "",
      endereco: "",
      valor: 0,
      observacoes: "",
      voos: [],
    };
  }

  async function refresh() {
    setBusy("Atualizando...");
    try {
      const { data: newQuote } = await supabaseBrowser
        .from("quote")
        .select("id, client_id, seller_id, status, currency, valid_until, total")
        .eq("id", quote.id)
        .single();

      const { data: newItems } = await supabaseBrowser
        .from("quote_item")
        .select("*")
        .eq("quote_id", quote.id)
        .order("created_at", { ascending: true });

      const { data: newDiscounts } = await supabaseBrowser
        .from("quote_discount")
        .select("*")
        .eq("quote_id", quote.id)
        .order("created_at", { ascending: true });

      if (newQuote) setQuote(newQuote as Quote);
      setItems((newItems ?? []) as QuoteItem[]);
      setDiscounts((newDiscounts ?? []) as QuoteDiscount[]);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    let ativo = true;
    async function carregarTipos() {
      const { data, error } = await supabaseBrowser
        .from("tipo_produtos")
        .select("id, nome, tipo")
        .eq("ativo", true)
        .order("nome");
      if (error || !data) return;
      if (ativo) {
        setTipoProdutos(data as Array<{ id: string; nome: string | null; tipo?: string | null }>);
      }
    }
    carregarTipos();
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const termo = produtoBusca.trim();
    if (termo.length < 2) {
      setProdutosSugestoes([]);
      setMostrarSugestoesProduto(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoProdutos(true);
      try {
        let query = supabaseBrowser
          .from("produtos")
          .select("id, nome, tipo_produto, cidade_id, todas_as_cidades")
          .eq("ativo", true)
          .ilike("nome", `%${termo}%`)
          .limit(10);

        if (itemForm.tipoProdutoId) {
          query = query.eq("tipo_produto", itemForm.tipoProdutoId);
        }
        if (itemForm.cidadeId) {
          query = query.or(`cidade_id.eq.${itemForm.cidadeId},todas_as_cidades.eq.true`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProdutosSugestoes((data || []) as Produto[]);
        setMostrarSugestoesProduto(true);
      } catch (e) {
        setProdutosSugestoes([]);
        setMostrarSugestoesProduto(false);
      } finally {
        setBuscandoProdutos(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [produtoBusca, itemForm.tipoProdutoId, itemForm.cidadeId]);

  useEffect(() => {
    const termo = cidadeBusca.trim();
    if (termo.length < 2) {
      setCidadesSugestoes([]);
      setErroCidadeBusca(null);
      setMostrarSugestoesCidade(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidadeBusca(null);
      try {
        const { data, error } = await supabaseBrowser.rpc(
          "buscar_cidades",
          { q: termo, limite: 8 },
          { signal: controller.signal }
        );
        if (error) throw error;
        setCidadesSugestoes((data || []) as Cidade[]);
        setMostrarSugestoesCidade(true);
      } catch (e) {
        if (!controller.signal.aborted) {
          setErroCidadeBusca("Erro ao buscar cidades.");
          setCidadesSugestoes([]);
          setMostrarSugestoesCidade(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoCidade(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cidadeBusca]);

  useEffect(() => {
    const tipoLabel = itemForm.tipoProdutoLabel || obterTipoLabel(itemForm.tipoProdutoId, "");
    if (normalizeOcrText(tipoLabel).includes("aereo") && itemForm.voos.length === 0) {
      setItemForm((prev) => ({
        ...prev,
        voos: [
          {
            airline: "",
            flight: "",
            type: "",
            from: "",
            depart: "",
            to: "",
            arrive: "",
          },
        ],
      }));
    }
  }, [itemForm.tipoProdutoId, itemForm.tipoProdutoLabel]);

  async function recalcAndPersistTotal() {
    // Persiste quote.total com o total atual (snapshot + descontos)
    setBusy("Calculando total...");
    try {
      const { error } = await supabaseBrowser
        .from("quote")
        .update({ total })
        .eq("id", quote.id);
      if (error) throw error;
      setQuote((q) => ({ ...q, total }));
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm("Remover este item do carrinho?")) return;
    setBusy("Removendo item...");
    try {
      const { error } = await supabaseBrowser.from("quote_item").delete().eq("id", itemId);
      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } finally {
      setBusy(null);
    }
  }

  function obterTipoLabel(tipoId: string, fallback = "") {
    if (!tipoId) return fallback;
    const tipo = tipoProdutosMap.get(tipoId);
    return (tipo?.nome || tipo?.tipo || fallback || "").trim();
  }

  function abrirFormularioItem(item?: QuoteItem) {
    setErroItemForm(null);
    if (!item) {
      const vazio = criarItemFormVazio();
      setItemForm(vazio);
      setProdutoBusca("");
      setCidadeBusca("");
      setModalItemAberto(true);
      return;
    }

    const parsed = parseItemDescription(item.description_snapshot || "");
    const tipoLabel =
      parsed.tipoProdutoLabel ||
      extractTipoLabel(item.description_snapshot || "") ||
      item.item_type ||
      "";
    const normalizedTipoLabel = normalizeOcrText(tipoLabel);
    const tipoProdutoId =
      tipoProdutos.find((tp) => {
        const normalizedTipo = normalizeOcrText(tp.nome || tp.tipo || "");
        return (
          normalizedTipo === normalizedTipoLabel ||
          normalizedTipo.includes(normalizedTipoLabel) ||
          normalizedTipoLabel.includes(normalizedTipo)
        );
      })?.id || "";
    const pax = parsed.pax || Number(item.quantity || 1);
    const dataInicio = parsed.dataInicio || "";
    const dataFim = parsed.dataFim || dataInicio || "";
    const produtoNome = parsed.produtoNome || "";

    const formAtual: ItemFormState = {
      id: item.id,
      tipoProdutoId,
      tipoProdutoLabel: tipoLabel,
      pax,
      dataInicio,
      dataFim,
      cidadeNome: parsed.cidadeNome || "",
      cidadeId: "",
      produtoNome,
      produtoId: item.product_id || "",
      endereco: parsed.endereco || "",
      valor: Number(item.total_item || 0),
      observacoes: parsed.observacoes || "",
      voos: parsed.voos || [],
    };

    setItemForm(formAtual);
    setProdutoBusca(produtoNome);
    setCidadeBusca(parsed.cidadeNome || "");
    setModalItemAberto(true);
  }

  async function garantirProdutoId(form: ItemFormState) {
    if (form.produtoId) {
      const { data } = await supabaseBrowser
        .from("produtos")
        .select("id")
        .eq("id", form.produtoId)
        .maybeSingle();
      if (data?.id) return form.produtoId;
    }

    const nome = form.produtoNome.trim();
    if (!nome) return "";
    const tipoId = form.tipoProdutoId;
    if (!tipoId) return "";

    let cidadeId = form.cidadeId || "";
    if (!cidadeId && form.cidadeNome.trim()) {
      try {
        const { data } = await supabaseBrowser.rpc("buscar_cidades", {
          q: form.cidadeNome.trim(),
          limite: 1,
        });
        if (data?.[0]?.id) cidadeId = data[0].id;
      } catch (e) {
        // ignore, fallback para produto global
      }
    }

    const destino = form.cidadeNome.trim() || nome;
    const payload = {
      nome: titleCaseWithExceptions(nome),
      destino: titleCaseWithExceptions(destino),
      cidade_id: cidadeId || null,
      tipo_produto: tipoId,
      informacoes_importantes: null,
      atracao_principal: null,
      melhor_epoca: null,
      duracao_sugerida: null,
      nivel_preco: null,
      imagem_url: null,
      ativo: true,
      fornecedor_id: null,
      todas_as_cidades: !cidadeId,
    };

    const { data, error } = await supabaseBrowser
      .from("produtos")
      .insert(payload)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return data?.id || "";
  }

  async function salvarItemForm() {
    setErroItemForm(null);
    setSalvandoItem(true);
    try {
      if (!itemForm.tipoProdutoId) {
        throw new Error("Selecione o tipo de produto.");
      }
      const tipoLabel = itemForm.tipoProdutoLabel || obterTipoLabel(itemForm.tipoProdutoId, "");
      if (!itemForm.pax || itemForm.pax <= 0) {
        throw new Error("Informe a quantidade de passageiros.");
      }
      if (!itemForm.dataInicio.trim()) {
        throw new Error("Informe a data de inicio.");
      }
      const dataFim = itemForm.dataFim.trim() || itemForm.dataInicio.trim();
      if (!itemForm.cidadeNome.trim()) {
        throw new Error("Informe a cidade de destino.");
      }
      if (!itemForm.produtoNome.trim()) {
        throw new Error("Informe o produto.");
      }
      if (!itemForm.valor || itemForm.valor <= 0) {
        throw new Error("Informe o valor do item.");
      }

      const tipoNormalized = normalizeOcrText(tipoLabel);
      if (tipoNormalized.includes("aereo")) {
        if (!itemForm.voos || itemForm.voos.length === 0) {
          throw new Error("Informe ao menos um trecho do aéreo.");
        }
        const invalido = itemForm.voos.some(
          (v) =>
            !v.airline.trim() ||
            !v.flight.trim() ||
            !v.type.trim() ||
            !v.from.trim() ||
            !v.depart.trim() ||
            !v.to.trim() ||
            !v.arrive.trim()
        );
        if (invalido) {
          throw new Error("Preencha todos os campos dos trechos do aéreo.");
        }
      }

      const produtoId = await garantirProdutoId(itemForm);
      const descricao = buildItemDescription({
        ...itemForm,
        tipoProdutoLabel: tipoLabel,
        dataFim,
        produtoId,
      });
      const resolvedType = resolveItemTypeFromLabel(tipoLabel, itemForm.tipoProdutoLabel);
      const unitPrice = itemForm.pax ? itemForm.valor / itemForm.pax : itemForm.valor;

      const payload = {
        quote_id: quote.id,
        product_id: produtoId || itemForm.produtoId || crypto.randomUUID(),
        item_type: resolvedType,
        quantity: itemForm.pax,
        unit_price_snapshot: unitPrice,
        taxes_snapshot: 0,
        total_item: itemForm.valor,
        description_snapshot: descricao,
      };

      if (itemForm.id) {
        const { error } = await supabaseBrowser
          .from("quote_item")
          .update(payload)
          .eq("id", itemForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseBrowser.from("quote_item").insert(payload);
        if (error) throw error;
      }

      setModalItemAberto(false);
      setItemForm(criarItemFormVazio());
      await refresh();
    } catch (e: any) {
      setErroItemForm(e?.message || "Erro ao salvar item.");
    } finally {
      setSalvandoItem(false);
    }
  }

  async function persistirOrdemItens(novaOrdem: QuoteItem[]) {
    if (novaOrdem.length === 0) return;
    setBusy("Reordenando itens...");
    try {
      const base = Date.now();
      const updates = novaOrdem.map((item, idx) => ({
        id: item.id,
        created_at: new Date(base + idx * 1000).toISOString(),
      }));
      await Promise.all(
        updates.map((u) =>
          supabaseBrowser.from("quote_item").update({ created_at: u.created_at }).eq("id", u.id)
        )
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  function moverItem(itemId: string, direcao: -1 | 1) {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === itemId);
      const alvo = index + direcao;
      if (index < 0 || alvo < 0 || alvo >= prev.length) return prev;
      const novaOrdem = [...prev];
      [novaOrdem[index], novaOrdem[alvo]] = [novaOrdem[alvo], novaOrdem[index]];
      persistirOrdemItens(novaOrdem);
      return novaOrdem;
    });
  }

  async function aplicarImportacao(parsed: ParsedBudget) {
    if (!parsed.items.length) {
      throw new Error("Nenhum item encontrado no texto.");
    }

    for (const item of parsed.items) {
      const tipoLabel = item.tipo_label || extractTipoLabel(item.description_snapshot) || item.item_type;
      const resolvedType = resolveItemTypeFromLabel(tipoLabel || item.item_type, item.item_type);
      const description =
        extractTipoLabel(item.description_snapshot)
          ? item.description_snapshot
          : `Tipo: ${tipoLabel} — ${item.description_snapshot}`;
      const payload = {
        item_type: resolvedType,
        description_snapshot: description,
        quantity: item.quantity,
        unit_price_snapshot: item.unit_price_snapshot,
        taxes_snapshot: item.taxes_snapshot ?? 0,
        total_item: item.total_item,
      };
      const { error } = await supabaseBrowser.from("quote_item").insert({
        quote_id: quote.id,
        product_id: crypto.randomUUID(),
        ...payload,
      });
      if (error) throw error;
    }

    if (parsed.taxes > 0) {
      const payload = {
        item_type: resolveItemTypeFromLabel("Taxas e impostos", "TRANSFER"),
        quantity: 1,
        description_snapshot: "Tipo: Taxas e impostos — Produto: Taxas e impostos",
        unit_price_snapshot: parsed.taxes,
        taxes_snapshot: 0,
        total_item: parsed.taxes,
      };
      const { error: taxErr } = await supabaseBrowser.from("quote_item").insert({
        quote_id: quote.id,
        product_id: crypto.randomUUID(),
        ...payload,
      });
      if (taxErr) throw taxErr;
    }

    if (parsed.discount > 0) {
      const { error: discountErr } = await supabaseBrowser.from("quote_discount").insert({
        quote_id: quote.id,
        applied_by: props.userId,
        discount_type: "FIXED",
        value: parsed.discount,
        reason: "Importado PDF",
      });
      if (discountErr) throw discountErr;
    }

    if (parsed.total) {
      await supabaseBrowser.from("quote").update({ total: parsed.total }).eq("id", quote.id);
    }
  }

  async function importarArquivos(arquivos = arquivosImportacao) {
    if (!arquivos.length) return;
    setImportandoArquivo(true);
    setErroImportacaoArquivo(null);
    setSucessoImportacaoArquivo(null);
    setStatusImportacaoArquivo("Lendo arquivos...");
    let worker: any | null = null;

    const getWorker = async () => {
      if (worker) return worker;
      const { createWorker } = await import("tesseract.js");
      worker = await createWorker("por");
      if (typeof worker.load === "function") {
        await worker.load();
      }
      if (typeof worker.reinitialize === "function") {
        await worker.reinitialize("por");
      }
      if (typeof worker.loadLanguage === "function") {
        await worker.loadLanguage("por");
      }
      if (typeof worker.initialize === "function") {
        await worker.initialize("por");
      }
      return worker;
    };

    try {
      const baseYear = Number.parseInt(quote.valid_until?.slice(0, 4) || "", 10) || new Date().getFullYear();
      const ocrWorker = await getWorker();
      const extractedItems: ExtractedCardItem[] = [];

      for (let i = 0; i < arquivos.length; i += 1) {
        const file = arquivos[i];
        setStatusImportacaoArquivo(`Processando ${file.name} (${i + 1}/${arquivos.length})`);
        if (file.type === "application/pdf") {
          const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
          try {
            const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker?url");
            if (workerModule?.default && pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
            }
          } catch (e) {
            // fallback: if worker fails to load, pdfjs will attempt without it
          }
          const data = await file.arrayBuffer();
          let pdf: any;
          try {
            pdf = await pdfjsLib.getDocument({ data }).promise;
          } catch (err) {
            pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
          }
          for (let p = 1; p <= pdf.numPages; p += 1) {
            setStatusImportacaoArquivo(`Renderizando página ${p}/${pdf.numPages} do PDF...`);
            const page = await pdf.getPage(p);
            const scale = 350 / 72;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            if (!context) continue;
            await page.render({ canvasContext: context, viewport }).promise;

            const skip = await shouldSkipPage(page, viewport, canvas, pdfjsLib, ocrWorker);
            if (skip) {
              setStatusImportacaoArquivo(`Página ${p} ignorada (informações gerais).`);
              continue;
            }

            let cards: CardBBox[] = [];
            try {
              const textBoxes = await extractTextItemsFromPdfPage(page, viewport, pdfjsLib);
              cards = detectCardsFromTextItems(textBoxes, canvas.width, canvas.height, p);
            } catch (e) {
              cards = [];
            }
            if (cards.length === 0) {
              const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
              cards = detectCardsFromImageData(imageData, canvas.width, canvas.height, p);
            }
            if (p === 1) {
              const cardsBase = cards;
              const ignoreZone = {
                x1: 0,
                y1: 0,
                x2: canvas.width,
                y2: canvas.height * 0.33,
              };
              cards = filtrarCardsPorZona(cards, ignoreZone);
              if (cards.length === 0) cards = cardsBase;
            }
            if (cards.length === 0) continue;

            const itensPagina = await extractItemsFromCards(
              canvas,
              cards,
              ocrWorker,
              baseYear,
              p,
              setStatusImportacaoArquivo
            );
            extractedItems.push(...itensPagina);
          }
        } else if (file.type.startsWith("image/")) {
          const canvas = await renderImageFileToCanvas(file);
          const context = canvas.getContext("2d");
          if (!context) continue;
          const skipImage = await shouldSkipCanvas(canvas, ocrWorker);
          if (skipImage) {
            setStatusImportacaoArquivo(`Imagem ${file.name} ignorada (informações gerais).`);
            continue;
          }
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          let cards = detectCardsFromImageData(imageData, canvas.width, canvas.height, i + 1);
          if (i === 0) {
            const cardsBase = cards;
            const ignoreZone = {
              x1: 0,
              y1: 0,
              x2: canvas.width,
              y2: canvas.height * 0.33,
            };
            cards = filtrarCardsPorZona(cards, ignoreZone);
            if (cards.length === 0) cards = cardsBase;
          }
          if (cards.length === 0) continue;
          const itensImagem = await extractItemsFromCards(
            canvas,
            cards,
            ocrWorker,
            baseYear,
            i + 1,
            setStatusImportacaoArquivo
          );
          extractedItems.push(...itensImagem);
        }
      }

      setStatusImportacaoArquivo("Interpretando dados...");
      if (extractedItems.length === 0) {
        throw new Error("Nenhum item identificado no PDF/imagem.");
      }
      const { parsed, reviewCount } = buildParsedBudgetFromExtractedItems(extractedItems);
      if (!parsed.items.length) {
        throw new Error("Nenhum item valido identificado no PDF/imagem.");
      }
      await aplicarImportacao(parsed);

      setSucessoImportacaoArquivo(
        `Importacao concluida. Itens: ${parsed.items.length} • Total ${formatCurrency(parsed.total || 0)}${
          reviewCount > 0 ? ` • Revisar: ${reviewCount}` : ""
        }.`
      );
      setArquivosImportacao([]);
      await refresh();
    } catch (e: any) {
      setErroImportacaoArquivo(e?.message || "Erro ao importar arquivos.");
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setStatusImportacaoArquivo(null);
      setImportandoArquivo(false);
    }
  }

  async function importarTexto() {
    const rawText = textoImportacao.trim();
    if (!rawText) {
      setErroImportacaoTexto("Cole o texto do orçamento para importar.");
      return;
    }
    setImportandoTexto(true);
    setErroImportacaoTexto(null);
    setSucessoImportacaoTexto(null);
    try {
      const parsed = parseBudgetFromTexts([rawText]);
      await aplicarImportacao(parsed);
      setSucessoImportacaoTexto(
        `Importacao concluida. Itens: ${parsed.items.length} • Total ${formatCurrency(parsed.total || 0)}.`
      );
      setTextoImportacao("");
      await refresh();
    } catch (e: any) {
      setErroImportacaoTexto(e?.message || "Erro ao importar texto.");
    } finally {
      setImportandoTexto(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const importarPdf = params.has("import_pdf");
    const raw = sessionStorage.getItem("importacao_pdf_files");
    if (raw) {
      try {
        const filesData = JSON.parse(raw) as Array<{ name: string; type: string; data: string }>;
        sessionStorage.removeItem("importacao_pdf_files");
        const files = (filesData || []).map((f) => dataUrlToFile(f.data, f.name, f.type));
        if (files.length > 0) {
          setMostrarImportacaoArquivo(true);
          setArquivosImportacao(files);
          importarArquivos(files);
        }
      } catch (e) {
        sessionStorage.removeItem("importacao_pdf_files");
      }
    }
    if (importarPdf) {
      setMostrarImportacaoArquivo(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("import_pdf");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const itensDetalhados = useMemo(() => {
    return items.map((item) => {
      const parsed = parseItemDescription(item.description_snapshot || "");
      const tipoLabel =
        parsed.tipoProdutoLabel ||
        extractTipoLabel(item.description_snapshot || "") ||
        item.item_type ||
        "";
      const pax = parsed.pax || Number(item.quantity || 1);
      const dataInicio = parsed.dataInicio || "";
      const dataFim = parsed.dataFim || dataInicio || "";
      const cidade = parsed.cidadeNome || "";
      const produto = parsed.produtoNome || fallbackProdutoNome(item.description_snapshot || "");
      const valor = Number(item.total_item || 0);
      return {
        item,
        tipoLabel,
        pax,
        dataInicio,
        dataFim,
        cidade,
        produto,
        valor,
        voos: parsed.voos || [],
        observacoes: parsed.observacoes || "",
      };
    });
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Importação */}
      <div className="card-base">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h2 className="card-title">Importar orçamento</h2>
            <div className="text-sm text-muted">
              Prioridade: PDF/Imagem ou texto copiado para preencher os itens automaticamente.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={() => setMostrarImportacaoArquivo((prev) => !prev)}
            >
              Importar PDF/Imagem
            </button>
            <button
              className="btn-secondary"
              onClick={() => setMostrarImportacaoTexto((prev) => !prev)}
            >
              Importar texto
            </button>
          </div>
        </div>

        {mostrarImportacaoArquivo && (
          <div className="mt-3 card-base" style={{ border: "1px dashed #cbd5f5" }}>
            <div className="text-sm text-muted">
              Envie o PDF do orçamento ou imagens (PNG/JPG). O sistema vai extrair os itens e permitir
              editar depois.
            </div>
            <div className="mt-2 flex flex-col md:flex-row gap-2">
              <input
                className="input"
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={(e) => setArquivosImportacao(Array.from(e.target.files || []))}
              />
              <button
                className="btn-primary"
                onClick={importarArquivos}
                disabled={importandoArquivo || arquivosImportacao.length === 0}
              >
                {importandoArquivo ? "Importando..." : "Processar e importar"}
              </button>
            </div>
            {arquivosImportacao.length > 0 && (
              <div className="text-xs text-muted mt-2">
                {arquivosImportacao.map((f) => f.name).join(", ")}
              </div>
            )}
            {statusImportacaoArquivo && (
              <div style={{ color: "#0f172a", marginTop: 8 }}>{statusImportacaoArquivo}</div>
            )}
            {erroImportacaoArquivo && (
              <div style={{ color: "#dc2626", marginTop: 8 }}>{erroImportacaoArquivo}</div>
            )}
            {sucessoImportacaoArquivo && (
              <div style={{ color: "#065f46", marginTop: 8 }}>{sucessoImportacaoArquivo}</div>
            )}
          </div>
        )}

        {mostrarImportacaoTexto && (
          <div className="mt-3 card-base" style={{ border: "1px dashed #cbd5f5" }}>
            <div className="text-sm text-muted">
              Cole o texto do orçamento (copy/paste). O sistema vai identificar os itens e permitir
              editar depois.
            </div>
            <div className="mt-2">
              <textarea
                className="input"
                rows={8}
                value={textoImportacao}
                onChange={(e) => setTextoImportacao(e.target.value)}
                placeholder="Cole aqui o texto do PDF/imagem..."
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="btn-primary"
                onClick={importarTexto}
                disabled={importandoTexto || !textoImportacao.trim()}
              >
                {importandoTexto ? "Importando..." : "Processar texto"}
              </button>
              <button
                className="btn-light"
                onClick={() => {
                  setTextoImportacao("");
                  setErroImportacaoTexto(null);
                  setSucessoImportacaoTexto(null);
                }}
                disabled={importandoTexto}
              >
                Limpar
              </button>
            </div>
            {erroImportacaoTexto && (
              <div style={{ color: "#dc2626", marginTop: 8 }}>{erroImportacaoTexto}</div>
            )}
            {sucessoImportacaoTexto && (
              <div style={{ color: "#065f46", marginTop: 8 }}>{sucessoImportacaoTexto}</div>
            )}
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="card-base">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-sm text-muted">Cliente</div>
            <div className="font-semibold">{clienteLabel}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Status</div>
            <div className="font-semibold">{quote.status}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Moeda</div>
            <div className="font-semibold">{quote.currency}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Validade</div>
            <div className="font-semibold">{quote.valid_until}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">Total (persistido)</div>
            <div className="text-xl font-bold">{formatCurrency(quote.total || 0)}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => abrirFormularioItem()}>
            + Adicionar item
          </button>
          <button className="btn-secondary" onClick={() => setOpenHotel(true)}>
            + Hotel (avançado)
          </button>
          <button className="btn-secondary" onClick={() => setOpenService(true)}>
            + Serviço (avançado)
          </button>
          <button className="btn-light" onClick={() => setOpenDiscount(true)}>
            Aplicar desconto
          </button>
          <button className="btn-light" onClick={refresh}>
            Atualizar
          </button>
          <button className="btn-primary" onClick={recalcAndPersistTotal}>
            Recalcular total
          </button>
        </div>

        {busy && (
          <div className="mt-3 card-warn">
            <strong>{busy}</strong>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card-base">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h2 className="card-title">Itens do orçamento</h2>
          <div className="text-sm text-muted">
            Campos obrigatórios: Tipo, Pax, Datas, Cidade, Produto e Valor.
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-muted mt-3">Nenhum item ainda. Importe ou adicione manualmente.</div>
        ) : (
          <div className="table-wrap mt-3">
            <table className="table-base">
              <thead className="table-header-blue">
                <tr>
                  <th>Tipo de produto</th>
                  <th>Pax</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Cidade</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itensDetalhados.map(({ item, tipoLabel, pax, dataInicio, dataFim, cidade, produto, valor }) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{tipoLabel || item.item_type}</td>
                    <td>{pax}</td>
                    <td>{dataInicio || "—"}</td>
                    <td>{dataFim || dataInicio || "—"}</td>
                    <td>{cidade || "—"}</td>
                    <td className="font-medium">{produto || "—"}</td>
                    <td className="font-semibold">{formatCurrency(valor || 0)}</td>
                    <td className="text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        <button
                          className="btn-light"
                          onClick={() => moverItem(item.id, -1)}
                          disabled={items[0]?.id === item.id}
                        >
                          ↑
                        </button>
                        <button
                          className="btn-light"
                          onClick={() => moverItem(item.id, 1)}
                          disabled={items[items.length - 1]?.id === item.id}
                        >
                          ↓
                        </button>
                        <button className="btn-light" onClick={() => abrirFormularioItem(item)}>
                          Editar
                        </button>
                        <button className="btn-danger" onClick={() => removeItem(item.id)}>
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="card-base">
        <h2 className="card-title">Totalização</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card-subtle">
            <div className="text-sm text-muted">Subtotal</div>
            <div className="text-lg font-bold">
              {formatCurrency(subtotal)}
            </div>
          </div>

          <div className="card-subtle">
            <div className="text-sm text-muted">Descontos (estimado)</div>
            <div className="text-lg font-bold">
              {formatCurrency(discountTotal)}
            </div>
          </div>

          <div className="card-subtle">
            <div className="text-sm text-muted">Total (calculado)</div>
            <div className="text-xl font-bold">
              {formatCurrency(total)}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalItemAberto && (
        <ModalShell
          title={itemForm.id ? "Editar item do orçamento" : "Adicionar item do orçamento"}
          onClose={() => {
            setModalItemAberto(false);
            setItemForm(criarItemFormVazio());
          }}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="label">Tipo de produto *</label>
                <select
                  className="input"
                  value={
                    itemForm.tipoProdutoId ||
                    (itemForm.tipoProdutoLabel ? "__custom__" : "")
                  }
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id === "__custom__") return;
                    const label = obterTipoLabel(id, itemForm.tipoProdutoLabel || "");
                    setItemForm((prev) => ({
                      ...prev,
                      tipoProdutoId: id,
                      tipoProdutoLabel: label,
                    }));
                  }}
                >
                  <option value="">Selecione</option>
                  {itemForm.tipoProdutoLabel &&
                    !tipoProdutos.some(
                      (tp) =>
                        normalizeOcrText(tp.nome || tp.tipo || "") ===
                        normalizeOcrText(itemForm.tipoProdutoLabel)
                    ) && (
                      <option value="__custom__">{itemForm.tipoProdutoLabel} (atual)</option>
                    )}
                  {tipoProdutos.map((tp) => {
                    const label = tp.nome || tp.tipo || "";
                    return (
                      <option key={tp.id} value={tp.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="label">Qte Pax *</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={itemForm.pax}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, pax: Number(e.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="label">Valor *</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={itemForm.valor}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, valor: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="label">Data início *</label>
                <input
                  className="input"
                  value={itemForm.dataInicio}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, dataInicio: e.target.value }))
                  }
                  placeholder="11 de mar"
                />
              </div>
              <div>
                <label className="label">Data fim</label>
                <input
                  className="input"
                  value={itemForm.dataFim}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, dataFim: e.target.value }))
                  }
                  placeholder="18 de mar"
                />
                <div className="text-xs text-muted mt-1">
                  Se vazio, será usada a data de início.
                </div>
              </div>
              <div>
                <label className="label">Cidade destino *</label>
                <input
                  className="input"
                  value={itemForm.cidadeNome}
                  onChange={(e) => {
                    setItemForm((prev) => ({
                      ...prev,
                      cidadeNome: e.target.value,
                      cidadeId: "",
                    }));
                    setCidadeBusca(e.target.value);
                  }}
                  onFocus={() => setMostrarSugestoesCidade(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesCidade(false), 150)}
                  placeholder="Digite a cidade"
                />
                {buscandoCidade && <div className="text-xs text-muted mt-1">Buscando...</div>}
                {erroCidadeBusca && <div className="text-xs text-red-600 mt-1">{erroCidadeBusca}</div>}
                {mostrarSugestoesCidade && cidadesSugestoes.length > 0 && (
                  <div className="card-base mt-2" style={{ padding: 6, maxHeight: 160, overflowY: "auto" }}>
                    {cidadesSugestoes.map((cidade) => (
                      <button
                        key={cidade.id}
                        type="button"
                        className="btn-light"
                        style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                        onClick={() => {
                          setItemForm((prev) => ({
                            ...prev,
                            cidadeNome: cidade.nome,
                            cidadeId: cidade.id,
                          }));
                          setCidadeBusca(cidade.nome);
                          setMostrarSugestoesCidade(false);
                        }}
                      >
                        {cidade.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="label">Produto *</label>
                <input
                  className="input"
                  value={itemForm.produtoNome}
                  onChange={(e) => {
                    setItemForm((prev) => ({
                      ...prev,
                      produtoNome: e.target.value,
                      produtoId: "",
                    }));
                    setProdutoBusca(e.target.value);
                  }}
                  onFocus={() => setMostrarSugestoesProduto(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesProduto(false), 150)}
                  placeholder="Nome do produto"
                />
                {buscandoProdutos && <div className="text-xs text-muted mt-1">Buscando...</div>}
                {mostrarSugestoesProduto && produtosSugestoes.length > 0 && (
                  <div className="card-base mt-2" style={{ padding: 6, maxHeight: 160, overflowY: "auto" }}>
                    {produtosSugestoes.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        className="btn-light"
                        style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                        onClick={() => {
                          const tipoId = prod.tipo_produto || itemForm.tipoProdutoId;
                          const tipoLabel = obterTipoLabel(tipoId, itemForm.tipoProdutoLabel || "");
                          setItemForm((prev) => ({
                            ...prev,
                            produtoNome: prod.nome || "",
                            produtoId: prod.id,
                            tipoProdutoId: tipoId,
                            tipoProdutoLabel: tipoLabel,
                          }));
                          setProdutoBusca(prod.nome || "");
                          setMostrarSugestoesProduto(false);
                        }}
                      >
                        {prod.nome || "(sem nome)"}
                      </button>
                    ))}
                  </div>
                )}
                <div className="text-xs text-muted mt-1">
                  Se não existir, o sistema criará um novo produto ao salvar.
                </div>
              </div>
              <div>
                <label className="label">Endereço (hotel)</label>
                <input
                  className="input"
                  value={itemForm.endereco}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, endereco: e.target.value }))
                  }
                  placeholder="Ex: Rua, 123"
                />
              </div>
            </div>

            {normalizeOcrText(
              itemForm.tipoProdutoLabel || obterTipoLabel(itemForm.tipoProdutoId, "")
            ).includes("aereo") && (
              <div className="card-base">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Trechos do aéreo *</div>
                  <button
                    type="button"
                    className="btn-light"
                    onClick={() =>
                      setItemForm((prev) => ({
                        ...prev,
                        voos: [
                          ...prev.voos,
                          {
                            airline: "",
                            flight: "",
                            type: "",
                            from: "",
                            depart: "",
                            to: "",
                            arrive: "",
                          },
                        ],
                      }))
                    }
                  >
                    + Adicionar trecho
                  </button>
                </div>
                <div className="table-wrap mt-2">
                  <table className="table-base">
                    <thead className="table-header-blue">
                      <tr>
                        <th>Cia Aérea</th>
                        <th>Voo</th>
                        <th>Tipo</th>
                        <th>De</th>
                        <th>Saída</th>
                        <th>Para</th>
                        <th>Chegada</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(itemForm.voos || []).map((voo, idx) => (
                        <tr key={`${voo.flight}-${idx}`}>
                          <td>
                            <input
                              className="input"
                              value={voo.airline}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], airline: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={voo.flight}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], flight: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={voo.type}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], type: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={voo.from}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], from: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={voo.depart}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], depart: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={voo.to}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], to: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <input
                              className="input"
                              value={voo.arrive}
                              onChange={(e) => {
                                const value = e.target.value;
                                setItemForm((prev) => {
                                  const voos = [...prev.voos];
                                  voos[idx] = { ...voos[idx], arrive: value };
                                  return { ...prev, voos };
                                });
                              }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-danger"
                              onClick={() =>
                                setItemForm((prev) => ({
                                  ...prev,
                                  voos: prev.voos.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <label className="label">Observações</label>
              <textarea
                className="input"
                rows={4}
                value={itemForm.observacoes}
                onChange={(e) =>
                  setItemForm((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                placeholder="Informações adicionais"
              />
            </div>

            {erroItemForm && <div className="card-error">{erroItemForm}</div>}
            <div className="flex gap-2">
              <button
                className="btn-light"
                onClick={() => {
                  setModalItemAberto(false);
                  setItemForm(criarItemFormVazio());
                }}
              >
                Cancelar
              </button>
              <button className="btn-primary" onClick={salvarItemForm} disabled={salvandoItem}>
                {salvandoItem ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {openHotel && (
        <AddHotelModal
          quoteId={quote.id}
          currency={quote.currency || "BRL"}
          onClose={() => setOpenHotel(false)}
          onAdded={async () => {
            setOpenHotel(false);
            await refresh();
          }}
        />
      )}

      {openService && (
        <AddServiceModal
          quoteId={quote.id}
          currency={quote.currency || "BRL"}
          onClose={() => setOpenService(false)}
          onAdded={async () => {
            setOpenService(false);
            await refresh();
          }}
        />
      )}

      {openDiscount && (
        <DiscountModal
          quoteId={quote.id}
          currency={quote.currency || "BRL"}
          appliedBy={props.userId}
          onClose={() => setOpenDiscount(false)}
          onSaved={async () => {
            setOpenDiscount(false);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
