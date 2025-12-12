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
  numero_venda?: string | null;
  venda_criada?: boolean | null;
  clientes?: { nome: string } | null;
  destinos?: { nome: string } | null;
  produtos?: { nome: string; tipo?: string } | null;
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
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [destinos, setDestinos] = useState<{ id: string; nome: string }[]>([]);
  const [produtos, setProdutos] = useState<{ id: string; nome: string | null; tipo?: string }[]>([]);
  const statuses: StatusOrcamento[] = ["novo", "enviado", "negociando", "fechado", "perdido"];
  const statusCores: Record<StatusOrcamento, { bg: string; border: string }> = {
    novo: { bg: "#e0f2fe", border: "#1d4ed8" }, // azul solicitado (#1d4ed8)
    enviado: { bg: "#fef9c3", border: "#facc15" }, // amarelo
    negociando: { bg: "#fff7ed", border: "#fdba74" }, // laranja
    fechado: { bg: "#ecfdf3", border: "#16a34a" }, // verde mais escuro na borda
    perdido: { bg: "#fee2e2", border: "#fca5a5" }, // vermelho mais evidente
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

  useEffect(() => {
    const handler = () => carregar();
    window.addEventListener("orcamento-criado", handler);
    return () => window.removeEventListener("orcamento-criado", handler);
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
            numero_venda,
            venda_criada,
            clientes:cliente_id (nome),
            destinos:produtos!destino_id (nome),
            produtos:tipo_produtos!produto_id (nome, tipo)
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
        supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome"),
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
        <div className="page-header" style={{ marginBottom: 8 }}>
          <div>
            <h2 className="card-title">Orçamentos</h2>
            <p className="page-subtitle">Consulta rápida dos orçamentos cadastrados.</p>
          </div>
        </div>
        <div
          className="grid w-full"
          style={{
            marginTop: 12,
            gap: 10,
            gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
            alignItems: "end",
          }}
        >
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={carregar} style={{ minWidth: 120 }}>
            Atualizar
          </button>
          <button className="btn btn-light" onClick={exportarCSV} style={{ minWidth: 140 }}>
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
            style={{ minWidth: 140 }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && (
        <div className="auth-success" style={{ color: "#0f172a", fontWeight: 700 }}>
          {sucesso}
        </div>
      )}

      <div className="card-base card-blue" style={{ marginTop: 12 }}>
        <h3 className="card-title">Situação do Orçamento</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          {statuses.map((status) => (
            <div
              key={`kpi-${status}`}
              className="kpi-card"
              style={{
                background: statusCores[status].bg,
                border: `1px solid ${statusCores[status].border}`,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                justifyContent: "center",
              }}
            >
              <div className="kpi-label" style={{ textTransform: "capitalize", fontWeight: 700 }}>
                {status} - {String(totais[status].qtd).padStart(2, "0")} Itens
              </div>
              <div className="kpi-value" style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                {totais[status].valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-base" style={{ marginTop: 16 }}>
        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-blue min-w-[1100px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Produto</th>
                <th>Status</th>
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
                    className="btn-icon"
                    onClick={() => iniciarEdicao(o)}
                    style={{ marginRight: 6 }}
                    disabled={o.status === "fechado" || o.status === "perdido"}
                    title={o.status === "fechado" || o.status === "perdido" ? "Orçamento encerrado" : "Editar"}
                  >
                    ✏️
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

    </>
  );
}
