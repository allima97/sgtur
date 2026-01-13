import React, { useMemo, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser";

type QuoteRecord = {
  id: string;
  status: string;
  currency: string;
  total: number;
  average_confidence?: number | null;
  source_file_path?: string | null;
  source_file_url?: string | null;
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
  start_date: string | null;
  end_date: string | null;
  currency: string | null;
  confidence: number | null;
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

export default function QuoteDetailIsland(props: {
  quote: QuoteRecord;
  items: QuoteItemRecord[];
}) {
  const [items, setItems] = useState<QuoteItemRecord[]>(props.items || []);
  const [status, setStatus] = useState(props.quote.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const totalAtual = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [items]
  );

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

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = items.map((item) => ({
        id: item.id,
        item_type: item.item_type,
        title: item.title,
        product_name: item.product_name,
        city_name: item.city_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        start_date: item.start_date || null,
        end_date: item.end_date || item.start_date || null,
        currency: item.currency || props.quote.currency,
      }));

      const { error: itemError } = await supabaseBrowser
        .from("quote_item")
        .upsert(payload, { onConflict: "id" });

      if (itemError) throw itemError;

      const total = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      const nextStatus = canConfirm ? "CONFIRMED" : status;

      const { error: quoteError } = await supabaseBrowser
        .from("quote")
        .update({ total, status: nextStatus, updated_at: new Date().toISOString() })
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

  return (
    <div className="page-content-wrap">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Quote</h1>
        <div style={{ fontSize: 14 }}>
          Status: {status} | Total: R$ {formatCurrency(totalAtual)}
        </div>
        {props.quote.source_file_url && (
          <div style={{ marginTop: 8 }}>
            <a href={props.quote.source_file_url} target="_blank" rel="noreferrer">
              Baixar PDF original
            </a>
          </div>
        )}
      </div>

      <div className="card-base">
        <h3 className="card-title">Itens</h3>
        <div className="table-container">
          <table className="table-default table-compact">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Produto</th>
                <th>Cidade</th>
                <th>Inicio</th>
                <th>Fim</th>
                <th>Qtd</th>
                <th>Total</th>
                <th>Conf</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
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
                  <td>{item.confidence?.toFixed(2) || "0.00"}</td>
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
