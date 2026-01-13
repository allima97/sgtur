import React, { useEffect, useMemo, useState } from "react";
import {
  extractCvcQuoteFromImage,
  extractCvcQuoteFromPdf,
  extractCvcQuoteFromText,
} from "../../lib/quote/cvcPdfExtractor";
import { saveQuoteDraft } from "../../lib/quote/saveQuoteDraft";
import { supabaseBrowser } from "../../lib/supabase-browser";
import type { ImportResult, QuoteDraft, QuoteItemDraft } from "../../lib/quote/types";

type ImportMode = "pdf" | "image" | "text";
type ClienteOption = { id: string; nome: string; cpf?: string | null };

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizeCpf(value: string) {
  return (value || "").replace(/\D/g, "");
}

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
  const [importMode, setImportMode] = useState<ImportMode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");
  const [draft, setDraft] = useState<QuoteDraft | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debug, setDebug] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [clientesErro, setClientesErro] = useState<string | null>(null);
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteId, setClienteId] = useState<string>("");
  const [carregandoClientes, setCarregandoClientes] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has("debug"));
  }, []);

  useEffect(() => {
    let active = true;
    async function carregarClientes() {
      setCarregandoClientes(true);
      try {
        const { data, error } = await supabaseBrowser
          .from("clientes")
          .select("id, nome, cpf")
          .order("nome", { ascending: true })
          .limit(500);
        if (error) throw error;
        if (!active) return;
        setClientes((data || []) as ClienteOption[]);
        setClientesErro(null);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        if (!active) return;
        setClientesErro("Nao foi possivel carregar os clientes.");
      } finally {
        if (active) setCarregandoClientes(false);
      }
    }
    carregarClientes();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setDraft(null);
    setImportResult(null);
    setStatus(null);
    setError(null);
    setSuccessId(null);
    setExtracting(false);
    setSaving(false);
    if (importMode !== "text") {
      setTextInput("");
    }
    if (importMode === "text") {
      setFile(null);
    }
  }, [importMode]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    const cpfTermo = normalizeCpf(clienteBusca);
    return clientes.filter((c) => {
      if (normalizeText(c.nome).includes(termo)) return true;
      if (cpfTermo && normalizeCpf(c.cpf || "") === cpfTermo) return true;
      return false;
    });
  }, [clientes, clienteBusca]);

  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) || null,
    [clientes, clienteId]
  );

  const canConfirm = useMemo(() => {
    if (!draft?.items?.length) return false;
    return draft.items.every(validateItem);
  }, [draft]);

  function updateDraftItems(items: QuoteItemDraft[]) {
    if (!draft) return;
    const ordered = items.map((item, index) => ({
      ...item,
      order_index: index,
      taxes_amount: Number(item.taxes_amount || 0),
    }));
    const subtotal = ordered.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const taxesTotal = ordered.reduce((sum, item) => sum + Number(item.taxes_amount || 0), 0);
    const total = subtotal + taxesTotal;
    const avgConf = ordered.length
      ? ordered.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / ordered.length
      : 0;
    setDraft({
      ...draft,
      items: ordered,
      total,
      average_confidence: avgConf,
    });
  }

  function handleClienteChange(value: string) {
    setClienteBusca(value);
    const texto = normalizeText(value);
    const cpfTexto = normalizeCpf(value);
    const achado = clientes.find((c) => {
      const cpf = normalizeCpf(c.cpf || "");
      return normalizeText(c.nome) === texto || (cpfTexto && cpf === cpfTexto);
    });
    if (achado) {
      setClienteId(achado.id);
      return;
    }
    if (clienteId) setClienteId("");
  }

  function handleClienteBlur() {
    if (!clienteBusca.trim()) return;
    const texto = normalizeText(clienteBusca);
    const cpfTexto = normalizeCpf(clienteBusca);
    const achado = clientesFiltrados.find((c) => {
      const cpf = normalizeCpf(c.cpf || "");
      return normalizeText(c.nome) === texto || (cpfTexto && cpf === cpfTexto);
    });
    if (achado) {
      setClienteId(achado.id);
      setClienteBusca("");
    }
  }

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setSuccessId(null);
    setStatus("Iniciando OCR...");
    try {
      let result: ImportResult | null = null;
      if (importMode === "text") {
        const text = textInput.trim();
        if (!text) {
          setError("Cole o texto do orcamento para importar.");
          setExtracting(false);
          return;
        }
        const textFile = new File([text], `orcamento-texto-${Date.now()}.txt`, {
          type: "text/plain",
        });
        setFile(textFile);
        setStatus("Processando texto...");
        result = await extractCvcQuoteFromText(text, {
          debug,
          onProgress: (message) => setStatus(message),
        });
      } else {
        if (!file) {
          setError(importMode === "image" ? "Selecione uma imagem para importar." : "Selecione um PDF para importar.");
          setExtracting(false);
          return;
        }
        result =
          importMode === "image"
            ? await extractCvcQuoteFromImage(file, { debug, onProgress: (message) => setStatus(message) })
            : await extractCvcQuoteFromPdf(file, { debug, onProgress: (message) => setStatus(message) });
      }

      if (!result) {
        setError("Falha ao extrair itens.");
        return;
      }
      setImportResult(result);
      const orderedItems = result.draft.items.map((item, index) => ({
        ...item,
        order_index: index,
        taxes_amount: Number(item.taxes_amount || 0),
      }));
      setDraft({ ...result.draft, items: orderedItems });
      setStatus("Extracao concluida.");
    } catch (err: any) {
      setError(err?.message || "Erro ao extrair itens.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!draft || !file) return;
    const resolvedClientId =
      clienteId ||
      clientes.find((c) => normalizeText(c.nome) === normalizeText(clienteBusca))?.id ||
      clientes.find((c) => normalizeCpf(c.cpf || "") === normalizeCpf(clienteBusca))?.id ||
      "";
    if (!resolvedClientId) {
      setError("Selecione um cliente antes de salvar.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessId(null);
    try {
      const result = await saveQuoteDraft({
        draft,
        file,
        clientId: resolvedClientId,
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

  function moveItem(index: number, direction: "up" | "down") {
    if (!draft) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= draft.items.length) return;
    const next = [...draft.items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    updateDraftItems(next);
  }

  return (
    <div className="page-content-wrap">
      <div className="card-base" style={{ marginBottom: 16 }}>
        <h2 className="page-title">Importacao de orcamentos (CVC)</h2>
        <p className="page-subtitle">
          Escolha PDF, imagem ou texto. Revise e confirme para salvar.
        </p>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <input
              className="form-input"
              list="listaClientes"
              placeholder="Buscar cliente..."
              value={clienteSelecionado?.nome || clienteBusca}
              onChange={(e) => handleClienteChange(e.target.value)}
              onBlur={handleClienteBlur}
              required
            />
            <datalist id="listaClientes">
              {clientesFiltrados.slice(0, 200).map((c) => (
                <option
                  key={c.id}
                  value={c.nome}
                  label={c.cpf ? `CPF: ${c.cpf}` : undefined}
                />
              ))}
            </datalist>
            {carregandoClientes && (
              <small style={{ color: "#64748b" }}>Carregando clientes...</small>
            )}
            {clientesErro && <small style={{ color: "#b91c1c" }}>{clientesErro}</small>}
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label className="form-label">Tipo de importacao</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "pdf"}
                  onChange={() => setImportMode("pdf")}
                />
                PDF
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "image"}
                  onChange={() => setImportMode("image")}
                />
                Imagem
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "text"}
                  onChange={() => setImportMode("text")}
                />
                Texto
              </label>
            </div>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: 12 }}>
          {importMode !== "text" ? (
            <div className="form-group">
              <label className="form-label">
                {importMode === "image" ? "Arquivo de imagem" : "Arquivo PDF"}
              </label>
              <input
                type="file"
                accept={importMode === "image" ? "image/*" : "application/pdf"}
                className="form-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          ) : (
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Texto do orcamento</label>
              <textarea
                className="form-input"
                rows={8}
                placeholder="Cole aqui o texto do orçamento"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />
            </div>
          )}
          <div className="form-group" style={{ alignSelf: "flex-end" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleExtract}
              disabled={(importMode === "text" ? !textInput.trim() : !file) || extracting}
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
                {draft.items.map((item, index) => {
                  const needsReview = item.confidence < 0.7 || !validateItem(item);
                  return (
                    <tr key={item.temp_id} style={needsReview ? { background: "#fef3c7" } : undefined}>
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
                            disabled={index === draft.items.length - 1}
                            style={{ padding: "2px 6px" }}
                          >
                            ⬇️
                          </button>
                        </div>
                      </td>
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
                      <td>
                        <input
                          className="form-input"
                          value={formatCurrency(item.taxes_amount || 0)}
                          onChange={(e) => updateItem(index, { taxes_amount: normalizeNumber(e.target.value) })}
                        />
                      </td>
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
              disabled={saving || !draft.items.length || !file}
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
