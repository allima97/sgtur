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
  raw?: Record<string, unknown> | null;
  segments?: QuoteItemSegmentRecord[] | null;
};

type QuoteItemSegmentRecord = {
  id?: string;
  segment_type: string;
  data: Record<string, unknown>;
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

function isCircuitItem(item: QuoteItemRecord) {
  return (item.item_type || "").trim().toLowerCase() === "circuito";
}

type CircuitMeta = {
  codigo?: string;
  serie?: string;
  itinerario?: string[];
  tags?: string[];
};

function getCircuitMeta(item: QuoteItemRecord): CircuitMeta {
  const raw = (item.raw || {}) as { circuito_meta?: CircuitMeta };
  return raw.circuito_meta || {};
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
      raw: item.raw || {},
      segments: item.segments || [],
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

  function updateCircuitMeta(index: number, updates: Partial<CircuitMeta>) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const meta = { ...getCircuitMeta(current), ...updates };
      const itinerario = meta.itinerario?.filter(Boolean) || [];
      next[index] = {
        ...current,
        raw: { ...(current.raw || {}), circuito_meta: meta },
        city_name: itinerario.length ? itinerario.join(" - ") : current.city_name,
      };
      return next;
    });
  }

  function updateCircuitSegments(
    index: number,
    updater: (segments: QuoteItemSegmentRecord[]) => QuoteItemSegmentRecord[]
  ) {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;
      const currentDays = (current.segments || []).filter((seg) => seg.segment_type === "circuit_day");
      const otherSegments = (current.segments || []).filter((seg) => seg.segment_type !== "circuit_day");
      const nextDays = updater(currentDays).map((seg, idx) => ({ ...seg, order_index: idx }));
      next[index] = {
        ...current,
        segments: [...otherSegments, ...nextDays],
      };
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
        raw: item.raw || {},
        order_index: typeof item.order_index === "number" ? item.order_index : index,
      }));

      const { error: itemError } = await supabaseBrowser
        .from("quote_item")
        .upsert(payload, { onConflict: "id" });

      if (itemError) throw itemError;

      const itemIds = items.map((item) => item.id);
      if (itemIds.length) {
        const { error: deleteSegErr } = await supabaseBrowser
          .from("quote_item_segment")
          .delete()
          .in("quote_item_id", itemIds);
        if (deleteSegErr) throw deleteSegErr;

        const segmentPayloads = items.flatMap((item) =>
          (item.segments || []).map((segment, idx) => ({
            quote_item_id: item.id,
            segment_type: segment.segment_type,
            data: segment.data || {},
            order_index: typeof segment.order_index === "number" ? segment.order_index : idx,
          }))
        );
        if (segmentPayloads.length) {
          const { error: segErr } = await supabaseBrowser
            .from("quote_item_segment")
            .insert(segmentPayloads);
          if (segErr) throw segErr;
        }
      }

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
              {items.map((item, index) => {
                const circuitMeta = getCircuitMeta(item);
                const circuitDays = (item.segments || [])
                  .filter((seg) => seg.segment_type === "circuit_day")
                  .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

                return (
                  <React.Fragment key={item.id}>
                    <tr>
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

                    {isCircuitItem(item) && (
                      <tr>
                        <td colSpan={9}>
                          <div style={{ padding: "8px 4px 16px", borderTop: "1px solid #e2e8f0" }}>
                            <div className="form-row">
                              <div className="form-group">
                                <label className="form-label">Codigo</label>
                                <input
                                  className="form-input"
                                  value={circuitMeta.codigo || ""}
                                  onChange={(e) => updateCircuitMeta(index, { codigo: e.target.value })}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-label">Serie</label>
                                <input
                                  className="form-input"
                                  value={circuitMeta.serie || ""}
                                  onChange={(e) => updateCircuitMeta(index, { serie: e.target.value })}
                                />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Tags (uma por linha)</label>
                                <textarea
                                  className="form-input"
                                  rows={2}
                                  value={(circuitMeta.tags || []).join("\n")}
                                  onChange={(e) =>
                                    updateCircuitMeta(index, {
                                      tags: e.target.value
                                        .split(/\r?\n/)
                                        .map((val) => val.trim())
                                        .filter(Boolean),
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="form-group" style={{ marginTop: 8 }}>
                              <label className="form-label">Itinerario (uma cidade por linha)</label>
                              <textarea
                                className="form-input"
                                rows={3}
                                value={(circuitMeta.itinerario || []).join("\n")}
                                onChange={(e) =>
                                  updateCircuitMeta(index, {
                                    itinerario: e.target.value
                                      .split(/\r?\n/)
                                      .map((val) => val.trim())
                                      .filter(Boolean),
                                  })
                                }
                              />
                            </div>

                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontWeight: 600, marginBottom: 8 }}>Dia a dia</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {circuitDays.map((seg, segIndex) => {
                                  const data = (seg.data || {}) as {
                                    dia?: number;
                                    titulo?: string;
                                    descricao?: string;
                                  };
                                  return (
                                    <div
                                      key={`circuit-${item.id}-${segIndex}`}
                                      style={{
                                        border: "1px solid #e2e8f0",
                                        borderRadius: 8,
                                        padding: 10,
                                        background: "#f8fafc",
                                      }}
                                    >
                                      <div className="form-row">
                                        <div className="form-group">
                                          <label className="form-label">Dia</label>
                                          <input
                                            className="form-input"
                                            type="number"
                                            min={1}
                                            value={data.dia ?? segIndex + 1}
                                            onChange={(e) =>
                                              updateCircuitSegments(index, (segments) =>
                                                segments.map((segmento, i) =>
                                                  i === segIndex
                                                    ? {
                                                        ...segmento,
                                                        data: {
                                                          ...(segmento.data || {}),
                                                          dia: Number(e.target.value) || segIndex + 1,
                                                        },
                                                      }
                                                    : segmento
                                                )
                                              )
                                            }
                                          />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                          <label className="form-label">Cidade / Titulo</label>
                                          <input
                                            className="form-input"
                                            value={data.titulo || ""}
                                            onChange={(e) =>
                                              updateCircuitSegments(index, (segments) =>
                                                segments.map((segmento, i) =>
                                                  i === segIndex
                                                    ? {
                                                        ...segmento,
                                                        data: {
                                                          ...(segmento.data || {}),
                                                          titulo: e.target.value,
                                                        },
                                                      }
                                                    : segmento
                                                )
                                              )
                                            }
                                          />
                                        </div>
                                        <div
                                          className="form-group"
                                          style={{ alignSelf: "flex-end", display: "flex", gap: 6 }}
                                        >
                                          <button
                                            type="button"
                                            className="btn btn-light"
                                            onClick={() =>
                                              updateCircuitSegments(index, (segments) => {
                                                if (segIndex === 0) return segments;
                                                const next = [...segments];
                                                const [removed] = next.splice(segIndex, 1);
                                                next.splice(segIndex - 1, 0, removed);
                                                return next;
                                              })
                                            }
                                            disabled={segIndex === 0}
                                          >
                                            ⬆️
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-light"
                                            onClick={() =>
                                              updateCircuitSegments(index, (segments) => {
                                                if (segIndex >= segments.length - 1) return segments;
                                                const next = [...segments];
                                                const [removed] = next.splice(segIndex, 1);
                                                next.splice(segIndex + 1, 0, removed);
                                                return next;
                                              })
                                            }
                                            disabled={segIndex >= circuitDays.length - 1}
                                          >
                                            ⬇️
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-light"
                                            onClick={() =>
                                              updateCircuitSegments(index, (segments) =>
                                                segments.filter((_, i) => i !== segIndex)
                                              )
                                            }
                                          >
                                            Remover
                                          </button>
                                        </div>
                                      </div>
                                      <div className="form-group">
                                        <label className="form-label">Descricao</label>
                                        <textarea
                                          className="form-input"
                                          rows={3}
                                          value={data.descricao || ""}
                                          onChange={(e) =>
                                            updateCircuitSegments(index, (segments) =>
                                              segments.map((segmento, i) =>
                                                i === segIndex
                                                  ? {
                                                      ...segmento,
                                                      data: {
                                                        ...(segmento.data || {}),
                                                        descricao: e.target.value,
                                                      },
                                                    }
                                                  : segmento
                                              )
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                className="btn btn-light"
                                style={{ marginTop: 8 }}
                                onClick={() =>
                                  updateCircuitSegments(index, (segments) => [
                                    ...segments,
                                    {
                                      segment_type: "circuit_day",
                                      order_index: segments.length,
                                      data: { dia: segments.length + 1, titulo: "", descricao: "" },
                                    },
                                  ])
                                }
                              >
                                Adicionar dia
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
