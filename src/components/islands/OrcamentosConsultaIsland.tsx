import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Orcamento = {
  id: string;
  status: string | null;
  valor: number | null;
  data_orcamento: string | null;
  data_viagem: string | null;
  notas: string | null;
  cliente_id?: string | null;
  destino_id?: string | null;
  produto_id?: string | null;
  venda_id?: string | null;
  numero_venda?: string | null;
  venda_criada?: boolean | null;
  numero_venda_url?: string | null;
  interacoes?: { criado_em: string; texto: string }[] | null;
  clientes?: { nome: string } | null;
  destinos?: { nome: string } | null;
  produtos?: { nome: string } | null;
};

type StatusOrcamento = "novo" | "enviado" | "negociando" | "fechado" | "perdido";

function gerarNumeroVenda(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  const h = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `VND-${y}${m}${d}-${h}${min}-${rand}`;
}

export default function OrcamentosConsultaIsland() {
  const { ativo } = usePermissao("Vendas");
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoStatus, setSalvandoStatus] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [editando, setEditando] = useState<Orcamento | null>(null);
  const [valorEdit, setValorEdit] = useState<string>("");
  const [dataViagemEdit, setDataViagemEdit] = useState<string>("");
  const [notasEdit, setNotasEdit] = useState<string>("");
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [destinoSelecionado, setDestinoSelecionado] = useState<string>("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("");
  const [novaInteracao, setNovaInteracao] = useState<string>("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [destinos, setDestinos] = useState<{ id: string; nome: string }[]>([]);
  const [produtos, setProdutos] = useState<{ id: string; nome: string }[]>([]);
  const statuses: StatusOrcamento[] = ["novo", "enviado", "negociando", "fechado", "perdido"];
  const statusCores: Record<StatusOrcamento, { bg: string; border: string }> = {
    novo: { bg: "#f8fafc", border: "#e2e8f0" },
    enviado: { bg: "#f1f5f9", border: "#cbd5e1" },
    negociando: { bg: "#eff6ff", border: "#bfdbfe" },
    fechado: { bg: "#ecfdf3", border: "#bbf7d0" },
    perdido: { bg: "#fef2f2", border: "#fecaca" },
  };
  const statusTotal: Record<StatusOrcamento, { qtd: number; valor: number }> = {
    novo: { qtd: 0, valor: 0 },
    enviado: { qtd: 0, valor: 0 },
    negociando: { qtd: 0, valor: 0 },
    fechado: { qtd: 0, valor: 0 },
    perdido: { qtd: 0, valor: 0 },
  };
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingStatus, setDraggingStatus] = useState<StatusOrcamento | null>(null);
  const [periodoIni, setPeriodoIni] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");

  useEffect(() => {
    carregar();
    carregarListas();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      setErro(null);
      setSucesso(null);

      let query = supabase
        .from("orcamentos")
        .select(
          `
            id,
            status,
            valor,
            data_orcamento,
            data_viagem,
            notas,
            cliente_id,
            destino_id,
            produto_id,
            venda_id,
            numero_venda,
            venda_criada,
            numero_venda_url,
            interacoes,
            clientes:cliente_id (nome),
            destinos:destino_id (nome),
            produtos:produto_id (nome)
          `
        )
        .order("data_orcamento", { ascending: false });

      if (statusFiltro) {
        query = query.eq("status", statusFiltro);
      }
      if (periodoIni) {
        query = query.gte("data_orcamento", periodoIni);
      }
      if (periodoFim) {
        query = query.lte("data_orcamento", periodoFim);
      }
      if (valorMin) {
        query = query.gte("valor", parseFloat(valorMin));
      }
      if (valorMax) {
        query = query.lte("valor", parseFloat(valorMax));
      }

      const { data, error } = await query;
      if (error) throw error;
      setLista((data || []) as Orcamento[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }

  const filtrados = useMemo(() => lista, [lista]);

  const porColuna = useMemo(() => {
    const mapa: Record<StatusOrcamento, Orcamento[]> = {
      novo: [],
      enviado: [],
      negociando: [],
      fechado: [],
      perdido: [],
    };
    filtrados.forEach((o) => {
      const s = (o.status as StatusOrcamento) || "novo";
      if (!mapa[s]) mapa[s] = [];
      mapa[s].push(o);
    });
    return mapa;
  }, [filtrados]);
  const totais = useMemo(() => {
    const acc: Record<StatusOrcamento, { qtd: number; valor: number }> = {
      novo: { qtd: 0, valor: 0 },
      enviado: { qtd: 0, valor: 0 },
      negociando: { qtd: 0, valor: 0 },
      fechado: { qtd: 0, valor: 0 },
      perdido: { qtd: 0, valor: 0 },
    };
    filtrados.forEach((o) => {
      const s = (o.status as StatusOrcamento) || "novo";
      const v = Number(o.valor || 0);
      if (!acc[s]) acc[s] = { qtd: 0, valor: 0 };
      acc[s].qtd += 1;
      acc[s].valor += v;
    });
    return acc;
  }, [filtrados]);

  function exportarCSV() {
    const header = [
      "id",
      "cliente",
      "destino",
      "produto",
      "status",
      "valor",
      "data_orcamento",
      "data_viagem",
      "numero_venda",
    ];
    const linhas = filtrados.map((o) => [
      o.id,
      o.clientes?.nome || "",
      o.destinos?.nome || "",
      o.produtos?.nome || "",
      o.status || "",
      o.valor ?? "",
      o.data_orcamento || "",
      o.data_viagem || "",
      o.numero_venda || "",
    ]);
    const csv = [header.join(","), ...linhas.map((l) => l.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orcamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
    const item = lista.find((o) => o.id === id);
    if (item?.status) setDraggingStatus(item.status as StatusOrcamento);
  }

  async function handleDrop(status: StatusOrcamento) {
    if (!draggingId) return;
    if (status === "fechado" || status === "perdido") {
      setDraggingId(null);
      setDraggingStatus(null);
      return;
    }
    await alterarStatus(draggingId, status);
    setDraggingId(null);
    setDraggingStatus(null);
  }

  async function carregarListas() {
    try {
      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("destinos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      if (c.data) setClientes(c.data as any);
      if (d.data) setDestinos(d.data as any);
      if (p.data) setProdutos(p.data as any);
    } catch (e) {
      console.error(e);
    }
  }

  async function alterarStatus(id: string, status: StatusOrcamento) {
    try {
      setSalvandoStatus(id);
      setErro(null);
      setSucesso(null);
      const { error } = await supabase
        .from("orcamentos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setSucesso("Status atualizado.");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao alterar status.");
    } finally {
      setSalvandoStatus(null);
    }
  }

  function iniciarEdicao(o: Orcamento) {
    setEditando(o);
    setValorEdit(o.valor ? String(o.valor) : "");
    setDataViagemEdit(o.data_viagem || "");
    setNotasEdit(o.notas || "");
    setClienteSelecionado(o.cliente_id || "");
    setDestinoSelecionado(o.destino_id || "");
    setProdutoSelecionado(o.produto_id || "");
    setErro(null);
    setSucesso(null);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    try {
      setSucesso(null);
      setErro(null);
      const { error } = await supabase
        .from("orcamentos")
        .update({
          valor: valorEdit ? parseFloat(valorEdit) : null,
          data_viagem: dataViagemEdit || null,
          notas: notasEdit || null,
          cliente_id: clienteSelecionado || editando.cliente_id || null,
          destino_id: destinoSelecionado || editando.destino_id || null,
          produto_id: produtoSelecionado || editando.produto_id || null,
          interacoes: novaInteracao.trim()
            ? [
                ...(editando.interacoes || []),
                { criado_em: new Date().toISOString(), texto: novaInteracao.trim() },
              ]
            : editando.interacoes || [],
        })
        .eq("id", editando.id);
      if (error) throw error;
      setSucesso("Orçamento atualizado.");
      setEditando(null);
      await carregar();
    } catch (err) {
      console.error(err);
      setErro("Erro ao salvar edição.");
    }
  }

  async function converterParaVenda(o: Orcamento) {
    const confirmar = window.confirm("Converter este orçamento em venda?");
    if (!confirmar) return;
    try {
      setSucesso(null);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");
      const hoje = new Date();
      const numero = gerarNumeroVenda(hoje);
      const dataLanc = hoje.toISOString().slice(0, 10);

      const { data: vendaData, error: vendaErr } = await supabase
        .from("vendas")
        .insert({
          vendedor_id: userId,
          cliente_id: o.cliente_id,
          destino_id: o.destino_id,
          produto_id: o.produto_id,
          data_lancamento: dataLanc,
          data_embarque: o.data_viagem || null,
          valor_total: o.valor || 0,
          status: "aberto",
          numero_venda: numero,
          notas: o.notas,
        })
        .select("id, numero_venda")
        .maybeSingle();

      if (vendaErr) throw vendaErr;

      if (vendaData?.id && o.produto_id) {
        await supabase.from("vendas_recibos").insert({
          venda_id: vendaData.id,
          produto_id: o.produto_id,
          numero_recibo: numero,
          valor_total: o.valor || 0,
          valor_taxas: 0,
        });
      }

      await supabase
        .from("orcamentos")
        .update({
          status: "fechado",
          notas: `${
            o.notas ? `${o.notas}\n` : ""
          }Convertido para venda ${numero}`,
        })
        .eq("id", o.id);

      setSucesso("Orçamento convertido em venda.");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao converter para venda.");
    }
  }

  if (!ativo) return <div>Acesso ao módulo de Vendas bloqueado.</div>;

  return (
    <>
      <div className="card-base">
      <div className="page-header">
        <div>
          <h2 className="card-title">Orçamentos</h2>
          <p className="page-subtitle">Consulta rápida dos orçamentos cadastrados.</p>
        </div>
        <div className="grid gap-3 w-full sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data início</label>
            <input
              className="form-input"
              type="date"
              value={periodoIni}
              onChange={(e) => setPeriodoIni(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data fim</label>
            <input
              className="form-input"
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valor min</label>
            <input
              className="form-input"
              type="number"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valor max</label>
            <input
              className="form-input"
              type="number"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={carregar}>
            Atualizar
          </button>
          <button className="btn btn-light" onClick={exportarCSV}>
            Exportar CSV
          </button>
          <button
            className="btn btn-light"
            onClick={() => {
              setStatusFiltro("");
              setPeriodoIni("");
              setPeriodoFim("");
              setValorMin("");
              setValorMax("");
              carregar();
            }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && <div className="auth-success">{sucesso}</div>}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[1100px]">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Destino</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Venda</th>
              <th>Valor</th>
              <th>Data viagem</th>
              <th>Notas</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={9}>Carregando...</td>
              </tr>
            )}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhum orçamento encontrado.</td>
              </tr>
            )}

            {!carregando &&
              filtrados.map((o) => (
                <tr key={o.id}>
                  <td>{o.data_orcamento?.slice(0, 10) || "—"}</td>
                  <td>{o.clientes?.nome || "—"}</td>
              <td>{o.destinos?.nome || "—"}</td>
              <td>{o.produtos?.nome || "—"}</td>
              <td style={{ textTransform: "capitalize" }}>
                <select
                  className="form-select"
                  value={o.status || ""}
                  onChange={(e) =>
                    alterarStatus(o.id, e.target.value as StatusOrcamento)
                  }
                  disabled={salvandoStatus === o.id}
                >
                  <option value="novo">Novo</option>
                  <option value="enviado">Enviado</option>
                  <option value="negociando">Negociando</option>
                  <option value="fechado">Fechado</option>
                  <option value="perdido">Perdido</option>
                </select>
              </td>
              <td>
                {o.venda_id ? (
                  <a href={o.numero_venda_url || "/vendas/consulta"} title="Ver venda">
                    {o.numero_venda || `${o.venda_id.slice(0, 6)}...`}
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td>
                {o.valor
                  ? o.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—"}
              </td>
              <td>{o.data_viagem || "—"}</td>
              <td>{o.notas || "—"}</td>
              <td>
                <button
                  className="btn btn-light"
                  onClick={() => iniciarEdicao(o)}
                  style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                  disabled={o.status === "fechado" || o.status === "perdido"}
                  title={o.status === "fechado" || o.status === "perdido" ? "Orçamento encerrado" : "Editar"}
                >
                  Editar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => converterParaVenda(o)}
                  style={{ padding: "4px 8px", fontSize: "0.85rem", marginLeft: 6 }}
                  disabled={!o.cliente_id || !o.destino_id || o.status === "fechado" || o.status === "perdido"}
                  title={
                    o.status === "fechado" || o.status === "perdido"
                      ? "Orçamento encerrado"
                      : !o.cliente_id || !o.destino_id
                        ? "Selecione cliente e destino para converter"
                        : "Converter em venda"
                  }
                >
                  Converter
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>

  {editando && (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Editar orçamento</div>
            <div style={{ fontSize: "0.85rem", color: "#475569" }}>
              Cliente: {editando.clientes?.nome || "—"} | Destino: {editando.destinos?.nome || "—"}
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setEditando(null)}>✖</button>
        </div>
        <form onSubmit={salvarEdicao}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input
                className="form-input"
                type="number"
                value={valorEdit}
                onChange={(e) => setValorEdit(e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data da viagem</label>
              <input
                className="form-input"
                type="date"
                value={dataViagemEdit}
                onChange={(e) => setDataViagemEdit(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select
                className="form-select"
                value={clienteSelecionado}
                onChange={(e) => setClienteSelecionado(e.target.value)}
              >
                <option value="">Selecione</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destino</label>
              <select
                className="form-select"
                value={destinoSelecionado}
                onChange={(e) => setDestinoSelecionado(e.target.value)}
              >
                <option value="">Selecione</option>
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Produto</label>
              <select
                className="form-select"
                value={produtoSelecionado}
                onChange={(e) => setProdutoSelecionado(e.target.value)}
              >
                <option value="">(Opcional)</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea
                className="form-input"
                rows={3}
                value={notasEdit}
                onChange={(e) => setNotasEdit(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Adicionar interação</label>
              <textarea
                className="form-input"
                rows={2}
                value={novaInteracao}
                onChange={(e) => setNovaInteracao(e.target.value)}
                placeholder="Ex: Ligação com cliente, próxima ação..."
              />
            </div>
            {editando.interacoes && editando.interacoes.length > 0 && (
              <div className="form-group">
                <label className="form-label">Histórico</label>
                <div
                  style={{
                    maxHeight: 120,
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 8,
                    background: "#f8fafc",
                  }}
                >
                  {editando.interacoes
                    .slice()
                    .reverse()
                    .map((i, idx) => (
                      <div key={idx} style={{ marginBottom: 6, fontSize: "0.9rem" }}>
                        <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                          {i.criado_em?.slice(0, 16).replace("T", " ")}
                        </div>
                        <div>{i.texto}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
      </div>

      {/* KANBAN SIMPLES */}
      <div className="card-base card-blue" style={{ marginTop: 12 }}>
        <h3 className="card-title">Situação do Orçamento</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            alignItems: "stretch",
            marginBottom: 10,
          }}
        >
          {statuses.map((status) => (
            <div
              key={`kpi-${status}`}
              className="kpi-card"
              style={{
                background: statusCores[status].bg,
                border: `1px solid ${statusCores[status].border}`,
              }}
            >
              <div className="kpi-label" style={{ textTransform: "capitalize" }}>
                {status}
              </div>
              <div className="kpi-value" style={{ fontSize: "1.1rem" }}>
                {totais[status].qtd} itens
              </div>
              <div style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                {totais[status].valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
          ))}
        </div>
        {statuses.some((s) => porColuna[s].length > 0) ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statuses
              .filter((s) => porColuna[s].length > 0)
              .map((status) => (
                <div
                  key={status}
                  style={{
                    background: statusCores[status].bg,
                    border: `1px solid ${statusCores[status].border}`,
                    borderRadius: 10,
                    padding: 10,
                    transition: "transform 0.1s ease, box-shadow 0.1s ease",
                    boxShadow:
                      draggingStatus && draggingStatus === status
                        ? "0 0 0 2px rgba(59,130,246,0.4)"
                        : "none",
                    transform: draggingStatus && draggingStatus === status ? "scale(1.01)" : "none",
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(status)}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700, textTransform: "capitalize" }}>{status}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {porColuna[status].map((o) => (
                      <div
                        key={o.id}
                        style={{
                          background: "white",
                          borderRadius: 8,
                          border: draggingId === o.id ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                          padding: "8px 10px",
                          boxShadow:
                            draggingId === o.id
                              ? "0 8px 16px rgba(59,130,246,0.15)"
                              : "0 1px 2px rgba(0,0,0,0.05)",
                          position: "relative",
                        }}
                        draggable={o.status !== "fechado" && o.status !== "perdido"}
                        onDragStart={() => {
                          if (o.status === "fechado" || o.status === "perdido") return;
                          handleDragStart(o.id);
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        title={`Cliente: ${o.clientes?.nome || "—"}\nDestino: ${o.destinos?.nome || "—"}\nValor: ${
                          o.valor
                            ? o.valor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"
                        }\nData orçamento: ${o.data_orcamento?.slice(0, 10) || "—"}\nData viagem: ${
                          o.data_viagem || "—"
                        }\nVenda: ${o.numero_venda || "—"}`}
                      >
                        <div style={{ fontWeight: 600 }}>{o.clientes?.nome || "Cliente"}</div>
                        <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                          {o.destinos?.nome || "—"}
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                          Valor:{" "}
                          {o.valor
                            ? o.valor.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : "—"}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                          Orcamento: {o.data_orcamento?.slice(0, 10) || "—"} | Viagem:{" "}
                          {o.data_viagem || "—"}
                        </div>
                        {o.venda_id && (
                          <div style={{ fontSize: "0.8rem", color: "#22c55e" }}>
                            Venda: {o.numero_venda || o.venda_id.slice(0, 6)}
                          </div>
                        )}
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {status !== "negociando" && (
                            <button
                              className="btn btn-light"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                              onClick={() => alterarStatus(o.id, "negociando")}
                              disabled={salvandoStatus === o.id}
                            >
                              Mover p/ negociando
                            </button>
                          )}
                          {status !== "enviado" && (
                            <button
                              className="btn btn-light"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                              onClick={() => alterarStatus(o.id, "enviado")}
                              disabled={salvandoStatus === o.id}
                            >
                              Enviar
                            </button>
                          )}
                          {status !== "perdido" && (
                            <button
                              className="btn btn-light"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                              onClick={() => alterarStatus(o.id, "perdido")}
                              disabled={salvandoStatus === o.id}
                            >
                              Marcar perdido
                            </button>
                          )}
                          {status !== "fechado" && (
                            <button
                              className="btn btn-primary"
                              style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                              onClick={() => converterParaVenda(o)}
                              disabled={!o.cliente_id || !o.destino_id}
                            >
                              Fechar (Venda)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="card-base card-config" style={{ marginTop: 8 }}>
            <strong>Nenhum orçamento para exibir no Kanban.</strong>
          </div>
        )}
      </div>

    </>
  );
}
