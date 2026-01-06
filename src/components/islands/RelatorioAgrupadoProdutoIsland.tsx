import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Produto = {
  id: string;
  nome: string | null;
  tipo: string;
};

type Venda = {
  id: string;
  cliente_id: string;
  destino_id: string;
  produto_id: string | null;
  destino_cidade_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  valor_total: number | null;
  status: string | null;
  vendas_recibos?: { produto_id: string | null; valor_total: number | null; valor_taxas: number | null; numero_recibo?: string | null; produtos?: { nome?: string | null } }[];
  destinos?: { nome: string | null; cidade_id?: string | null };
  destino_cidade?: { nome: string | null };
};

type CidadeFiltro = { id: string; nome: string };

type LinhaProduto = {
  produto_id: string | null;
  produto_nome: string;
  quantidade: number;
  total: number;
  ticketMedio: number;
  destinoNomes: string[];
  destinoIds: (string | null)[];
};

type ReciboDetalhe = {
  vendaId: string;
  numeroRecibo: string | null;
  produtoNome: string;
  tipoId: string | null;
  valorTotal: number;
  valorTaxas: number;
  dataLancamento: string;
  status: string | null;
  destinoNome: string | null;
  cidadeNome: string | null;
  cidadeId: string | null;
};

type Ordenacao = "total" | "quantidade" | "ticket";

type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

