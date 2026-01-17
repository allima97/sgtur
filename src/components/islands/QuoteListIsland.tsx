import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportQuotePdfById } from "../../lib/quote/exportQuotePdfClient";

type QuoteItemRow = {
  id: string;
  title?: string | null;
  product_name?: string | null;
  item_type?: string | null;
  total_amount?: number | null;
  order_index?: number | null;
};

type QuoteRow = {
  id: string;
  status: string;
  status_negociacao?: string | null;
  total: number | null;
  currency: string | null;
  created_at: string;
  client_id?: string | null;
  client_name?: string | null;
  client_whatsapp?: string | null;
  client_email?: string | null;
  last_interaction_at?: string | null;
  cliente?: { id: string; nome?: string | null; cpf?: string | null } | null;
  quote_item?: QuoteItemRow[] | null;
};

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildItemLabel(item: QuoteItemRow) {
  const title = (item.title || "").trim();
  const product = (item.product_name || "").trim();
  const type = (item.item_type || "").trim();
  return title || product || type || "-";
}

const STATUS_OPTIONS = ["Enviado", "Negociando", "Fechado", "Perdido"];

export default function QuoteListIsland() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("all");
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [visualizandoQuote, setVisualizandoQuote] = useState<QuoteRow | null>(null);
  const [exportingQuoteId, setExportingQuoteId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function carregar() {
      setLoading(true);
      setErro(null);
      try {
        const { data, error } = await supabase
          .from("quote")
          .select(
            "id, status, status_negociacao, total, currency, created_at, client_id, client_name, client_whatsapp, client_email, last_interaction_at, cliente:client_id (id, nome, cpf), quote_item (id, title, product_name, item_type, total_amount, order_index)"
          )
          .order("created_at", { ascending: false })
          .order("order_index", { foreignTable: "quote_item", ascending: true })
          .limit(200);
        if (error) throw error;
        if (!active) return;
        setQuotes((data || []) as QuoteRow[]);
      } catch (err) {
        console.error("Erro ao carregar orcamentos:", err);
        if (!active) return;
        setErro("Nao foi possivel carregar os orcamentos.");
      } finally {
        if (active) setLoading(false);
      }
    }
    carregar();
    return () => {
      active = false;
    };
  }, []);

  const quotesFiltrados = useMemo(() => {
    const termo = normalizeText(busca.trim());
    return quotes.filter((quote) => {
      const statusAtual = quote.status_negociacao || "Enviado";
      if (statusFiltro !== "all" && statusAtual !== statusFiltro) return false;
      if (!termo) return true;
      const clienteNome = quote.client_name || quote.cliente?.nome || "";
      const clienteCpf = quote.cliente?.cpf || "";
      const itens = (quote.quote_item || [])
        .map((item) => [item.item_type, item.title].filter(Boolean).join(" "))
        .join(" ");
      const haystack = normalizeText(
        [clienteNome, clienteCpf, statusAtual, itens, quote.id].filter(Boolean).join(" ")
      );
      return haystack.includes(termo);
    });
  }, [quotes, busca, statusFiltro]);

  async function handleExportPdf(quoteId: string) {
    setExportError(null);
    setExportingQuoteId(quoteId);
    try {
      await exportQuotePdfById({ quoteId, showItemValues: true, showSummary: true });
    } catch (err: any) {
      console.error("Erro ao exportar PDF:", err);
      setExportError(err?.message || "Nao foi possivel gerar o PDF.");
    } finally {
      setExportingQuoteId(null);
    }
  }

  async function excluirQuote(id: string) {
    const confirmar = window.confirm("Excluir este orcamento? Esta acao nao pode ser desfeita.");
    if (!confirmar) return;
    setDeletandoId(id);
    setErro(null);
    try {
      const { error } = await supabase.from("quote").delete().eq("id", id);
      if (error) throw error;
      setQuotes((prev) => prev.filter((quote) => quote.id !== id));
    } catch (err) {
      console.error("Erro ao excluir orcamento:", err);
      setErro("Nao foi possivel excluir o orcamento.");
    } finally {
      setDeletandoId(null);
    }
  }

  async function atualizarStatus(id: string, status: string) {
    setErro(null);
    try {
      const { error } = await supabase
        .from("quote")
        .update({ status_negociacao: status })
        .eq("id", id);
      if (error) throw error;
      setQuotes((prev) =>
        prev.map((quote) =>
          quote.id === id ? { ...quote, status_negociacao: status } : quote
        )
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      setErro("Nao foi possivel atualizar o status.");
    }
  }

  async function marcarUltimaInteracao(id: string) {
    const now = new Date().toISOString();
    setErro(null);
    try {
      const { error } = await supabase
        .from("quote")
        .update({ last_interaction_at: now })
        .eq("id", id);
      if (error) throw error;
      setQuotes((prev) =>
        prev.map((quote) =>
          quote.id === id ? { ...quote, last_interaction_at: now } : quote
        )
      );
    } catch (err) {
      console.error("Erro ao registrar ultima interacao:", err);
      setErro("Nao foi possivel registrar a ultima interacao.");
    }
  }

  function converterParaVenda(id: string) {
    if (typeof window === "undefined") return;
    window.location.href = `/vendas/cadastro?orcamentoId=${id}`;
  }

  return (
    <div className="page-content-wrap">
      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar</label>
            <input
              className="form-input"
              placeholder="Cliente, item, status..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="all">Todos</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}
      {exportError && (
        <div className="card-base card-config mb-3">
          <strong>{exportError}</strong>
        </div>
      )}

      <div className="table-container overflow-x-auto" style={{ maxHeight: "65vh", overflowY: "auto" }}>
        <table className="table-default table-header-purple min-w-[980px]">
          <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Total</th>
              <th>Criado</th>
              <th className="th-actions" style={{ textAlign: "center" }}>
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Carregando...</td>
              </tr>
            )}

            {!loading && quotesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhum orcamento encontrado.</td>
              </tr>
            )}

            {!loading &&
              quotesFiltrados.map((quote) => {
                const itens = quote.quote_item || [];
                const itensOrdenados = [...itens].sort(
                  (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
                );
                const itensLabel = itens.length
                  ? itensOrdenados.map((item) => buildItemLabel(item))
                  : [];
                const statusAtual = quote.status_negociacao || "Enviado";
                const clienteLabel =
                  quote.client_name ||
                  quote.cliente?.nome ||
                  (quote.client_id ? "Cliente" : "-");
                return (
                  <tr key={quote.id}>
                    <td>{clienteLabel}</td>
                    <td>
                      {itensLabel.length === 0 ? (
                        "-"
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {itensLabel.map((item, idx) => (
                            <span key={`${quote.id}-item-${idx}`}>{item}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        className="form-input"
                        value={statusAtual}
                        onChange={(e) => atualizarStatus(quote.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatCurrency(Number(quote.total || 0))}</td>
                    <td>{formatDate(quote.created_at)}</td>
                    <td
                      className="th-actions"
                      style={{
                        textAlign: "center",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <button
                        className="btn-icon"
                        title={`Ultima interacao: ${formatDateTime(
                          quote.last_interaction_at
                        )}`}
                        style={{ padding: "4px 6px" }}
                        onClick={() => marcarUltimaInteracao(quote.id)}
                      >
                        🕒
                      </button>
                      <button
                        className="btn-icon"
                        title="Converter em venda"
                        style={{ padding: "4px 6px" }}
                        onClick={() => converterParaVenda(quote.id)}
                      >
                        🧾
                      </button>
                      <button
                        className="btn-icon"
                        title="Visualizar orçamento"
                        style={{ padding: "4px 6px" }}
                        onClick={() => setVisualizandoQuote(quote)}
                      >
                        👁️
                      </button>
                      <button
                        className="btn-icon"
                        title="Visualizar PDF"
                        style={{ padding: "4px 6px" }}
                        onClick={() => handleExportPdf(quote.id)}
                        disabled={exportingQuoteId === quote.id}
                      >
                        {exportingQuoteId === quote.id ? "⏳" : "📄"}
                      </button>
                      <a
                        className="btn-icon"
                        href={`/orcamentos/${quote.id}`}
                        title="Editar orcamento"
                        style={{ padding: "4px 6px" }}
                      >
                        ✏️
                      </a>
                      <button
                        className="btn-icon btn-danger"
                        title="Excluir orcamento"
                        onClick={() => excluirQuote(quote.id)}
                        disabled={deletandoId === quote.id}
                        style={{ padding: "4px 6px" }}
                      >
                        {deletandoId === quote.id ? "..." : "🗑️"}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {visualizandoQuote && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 640, width: "90vw" }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Visualizar orçamento</div>
                <div style={{ fontSize: "0.9rem", color: "#475569" }}>
                  Cliente:{" "}
                  {visualizandoQuote.client_name ||
                    visualizandoQuote.cliente?.nome ||
                    "—"}{" "}
                  | Status:{" "}
                  {visualizandoQuote.status_negociacao || "Enviado"}
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setVisualizandoQuote(null)}>
                ✖
              </button>
            </div>
            <div className="modal-body" style={{ display: "grid", gap: 12 }}>
              <div>
                <strong>Total:</strong>{" "}
                {formatCurrency(Number(visualizandoQuote.total || 0))}
              </div>
              <div className="table-container overflow-x-auto">
                <table className="table-default table-compact quote-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qtd</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visualizandoQuote.quote_item || []).map((item) => (
                      <tr key={`${visualizandoQuote.id}-${item.id}`}>
                        <td>{buildItemLabel(item)}</td>
                        <td>{item.quantity || 1}</td>
                        <td>{formatCurrency(Number(item.total_amount || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setVisualizandoQuote(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
