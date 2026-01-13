import { supabaseBrowser } from "../supabase-browser";
import type { ImportResult, QuoteDraft, QuoteItemDraft, QuoteStatus } from "./types";

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
  const subtotal = draft.items.reduce(
    (sum, item) => sum + sanitizeNumber(item.total_amount, 0),
    0
  );
  const taxesTotal = draft.items.reduce(
    (sum, item) => sum + sanitizeNumber(item.taxes_amount, 0),
    0
  );
  const total = subtotal + taxesTotal;

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
    for (const [index, item] of draft.items.entries()) {
      const payload = {
        quote_id: quote.id,
        item_type: item.item_type,
        title: item.title,
        product_name: item.product_name,
        city_name: item.city_name,
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

    const shouldConfirm = validateForConfirm(draft.items);
    const nextStatus = shouldConfirm ? "CONFIRMED" : "IMPORTED";
    const newSubtotal = draft.items.reduce((sum, item) => sum + sanitizeNumber(item.total_amount, 0), 0);
    const newTaxes = draft.items.reduce((sum, item) => sum + sanitizeNumber(item.taxes_amount, 0), 0);
    const newTotal = newSubtotal + newTaxes;

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
