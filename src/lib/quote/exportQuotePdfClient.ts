import { supabaseBrowser } from "../supabase-browser";
import { exportQuoteToPdf, QuotePdfItem, QuotePdfSettings } from "./quotePdf";

type QuoteItemRecord = QuotePdfItem & {
  quote_item_segment?: Array<{
    id?: string;
    segment_type: string;
    data: Record<string, unknown>;
    order_index?: number | null;
  }> | null;
  cidade_id?: string | null;
  cidade?: { id: string; nome?: string | null } | null;
};

type ExportArgs = {
  quoteId: string;
  showItemValues?: boolean;
  showSummary?: boolean;
  discount?: number;
};

function formatQuotePdfItems(items: QuoteItemRecord[]): QuotePdfItem[] {
  return items.map((item) => ({
    ...item,
    taxes_amount: Number(item.taxes_amount || 0),
    segments: item.quote_item_segment || [],
  }));
}

function extractStoragePath(value?: string | null) {
  if (!value) return null;
  const marker = "/quotes/";
  const index = value.indexOf(marker);
  if (index === -1) return null;
  return value.slice(index + marker.length);
}

async function resolveLogoUrl(settings: QuotePdfSettings & { logo_path?: string | null }) {
  let logoUrl = settings.logo_url || null;
  const logoPath = settings.logo_path || extractStoragePath(settings.logo_url);
  if (logoPath) {
    const signed = await supabaseBrowser.storage
      .from("quotes")
      .createSignedUrl(logoPath, 3600);
    if (signed.data?.signedUrl) {
      logoUrl = signed.data.signedUrl;
    }
  }
  return logoUrl;
}

async function fetchQuoteItems(quoteId: string) {
  const { data, error } = await supabaseBrowser
    .from("quote_item")
    .select(
    "id, item_type, title, product_name, city_name, cidade_id, cidade:cidades(id, nome), quantity, unit_price, total_amount, taxes_amount, start_date, end_date, currency, confidence, order_index, raw, quote_item_segment (id, segment_type, data, order_index)"
    )
    .eq("quote_id", quoteId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as QuoteItemRecord[];
}

export async function exportQuotePdfById(args: ExportArgs) {
  const { quoteId, showItemValues = true, showSummary, discount } = args;
  const { data: auth } = await supabaseBrowser.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) {
    throw new Error("Usuario nao autenticado.");
  }

  const { data: quote, error: quoteError } = await supabaseBrowser
    .from("quote")
    .select("id, created_at, currency, total, status, client_name, cliente:client_id (nome)")
    .eq("id", quoteId)
    .maybeSingle();
  if (quoteError || !quote) {
    throw new Error("Orcamento nao encontrado.");
  }

  const items = await fetchQuoteItems(quote.id);

  const { data: settings, error: settingsErr } = await supabaseBrowser
    .from("quote_print_settings")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (settingsErr) throw settingsErr;
  if (!settings) {
    throw new Error("Configure os parametros do PDF em Parametros > Orcamentos.");
  }

  const logoUrl = await resolveLogoUrl(settings);

  await exportQuoteToPdf({
    quote: {
      id: quote.id,
      created_at: quote.created_at || null,
      total: quote.total || 0,
      currency: quote.currency || "BRL",
      client_name: quote.client_name || quote.cliente?.nome || null,
    },
    items: formatQuotePdfItems(items),
    settings: {
      ...settings,
      logo_url: logoUrl,
    },
    options: {
      showItemValues,
      showSummary: showSummary ?? showItemValues,
      discount,
    },
  });
}