type UserCtx = {
  usuarioId: string;
  papel: Papel;
  vendedorIds: string[];
};

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function hojeISO() {
  return new Date().toISOString().substring(0, 10);
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatISO(date: Date) {
  return date.toISOString().substring(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function RelatorioAgrupadoProdutoIsland() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    const inicio = addDays(hoje, -30);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = useState<string>(hojeISO());
  const [buscaProduto, setBuscaProduto] = useState("");
  const [produtosCadastro, setProdutosCadastro] = useState<
    { tipo_produto: string | null; nome: string | null }[]
  >([]);
  const [tipoReciboSelecionado, setTipoReciboSelecionado] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [cidadeNomeInput, setCidadeNomeInput] = useState("");
  const [mostrarSugestoesCidadeFiltro, setMostrarSugestoesCidadeFiltro] = useState(false);
  const [cidadesLista, setCidadesLista] = useState<CidadeFiltro[]>([]);
  const [cidadeSugestoes, setCidadeSugestoes] = useState<CidadeFiltro[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidade, setErroCidade] = useState<string | null>(null);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [cidadesMap, setCidadesMap] = useState<Record<string, string>>({});

  const [ordenacao, setOrdenacao] = useState<Ordenacao>("total");
  const [ordemDesc, setOrdemDesc] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"agrupado" | "recibos">("recibos");
  const tabOptions = [
    { id: "recibos", label: "Produtos por recibo" },
    { id: "agrupado", label: "Resumo por tipo" },
  ];

  useEffect(() => {
    async function carregarBase() {
      try {
        const { data, error } = await supabase
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .order("nome", { ascending: true });

        if (error) throw error;
        setProdutos((data || []) as Produto[]);
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar produtos.");
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    async function carregarProdutosCadastro() {
      try {
        const { data, error } = await supabase
          .from("produtos")
          .select("tipo_produto, nome")
          .order("nome", { ascending: true });
        if (error) throw error;
        setProdutosCadastro((data || []) as { tipo_produto: string | null; nome: string | null }[]);
      } catch (e: any) {
        console.error("Erro ao carregar produtos cadastros:", e);
      }
    }

    carregarProdutosCadastro();
  }, []);

  useEffect(() => {
    async function carregarCidades() {
      try {
        const { data, error } = await supabase
          .from("cidades")
          .select("id, nome")
          .order("nome", { ascending: true });
        if (error) throw error;
        const map: Record<string, string> = {};
        const lista: CidadeFiltro[] = [];
        (data || []).forEach((cidade: any) => {
          if (cidade?.id && cidade?.nome) {
            map[cidade.id] = cidade.nome;
            lista.push({ id: cidade.id, nome: cidade.nome });
          }
        });
        setCidadesMap(map);
        setCidadesLista(lista);
      } catch (e: any) {
        console.error("Erro ao carregar cidades:", e);
      }
    }
    carregarCidades();
  }, []);

  useEffect(() => {
    if (cidadeNomeInput.trim().length < 2) {
      setCidadeSugestoes([]);
      setErroCidade(null);
      setBuscandoCidade(false);
      setMostrarSugestoesCidadeFiltro(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidade(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: cidadeNomeInput.trim(), limite: 8 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            console.error("Erro ao buscar cidades (RPC):", error);
            throw error;
          }
          setCidadeSugestoes((data || []) as CidadeFiltro[]);
          setMostrarSugestoesCidadeFiltro(true);
        }
      } catch (e: any) {
        if (!controller.signal.aborted) {
          console.error("Erro ao buscar cidades:", e);
          setErroCidade("Erro ao buscar cidades. Tente novamente.");
          setCidadeSugestoes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoCidade(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cidadeNomeInput]);

  useEffect(() => {
    if (!cidadeFiltro) return;
    const selec = cidadesLista.find((cidade) => cidade.id === cidadeFiltro);
    if (selec) {
      setCidadeNomeInput(selec.nome);
    }
  }, [cidadeFiltro, cidadesLista]);

  const nomeProdutosPorTipo = useMemo(() => {
    const map = new Map<string, string[]>();
    produtosCadastro.forEach(({ tipo_produto, nome }) => {
      if (!tipo_produto || !nome) return;
      const trimmed = nome.trim();
      if (!trimmed) return;
      const atual = map.get(tipo_produto) || [];
      if (!atual.includes(trimmed)) {
        atual.push(trimmed);
        map.set(tipo_produto, atual);
      }
    });
    return map;
  }, [produtosCadastro]);

  useEffect(() => {
    async function carregarUserCtx() {
      try {
        setLoadingUser(true);
        setErro(null);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuário não autenticado.");
          return;
        }

        const { data: usuarioDb } = await supabase
          .from("users")
          .select("id, user_types(name)")
          .eq("id", userId)
          .maybeSingle();

        const tipoName =
          ((usuarioDb as any)?.user_types as any)?.name ||
          (auth?.user?.user_metadata as any)?.name ||
          "";
        const tipoNorm = String(tipoName || "").toUpperCase();

        let papel: Papel = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";

        let vendedorIds: string[] = [userId];
        if (papel === "GESTOR") {
          const { data: rel } = await supabase
            .from("gestor_vendedor")
            .select("vendedor_id")
            .eq("gestor_id", userId);
          const extras =
            rel
              ?.map((r: any) => r.vendedor_id)
              .filter((id: string | null): id is string => Boolean(id)) || [];
          vendedorIds = Array.from(new Set([userId, ...extras]));
        } else if (papel === "ADMIN") {
          vendedorIds = [];
        }

        setUserCtx({ usuarioId: userId, papel, vendedorIds });
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUser(false);
      }
    }

    carregarUserCtx();
  }, []);

  const tipoProdutosNomeMap = useMemo(
    () => new Map(produtos.map((p) => [p.id, p.nome || ""])),
    [produtos]
  );

  const linhas: LinhaProduto[] = useMemo(() => {
    const prodMap = new Map(produtos.map((p) => [p.id, p]));
    const map = new Map<string, LinhaProduto>();

    const adicionar = (
      prodId: string | null,
      valor: number,
      destinoNome?: string,
      destinoId?: string | null
    ) => {
      const key = prodId || "sem-produto";
      const base = prodId ? prodMap.get(prodId) : undefined;
      const nome = base?.nome || base?.tipo || "(sem produto)";
      const atual =
        map.get(key) ||
        {
          produto_id: prodId,
          produto_nome: nome,
          quantidade: 0,
          total: 0,
          ticketMedio: 0,
          destinoNomes: [],
          destinoIds: [],
        };
      atual.quantidade += 1;
      atual.total += valor;
      if (destinoNome) {
        const nomeLimpo = destinoNome.trim();
        if (nomeLimpo && !atual.destinoNomes.includes(nomeLimpo)) {
          atual.destinoNomes.push(nomeLimpo);
        }
      }
      if (destinoId != null && destinoId !== "") {
        if (!atual.destinoIds.includes(destinoId)) {
          atual.destinoIds.push(destinoId);
        }
      }
      map.set(key, atual);
    };

    vendas.forEach((v) => {
      const destinoNome = v.destinos?.nome || "";
      const destinoId = v.destino_cidade_id || v.destinos?.cidade_id || null;
      const recibos = v.vendas_recibos || [];
      if (recibos.length) {
        recibos.forEach((r) => {
          const val = Number(r.valor_total || 0);
          adicionar(r.produto_id, val, destinoNome, destinoId);
        });
      } else {
        const val = v.valor_total ?? 0;
        adicionar(v.produto_id, val, destinoNome, destinoId);
      }
    });

    const arr = Array.from(map.values()).map((l) => ({
      ...l,
      ticketMedio: l.quantidade > 0 ? l.total / l.quantidade : 0,
    }));

    arr.sort((a, b) => {
      let comp = 0;
      if (ordenacao === "total") {
        comp = a.total - b.total;
      } else if (ordenacao === "quantidade") {
        comp = a.quantidade - b.quantidade;
      } else {
        comp = a.ticketMedio - b.ticketMedio;
      }
      return ordemDesc ? -comp : comp;
    });

    return arr;
  }, [vendas, produtos, ordenacao, ordemDesc]);

  const recibosDetalhados = useMemo(() => {
    const rows: ReciboDetalhe[] = [];
    const nomeFallback = (tipoId?: string | null) =>
      tipoProdutosNomeMap.get(tipoId || "") || "(sem produto)";
    vendas.forEach((v) => {
      const cidadeId =
        v.destino_cidade_id || v.destinos?.cidade_id || null;
      const cidadeNome =
        v.destino_cidade?.nome ||
        (cidadeId && cidadesMap[cidadeId] ? cidadesMap[cidadeId] : null);
      const destinoNome = v.destinos?.nome || null;
      const recibos = v.vendas_recibos || [];
      if (recibos.length) {
        recibos.forEach((r) => {
          const produtoNome = r.produtos?.nome || nomeFallback(r.produto_id);
          rows.push({
            vendaId: v.id,
            numeroRecibo: r.numero_recibo || null,
            tipoId: r.produto_id || null,
            produtoNome,
            valorTotal: Number(r.valor_total || 0),
            valorTaxas: Number(r.valor_taxas || 0),
            dataLancamento: v.data_lancamento,
            status: v.status,
            destinoNome,
            cidadeNome,
            cidadeId,
          });
        });
      } else {
        rows.push({
          vendaId: v.id,
          numeroRecibo: null,
          tipoId: v.produto_id || null,
          produtoNome: nomeFallback(v.produto_id),
          valorTotal: v.valor_total ?? 0,
          valorTaxas: 0,
          dataLancamento: v.data_lancamento,
          status: v.status,
          destinoNome,
          cidadeNome,
          cidadeId,
        });
      }
    });
    return rows;
  }, [vendas, tipoProdutosNomeMap, cidadesMap]);

  const recibosFiltrados = useMemo(() => {
    const hasTerm = buscaProduto.trim().length > 0;
    const term = normalizeText(buscaProduto);
    return recibosDetalhados.filter((recibo) => {
      if (cidadeFiltro && recibo.cidadeId !== cidadeFiltro) {
        return false;
      }
      if (tipoReciboSelecionado && recibo.tipoId !== tipoReciboSelecionado) {
        return false;
      }
      if (!hasTerm) return true;
      const destino = normalizeText(recibo.destinoNome || "");
      const produto = normalizeText(recibo.produtoNome || "");
      return destino.includes(term) || produto.includes(term);
    });
  }, [recibosDetalhados, buscaProduto, tipoReciboSelecionado, cidadeFiltro]);

  const linhasFiltradas = useMemo(() => {
    const term = normalizeText(buscaProduto);
    const hasTerm = term.length > 0;
    return linhas.filter((l) => {
      if (cidadeFiltro) {
        const temCidade = l.destinoIds.some((id) => id === cidadeFiltro);
        if (!temCidade) {
          return false;
        }
      }
      if (!hasTerm) return true;
      if (normalizeText(l.produto_nome).includes(term)) return true;
      if (l.destinoNomes.some((nome) => normalizeText(nome).includes(term))) return true;
      const tipo = l.produto_id || "";
      const nomesExtra = nomeProdutosPorTipo.get(tipo) || [];
      if (nomesExtra.some((nome) => normalizeText(nome).includes(term))) return true;
      return false;
    });
  }, [linhas, buscaProduto, nomeProdutosPorTipo, cidadeFiltro]);

  const totalGeral = linhasFiltradas.reduce((acc, l) => acc + l.total, 0);
  const totalQtd = linhasFiltradas.reduce((acc, l) => acc + l.quantidade, 0);
  const ticketGeral = totalQtd > 0 ? totalGeral / totalQtd : 0;
  const totalRecibosCount = recibosFiltrados.length;
  const totalRecibosValor = recibosFiltrados.reduce((acc, r) => acc + r.valorTotal, 0);
  const totalRecibosTaxas = recibosFiltrados.reduce((acc, r) => acc + r.valorTaxas, 0);

  function aplicarPeriodoPreset(tipo: "7" | "30" | "mes_atual" | "mes_anterior") {
    const hoje = new Date();
    if (tipo === "7") {
      const inicio = addDays(hoje, -7);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }
    if (tipo === "30") {
      const inicio = addDays(hoje, -30);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }
    if (tipo === "mes_atual") {
      const inicio = startOfMonth(hoje);
      const fim = endOfMonth(hoje);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }
    if (tipo === "mes_anterior") {
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const inicio = startOfMonth(mesAnterior);
      const fim = endOfMonth(mesAnterior);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }
  }

  async function carregar() {
    if (!userCtx) return;
    try {
      setLoading(true);
      setErro(null);

      let query = supabase
        .from("vendas")
        .select(
          `
          id,
          vendedor_id,
          cliente_id,
          destino_id,
          produto_id,
          destino_cidade_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          destino_cidade:destino_cidade_id (nome),
          destinos:produtos!destino_id (nome, cidade_id),
          vendas_recibos (
            numero_recibo,
            produto_id,
            valor_total,
            valor_taxas,
            produtos:tipo_produtos!produto_id (nome, tipo)
          )
        `
        )
        .order("data_lancamento", { ascending: false });

      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }

      if (dataInicio) {
        query = query.gte("data_lancamento", dataInicio);
      }
      if (dataFim) {
        query = query.lte("data_lancamento", dataFim);
      }
      const { data, error } = await query;
      if (error) throw error;
      setVendas((data || []) as Venda[]);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar vendas para relatório por produto.");
    } finally {
      setLoading(false);
    }
  }

  function mudarOrdenacao(campo: Ordenacao) {
    if (campo === ordenacao) {
      setOrdemDesc((prev) => !prev);
    } else {
      setOrdenacao(campo);
      setOrdemDesc(true);
    }
  }

  useEffect(() => {
    if (userCtx) {
      carregar();
    }
  }, [userCtx]);

  function exportarCSV() {
    if (linhasFiltradas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = ["produto", "quantidade", "total", "ticket_medio"];

    const rows = linhasFiltradas.map((l) => [
      l.produto_nome,
      l.quantidade.toString(),
      l.total.toFixed(2).replace(".", ","),
      l.ticketMedio.toFixed(2).replace(".", ","),
    ]);

    const all = [header, ...rows]
      .map((cols) => cols.map((c) => csvEscape(c)).join(";"))
      .join("\n");

    const blob = new Blob([all], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio-vendas-por-produto-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relatorio-vendas-produto-page">
      <div className="card-base card-purple mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data início</label>
            <input
              type="date"
              className="form-input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data fim</label>
            <input
              type="date"
              className="form-input"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ position: "relative" }}>
            <label className="form-label">Cidade</label>
            <input
              className="form-input"
              placeholder="Digite a cidade"
              value={cidadeNomeInput}
              onChange={(e) => {
                setCidadeNomeInput(e.target.value);
                setCidadeFiltro("");
                setMostrarSugestoesCidadeFiltro(true);
              }}
              onFocus={() => {
                if (cidadeNomeInput.trim().length > 0) {
                  setMostrarSugestoesCidadeFiltro(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setMostrarSugestoesCidadeFiltro(false), 150);
                if (!cidadeNomeInput.trim()) {
                  setCidadeFiltro("");
                  return;
                }
                const match = cidadesLista.find((cidade) =>
                  normalizeText(cidade.nome) === normalizeText(cidadeNomeInput)
                );
                if (match) {
                  setCidadeFiltro(match.id);
                  setCidadeNomeInput(match.nome);
                }
              }}
            />
            {mostrarSugestoesCidadeFiltro && cidadeNomeInput.trim().length > 0 && (
              <div
                className="card-base card-config"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: 160,
                  overflowY: "auto",
                  zIndex: 20,
                  padding: "4px 0",
                }}
              >
                {buscandoCidade && (
                  <div style={{ padding: "6px 12px", color: "#64748b" }}>
                    Buscando cidades...
                  </div>
                )}
                {!buscandoCidade && erroCidade && (
                  <div style={{ padding: "6px 12px", color: "#dc2626" }}>{erroCidade}</div>
                )}
                {!buscandoCidade && !erroCidade && cidadeSugestoes.length === 0 && (
                  <div style={{ padding: "6px 12px", color: "#94a3b8" }}>
                    Nenhuma cidade encontrada.
                  </div>
                )}
                {!buscandoCidade && !erroCidade && cidadeSugestoes.map((cidade) => (
                  <button
                    key={cidade.id}
                    type="button"
                    className="btn btn-ghost w-full text-left"
                    style={{ padding: "6px 12px" }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setCidadeFiltro(cidade.id);
                      setCidadeNomeInput(cidade.nome);
                      setMostrarSugestoesCidadeFiltro(false);
                    }}
                  >
                    {cidade.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
          {activeTab === "recibos" && (
            <div className="form-group">
              <label className="form-label">Tipo de Produto</label>
              <select
                className="form-select"
                value={tipoReciboSelecionado}
                onChange={(e) => setTipoReciboSelecionado(e.target.value)}
              >
                <option value="">Todos os tipos</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome || p.tipo || p.id}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Buscar produto</label>
            <input
              type="text"
              className="form-input"
              placeholder="Nome do produto"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("7")}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("30")}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("mes_atual")}
          >
            Este mês
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("mes_anterior")}
          >
            Mês anterior
          </button>

          <button type="button" className="btn btn-primary" onClick={carregar}>
            Aplicar filtros
          </button>

          <button type="button" className="btn btn-purple" onClick={exportarCSV}>
            Exportar CSV
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabOptions.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn ${
                activeTab === tab.id ? "btn-primary" : "btn-outline"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loadingUser && (
        <div className="card-base card-config mb-3">Carregando contexto do usuário...</div>
      )}
      {userCtx && userCtx.papel !== "ADMIN" && (
        <div className="card-base card-config mb-3" style={{ color: "#334155" }}>
          Relatório limitado a {userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas"}.
        </div>
      )}

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {activeTab === "agrupado" && (
        <>
          <div className="card-base mb-3">
            <div className="form-row">
              <div className="form-group">
                <span>
                  Produtos: <strong>{linhasFiltradas.length}</strong>
                </span>
              </div>
              <div className="form-group">
                <span>
                  Faturamento total: <strong>{formatCurrency(totalGeral)}</strong>
                </span>
              </div>
              <div className="form-group">
                <span>
                  Ticket médio geral: <strong>{formatCurrency(ticketGeral)}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="table-container overflow-x-auto">
            <table className="table-default table-header-purple min-w-[620px]">
              <thead>
                <tr>
                  <th>Tipo de Produto</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => mudarOrdenacao("quantidade")}
                  >
                    Qtde {ordenacao === "quantidade" ? (ordemDesc ? "↓" : "↑") : ""}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => mudarOrdenacao("total")}
                  >
                    Faturamento {ordenacao === "total" ? (ordemDesc ? "↓" : "↑") : ""}
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => mudarOrdenacao("ticket")}
                  >
                    Ticket médio {ordenacao === "ticket" ? (ordemDesc ? "↓" : "↑") : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4}>Carregando...</td>
                  </tr>
                )}
                {!loading && linhasFiltradas.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      Nenhum produto encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
                {!loading &&
                  linhasFiltradas.map((l, idx) => (
                    <tr key={l.produto_id ?? `sem-${idx}`}>
                      <td>{l.produto_nome}</td>
                      <td>{l.quantidade}</td>
                      <td>{formatCurrency(l.total)}</td>
                      <td>{formatCurrency(l.ticketMedio)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "recibos" && (
        <>
          <div className="card-base mb-3">
            <div className="form-row">
              <div className="form-group">
                <span>
                  Recibos: <strong>{totalRecibosCount}</strong>
                </span>
              </div>
              <div className="form-group">
                <span>
                  Total recebido: <strong>{formatCurrency(totalRecibosValor)}</strong>
                </span>
              </div>
              <div className="form-group">
                <span>
                  Taxas: <strong>{formatCurrency(totalRecibosTaxas)}</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="table-container overflow-x-auto">
            <table className="table-default table-header-purple min-w-[720px]">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Produto</th>
                  <th>Cidade</th>
                  <th>Destino</th>
                  <th>Data</th>
                  <th style={{ textAlign: "right" }}>Valor total</th>
                  <th style={{ textAlign: "right" }}>Taxas</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7}>Carregando...</td>
                  </tr>
                )}
                {!loading && recibosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      Nenhum recibo encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
                {!loading &&
                  recibosFiltrados.map((recibo) => {
                    const dataLabel = recibo.dataLancamento
                      ? recibo.dataLancamento.split("T")[0]
                      : "-";
                    return (
                      <tr key={`${recibo.vendaId}-${recibo.numeroRecibo || "sem"}`}>
                        <td>{recibo.numeroRecibo || "-"}</td>
                        <td>{recibo.produtoNome}</td>
                        <td>{recibo.cidadeNome || "-"}</td>
                        <td>{recibo.destinoNome || "-"}</td>
                        <td>{dataLabel}</td>
                        <td style={{ textAlign: "right" }}>
                          {formatCurrency(recibo.valorTotal)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {formatCurrency(recibo.valorTaxas)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}

    </div>
  );
}
