import { titleCaseWithExceptions } from "../titleCase";
import { getOcrWorker } from "./ocrWorker";
import type {
  ImportDebugImage,
  ImportLogDraft,
  ImportResult,
  QuoteDraft,
  QuoteItemDraft,
} from "./types";

type ExtractOptions = {
  debug?: boolean;
  onProgress?: (message: string) => void;
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

const OCR_CARD_REGIONS = {
  titleLeft: { x1: 0, y1: 0, x2: 0.7, y2: 0.35 },
  topRight: { x1: 0.7, y1: 0, x2: 1, y2: 0.45 },
  middle: { x1: 0, y1: 0.3, x2: 1, y2: 0.65 },
  product: { x1: 0, y1: 0.55, x2: 1, y2: 1 },
};

const OCR_TEXT_WHITELIST =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜàáâãäçèéêëìíîïòóôõöùúûü0123456789$%()[]{}<>.,;:/-–—+°'\"#@&=!?* ";
const OCR_NUMBER_WHITELIST = "0123456789R$.,()AdultoPaxTotal";

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

const TEXT_STOP_KEYWORDS = [
  "resumo da viagem",
  "informacoes importantes",
  "informações importantes",
  "comprar produtos",
  "posso te ajudar",
  "telefone de contato",
  "id do carrinho",
  "taxas inclusas",
];

const MONTHS_PT: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  "março": 3,
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

function parsePtMonth(value: string) {
  const key = normalizeOcrText(value).trim();
  return MONTHS_PT[key] || 0;
}

function toIsoDate(day: number, month: number, year: number) {
  if (!day || !month || !year) return "";
  const d = String(day).padStart(2, "0");
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-${d}`;
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
  const fallbackMatches = text.match(/[0-9]{1,3}(?:\.[0-9]{3})*,\d{2}/g) || [];
  const list = matches.length ? matches : fallbackMatches;
  if (list.length === 0) return { valor: 0, valor_formatado: "", moeda: "" };
  const last = list[list.length - 1];
  return {
    valor: parseCurrencyValue(last),
    valor_formatado: last.replace(/\s+/g, " ").trim(),
    moeda: /R\$/i.test(last) ? "BRL" : "BRL",
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
  return "";
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

function inferTipoLabelFromText(text: string, fallbackLabel: string) {
  const normalized = normalizeOcrText(text);
  if (normalized.includes("ingresso")) return "Serviços";
  if (normalized.includes("seguro")) return "Seguro viagem";
  if (normalized.includes("aereo") || normalized.includes("voo") || normalized.includes("passagem")) return "Aéreo";
  if (normalized.includes("hotel") || normalized.includes("pousada") || normalized.includes("resort") || normalized.includes("flat")) return "Hotel";
  if (normalized.includes("passeio")) return "Serviços";
  if (normalized.includes("transporte") || normalized.includes("transfer") || normalized.includes("traslado")) return "Serviços";
  return fallbackLabel || "";
}

function isTipoProdutoValido(text: string) {
  const normalized = normalizeOcrText(text || "");
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

function pageHasSkipKeywords(text: string) {
  const normalized = normalizeOcrText(text || "");
  return PAGE_SKIP_KEYWORDS.some((keyword) => normalized.includes(normalizeOcrText(keyword)));
}

function pageHasItemKeywords(text: string) {
  const normalized = normalizeOcrText(text || "");
  return ITEM_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function extractYearFromText(text: string) {
  const match = text.match(/20\d{2}/);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return Number.isFinite(year) ? year : null;
}

function cropCanvas(source: HTMLCanvasElement, region: { x1: number; y1: number; x2: number; y2: number }) {
  const width = Math.max(1, Math.round(region.x2 - region.x1));
  const height = Math.max(1, Math.round(region.y2 - region.y1));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(
      source,
      region.x1,
      region.y1,
      width,
      height,
      0,
      0,
      width,
      height
    );
  }
  return canvas;
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

async function ocrCanvasRegion(worker: any, canvas: HTMLCanvasElement, mode: "text" | "numbers") {
  if (typeof worker.setParameters === "function") {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist: mode === "numbers" ? OCR_NUMBER_WHITELIST : OCR_TEXT_WHITELIST,
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

async function ocrCanvasLines(worker: any, canvas: HTMLCanvasElement): Promise<TextItemBox[]> {
  if (typeof worker.setParameters === "function") {
    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      tessedit_char_whitelist: OCR_TEXT_WHITELIST,
      preserve_interword_spaces: "1",
    });
  }
  const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
  const blocks = (data?.blocks || []) as Array<{
    paragraphs?: Array<{
      lines?: Array<{ text?: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
    }>;
  }>;
  const extracted: TextItemBox[] = [];
  blocks.forEach((block) => {
    (block.paragraphs || []).forEach((paragraph) => {
      (paragraph.lines || []).forEach((line) => {
        const text = (line.text || "").trim();
        if (!text) return;
        const bbox = line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 };
        extracted.push({
          x1: bbox.x0,
          y1: bbox.y0,
          x2: bbox.x1,
          y2: bbox.y1,
          text,
        });
      });
    });
  });
  if (extracted.length > 0) {
    return extracted.filter((line) => line.x2 > line.x1 && line.y2 > line.y1);
  }
  const fallbackText = (data?.text || "").trim();
  if (!fallbackText) return [];
  return fallbackText
    .split(/\r?\n/)
    .map((line, idx) => ({
      x1: 0,
      y1: idx * 12,
      x2: canvas.width,
      y2: idx * 12 + 10,
      text: line.trim(),
    }))
    .filter((line) => line.text);
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
    .filter(({ line }) => isTipoProdutoValido(line.text) || inferTipoLabelFromText(line.text, "") !== "");
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
    const y1 = Math.max(0, anchorLine.y1 - padding);
    const y2 = Math.min(pageHeight, slice[slice.length - 1].y2 + padding);
    if (y2 - y1 < minHeight) return;
    cards.push({
      pageIndex,
      x1: 0,
      y1,
      x2: pageWidth,
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
  blocks.forEach((block) => {
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
    if (maxX - minX < pageWidth * 0.25) return;
    cards.push({
      pageIndex,
      x1: 0,
      y1: clamp(block.y1 - 10, 0, pageHeight),
      x2: pageWidth,
      y2: clamp(block.y2 + 10, 0, pageHeight),
    });
  });
  return cards;
}

function detectCardsFromTextItems(
  boxes: TextItemBox[],
  pageWidth: number,
  pageHeight: number,
  pageIndex = 0
): CardBBox[] {
  const lines = groupTextLines(boxes, pageHeight);
  if (!lines.length) return [];
  const sortedLines = [...lines].sort((a, b) => a.y1 - b.y1);
  const cards: Array<{ x1: number; y1: number; x2: number; y2: number; lines: number }> = [];
  const cardGap = Math.max(14, pageHeight * 0.015);
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
  const minWidth = Math.max(200, pageWidth * 0.25);
  return cards
    .filter((card) => card.lines >= 2)
    .filter((card) => card.y2 - card.y1 >= minHeight && card.x2 - card.x1 >= minWidth)
    .map((card) => ({
      pageIndex,
      x1: 0,
      y1: clamp(card.y1 - 10, 0, pageHeight),
      x2: pageWidth,
      y2: clamp(card.y2 + 10, 0, pageHeight),
    }));
}

function filterCardsByZone(cards: CardBBox[], zone?: { x1: number; y1: number; x2: number; y2: number }) {
  if (!zone) return cards;
  return cards.filter((card) => card.y1 >= zone.y2 || card.y2 <= zone.y1);
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

function buildTempId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

async function shouldSkipPage(page: any, viewport: any, canvas: HTMLCanvasElement, pdfjsLib: any, worker: any) {
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
  const topOcr = await ocrCanvasRegion(worker, topRegion, "text");
  return pageHasSkipKeywords(topOcr.text) && !pageHasItemKeywords(topOcr.text);
}

async function extractItemsFromCards(
  canvas: HTMLCanvasElement,
  cards: CardBBox[],
  worker: any,
  baseYear: number,
  pageNumber: number,
  debug: boolean,
  debugImages: ImportDebugImage[]
): Promise<QuoteItemDraft[]> {
  const result: QuoteItemDraft[] = [];
  const sortedCards = [...cards].sort((a, b) => a.y1 - b.y1);
  for (let idx = 0; idx < sortedCards.length; idx += 1) {
    const card = sortedCards[idx];
    const regions = buildCardRegions(card);
    const titleCanvas = cropCanvas(canvas, regions.titleLeft);
    const topRightCanvas = cropCanvas(canvas, regions.topRight);
    const middleCanvas = cropCanvas(canvas, regions.middle);
    const productCanvas = cropCanvas(canvas, regions.product);

    const titleOcr = await ocrCanvasRegion(worker, titleCanvas, "text");
    const topRightOcr = await ocrCanvasRegion(worker, topRightCanvas, "numbers");
    const middleOcr = await ocrCanvasRegion(worker, middleCanvas, "text");
    const productOcr = await ocrCanvasRegion(worker, productCanvas, "text");

    let tipoProduto = parseTipoProduto(titleOcr.text);
    let tipoValido = isTipoProdutoValido(tipoProduto) || isTipoProdutoValido(titleOcr.text);
    if (!tipoValido) {
      tipoProduto = parseTipoProduto(middleOcr.text);
      tipoValido = isTipoProdutoValido(tipoProduto) || isTipoProdutoValido(middleOcr.text);
    }

    const combinedText = `${titleOcr.text}\n${middleOcr.text}\n${productOcr.text}\n${topRightOcr.text}`;
    const inferredTipo = inferTipoLabelFromText(combinedText, tipoProduto);
    if (!tipoValido && inferredTipo) {
      tipoProduto = inferredTipo;
      tipoValido = true;
    }

    const qtePax = parseQuantidadePax(topRightOcr.text);
    let valorInfo = parseValor(topRightOcr.text);
    if (valorInfo.valor <= 0) {
      const width = card.x2 - card.x1;
      const height = card.y2 - card.y1;
      const fallbackRegion = cropCanvas(canvas, {
        x1: card.x1 + width * 0.55,
        y1: card.y1,
        x2: card.x2,
        y2: card.y1 + height * 0.6,
      });
      const fallbackOcr = await ocrCanvasRegion(worker, fallbackRegion, "numbers");
      valorInfo = parseValor(fallbackOcr.text);
    }
    if (valorInfo.valor <= 0) {
      const fullCard = cropCanvas(canvas, {
        x1: card.x1,
        y1: card.y1,
        x2: card.x2,
        y2: card.y2,
      });
      const cardOcr = await ocrCanvasRegion(worker, fullCard, "numbers");
      valorInfo = parseValor(cardOcr.text);
    }

    let periodoInfo = parsePeriodoIso(middleOcr.text, baseYear);
    if (!periodoInfo.start) {
      periodoInfo = parsePeriodoIso(productOcr.text, baseYear);
    }
    const cidade = parseCidade(middleOcr.text) || parseCidade(productOcr.text);
    const produto = parseProduto(productOcr.text) || parseProduto(middleOcr.text);

    const missingFields =
      (tipoProduto ? 0 : 1) +
      (valorInfo.valor > 0 ? 0 : 1) +
      (periodoInfo.start ? 0 : 1) +
      (produto ? 0 : 1);
    const avgConfidence =
      (titleOcr.confidence + topRightOcr.confidence + middleOcr.confidence + productOcr.confidence) / 4;
    const confidence = clamp(avgConfidence - missingFields * 0.12, 0, 1);

    if (!tipoValido && (produto || valorInfo.valor > 0)) {
      tipoProduto = inferredTipo || "Serviços";
      tipoValido = true;
    }
    if (!tipoValido) continue;

    const totalAmount = valorInfo.valor;
    if (totalAmount <= 0 && !produto) {
      continue;
    }

    if (debug) {
      const baseLabel = `p${pageNumber}-c${idx + 1}`;
      debugImages.push({
        label: `${baseLabel}-title`,
        data_url: titleCanvas.toDataURL("image/png"),
        page: pageNumber,
        card_index: idx + 1,
      });
      debugImages.push({
        label: `${baseLabel}-topright`,
        data_url: topRightCanvas.toDataURL("image/png"),
        page: pageNumber,
        card_index: idx + 1,
      });
      debugImages.push({
        label: `${baseLabel}-middle`,
        data_url: middleCanvas.toDataURL("image/png"),
        page: pageNumber,
        card_index: idx + 1,
      });
      debugImages.push({
        label: `${baseLabel}-product`,
        data_url: productCanvas.toDataURL("image/png"),
        page: pageNumber,
        card_index: idx + 1,
      });
    }

    result.push({
      temp_id: buildTempId(),
      item_type: tipoProduto || "Serviços",
      title: produto || tipoProduto || "Item",
      product_name: produto || "",
      city_name: cidade || "",
      quantity: qtePax || 1,
      unit_price: qtePax > 0 ? totalAmount / qtePax : totalAmount,
      total_amount: totalAmount,
      taxes_amount: 0,
      start_date: periodoInfo.start || "",
      end_date: periodoInfo.end || periodoInfo.start || "",
      currency: valorInfo.moeda || "BRL",
      confidence,
      segments: [],
      raw: {
        page: pageNumber,
        card_bbox: [card.x1, card.y1, card.x2, card.y2],
        missing_fields: missingFields,
        regions: {
          title: titleOcr,
          top_right: topRightOcr,
          middle: middleOcr,
          product: productOcr,
        },
      },
    });
  }
  return result;
}

function buildItemKey(item: QuoteItemDraft) {
  const keyParts = [
    normalizeOcrText(item.item_type),
    normalizeOcrText(item.product_name),
    normalizeOcrText(item.city_name),
    item.start_date || "",
    item.total_amount.toFixed(2),
  ];
  return keyParts.join("|");
}

function dedupeItems(items: QuoteItemDraft[]) {
  const map = new Map<string, QuoteItemDraft>();
  items.forEach((item) => {
    const key = buildItemKey(item);
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

function parseItemsFromFullText(text: string, baseYear: number, pageNumber: number): QuoteItemDraft[] {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const blocks: string[][] = [];
  let current: string[] = [];

  lines.forEach((line) => {
    const normalized = normalizeOcrText(line);
    const hasType = inferTipoLabelFromText(line, "") !== "";
    const hasMoney =
      /R\$/i.test(line) ||
      /[0-9]{1,3}(?:\.[0-9]{3})*,\d{2}/.test(line);
    const isTotalLine = normalized.includes("total") && hasMoney;
    if ((hasType || isTotalLine) && current.length > 0) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  });
  if (current.length) blocks.push(current);

  const items: QuoteItemDraft[] = [];
  blocks.forEach((block) => {
    const blockText = block.join("\n");
    const tipo = inferTipoLabelFromText(blockText, "") || detectCardTypeLabel(block) || "Serviços";
    const valorInfo = parseValor(blockText);
    if (valorInfo.valor <= 0) return;
    const periodo = parsePeriodoIso(blockText, baseYear);
    const cidade = parseCidade(blockText);
    const produto = parseProduto(blockText);
    const quantity = parseQuantidadePax(blockText);
    const totalAmount = valorInfo.valor;
    items.push({
      temp_id: buildTempId(),
      item_type: tipo,
      title: produto || tipo || "Item",
      product_name: produto || "",
      city_name: cidade || "",
      quantity: quantity || 1,
      unit_price: quantity > 0 ? totalAmount / quantity : totalAmount,
      total_amount: totalAmount,
      taxes_amount: 0,
      start_date: periodo.start || "",
      end_date: periodo.end || periodo.start || "",
      currency: valorInfo.moeda || "BRL",
      confidence: 0.4,
      segments: [],
      raw: {
        page: pageNumber,
        block_text: blockText,
      },
    });
  });

  return items;
}

type TextBlock = {
  typeHint: string;
  lines: string[];
};

function isTextStopLine(line: string) {
  const normalized = normalizeOcrText(line);
  return TEXT_STOP_KEYWORDS.some((keyword) => normalized.includes(normalizeOcrText(keyword)));
}

function detectSectionLabel(line: string) {
  const normalized = normalizeOcrText(line);
  if (!normalized) return "";
  if (normalized === "servicos") return "Serviços";
  if (normalized === "aereo") return "Aéreo";
  if (normalized === "hoteis" || normalized === "hotel" || normalized === "hospedagem") return "Hotel";
  if (normalized.includes("seguro") && normalized.includes("viagem")) return "Seguro viagem";
  return "";
}

function splitTextBlocks(text: string): TextBlock[] {
  const lines = (text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: TextBlock[] = [];
  let currentType = "";
  let current: string[] = [];
  let started = false;

  for (const line of lines) {
    const normalized = normalizeOcrText(line);
    if (!normalized) continue;
    if (isTextStopLine(line)) break;

    const sectionType = detectSectionLabel(line);
    if (sectionType) {
      if (current.length) {
        blocks.push({ typeHint: currentType, lines: current });
        current = [];
      }
      currentType = sectionType;
      started = true;
      continue;
    }

    if (normalized === "selecionado") {
      if (current.length) {
        blocks.push({ typeHint: currentType, lines: current });
        current = [];
      }
      started = true;
      continue;
    }

    if (!started) continue;
    if (normalized === "detalhes") continue;

    current.push(line);
  }

  if (current.length) {
    blocks.push({ typeHint: currentType, lines: current });
  }

  return blocks.filter((block) => block.lines.some((line) => /[A-Za-zÀ-ÿ]/.test(line)));
}

function isLikelyAirportCode(line: string) {
  return /^[A-Z]{3,4}$/.test(line.trim());
}

function isLikelyTimeLine(line: string) {
  return /^\d{1,2}:\d{2}$/.test(line.trim());
}

function isLikelyDateLine(normalized: string) {
  return /\d{1,2}\s*de\s*[a-zçãõáéíóú]{3,}/i.test(normalized);
}

function pickProductLineFromBlock(lines: string[], itemType: string) {
  const candidates = lines.filter((line) => {
    const normalized = normalizeOcrText(line);
    if (!/[A-Za-zÀ-ÿ]/.test(line)) return false;
    if (normalized === "selecionado" || normalized === "detalhes") return false;
    if (normalized.includes("total")) return false;
    if (normalized.includes("reembols")) return false;
    if (normalized.includes("nao reembols")) return false;
    if (normalized.includes("facil")) return false;
    if (normalized.includes("classe")) return false;
    if (normalized.includes("adulto") || normalized.includes("pax") || normalized.includes("passageiro")) return false;
    if (normalized.includes("dias") && normalized.includes("noites")) return false;
    if (normalized.includes("total (")) return false;
    if (isLikelyDateLine(normalized)) return false;
    if (isLikelyTimeLine(line)) return false;
    if (isLikelyAirportCode(line)) return false;
    if (normalized.startsWith("gol") && (normalized.includes("ida") || normalized.includes("volta"))) return false;
    return true;
  });

  if (candidates.length === 0) return "";

  const tipoNorm = normalizeOcrText(itemType);
  const scored = candidates.map((line) => {
    const normalized = normalizeOcrText(line);
    let score = line.length;
    if (tipoNorm === "aereo" && normalized.includes(" - ")) score += 30;
    if (tipoNorm === "servicos" && /(transporte|transfer|traslado|passeio|ingresso)/.test(normalized)) {
      score += 20;
    }
    if (tipoNorm === "hotel" && /(hotel|resort|pousada|all inclusive)/.test(normalized)) {
      score += 20;
    }
    if (normalized.startsWith("(")) score += 10;
    return { line, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.line || "";
}

function parseItemsFromCvcText(text: string, baseYear: number): QuoteItemDraft[] {
  const blocks = splitTextBlocks(text);
  if (!blocks.length) return [];

  const items: QuoteItemDraft[] = [];

  blocks.forEach((block) => {
    const blockText = block.lines.join("\n");
    const tipo =
      block.typeHint ||
      inferTipoLabelFromText(blockText, "") ||
      detectCardTypeLabel(block.lines) ||
      "Serviços";
    const valorInfo = parseValor(blockText);
    if (valorInfo.valor <= 0) return;
    const periodo = parsePeriodoIso(blockText, baseYear);
    const quantidade = parseQuantidadePax(blockText);
    const cidade = parseCidade(blockText);
    const produto = pickProductLineFromBlock(block.lines, tipo) || parseProduto(blockText);
    const totalAmount = valorInfo.valor;
    const quantity = quantidade || 1;
    const title = produto || tipo || "Item";

    items.push({
      temp_id: buildTempId(),
      item_type: tipo,
      title,
      product_name: produto || title,
      city_name: cidade || "",
      quantity,
      unit_price: quantity > 0 ? totalAmount / quantity : totalAmount,
      total_amount: totalAmount,
      taxes_amount: 0,
      start_date: periodo.start || "",
      end_date: periodo.end || periodo.start || "",
      currency: valorInfo.moeda || "BRL",
      confidence: 0.6,
      segments: [],
      raw: {
        source: "text",
        type_hint: block.typeHint,
        block_text: blockText,
      },
    });
  });

  return items;
}

function validateForConfirm(items: QuoteItemDraft[]) {
  return items.every((item) => {
    return (
      item.item_type &&
      item.quantity > 0 &&
      item.start_date &&
      item.title &&
      item.total_amount > 0
    );
  });
}

async function loadImageFromFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Falha ao carregar imagem."));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractCvcQuoteFromText(text: string, options: ExtractOptions = {}): Promise<ImportResult> {
  if (!text || !text.trim()) {
    throw new Error("Texto obrigatorio.");
  }

  const logs: ImportLogDraft[] = [];
  const debugImages: ImportDebugImage[] = [];
  const onProgress = options.onProgress || (() => {});
  onProgress("Processando texto...");
  const baseYear = extractYearFromText(text) || new Date().getFullYear();
  const extractedItems = parseItemsFromCvcText(text, baseYear);
  const deduped = dedupeItems(extractedItems);

  if (!deduped.length) {
    throw new Error("Nenhum item identificado no texto.");
  }

  const total = deduped.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const averageConfidence = deduped.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / deduped.length;
  const extractedAt = new Date().toISOString();

  const rawJson = {
    source: "CVC_TEXT",
    extracted_at: extractedAt,
    text_length: text.length,
    raw_text: text,
    items: deduped.map((item) => ({
      item_type: item.item_type,
      title: item.title,
      product_name: item.product_name,
      city_name: item.city_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.total_amount,
      taxes_amount: item.taxes_amount,
      start_date: item.start_date,
      end_date: item.end_date,
      confidence: item.confidence,
      raw: item.raw,
    })),
  };

  const draft: QuoteDraft = {
    source: "CVC_TEXT",
    status: "IMPORTED",
    currency: "BRL",
    total,
    average_confidence: averageConfidence,
    items: deduped,
    meta: {
      file_name: "texto-colado",
      page_count: 1,
      extracted_at: extractedAt,
    },
    raw_json: rawJson,
  };

  logs.push({ level: "INFO", message: `Texto importado com ${deduped.length} itens.` });

  return {
    draft,
    logs,
    debug_images: debugImages,
  };
}

export async function extractCvcQuoteFromImage(file: File, options: ExtractOptions = {}): Promise<ImportResult> {
  if (!file) {
    throw new Error("Arquivo de imagem obrigatorio.");
  }

  const debug = Boolean(options.debug);
  const logs: ImportLogDraft[] = [];
  const debugImages: ImportDebugImage[] = [];
  const onProgress = options.onProgress || (() => {});
  const worker = await getOcrWorker({ debug });

  onProgress("Carregando imagem...");
  const image = await loadImageFromFile(file);
  const scale = image.width < 1800 ? 2 : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Nao foi possivel renderizar a imagem.");
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  onProgress("OCR da imagem...");
  const fullOcr = await ocrCanvasRegion(worker, canvas, "text");
  const baseYear = extractYearFromText(fullOcr.text) || new Date().getFullYear();

  let cards: CardBBox[] = [];
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  cards = detectCardsFromImageData(imageData, canvas.width, canvas.height, 1);

  if (cards.length === 0) {
    const ocrLines = await ocrCanvasLines(worker, canvas);
    if (ocrLines.length) {
      cards = detectCardsFromTypeLabels(ocrLines, canvas.width, canvas.height, 1);
    }
  }

  const ignoreZone = {
    x1: 0,
    y1: 0,
    x2: canvas.width,
    y2: canvas.height * 0.4,
  };
  if (cards.length > 0) {
    const filtered = filterCardsByZone(cards, ignoreZone);
    if (filtered.length) cards = filtered;
  }

  let extractedItems: QuoteItemDraft[] = [];
  if (cards.length > 0) {
    onProgress("OCR dos cards...");
    extractedItems = await extractItemsFromCards(canvas, cards, worker, baseYear, 1, debug, debugImages);
  }

  if (extractedItems.length === 0) {
    const fallbackItems = parseItemsFromFullText(fullOcr.text, baseYear, 1);
    if (fallbackItems.length) {
      extractedItems = fallbackItems;
      logs.push({ level: "INFO", message: "Imagem importada via fallback de texto." });
    }
  }

  const deduped = dedupeItems(extractedItems);
  if (!deduped.length) {
    throw new Error("Nenhum item identificado no PDF/imagem.");
  }

  const total = deduped.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const averageConfidence = deduped.length
    ? deduped.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / deduped.length
    : 0;
  const extractedAt = new Date().toISOString();

  const rawJson = {
    source: "CVC_IMAGE",
    file_name: file.name,
    page_count: 1,
    extracted_at: extractedAt,
    ocr_text: fullOcr.text,
    items: deduped.map((item) => ({
      item_type: item.item_type,
      title: item.title,
      product_name: item.product_name,
      city_name: item.city_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.total_amount,
      taxes_amount: item.taxes_amount,
      start_date: item.start_date,
      end_date: item.end_date,
      confidence: item.confidence,
      raw: item.raw,
    })),
  };

  const draft: QuoteDraft = {
    source: "CVC_IMAGE",
    status: validateForConfirm(deduped) ? "IMPORTED" : "IMPORTED",
    currency: "BRL",
    total,
    average_confidence: averageConfidence,
    items: deduped,
    meta: {
      file_name: file.name,
      page_count: 1,
      extracted_at: extractedAt,
    },
    raw_json: rawJson,
  };

  return {
    draft,
    logs,
    debug_images: debugImages,
  };
}

export async function extractCvcQuoteFromPdf(file: File, options: ExtractOptions = {}): Promise<ImportResult> {
  if (!file) {
    throw new Error("Arquivo PDF obrigatorio.");
  }
  const debug = Boolean(options.debug);
  const logs: ImportLogDraft[] = [];
  const debugImages: ImportDebugImage[] = [];
  const onProgress = options.onProgress || (() => {});
  const worker = await getOcrWorker({ debug });

  onProgress("Lendo PDF...");
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
  try {
    const workerModule = await import("pdfjs-dist/legacy/build/pdf.worker?url");
    if (workerModule?.default && pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
    }
  } catch (err) {
    logs.push({ level: "WARN", message: "PDF worker nao carregou, fallback sem worker.", payload: {} });
  }

  const data = await file.arrayBuffer();
  let pdf: any;
  try {
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (err) {
    pdf = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  }

  const baseYear = new Date().getFullYear();
  const extractedItems: QuoteItemDraft[] = [];

  for (let p = 1; p <= pdf.numPages; p += 1) {
    onProgress(`Renderizando pagina ${p}/${pdf.numPages}...`);
    const page = await pdf.getPage(p);
    const scale = 350 / 72;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvasContext: context, viewport }).promise;

    const skip = await shouldSkipPage(page, viewport, canvas, pdfjsLib, worker);
    if (skip) {
      logs.push({ level: "INFO", message: `Pagina ${p} ignorada (informacoes gerais).` });
      continue;
    }

    let pageYear = baseYear;
    let textBoxes: TextItemBox[] = [];
    try {
      textBoxes = await extractTextItemsFromPdfPage(page, viewport, pdfjsLib);
    } catch (err) {
      textBoxes = [];
    }

    if (textBoxes.length > 0) {
      const allText = textBoxes.map((b) => b.text).join(" ");
      const yearFromText = extractYearFromText(allText);
      if (yearFromText) pageYear = yearFromText;
    }

    const ignoreZone = p === 1
      ? {
          x1: 0,
          y1: 0,
          x2: canvas.width,
          y2: canvas.height * 0.4,
        }
      : undefined;

    let cards: CardBBox[] = [];
    let ocrLines: TextItemBox[] = [];

    if (textBoxes.length > 0) {
      cards = detectCardsFromTextItems(textBoxes, canvas.width, canvas.height, p);
      const labelCards = detectCardsFromTypeLabels(textBoxes, canvas.width, canvas.height, p);
      if (labelCards.length > cards.length) {
        cards = labelCards;
      }
    }

    if (cards.length === 0) {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      cards = detectCardsFromImageData(imageData, canvas.width, canvas.height, p);
    }

    if (cards.length === 0) {
      ocrLines = await ocrCanvasLines(worker, canvas);
      if (ocrLines.length) {
        cards = detectCardsFromTypeLabels(ocrLines, canvas.width, canvas.height, p);
      }
    }

    if (ignoreZone) {
      const cardsBase = cards;
      cards = filterCardsByZone(cards, ignoreZone);
      if (cards.length === 0) cards = cardsBase;
    }

    if (cards.length === 0) {
      logs.push({ level: "WARN", message: `Pagina ${p} sem cards detectados.` });
      continue;
    }

    onProgress(`OCR dos cards da pagina ${p}...`);
    const itemsPage = await extractItemsFromCards(
      canvas,
      cards,
      worker,
      pageYear,
      p,
      debug,
      debugImages
    );
    if (itemsPage.length === 0) {
      const fullOcr = await ocrCanvasRegion(worker, canvas, "text");
      const fallbackItems = parseItemsFromFullText(fullOcr.text, pageYear, p);
      if (fallbackItems.length > 0) {
        extractedItems.push(...fallbackItems);
        logs.push({ level: "INFO", message: `Pagina ${p} importada via fallback de texto.` });
      } else {
        logs.push({ level: "WARN", message: `Pagina ${p} sem itens reconhecidos.` });
      }
    } else {
      extractedItems.push(...itemsPage);
    }
  }

  const deduped = dedupeItems(extractedItems);
  const total = deduped.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
  const averageConfidence = deduped.length
    ? deduped.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / deduped.length
    : 0;

  if (!deduped.length) {
    throw new Error("Nenhum item identificado no PDF/imagem.");
  }

  const rawJson = {
    source: "CVC_PDF",
    file_name: file.name,
    page_count: pdf.numPages,
    extracted_at: new Date().toISOString(),
    items: deduped.map((item) => ({
      item_type: item.item_type,
      title: item.title,
      product_name: item.product_name,
      city_name: item.city_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_amount: item.total_amount,
      taxes_amount: item.taxes_amount,
      start_date: item.start_date,
      end_date: item.end_date,
      confidence: item.confidence,
      raw: item.raw,
    })),
  };

  const draft: QuoteDraft = {
    source: "CVC_PDF",
    status: validateForConfirm(deduped) ? "IMPORTED" : "IMPORTED",
    currency: "BRL",
    total,
    average_confidence: averageConfidence,
    items: deduped,
    meta: {
      file_name: file.name,
      page_count: pdf.numPages,
      extracted_at: new Date().toISOString(),
    },
    raw_json: rawJson,
  };

  return {
    draft,
    logs,
    debug_images: debugImages,
  };
}
