import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { formatarDataParaExibicao } from "../../lib/formatDate";
import { construirLinkWhatsApp } from "../../lib/whatsapp";
import { normalizeText } from "../../lib/normalizeText";
import ConfirmDialog from "../ui/ConfirmDialog";

type Viagem = {
  id: string;
  venda_id?: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  origem: string | null;
  destino: string | null;
  responsavel_user_id: string | null;
  cliente_id: string | null;
  clientes?: { nome: string | null; whatsapp?: string | null } | null;
  responsavel?: { nome_completo?: string | null } | null;
  recibo?: {
    id: string;
    valor_total: number | null;
    valor_taxas: number | null;
    data_inicio: string | null;
    data_fim: string | null;
    numero_recibo?: string | null;
    produto_id: string | null;
    tipo_produtos?: { id: string; nome?: string | null; tipo?: string | null } | null;
  } | null;
};
type ViagemExibicao = Viagem & { recibos: NonNullable<Viagem["recibo"]>[] };

const STATUS_OPCOES = [
  { value: "", label: "Todas" },
  { value: "planejada", label: "Planejada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_viagem", label: "Em viagem" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_LABELS: Record<string, string> = {
  planejada: "Planejada",
  confirmada: "Confirmada",
  em_viagem: "Em viagem",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

function obterStatusPorPeriodo(inicio?: string | null, fim?: string | null): string | null {
  if (!inicio) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : null;

  if (dataFim && dataFim < hoje) return "concluida";
  if (dataInicio > hoje) return "confirmada";
  if (dataFim && hoje > dataFim) return "concluida";
  return "em_viagem";
}

function formatarMoeda(valor?: number | null) {
  if (valor == null || Number.isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function obterMinData(datas: Array<string | null | undefined>) {
  let minTs: number | null = null;
  let minStr: string | null = null;
  datas.forEach((data) => {
    if (!data) return;
    const ts = Date.parse(data);
    if (Number.isNaN(ts)) return;
    if (minTs === null || ts < minTs) {
      minTs = ts;
      minStr = data;
    }
  });
  return minStr;
}

function obterMaxData(datas: Array<string | null | undefined>) {
  let maxTs: number | null = null;
  let maxStr: string | null = null;
  datas.forEach((data) => {
    if (!data) return;
    const ts = Date.parse(data);
    if (Number.isNaN(ts)) return;
    if (maxTs === null || ts > maxTs) {
      maxTs = ts;
      maxStr = data;
    }
  });
  return maxStr;
}

const initialCadastroForm = {
  origem: "",
  destino: "",
  data_inicio: "",
  data_fim: "",
  status: "planejada",
  cliente_id: "",
};

export default function ViagensListaIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Operacao");
  const podeCriar = can("Operacao", "create");
  const podeEditar = can("Operacao", "edit");
  const podeExcluir = can("Operacao", "delete");

  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");
  const [busca, setBusca] = useState<string>("");
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savingViagem, setSavingViagem] = useState(false);
  const [cadastroForm, setCadastroForm] = useState(() => ({ ...initialCadastroForm }));
  type CidadeSugestao = {
    nome: string;
    subdivisao_nome?: string | null;
    pais_nome?: string | null;
  };
  const [cidades, setCidades] = useState<CidadeSugestao[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string; cpf?: string | null }[]>([]);
  const [clientesErro, setClientesErro] = useState<string | null>(null);
  const [deletandoViagemId, setDeletandoViagemId] = useState<string | null>(null);
  const [viagemParaExcluir, setViagemParaExcluir] = useState<ViagemExibicao | null>(null);
  const [buscandoCidades, setBuscandoCidades] = useState(false);
  const [erroCidades, setErroCidades] = useState<string | null>(null);
  const cidadesAbort = useRef<AbortController | null>(null);
  const cidadesTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formatCidadeLabel = (cidade: CidadeSugestao) => {
    const partes = [cidade.nome];
    if (cidade.subdivisao_nome) partes.push(cidade.subdivisao_nome);
    if (cidade.pais_nome) partes.push(cidade.pais_nome);
    return partes.join(" • ");
  };

  useEffect(() => {
    if (!loadingPerm && podeVer) {
      buscar();
    }
  }, [loadingPerm, podeVer, statusFiltro, inicio, fim]);

  useEffect(() => {
    async function resolveUser() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user || null;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        setUserId(data.user.id);
        const { data: row } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", data.user.id)
          .maybeSingle();
        setCompanyId(row?.company_id || null);
      } else {
        setUserId(user.id);
        const { data: row } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
        setCompanyId(row?.company_id || null);
      }
    }
    resolveUser();
  }, []);

  useEffect(() => {
    if (!companyId) return;
    async function carregarClientes() {
      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("id, nome, cpf")
          .eq("company_id", companyId)
          .order("nome", { ascending: true })
          .limit(200);
        if (error) throw error;
        setClientes((data || []) as { id: string; nome: string; cpf?: string | null }[]);
        setClientesErro(null);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        setClientesErro("Não foi possível carregar os clientes.");
      }
    }
    carregarClientes();
  }, [companyId]);

  useEffect(() => {
    carregarSugestoes("");
    return () => {
      if (cidadesAbort.current) {
        cidadesAbort.current.abort();
      }
      if (cidadesTimeout.current) {
        clearTimeout(cidadesTimeout.current);
      }
    };
  }, []);

  async function carregarSugestoes(term: string) {
    if (cidadesAbort.current) {
      cidadesAbort.current.abort();
    }
    const controller = new AbortController();
    cidadesAbort.current = controller;
    try {
      setBuscandoCidades(true);
      setErroCidades(null);
      const search = term.trim();
      const limite = search.length === 0 ? 200 : 50;
      let cidadesData: CidadeSugestao[] = [];
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: search, limite },
          { signal: controller.signal }
        );
        if (error) throw error;
        cidadesData = (data || []) as CidadeSugestao[];
      } catch (rpcError) {
        if (controller.signal.aborted) return;
        console.warn("RPC buscar_cidades falhou:", rpcError);
        let fallbackQuery = supabase
          .from("cidades")
          .select("nome")
          .order("nome")
          .limit(limite);
        if (search.length > 0) {
          fallbackQuery = fallbackQuery.ilike("nome", `%${search}%`);
        }
        const fallback = await fallbackQuery;
        if (fallback.error) throw fallback.error;
        cidadesData = (fallback.data || []).map((c) => ({ nome: c.nome }));
      }

      if (controller.signal.aborted) return;

      const unique = new Map<string, CidadeSugestao>();
      cidadesData.forEach((cidade) => {
        if (!cidade?.nome) return;
        const key = `${cidade.nome}|${cidade.pais_nome || ""}|${cidade.subdivisao_nome || ""}`;
        if (!unique.has(key)) unique.set(key, cidade);
      });
      setCidades(Array.from(unique.values()));
    } catch (e) {
      if (!controller.signal.aborted) {
        console.error("Erro ao buscar cidades:", e);
        setErroCidades("Não foi possível carregar as cidades.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setBuscandoCidades(false);
      }
    }
  }

  function agendarBuscaCidades(term: string) {
    if (cidadesTimeout.current) {
      clearTimeout(cidadesTimeout.current);
    }
    cidadesTimeout.current = setTimeout(() => {
      carregarSugestoes(term);
    }, 250);
  }

  function resetCadastroForm() {
    setCadastroForm({ ...initialCadastroForm });
    setFormError(null);
  }

  function abrirFormularioViagem() {
    resetCadastroForm();
    setShowForm(true);
  }

  function fecharFormularioViagem() {
    resetCadastroForm();
    setShowForm(false);
  }

  async function buscar() {
    try {
      setLoading(true);
      setErro(null);

      let query = supabase
        .from("viagens")
        .select(
          "id, venda_id, data_inicio, data_fim, status, origem, destino, responsavel_user_id, cliente_id, clientes (nome, whatsapp), responsavel:users!responsavel_user_id (nome_completo), recibo:vendas_recibos (id, valor_total, valor_taxas, data_inicio, data_fim, numero_recibo, produto_id, tipo_produtos (id, nome, tipo))"
        )
        .order("data_inicio", { ascending: true });

      if (statusFiltro) {
        query = query.eq("status", statusFiltro);
      }
      if (inicio) {
        query = query.gte("data_inicio", inicio);
      }
      if (fim) {
        query = query.lte("data_inicio", fim);
      }

      const { data, error } = await query;
      if (error) throw error;
      setViagens((data || []) as Viagem[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar viagens.");
    } finally {
      setLoading(false);
    }
  }

  async function criarViagem() {
    if (!podeCriar) return;
    if (!companyId || !userId) {
      setFormError("NÇőo foi possÇ§vel determinar sua empresa.");
      return;
    }
    if (!cadastroForm.cliente_id) {
      setFormError("Selecione o cliente responsÂvel.");
      return;
    }
    if (!cadastroForm.origem || !cadastroForm.destino || !cadastroForm.data_inicio) {
      setFormError("Origem, destino e data de inÃ­cio sÇőo obrigatÃ³rios.");
      return;
    }

    try {
      setSavingViagem(true);
      setFormError(null);

      const origemLabel = cadastroForm.origem.trim();
      const destinoLabel = cadastroForm.destino.trim();

      const payload = {
        company_id: companyId,
        responsavel_user_id: userId,
        cliente_id: cadastroForm.cliente_id,
        origem: origemLabel,
        destino: destinoLabel,
        data_inicio: cadastroForm.data_inicio,
        data_fim: cadastroForm.data_fim || null,
        status: cadastroForm.status,
        orcamento_id: null,
      };
      const { error } = await supabase.from("viagens").insert(payload);
      if (error) throw error;

      resetCadastroForm();
      setShowForm(false);
      buscar();
    } catch (e: unknown) {
      console.error(e);
      const errorMessage =
        e && typeof e === "object" && e !== null && "message" in e && typeof (e as { message?: string }).message === "string"
          ? (e as { message?: string }).message
          : null;
      setFormError(errorMessage || "Erro ao criar viagem.");
    } finally {
      setSavingViagem(false);
    }
  }

  async function excluirViagem(v: ViagemExibicao) {
    if (!podeExcluir) return;
    try {
      setDeletandoViagemId(v.id);
      setErro(null);
      setSucesso(null);
      const deleteQuery = supabase.from("viagens").delete();
      const { error } = v.venda_id
        ? await deleteQuery.eq("venda_id", v.venda_id)
        : await deleteQuery.eq("id", v.id);
      if (error) throw error;
      setSucesso("Viagem excluída.");
      await buscar();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Erro ao excluir viagem.";
      setErro(message);
    } finally {
      setDeletandoViagemId(null);
    }
  }

  function solicitarExclusaoViagem(viagem: ViagemExibicao) {
    if (!podeExcluir) return;
    setViagemParaExcluir(viagem);
  }

  async function confirmarExclusaoViagem() {
    if (!viagemParaExcluir) return;
    await excluirViagem(viagemParaExcluir);
    setViagemParaExcluir(null);
  }

  function obterStatusExibicao(viagem: Viagem) {
    const periodoStatus = obterStatusPorPeriodo(
      viagem.data_inicio,
      viagem.data_fim,
    );
    if (periodoStatus) {
      return STATUS_LABELS[periodoStatus] || periodoStatus;
    }
    if (viagem.status) {
      return STATUS_LABELS[viagem.status] || viagem.status;
    }
    return "-";
  }

  const viagensAgrupadas = useMemo<ViagemExibicao[]>(() => {
    const grupos = new Map<string, { base: Viagem; recibos: NonNullable<Viagem["recibo"]>[] }>();

    viagens.forEach((viagem) => {
      const chave = viagem.venda_id || viagem.id;
      const recibosAtual = viagem.recibo ? [viagem.recibo] : [];
      const existente = grupos.get(chave);
      if (!existente) {
        const dataInicio = obterMinData([viagem.data_inicio, viagem.recibo?.data_inicio]);
        const dataFim = obterMaxData([viagem.data_fim, viagem.recibo?.data_fim]);
        grupos.set(chave, {
          base: {
            ...viagem,
            data_inicio: dataInicio || viagem.data_inicio,
            data_fim: dataFim || viagem.data_fim,
          },
          recibos: [...recibosAtual],
        });
        return;
      }

      existente.recibos.push(...recibosAtual);
      const datasInicio = [
        existente.base.data_inicio,
        viagem.data_inicio,
        viagem.recibo?.data_inicio,
      ];
      const datasFim = [
        existente.base.data_fim,
        viagem.data_fim,
        viagem.recibo?.data_fim,
      ];
      existente.base.data_inicio = obterMinData(datasInicio) || existente.base.data_inicio;
      existente.base.data_fim = obterMaxData(datasFim) || existente.base.data_fim;
    });

    return Array.from(grupos.values()).map(({ base, recibos }) => ({ ...base, recibos }));
  }, [viagens]);

  const mensagemExclusaoViagem = viagemParaExcluir
    ? (viagemParaExcluir.recibos || []).length > 1
      ? "Tem certeza que deseja excluir esta viagem e seus itens vinculados?"
      : "Tem certeza que deseja excluir esta viagem?"
    : "";

  const proximasViagens = useMemo(() => {
    return [...viagensAgrupadas].sort((a, b) => {
      const da = a.data_inicio || "";
      const db = b.data_inicio || "";
      if (da === db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    });
  }, [viagensAgrupadas]);
  const viagensFiltradas = useMemo(() => {
    const termo = normalizeText(busca.trim());
    if (!termo) return proximasViagens;
    return proximasViagens.filter((viagem) => {
      const clienteNome = viagem.clientes?.nome || "";
      const produtos = (viagem.recibos || [])
        .map((recibo) =>
          [
            recibo.tipo_produtos?.nome,
            recibo.tipo_produtos?.tipo,
            recibo.produto_id,
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ");
      const haystack = normalizeText([clienteNome, produtos].filter(Boolean).join(" "));
      return haystack.includes(termo);
    });
  }, [proximasViagens, busca]);
  const viagensExibidas = useMemo(() => {
    const mostrarTodos = Boolean(busca.trim() || statusFiltro || inicio || fim);
    return mostrarTodos ? viagensFiltradas : viagensFiltradas.slice(0, 5);
  }, [viagensFiltradas, busca, statusFiltro, inicio, fim]);
  const compactDateFieldStyle = { flex: "0 0 140px", minWidth: 125 };
  const totalColunasTabela = 7;

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!podeVer) {
    return <div>Você não possui acesso ao módulo de Operação/Viagens.</div>;
  }

  return (
      <div
        className={`page-content-wrap viagens-page${podeCriar && !showForm ? " has-mobile-actionbar" : ""}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {showForm && (
            <div className="card-base card-blue form-card viagens-form" style={{ padding: 16 }}>
              <datalist id="cidades-list">
                {cidades.map((cidade) => (
                  <option
                    key={`${cidade.nome}-${cidade.subdivisao_nome || ""}-${cidade.pais_nome || ""}`}
                    value={cidade.nome}
                    label={formatCidadeLabel(cidade)}
                  />
                ))}
              </datalist>
              {buscandoCidades && <small style={{ color: "#6366f1" }}>Buscando cidades...</small>}
              {erroCidades && <small style={{ color: "red" }}>{erroCidades}</small>}
              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select
                  className="form-select"
                  value={cadastroForm.cliente_id}
                  onChange={(e) =>
                    setCadastroForm((prev) => ({ ...prev, cliente_id: e.target.value }))
                  }
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                      {cliente.cpf ? ` (${cliente.cpf})` : ""}
                    </option>
                  ))}
                </select>
                {clientesErro && (
                  <small style={{ color: "red" }}>{clientesErro}</small>
                )}
              </div>
              <div className="form-row mobile-stack">
                <div className="form-group">
                  <label className="form-label">Origem</label>
                  <input
                    className="form-input"
                    list="cidades-list"
                    value={cadastroForm.origem}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCadastroForm((prev) => ({ ...prev, origem: value }));
                      agendarBuscaCidades(value);
                    }}
                    placeholder="Cidade de origem"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Destino</label>
                  <input
                    className="form-input"
                    list="cidades-list"
                    value={cadastroForm.destino}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCadastroForm((prev) => ({ ...prev, destino: value }));
                      agendarBuscaCidades(value);
                    }}
                    placeholder="Cidade de destino"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data início</label>
                  <input
                    type="date"
                    className="form-input w-full"
                    value={cadastroForm.data_inicio}
                    onChange={(e) =>
                      setCadastroForm((prev) => {
                        const nextInicio = e.target.value;
                        const nextFim =
                          prev.data_fim && nextInicio && prev.data_fim < nextInicio
                            ? nextInicio
                            : prev.data_fim;
                        return { ...prev, data_inicio: nextInicio, data_fim: nextFim };
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data fim</label>
                  <input
                    type="date"
                    className="form-input w-full"
                    value={cadastroForm.data_fim}
                    min={cadastroForm.data_inicio || undefined}
                    onChange={(e) =>
                      setCadastroForm((prev) => {
                        const nextFim = e.target.value;
                        const boundedFim =
                          prev.data_inicio && nextFim && nextFim < prev.data_inicio
                            ? prev.data_inicio
                            : nextFim;
                        return { ...prev, data_fim: boundedFim };
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={cadastroForm.status}
                    onChange={(e) => setCadastroForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="planejada">Planejada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="em_viagem">Em viagem</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
              <div className="mobile-stack-buttons" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary w-full sm:w-auto"
                  type="button"
                  onClick={criarViagem}
                  disabled={savingViagem}
                >
                  {savingViagem ? "Salvando..." : "Salvar viagem"}
                </button>
                <button
                  className="btn btn-light w-full sm:w-auto"
                  type="button"
                  onClick={fecharFormularioViagem}
                  disabled={savingViagem}
                >
                  Cancelar
                </button>
              </div>
              {formError && <div style={{ color: "red" }}>{formError}</div>}
            </div>
          )}

          {!showForm && (
            <div className="card-base card-blue mb-3 list-toolbar-sticky">
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="form-group">
                  <label className="form-label">Buscar cliente</label>
                  <input
                    className="form-input"
                    placeholder="Cliente ou produto..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-light" onClick={() => setShowFilters(true)}>
                  Filtros
                </button>
              </div>
              <div className="hidden sm:block">
                <div
                  className="form-row mobile-stack"
                  style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}
                >
                  <div className="form-group" style={{ flex: "1 1 220px", minWidth: 200 }}>
                    <label className="form-label">Buscar cliente</label>
                    <input
                      className="form-input"
                      placeholder="Cliente ou produto..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: "1 1 180px" }}>
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={statusFiltro}
                      onChange={(e) => setStatusFiltro(e.target.value)}
                    >
                      {STATUS_OPCOES.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={compactDateFieldStyle}>
                    <label className="form-label">Inicio</label>
                    <input
                      type="date"
                      className="form-input w-full"
                      value={inicio}
                      onChange={(e) => {
                        const nextInicio = e.target.value;
                        setInicio(nextInicio);
                        if (fim && nextInicio && fim < nextInicio) {
                          setFim(nextInicio);
                        }
                      }}
                    />
                  </div>
                  <div className="form-group" style={compactDateFieldStyle}>
                    <label className="form-label">Final</label>
                    <input
                      type="date"
                      className="form-input w-full"
                      value={fim}
                      min={inicio || undefined}
                      onChange={(e) => {
                        const nextFim = e.target.value;
                        const boundedFim = inicio && nextFim && nextFim < inicio ? inicio : nextFim;
                        setFim(boundedFim);
                      }}
                    />
                  </div>
                  <div className="form-group viagens-actions">
                    <button className="btn btn-strong" type="button" onClick={buscar} disabled={loading}>
                      {loading ? "Atualizando..." : "Atualizar"}
                    </button>
                    {podeCriar && (
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={abrirFormularioViagem}
                        disabled={showForm}
                      >
                        Nova viagem
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!showForm && showFilters && (
            <div className="mobile-drawer-backdrop" onClick={() => setShowFilters(false)}>
              <div
                className="mobile-drawer-panel"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <strong>Filtros</strong>
                  <button type="button" className="btn-ghost" onClick={() => setShowFilters(false)}>
                    ✕
                  </button>
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={statusFiltro}
                    onChange={(e) => setStatusFiltro(e.target.value)}
                  >
                    {STATUS_OPCOES.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Inicio</label>
                  <input
                    type="date"
                    className="form-input w-full"
                    value={inicio}
                    onChange={(e) => {
                      const nextInicio = e.target.value;
                      setInicio(nextInicio);
                      if (fim && nextInicio && fim < nextInicio) {
                        setFim(nextInicio);
                      }
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Final</label>
                  <input
                    type="date"
                    className="form-input w-full"
                    value={fim}
                    min={inicio || undefined}
                    onChange={(e) => {
                      const nextFim = e.target.value;
                      const boundedFim = inicio && nextFim && nextFim < inicio ? inicio : nextFim;
                      setFim(boundedFim);
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 12, width: "100%" }}
                  onClick={() => {
                    buscar();
                    setShowFilters(false);
                  }}
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          )}

        {!showForm && erro && <div style={{ color: "red" }}>{erro}</div>}
        {!showForm && sucesso && (
          <div className="auth-success" style={{ color: "#0f172a", fontWeight: 700 }}>
            {sucesso}
          </div>
        )}

        {!showForm && (
          <div
            className="table-container overflow-x-auto"
            style={{ maxHeight: "65vh", overflowY: "auto" }}
          >
            <table className="table-default table-header-teal table-mobile-cards min-w-[760px]">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Status</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={totalColunasTabela}>Carregando viagens...</td>
                  </tr>
                )}
                {!loading && viagensExibidas.length === 0 && (
                  <tr>
                    <td colSpan={totalColunasTabela}>Nenhuma viagem encontrada.</td>
                  </tr>
                )}
                {viagensExibidas.map((v) => {
                  const statusLabel = obterStatusExibicao(v);
                  const recibos = v.recibos || [];
                  const produtoLabel =
                    recibos.length > 1
                      ? `Múltiplos (${recibos.length})`
                      : recibos[0]?.tipo_produtos?.nome ||
                        recibos[0]?.tipo_produtos?.tipo ||
                        recibos[0]?.produto_id ||
                        "-";
                  const valorTotal = recibos.reduce((total, r) => total + (r.valor_total || 0), 0);
                  const valorLabel = recibos.length > 0 ? formatarMoeda(valorTotal) : "-";
                  const whatsappLink = construirLinkWhatsApp(v.clientes?.whatsapp || null);
                  return (
                    <tr key={v.id}>
                      <td data-label="Cliente">{v.clientes?.nome || "-"}</td>
                      <td data-label="Início">{formatarDataParaExibicao(v.data_inicio)}</td>
                      <td data-label="Fim">{formatarDataParaExibicao(v.data_fim)}</td>
                      <td data-label="Status">{statusLabel}</td>
                      <td data-label="Produto">{produtoLabel}</td>
                      <td data-label="Valor">{valorLabel}</td>
                      <td className="th-actions" data-label="Ações">
                        <div className="action-buttons viagens-action-buttons">
                          <a
                            className="btn-icon"
                            href={`/operacao/viagens/${v.id}`}
                            title="Ver viagem"
                          >
                            👁️
                          </a>
                          {whatsappLink && (
                            <a
                              className="btn-icon"
                              href={whatsappLink}
                              title="Enviar WhatsApp"
                              target="_blank"
                              rel="noreferrer"
                            >
                              💬
                            </a>
                          )}
                          {podeEditar && (
                            <a
                              className="btn-icon"
                              href={`/operacao/viagens/${v.id}?modo=editar`}
                              title="Editar viagem"
                            >
                              ✏️
                            </a>
                          )}
                          {podeExcluir && (
                            <button
                              className="btn-icon btn-danger"
                              title="Excluir viagem"
                              onClick={() => solicitarExclusaoViagem(v)}
                              disabled={deletandoViagemId === v.id}
                            >
                              {deletandoViagemId === v.id ? "..." : "🗑️"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!showForm && podeCriar && (
          <div className="mobile-actionbar sm:hidden">
            <button type="button" className="btn btn-primary" onClick={abrirFormularioViagem}>
              Nova viagem
            </button>
          </div>
        )}
        <ConfirmDialog
          open={Boolean(viagemParaExcluir)}
          title="Excluir viagem"
          message={mensagemExclusaoViagem}
          confirmLabel={deletandoViagemId ? "Excluindo..." : "Excluir"}
          confirmVariant="danger"
          confirmDisabled={Boolean(deletandoViagemId)}
          onCancel={() => setViagemParaExcluir(null)}
          onConfirm={confirmarExclusaoViagem}
        />
      </div>
    </div>
  );
}
