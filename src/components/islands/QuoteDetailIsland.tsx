import React, { useMemo, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";
import { exportQuoteToPdf } from "../../lib/quote/quotePdf";

type QuoteRecord = {
  id: string;
  status: string;
  status_negociacao?: string | null;
  currency: string;
  total: number;
  created_at?: string | null;
  average_confidence?: number | null;
  source_file_path?: string | null;
  source_file_url?: string | null;
  client_id?: string | null;
  cliente?: { id: string; nome?: string | null; cpf?: string | null } | null;
};

type QuoteItemRecord = {
  id: string;
  item_type: string;
  title: string | null;
  product_name: string | null;
  city_name: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  taxes_amount?: number | null;
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  confidence: number | null;
  order_index?: number | null;
};

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeNumber(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateItem(item: QuoteItemRecord) {
  return Boolean(
    item.item_type &&
      item.quantity > 0 &&
      item.start_date &&
      item.title &&
      item.total_amount > 0
  );
}

function extractStoragePath(value?: string | null) {
  if (!value) return null;
  const marker = "/quotes/";
  const index = value.indexOf(marker);
  if (index === -1) return null;
  return value.slice(index + marker.length);
}

export default function QuoteDetailIsland(props: {
  quote: QuoteRecord;
  items: QuoteItemRecord[];
}) {
  const [items, setItems] = useState<QuoteItemRecord[]>(
    (props.items || []).map((item, index) => ({
      ...item,
      taxes_amount: Number(item.taxes_amount || 0),
      order_index: typeof item.order_index === "number" ? item.order_index : index,
    }))
  );
  const [status, setStatus] = useState(props.quote.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const subtotalAtual = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [items]
  );
  const taxesAtual = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0),
    [items]
  );
  const totalAtual = useMemo(() => subtotalAtual + taxesAtual, [subtotalAtual, taxesAtual]);

  const canConfirm = useMemo(() => {
    if (!items.length) return false;
    return items.every(validateItem);
  }, [items]);

  function updateItem(index: number, updates: Partial<QuoteItemRecord>) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const updated = { ...current, ...updates };
      const quantity = Math.max(1, Math.round(Number(updated.quantity) || 1));
      const total = Number(updated.total_amount) || 0;
      const unitPrice = quantity > 0 ? total / quantity : total;
      updated.quantity = quantity;
      updated.total_amount = total;
      updated.unit_price = unitPrice;
      next[index] = updated;
      return next;
    });
  }

  function moveItem(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    const reindexed = next.map((item, idx) => ({
      ...item,
      order_index: idx,
    }));
    setItems(reindexed);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = items.map((item, index) => ({
        id: item.id,
        quote_id: props.quote.id,
        item_type: item.item_type,
        title: item.title,
        product_name: item.product_name,
        city_name: item.city_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        taxes_amount: Number(item.taxes_amount || 0),
        start_date: item.start_date || null,
        end_date: item.end_date || item.start_date || null,
        currency: item.currency || props.quote.currency,
        order_index: typeof item.order_index === "number" ? item.order_index : index,
      }));

      const { error: itemError } = await supabaseBrowser
        .from("quote_item")
        .upsert(payload, { onConflict: "id" });

      if (itemError) throw itemError;

      const subtotal = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      const taxes = items.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0);
      const total = subtotal + taxes;
      const nextStatus = canConfirm ? "CONFIRMED" : status;

      const { error: quoteError } = await supabaseBrowser
        .from("quote")
        .update({
          subtotal,
          taxes,
          total,
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", props.quote.id);

      if (quoteError) throw quoteError;

      setStatus(nextStatus);
      setSuccess("Atualizado com sucesso.");
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(showItemValues: boolean) {
    setExporting(true);
    setExportError(null);
    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        throw new Error("Usuario nao autenticado.");
      }

      const { data: settings, error: settingsErr } = await supabaseBrowser
        .from("quote_print_settings")
        .select("*")
        .eq("owner_user_id", userId)
        .maybeSingle();
      if (settingsErr) throw settingsErr;
      if (!settings) {
        throw new Error("Configure os parametros do PDF em Parametros > Orcamentos.");
      }

      let logoUrl = settings.logo_url || null;
      const logoPath = settings.logo_path || extractStoragePath(settings.logo_url);
      if (logoPath) {
        const signed = await supabaseBrowser.storage.from("quotes").createSignedUrl(logoPath, 3600);
        if (signed.data?.signedUrl) {
          logoUrl = signed.data.signedUrl;
        }
      }

      await exportQuoteToPdf({
        quote: {
          id: props.quote.id,
          created_at: props.quote.created_at || null,
          total: totalAtual,
          currency: props.quote.currency,
        },
        items,
        settings: { ...settings, logo_url: logoUrl },
        options: { showItemValues, showSummary: showItemValues && showSummary },
      });
    } catch (err: any) {
      setExportError(err?.message || "Erro ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="page-content-wrap">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Quote</h1>
        <div style={{ fontSize: 14 }}>
          Status: {props.quote.status_negociacao || "Enviado"} | Total: R$ {formatCurrency(totalAtual)} | Cliente:{" "}
          {props.quote.cliente?.nome || "-"}
        </div>
        {props.quote.source_file_url && (
          <div style={{ marginTop: 8 }}>
            <a href={props.quote.source_file_url} target="_blank" rel="noreferrer">
              Baixar PDF original
            </a>
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleExport(true)}
            disabled={exporting}
          >
            {exporting ? "Gerando..." : "Exportar PDF (com valores)"}
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => handleExport(false)}
            disabled={exporting}
          >
            Exportar PDF (somente total)
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showSummary}
              onChange={(e) => setShowSummary(e.target.checked)}
            />
            Mostrar resumo de servicos
          </label>
        </div>
        {exportError && <div style={{ marginTop: 8, color: "#b91c1c" }}>{exportError}</div>}
      </div>

      <div className="card-base">
        <h3 className="card-title">Itens</h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default table-compact quote-items-table">
            <thead>
              <tr>
                <th className="order-cell">Ordem</th>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Cidade</th>
                <th>Inicio</th>
                <th>Fim</th>
                <th>Qtd</th>
                <th>Total</th>
                <th>Taxas</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="order-cell">
                    <div className="order-controls">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Mover para cima"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0}
                        style={{ padding: "2px 6px" }}
                      >
                        ⬆️
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Mover para baixo"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1}
                        style={{ padding: "2px 6px" }}
                      >
                        ⬇️
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={item.item_type || ""}
                      onChange={(e) => updateItem(index, { item_type: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={item.title || ""}
                      onChange={(e) =>
                        updateItem(index, { title: e.target.value, product_name: e.target.value })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={item.city_name || ""}
                      onChange={(e) => updateItem(index, { city_name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      type="date"
                      value={item.start_date || ""}
                      onChange={(e) => updateItem(index, { start_date: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      type="date"
                      value={item.end_date || ""}
                      onChange={(e) => updateItem(index, { end_date: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 1 })}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={formatCurrency(item.total_amount)}
                      onChange={(e) =>
                        updateItem(index, { total_amount: normalizeNumber(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      value={formatCurrency(Number(item.taxes_amount || 0))}
                      onChange={(e) =>
                        updateItem(index, { taxes_amount: normalizeNumber(e.target.value) })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar ajustes"}
          </button>
          <div style={{ fontSize: 13 }}>
            {canConfirm ? "Valido para CONFIRMED." : "Alguns itens precisam de ajuste."}
          </div>
        </div>

        {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}
        {success && <div style={{ marginTop: 12, color: "#16a34a" }}>{success}</div>}
      </div>
    </div>
  );
}
