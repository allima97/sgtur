import type { APIRoute } from "astro";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const CVC_BASE_URL = "https://atlas.cvc.com.br";
const CVC_API_PATH = "/api/v1/provider/shopping-carts";
const CVC_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const CVC_TOKEN_DEFAULT =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVkZW50aWFsIjogeyJwZXJzb25JZCI6IDc2Mjc4NjUsInVzZXJJZCI6IDk2NzExLCJuYW1lIjogIk9OTElORSIsImNwZiI6IG51bGwsImJyYW5jaElkIjogMTAwMCwiYWdlbnRTaWduIjogIldFQiIsInVzZXIiOiAiTVRaQ1BENjAwIn0sInN5c3RlbXMiOiBbXSwiaWF0IjogMTQ4NDIyODYzOX0.kHPebKM-fc7W06I7jrCTZaivTIUCmclldRwuB4fYeFeyoUndV1ANVgOdM98ubMPs4Nyt6zdZeugyRE8yv0k0gD8GQzxLM6-muxlh8BUG5EJD2AUQ4-dPN6maOzBSW_mkodcaQTNCjC_gR-glBuk5b7KZkbkZRs22VIBEIeYGz5u0D0fyY0_tY7h65pPaDCnL4EqFImhu_zaRan1U9ksefAYUqGxDd9QhA8ZHKuukaHlgpkjp1todQCT5VCXtN06bUV-H87S85x15YRu10XRRSV2JAbufvWSDRYJOLZEf3fD26SGM8C5cLUS1KHY0que87zaSWQhmz5CeNp_C-b_bow";

const ITEM_TYPE_MAP: Array<{ match: RegExp; type: string }> = [
  { match: /seguro|insurance|travelinsurance/i, type: "INSURANCE" },
  { match: /hotel/i, type: "HOTEL" },
  { match: /aereo|voo|flight/i, type: "FLIGHT" },
  { match: /servico|service|transfer|tour/i, type: "SERVICE" },
];

function normalizeText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractCartId(input: string) {
  const value = (input || "").trim();
  if (!value) return "";
  const urlMatch = value.match(/carrinho-dinamico\/([a-z0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  const idMatch = value.match(/[a-f0-9]{20,}/i);
  return idMatch?.[0] || "";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9,.-]/g, "");
    if (!cleaned) return null;
    const normalized = cleaned.includes(",")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nested =
      record.amount ??
      record.value ??
      record.total ??
      record.price ??
      record.valor ??
      record.totalValue;
    if (nested !== undefined) return parseNumber(nested);
  }
  return null;
}

function getByPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function pickFirstString(obj: any, paths: string[]) {
  for (const path of paths) {
    const value = getByPath(obj, path);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function pickFirstNumber(obj: any, paths: string[]) {
  for (const path of paths) {
    const value = getByPath(obj, path);
    const parsed = parseNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

function formatPeriod(start: string, end: string) {
  const startLabel = start ? formatDate(start) : "";
  const endLabel = end ? formatDate(end) : "";
  if (startLabel && endLabel && startLabel !== endLabel) {
    return `${startLabel} a ${endLabel}`;
  }
  return startLabel || endLabel;
}

function extractPassengers(item: any) {
  const adults = pickFirstNumber(item, [
    "adults",
    "adultCount",
    "passengers.adults",
    "pax.adults",
    "travelers.adults",
  ]);
  const children = pickFirstNumber(item, [
    "children",
    "childCount",
    "passengers.children",
    "pax.children",
    "travelers.children",
  ]);
  const quantity =
    pickFirstNumber(item, [
      "passengers",
      "pax",
      "quantity",
      "travellers",
      "travelers",
      "people",
    ]) || (adults || 0) + (children || 0) || 1;

  const parts: string[] = [];
  if (adults) parts.push(`${adults} adulto${adults > 1 ? "s" : ""}`);
  if (children) parts.push(`${children} crianca${children > 1 ? "s" : ""}`);
  const label = parts.length
    ? parts.join(" e ")
    : `${quantity} passageiro${quantity > 1 ? "s" : ""}`;

  return { quantity, label };
}

function extractPeriod(item: any) {
  const periodText = pickFirstString(item, [
    "period",
    "periodo",
    "dateRange",
    "periodRange",
  ]);
  if (periodText) return periodText;
  const start = pickFirstString(item, [
    "startDate",
    "inicio",
    "dataInicio",
    "checkin",
    "departureDate",
    "departure",
    "dateFrom",
    "from",
  ]);
  const end = pickFirstString(item, [
    "endDate",
    "fim",
    "dataFim",
    "checkout",
    "returnDate",
    "return",
    "dateTo",
    "to",
  ]);
  return formatPeriod(start, end);
}

function extractItemType(item: any) {
  return pickFirstString(item, [
    "productType",
    "type",
    "itemType",
    "product_type",
    "item_type",
    "categoria",
    "category",
    "productGroup",
    "grupoProduto",
    "tipo",
  ]);
}

function mapItemType(rawType: string, description: string) {
  const combined = normalizeText(`${rawType} ${description}`);
  for (const entry of ITEM_TYPE_MAP) {
    if (entry.match.test(combined)) return entry.type;
  }
  return rawType ? rawType.toUpperCase() : "SERVICE";
}

function extractDescription(item: any) {
  return pickFirstString(item, [
    "description",
    "descricao",
    "name",
    "nome",
    "title",
    "titulo",
    "productName",
    "product.name",
    "hotel.name",
    "service.name",
    "serviceName",
  ]);
}

function extractSupplier(item: any) {
  return pickFirstString(item, [
    "supplier",
    "supplierName",
    "provider",
    "providerName",
    "brand",
  ]);
}

function extractItemTotal(item: any) {
  return (
    pickFirstNumber(item, [
      "total",
      "totalValue",
      "totalPrice",
      "total_price",
      "priceTotal",
      "valorTotal",
      "amount",
      "price.amount",
      "totalPrice.amount",
    ]) ?? null
  );
}

function extractItemTaxes(item: any) {
  return (
    pickFirstNumber(item, [
      "taxes",
      "tax",
      "taxValue",
      "taxesValue",
      "impostos",
      "fees",
      "fee",
    ]) ?? 0
  );
}

function extractItemUnitPrice(item: any) {
  return (
    pickFirstNumber(item, [
      "unitPrice",
      "unit_price",
      "price",
      "valor",
      "price.amount",
    ]) ?? 0
  );
}

function isRelevantItem(rawType: string, description: string) {
  const combined = normalizeText(`${rawType} ${description}`);
  return /(seguro|insurance|hotel|flight|aereo|voo|servico|service|transfer|tour)/.test(
    combined
  );
}

function collectArrays(value: any, collector: any[]) {
  if (Array.isArray(value)) {
    collector.push(value);
    value.forEach((item) => collectArrays(item, collector));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectArrays(item, collector));
  }
}

function scoreItemArray(items: any[]) {
  let score = 0;
  items.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const rawType = extractItemType(item);
    const description = extractDescription(item);
    const total = extractItemTotal(item);
    if ((rawType || description) && total !== null) score += 1;
  });
  return score;
}

function selectItemArray(cart: any) {
  const arrays: any[] = [];
  collectArrays(cart, arrays);
  const scored = arrays
    .map((items) => ({ items, score: scoreItemArray(items) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.items || [];
}

function extractSummary(cart: any, promotions: any, items: any[]) {
  const candidates = [
    cart?.summary,
    cart?.totals,
    cart?.totalizer,
    cart?.totalizadores,
    cart?.shoppingCart,
    cart?.cart,
    cart,
  ].filter(Boolean);

  let subtotal: number | null = null;
  let taxes: number | null = null;
  let discount: number | null = null;
  let total: number | null = null;

  for (const candidate of candidates) {
    if (subtotal === null) {
      subtotal = pickFirstNumber(candidate, [
        "subtotal",
        "subTotal",
        "itemsTotal",
        "productsTotal",
        "totalItems",
        "itemsValue",
        "productsValue",
        "totalValue",
      ]);
    }
    if (taxes === null) {
      taxes = pickFirstNumber(candidate, [
        "taxes",
        "tax",
        "taxValue",
        "taxesValue",
        "impostos",
        "fees",
        "fee",
      ]);
    }
    if (discount === null) {
      discount = pickFirstNumber(candidate, [
        "discount",
        "discountValue",
        "totalDiscount",
        "desconto",
        "promotion",
      ]);
    }
    if (total === null) {
      total = pickFirstNumber(candidate, [
        "total",
        "totalValue",
        "totalPrice",
        "grandTotal",
        "totalAmount",
      ]);
    }
  }

  if (discount === null && promotions) {
    discount = pickFirstNumber(promotions, [
      "discount",
      "discountValue",
      "totalDiscount",
      "value",
      "amount",
    ]);
  }

  const itemsSum = items.reduce((sum, item) => {
    const value = parseNumber(item?.total_item ?? item?.total) || 0;
    return sum + value;
  }, 0);

  if (subtotal === null) subtotal = itemsSum;
  if (taxes === null) taxes = 0;
  if (discount === null) discount = 0;
  if (total === null) total = subtotal + taxes - discount;

  return {
    subtotal,
    taxes,
    discount,
    total,
  };
}

async function fetchCvcData(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      "access-token": `Bearer ${token}`,
      "business-unit": "CVC",
      "user-agent": CVC_USER_AGENT,
      accept: "application/json",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(
      `Falha ao acessar carrinho CVC (status ${response.status}). ${text.includes("Cloudflare") ? "Acesso bloqueado." : ""}`.trim()
    );
  }

  return response.json();
}

function buildItemDescription(base: string, period: string, passengers: string) {
  const parts = [base, period ? `Periodo: ${period}` : "", passengers ? `Passageiros: ${passengers}` : ""];
  return parts.filter(Boolean).join(" — ");
}

function parseCvcItems(cart: any) {
  const items = selectItemArray(cart);
  const parsed = items
    .map((item: any) => {
      const rawType = extractItemType(item);
      const descricaoBase = extractDescription(item) || rawType || "Servico";
      const supplier = extractSupplier(item);
      const period = extractPeriod(item);
      const pax = extractPassengers(item);
      const total = extractItemTotal(item);
      if (total === null) return null;

      const mappedType = mapItemType(rawType, descricaoBase);
      if (!isRelevantItem(rawType, descricaoBase)) return null;

      const taxes = extractItemTaxes(item) || 0;
      const unitPrice = extractItemUnitPrice(item) || total / pax.quantity;
      const description = buildItemDescription(descricaoBase, period, pax.label);

      return {
        item_type: mappedType,
        description_snapshot: description,
        quantity: pax.quantity,
        unit_price_snapshot: unitPrice,
        taxes_snapshot: taxes,
        total_item: total,
        supplier_snapshot: supplier || null,
      };
    })
    .filter(Boolean) as Array<Record<string, any>>;

  return parsed;
}

function buildTaxesItem(taxes: number) {
  return {
    item_type: "TAXES",
    description_snapshot: "Taxas e impostos",
    quantity: 1,
    unit_price_snapshot: taxes,
    taxes_snapshot: 0,
    total_item: taxes,
    supplier_snapshot: null,
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const quoteId = String(body?.quote_id || "").trim();
    const cartInput = String(body?.url || body?.cart_id || "");

    if (!quoteId) {
      return new Response(JSON.stringify({ error: "quote_id obrigatorio" }), { status: 400 });
    }

    const cartId = extractCartId(cartInput);
    if (!cartId) {
      return new Response(JSON.stringify({ error: "Link ou ID do carrinho invalido" }), { status: 400 });
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase nao configurado" }), { status: 500 });
    }
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Service role nao configurado" }), { status: 500 });
    }

    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (name) => cookies.get(name)?.value ?? "",
        set: (name, value, options) =>
          cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: "Lax",
            path: "/",
          }),
        remove: (name, options) =>
          cookies.delete(name, {
            ...options,
            path: "/",
          }),
      },
    });

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Usuario nao autenticado" }), { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: quoteRow, error: quoteErr } = await supabaseAdmin
      .from("quote")
      .select("id, seller_id")
      .eq("id", quoteId)
      .single();

    if (quoteErr || !quoteRow) {
      return new Response(JSON.stringify({ error: "Orcamento nao encontrado" }), { status: 404 });
    }

    if (quoteRow.seller_id && quoteRow.seller_id !== user.id) {
      return new Response(JSON.stringify({ error: "Sem permissao para importar" }), { status: 403 });
    }

    const token = import.meta.env.CVC_SHOPPING_CART_TOKEN || CVC_TOKEN_DEFAULT;
    const cart = await fetchCvcData(`${CVC_BASE_URL}${CVC_API_PATH}/${cartId}`, token);
    let promotions: any = null;
    try {
      promotions = await fetchCvcData(`${CVC_BASE_URL}${CVC_API_PATH}/promotions/${cartId}`, token);
    } catch (err) {
      console.warn("Nao foi possivel buscar promocoes do CVC:", err);
    }

    const parsedItems = parseCvcItems(cart);
    if (parsedItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum item relevante encontrado no carrinho" }),
        { status: 422 }
      );
    }

    const summary = extractSummary(cart, promotions, parsedItems);
    const itemsToInsert = [...parsedItems];
    const expectedTotal = summary.subtotal + summary.taxes - summary.discount;
    const shouldAddTaxes =
      summary.taxes > 0 &&
      (!summary.total || Math.abs(expectedTotal - summary.total) < 0.5);

    if (shouldAddTaxes) {
      itemsToInsert.push(buildTaxesItem(summary.taxes));
    }

    const payloadItems = itemsToInsert.map((item) => ({
      quote_id: quoteId,
      product_id: randomUUID(),
      item_type: item.item_type,
      quantity: item.quantity,
      description_snapshot: item.description_snapshot,
      unit_price_snapshot: item.unit_price_snapshot,
      taxes_snapshot: item.taxes_snapshot ?? 0,
      total_item: item.total_item,
      supplier_snapshot: item.supplier_snapshot ?? null,
      policy_snapshot: null,
    }));

    const { error: insertErr } = await supabaseAdmin.from("quote_item").insert(payloadItems);
    if (insertErr) throw insertErr;

    if (summary.discount > 0) {
      const { error: discountErr } = await supabaseAdmin.from("quote_discount").insert({
        quote_id: quoteId,
        discount_type: "FIXED",
        value: summary.discount,
        reason: "Importado CVC",
      });
      if (discountErr) throw discountErr;
    }

    if (summary.total) {
      await supabaseAdmin.from("quote").update({ total: summary.total }).eq("id", quoteId);
    }

    return new Response(
      JSON.stringify({
        imported: parsedItems.length,
        taxes: summary.taxes,
        discount: summary.discount,
        total: summary.total,
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error(e);
    return new Response(
      JSON.stringify({
        error: e?.message || "Erro ao importar carrinho CVC",
      }),
      { status: 500 }
    );
  }
};
