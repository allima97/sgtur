import React, { useEffect, useMemo, useState } from "react";
import { extractCvcQuoteFromPdf } from "../../lib/quote/cvcPdfExtractor";
import { saveQuoteDraft } from "../../lib/quote/saveQuoteDraft";
import type { ImportResult, QuoteDraft, QuoteItemDraft } from "../../lib/quote/types";

function normalizeNumber(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "0.00";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function validateItem(item: QuoteItemDraft) {
  return Boolean(
    item.item_type &&
      item.quantity > 0 &&
      item.start_date &&
      item.title &&
      item.total_amount > 0
  );
}

export default function QuoteImportIsland() {
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has("debug"));
  }, []);

  const canConfirm = useMemo(() => {
    if (!draft?.items?.length) return false;
    return draft.items.every(validateItem);
  }, [draft]);

  function updateDraftItems(items: QuoteItemDraft[]) {
    if (!draft) return;
    const total = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const avgConf = items.length
      ? items.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / items.length
      : 0;
    setDraft({
      ...draft,
      items,
      total,
      average_confidence: avgConf,
    });
  }

  async function handleExtract() {
    if (!file) {
      setError("Selecione um PDF para importar.");
      return;
    }
    setExtracting(true);
    setError(null);
    setSuccessId(null);
    setStatus("Iniciando OCR...");
    try {
      const result = await extractCvcQuoteFromPdf(file, {
        debug,
        onProgress: (message) => setStatus(message),
      });
      setImportResult(result);
      setDraft(result.draft);
      setStatus("Extracao concluida.");
    } catch (err: any) {
      setError(err?.message || "Erro ao extrair itens.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!draft || !file) return;
    setSaving(true);
    setError(null);
    setSuccessId(null);
    try {
      const result = await saveQuoteDraft({
        draft,
        file,
        importResult: importResult || undefined,
        debug,
      });
      setSuccessId(result.quote_id);
      setStatus(`Salvo como ${result.status}.`);
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar quote.");
    } finally {
      setSaving(false);
    }
  }

  function updateItem(index: number, updates: Partial<QuoteItemDraft>) {
    if (!draft) return;
    const next = draft.items.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, ...updates };
      const quantity = Math.max(1, Math.round(Number(updated.quantity) || 1));
      const total = Number(updated.total_amount) || 0;
      const unitPrice = quantity > 0 ? total / quantity : total;
      return {
        ...updated,
        quantity,
        total_amount: total,
        unit_price: unitPrice,
      };
    });
    updateDraftItems(next);
  }

  return (
    <div className="page-content-wrap">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h2 className="page-title">Importacao de PDF (CVC)</h2>
        <p className="page-subtitle">
          Envie um PDF para gerar um draft. Revise e confirme para salvar.
        </p>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Arquivo PDF</label>
            <input
              type="file"
              accept="application/pdf"
              className="form-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <div className="form-group" style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExtract}
              disabled={!file || extracting}
            >
              {extracting ? "Extraindo..." : "Extrair"}
            </button>
          </div>
        </div>
        {status && <div style={{ marginTop: 12, fontSize: 14 }}>{status}</div>}
        {error && <div style={{ marginTop: 12, color: "#b91c1c" }}>{error}</div>}
      </div>

      {draft && (
        <div className="card-base">
          <h3 className="card-title">Preview dos itens</h3>
          <div style={{ marginBottom: 12, fontSize: 14 }}>
            Total estimado: R$ {formatCurrency(draft.total)}
          </div>
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
                {draft.items.map((item, index) => {
                  const needsReview = item.confidence < 0.7 || !validateItem(item);
                  return (
                    <tr key={item.temp_id} style={needsReview ? { background: "#fef3c7" } : undefined}>
                      <td>
                        <input
                          className="form-input"
                          value={item.item_type}
                          onChange={(e) => updateItem(index, { item_type: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={item.title}
                          onChange={(e) => updateItem(index, { title: e.target.value, product_name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="form-input"
                          value={item.city_name}
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
                          onChange={(e) => updateItem(index, { total_amount: normalizeNumber(e.target.value) })}
                        />
                      </td>
                      <td>{item.confidence.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !draft.items.length}
            >
              {saving ? "Salvando..." : "Confirmar e salvar"}
            </button>
            <div style={{ fontSize: 13 }}>
              {canConfirm
                ? "Valido para CONFIRMED."
                : "Alguns itens precisam de ajuste; status ficara IMPORTED."}
            </div>
          </div>

          {successId && (
            <div style={{ marginTop: 12 }}>
              Salvo com sucesso. <a href={`/orcamentos/${successId}`}>Abrir quote</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
