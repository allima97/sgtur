import { supabaseBrowser } from "../supabase-browser";
import { titleCaseWithExceptions } from "../titleCase";
import type { ImportResult, QuoteDraft, QuoteItemDraft, QuoteStatus } from "./types";

const EXCLUDED_PRODUTO_TIPOS = new Set(
  [
    "Seguro viagem",
    "Passagem Aerea",
    "Passagem Facial",
    "Aereo",
    "Chip",
    "Aluguel de Carro",
  ].map((value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
  )
);

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

function sanitizeNumber(value: unknown, fallback = 0) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeLookupText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isSeguroItem(item: QuoteItemDraft) {
  const normalized = normalizeLookupText(item.item_type || "");
  return normalized.includes("seguro") && normalized.includes("viagem");
}

function normalizeTitleText(value: string) {
  return titleCaseWithExceptions(value || "");
}

function normalizeItemText(item: QuoteItemDraft): QuoteItemDraft {
  if (isSeguroItem(item)) {
    return {
      ...item,
      title: "SEGURO VIAGEM",
      product_name: "SEGURO VIAGEM",
      city_name: item.city_name ? normalizeTitleText(item.city_name) : item.city_name,
    };
  }
  return {
    ...item,
    title: item.title ? normalizeTitleText(item.title) : item.title,
    product_name: item.product_name ? normalizeTitleText(item.product_name) : item.product_name,
    city_name: item.city_name ? normalizeTitleText(item.city_name) : item.city_name,
  };
}

async function loadTipoLabelMap() {
  try {
    const { data, error } = await supabaseBrowser
      .from("tipo_produtos")
      .select("id, nome, tipo")
      .order("nome", { ascending: true })
      .limit(500);
    if (error) {
      console.warn("[saveQuoteDraft] Falha ao carregar tipos", error);
      return new Map<string, string>();
    }
    const map = new Map<string, string>();
    (data || [])
      .filter((tipo) => tipo && (tipo.nome || tipo.tipo))
      .forEach((tipo) => {
        const label = (tipo.nome || tipo.tipo || "").trim();
        const key = normalizeLookupText(label);
        if (key) map.set(key, tipo.id);
      });
    return map;
  } catch (err) {
    console.warn("[saveQuoteDraft] Erro ao carregar tipos", err);
    return new Map<string, string>();
  }
}

async function syncProductsCatalog(items: QuoteItemDraft[], tipoLabelMap: Map<string, string>) {
  if (!items.length) return;
  for (const item of items) {
    const nomeRaw = (item.title || item.product_name || "").trim();
    if (!nomeRaw) continue;
    const nome = titleCaseWithExceptions(nomeRaw);
    if (!nome) continue;
    const destinoRaw = (item.city_name || "").trim();
    const destino = destinoRaw ? titleCaseWithExceptions(destinoRaw) : null;
    const cidadeId = item.cidade_id || null;
    const tipoKey = normalizeLookupText(item.item_type || "");
    if (EXCLUDED_PRODUTO_TIPOS.has(tipoKey)) {
      continue;
    }
    const tipoId = tipoLabelMap.get(tipoKey) || null;
    const payload = {
      nome,
      destino,
      cidade_id: cidadeId,
      tipo_produto: tipoId,
    };

    try {
      let query = supabaseBrowser.from("produtos").select("id");
      query = query.eq("nome", payload.nome);
      if (payload.destino) {
        query = query.eq("destino", payload.destino);
      } else {
        query = query.is("destino", null);
      }
      if (payload.cidade_id) {
        query = query.eq("cidade_id", payload.cidade_id);
      } else {
        query = query.is("cidade_id", null);
      }
      const { data: existing, error: selectErr } = await query.maybeSingle();
      if (selectErr) {
        console.warn("[saveQuoteDraft] Falha ao buscar produto", selectErr);
        continue;
      }
      if (existing?.id) {
        const { error: updateErr } = await supabaseBrowser
          .from("produtos")
          .update(payload)
          .eq("id", existing.id);
        if (updateErr) {
          console.warn("[saveQuoteDraft] Falha ao atualizar produto", updateErr);
        }
      } else {
        const { error: insertErr } = await supabaseBrowser.from("produtos").insert(payload);
        if (insertErr) {
          console.warn("[saveQuoteDraft] Falha ao inserir produto", insertErr);
        }
      }
    } catch (err) {
      console.warn("[saveQuoteDraft] Erro ao sincronizar produto", err);
    }
  }
}

function getFileExtension(file: File) {
  const name = file?.name || "";
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (match?.[1]) return match[1].toLowerCase();
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return file.type.split("/")[1] || "png";
  if (file.type.startsWith("text/")) return "txt";
  return "bin";
}

function buildOriginalFileName(file: File) {
  const ext = getFileExtension(file);
  return `original.${ext || "bin"}`;
}

export async function saveQuoteDraft(params: {
  draft: QuoteDraft;
  file: File;
  clientId?: string;
  importResult?: ImportResult;
  debug?: boolean;
}) {
  const { draft, file, clientId, importResult, debug } = params;
  const {
    data: { user },
    error: authError,
  } = await supabaseBrowser.auth.getUser();

  if (authError || !user) {
    throw new Error("Usuario nao autenticado.");
  }

  let quoteId: string | null = null;
  const normalizedItems = draft.items.map((item) => normalizeItemText(item));
  const subtotal = normalizedItems.reduce(
    (sum, item) => sum + sanitizeNumber(item.total_amount, 0),
    0
  );
  const taxesTotal = normalizedItems.reduce(
    (sum, item) => sum + sanitizeNumber(item.taxes_amount, 0),
    0
  );
  const total = subtotal;

  try {
    const quotePayload = {
      created_by: user.id,
      client_id: clientId || null,
      status: "IMPORTED" as QuoteStatus,
      currency: draft.currency || "BRL",
      subtotal,
      taxes: taxesTotal,
      total,
      average_confidence: sanitizeNumber(draft.average_confidence, 0),
      raw_json: draft.raw_json || {},
    };

    const { data: quote, error: quoteError } = await supabaseBrowser
      .from("quote")
      .insert(quotePayload)
      .select("id")
      .single();

    if (quoteError || !quote) {
      throw quoteError || new Error("Falha ao criar quote.");
    }

    quoteId = quote.id;

    const filePath = `${quote.id}/${buildOriginalFileName(file)}`;
    const upload = await supabaseBrowser.storage.from("quotes").upload(filePath, file, {
      upsert: true,
      contentType: file.type || "application/pdf",
    });

    if (upload.error) {
      throw upload.error;
    }

    const publicUrl = supabaseBrowser.storage.from("quotes").getPublicUrl(filePath).data.publicUrl;

    const { error: updateQuoteError } = await supabaseBrowser
      .from("quote")
      .update({
        source_file_path: filePath,
        source_file_url: publicUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    if (updateQuoteError) {
      throw updateQuoteError;
    }

    const insertedItems: Array<{ id: string; item: QuoteItemDraft }> = [];
    for (const [index, item] of normalizedItems.entries()) {
      const payload = {
        quote_id: quote.id,
        item_type: item.item_type,
        title: item.title,
        product_name: item.product_name,
        city_name: item.city_name,
        cidade_id: item.cidade_id || null,
        quantity: Math.max(1, Math.round(sanitizeNumber(item.quantity, 1))),
        unit_price: sanitizeNumber(item.unit_price, 0),
        total_amount: sanitizeNumber(item.total_amount, 0),
        taxes_amount: sanitizeNumber(item.taxes_amount, 0),
        start_date: item.start_date || null,
        end_date: item.end_date || item.start_date || null,
        currency: item.currency || draft.currency || "BRL",
        confidence: sanitizeNumber(item.confidence, 0),
        order_index: typeof item.order_index === "number" ? item.order_index : index,
        raw: item.raw || {},
      };

      const { data: row, error } = await supabaseBrowser
        .from("quote_item")
        .insert(payload)
        .select("id")
        .single();

      if (error || !row) {
        throw error || new Error("Falha ao salvar item.");
      }

      insertedItems.push({ id: row.id, item });
    }

    const segmentPayloads: Array<Record<string, unknown>> = [];
    insertedItems.forEach(({ id, item }) => {
      (item.segments || []).forEach((segment, index) => {
        segmentPayloads.push({
          quote_item_id: id,
          segment_type: segment.segment_type,
          data: segment.data || {},
          order_index: segment.order_index ?? index,
        });
      });
    });

    if (segmentPayloads.length > 0) {
      const { error } = await supabaseBrowser.from("quote_item_segment").insert(segmentPayloads);
      if (error) throw error;
    }

    const tipoLabelMap = await loadTipoLabelMap();
    await syncProductsCatalog(normalizedItems, tipoLabelMap);

    if (debug && importResult) {
      const logPayloads = importResult.logs.map((log) => ({
        quote_id: quote.id,
        level: log.level,
        message: log.message,
        payload: log.payload || {},
      }));

      const imagePayloads = importResult.debug_images.map((img) => ({
        quote_id: quote.id,
        level: "INFO",
        message: `debug_image:${img.label}`,
        payload: {
          page: img.page,
          card_index: img.card_index,
          data_url: img.data_url,
        },
      }));

      const allLogs = [...logPayloads, ...imagePayloads];
      if (allLogs.length > 0) {
        const { error } = await supabaseBrowser.from("quote_import_log").insert(allLogs);
        if (error) throw error;
      }
    }

    const shouldConfirm = validateForConfirm(normalizedItems);
    const nextStatus = shouldConfirm ? "CONFIRMED" : "IMPORTED";
    const newSubtotal = normalizedItems.reduce((sum, item) => sum + sanitizeNumber(item.total_amount, 0), 0);
    const newTaxes = normalizedItems.reduce((sum, item) => sum + sanitizeNumber(item.taxes_amount, 0), 0);
    const newTotal = newSubtotal;

    const { error: statusError } = await supabaseBrowser
      .from("quote")
      .update({
        status: nextStatus,
        subtotal: newSubtotal,
        taxes: newTaxes,
        total: newTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    if (statusError) throw statusError;

    return {
      quote_id: quote.id,
      status: nextStatus,
    };
  } catch (err) {
    if (quoteId) {
      await supabaseBrowser
        .from("quote")
        .update({ status: "FAILED", updated_at: new Date().toISOString() })
        .eq("id", quoteId);
    }
    throw err;
  }
}
