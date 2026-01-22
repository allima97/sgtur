globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_Ck_yWTiO.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_R_BoJegu.mjs';
import { f as formatarDataParaExibicao } from '../../chunks/formatDate_DIYZa49I.mjs';
import { c as construirLinkWhatsApp } from '../../chunks/whatsapp_C20KyoZc.mjs';

const STATUS_OPCOES = [
  { value: "", label: "Todas" },
  { value: "planejada", label: "Planejada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_viagem", label: "Em viagem" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" }
];
const STATUS_LABELS = {
  planejada: "Planejada",
  confirmada: "Confirmada",
  em_viagem: "Em viagem",
  concluida: "Concluída",
  cancelada: "Cancelada"
};
function obterStatusPorPeriodo(inicio, fim) {
  if (!inicio) return null;
  const hoje = /* @__PURE__ */ new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : null;
  if (dataFim && dataFim < hoje) return "concluida";
  if (dataInicio > hoje) return "confirmada";
  if (dataFim && hoje > dataFim) return "concluida";
  return "em_viagem";
}
function formatarMoeda(valor) {
  if (valor == null || Number.isNaN(valor)) return "-";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function obterMinData(datas) {
  let minTs = null;
  let minStr = null;
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
function obterMaxData(datas) {
  let maxTs = null;
  let maxStr = null;
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
  cliente_id: ""
};
function ViagensListaIsland() {
  const { permissao, loading: loadingPerm, ativo, podeExcluir, podeEditar } = usePermissao("Operacao");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const [statusFiltro, setStatusFiltro] = reactExports.useState("");
  const [inicio, setInicio] = reactExports.useState("");
  const [fim, setFim] = reactExports.useState("");
  const [busca, setBusca] = reactExports.useState("");
  const [viagens, setViagens] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [sucesso, setSucesso] = reactExports.useState(null);
  const [showForm, setShowForm] = reactExports.useState(false);
  const [formError, setFormError] = reactExports.useState(null);
  const [savingViagem, setSavingViagem] = reactExports.useState(false);
  const [cadastroForm, setCadastroForm] = reactExports.useState(() => ({ ...initialCadastroForm }));
  const [cidades, setCidades] = reactExports.useState([]);
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [userId, setUserId] = reactExports.useState(null);
  const [clientes, setClientes] = reactExports.useState([]);
  const [clientesErro, setClientesErro] = reactExports.useState(null);
  const [deletandoViagemId, setDeletandoViagemId] = reactExports.useState(null);
  const [buscandoCidades, setBuscandoCidades] = reactExports.useState(false);
  const [erroCidades, setErroCidades] = reactExports.useState(null);
  const cidadesAbort = reactExports.useRef(null);
  const cidadesTimeout = reactExports.useRef(null);
  const formatCidadeLabel = (cidade) => {
    const partes = [cidade.nome];
    if (cidade.subdivisao_nome) partes.push(cidade.subdivisao_nome);
    if (cidade.pais_nome) partes.push(cidade.pais_nome);
    return partes.join(" • ");
  };
  reactExports.useEffect(() => {
    if (!loadingPerm && podeVer) {
      buscar();
    }
  }, [loadingPerm, podeVer, statusFiltro, inicio, fim]);
  reactExports.useEffect(() => {
    async function resolveUser() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user || null;
      if (!user) {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        setUserId(data.user.id);
        const { data: row } = await supabase.from("users").select("company_id").eq("id", data.user.id).maybeSingle();
        setCompanyId(row?.company_id || null);
      } else {
        setUserId(user.id);
        const { data: row } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        setCompanyId(row?.company_id || null);
      }
    }
    resolveUser();
  }, []);
  reactExports.useEffect(() => {
    if (!companyId) return;
    async function carregarClientes() {
      try {
        const { data, error } = await supabase.from("clientes").select("id, nome, cpf").eq("company_id", companyId).order("nome", { ascending: true }).limit(200);
        if (error) throw error;
        setClientes(data || []);
        setClientesErro(null);
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
        setClientesErro("Não foi possível carregar os clientes.");
      }
    }
    carregarClientes();
  }, [companyId]);
  reactExports.useEffect(() => {
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
  async function carregarSugestoes(term) {
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
      let cidadesData = [];
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: search, limite },
          { signal: controller.signal }
        );
        if (error) throw error;
        cidadesData = data || [];
      } catch (rpcError) {
        if (controller.signal.aborted) return;
        console.warn("RPC buscar_cidades falhou:", rpcError);
        let fallbackQuery = supabase.from("cidades").select("nome").order("nome").limit(limite);
        if (search.length > 0) {
          fallbackQuery = fallbackQuery.ilike("nome", `%${search}%`);
        }
        const fallback = await fallbackQuery;
        if (fallback.error) throw fallback.error;
        cidadesData = (fallback.data || []).map((c) => ({ nome: c.nome }));
      }
      if (controller.signal.aborted) return;
      const unique = /* @__PURE__ */ new Map();
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
  function agendarBuscaCidades(term) {
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
      let query = supabase.from("viagens").select(
        "id, venda_id, data_inicio, data_fim, status, origem, destino, responsavel_user_id, cliente_id, clientes (nome, whatsapp), responsavel:users!responsavel_user_id (nome_completo), recibo:vendas_recibos (id, valor_total, valor_taxas, data_inicio, data_fim, numero_recibo, produto_id, tipo_produtos (id, nome, tipo))"
      ).order("data_inicio", { ascending: true });
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
      setViagens(data || []);
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
        orcamento_id: null
      };
      const { error } = await supabase.from("viagens").insert(payload);
      if (error) throw error;
      resetCadastroForm();
      setShowForm(false);
      buscar();
    } catch (e) {
      console.error(e);
      const errorMessage = e && typeof e === "object" && e !== null && "message" in e && typeof e.message === "string" ? e.message : null;
      setFormError(errorMessage || "Erro ao criar viagem.");
    } finally {
      setSavingViagem(false);
    }
  }
  async function excluirViagem(v) {
    if (!podeExcluir) return;
    const possuiMultiplos = (v.recibos || []).length > 1;
    const mensagemConfirmacao = possuiMultiplos ? "Tem certeza que deseja excluir esta viagem e seus itens vinculados?" : "Tem certeza que deseja excluir esta viagem?";
    const confirmar = window.confirm(mensagemConfirmacao);
    if (!confirmar) return;
    try {
      setDeletandoViagemId(v.id);
      setErro(null);
      setSucesso(null);
      const deleteQuery = supabase.from("viagens").delete();
      const { error } = v.venda_id ? await deleteQuery.eq("venda_id", v.venda_id) : await deleteQuery.eq("id", v.id);
      if (error) throw error;
      setSucesso("Viagem excluída.");
      await buscar();
    } catch (err) {
      console.error(err);
      const message = err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : "Erro ao excluir viagem.";
      setErro(message);
    } finally {
      setDeletandoViagemId(null);
    }
  }
  function obterStatusExibicao(viagem) {
    const periodoStatus = obterStatusPorPeriodo(
      viagem.data_inicio,
      viagem.data_fim
    );
    if (periodoStatus) {
      return STATUS_LABELS[periodoStatus] || periodoStatus;
    }
    if (viagem.status) {
      return STATUS_LABELS[viagem.status] || viagem.status;
    }
    return "-";
  }
  const viagensAgrupadas = reactExports.useMemo(() => {
    const grupos = /* @__PURE__ */ new Map();
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
            data_fim: dataFim || viagem.data_fim
          },
          recibos: [...recibosAtual]
        });
        return;
      }
      existente.recibos.push(...recibosAtual);
      const datasInicio = [
        existente.base.data_inicio,
        viagem.data_inicio,
        viagem.recibo?.data_inicio
      ];
      const datasFim = [
        existente.base.data_fim,
        viagem.data_fim,
        viagem.recibo?.data_fim
      ];
      existente.base.data_inicio = obterMinData(datasInicio) || existente.base.data_inicio;
      existente.base.data_fim = obterMaxData(datasFim) || existente.base.data_fim;
    });
    return Array.from(grupos.values()).map(({ base, recibos }) => ({ ...base, recibos }));
  }, [viagens]);
  const proximasViagens = reactExports.useMemo(() => {
    return [...viagensAgrupadas].sort((a, b) => {
      const da = a.data_inicio || "";
      const db = b.data_inicio || "";
      if (da === db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    });
  }, [viagensAgrupadas]);
  const viagensFiltradas = reactExports.useMemo(() => {
    const termo = normalizeText(busca.trim());
    if (!termo) return proximasViagens;
    return proximasViagens.filter((viagem) => {
      const clienteNome = viagem.clientes?.nome || "";
      const produtos = (viagem.recibos || []).map(
        (recibo) => [
          recibo.tipo_produtos?.nome,
          recibo.tipo_produtos?.tipo,
          recibo.produto_id
        ].filter(Boolean).join(" ")
      ).join(" ");
      const haystack = normalizeText([clienteNome, produtos].filter(Boolean).join(" "));
      return haystack.includes(termo);
    });
  }, [proximasViagens, busca]);
  const compactDateFieldStyle = { flex: "0 0 140px", minWidth: 125 };
  const totalColunasTabela = 7;
  if (loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Operação/Viagens." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-purple viagens-page", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
    showForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue form-card viagens-form", style: { padding: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "cidades-list", children: cidades.map((cidade) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "option",
        {
          value: cidade.nome,
          label: formatCidadeLabel(cidade)
        },
        `${cidade.nome}-${cidade.subdivisao_nome || ""}-${cidade.pais_nome || ""}`
      )) }),
      buscandoCidades && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#6366f1" }, children: "Buscando cidades..." }),
      erroCidades && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "red" }, children: erroCidades }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: cadastroForm.cliente_id,
            onChange: (e) => setCadastroForm((prev) => ({ ...prev, cliente_id: e.target.value })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione um cliente" }),
              clientes.map((cliente) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: cliente.id, children: [
                cliente.nome,
                cliente.cpf ? ` (${cliente.cpf})` : ""
              ] }, cliente.id))
            ]
          }
        ),
        clientesErro && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "red" }, children: clientesErro })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row mobile-stack", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Origem" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              list: "cidades-list",
              value: cadastroForm.origem,
              onChange: (e) => {
                const value = e.target.value;
                setCadastroForm((prev) => ({ ...prev, origem: value }));
                agendarBuscaCidades(value);
              },
              placeholder: "Cidade de origem"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              list: "cidades-list",
              value: cadastroForm.destino,
              onChange: (e) => {
                const value = e.target.value;
                setCadastroForm((prev) => ({ ...prev, destino: value }));
                agendarBuscaCidades(value);
              },
              placeholder: "Cidade de destino"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: cadastroForm.data_inicio,
              onChange: (e) => setCadastroForm((prev) => {
                const nextInicio = e.target.value;
                const nextFim = prev.data_fim && nextInicio && prev.data_fim < nextInicio ? nextInicio : prev.data_fim;
                return { ...prev, data_inicio: nextInicio, data_fim: nextFim };
              })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: cadastroForm.data_fim,
              min: cadastroForm.data_inicio || void 0,
              onChange: (e) => setCadastroForm((prev) => {
                const nextFim = e.target.value;
                const boundedFim = prev.data_inicio && nextFim && nextFim < prev.data_inicio ? prev.data_inicio : nextFim;
                return { ...prev, data_fim: boundedFim };
              })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: cadastroForm.status,
              onChange: (e) => setCadastroForm((prev) => ({ ...prev, status: e.target.value })),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "planejada", children: "Planejada" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "confirmada", children: "Confirmada" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "em_viagem", children: "Em viagem" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "concluida", children: "Concluída" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cancelada", children: "Cancelada" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-stack-buttons", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-primary w-full sm:w-auto",
            type: "button",
            onClick: criarViagem,
            disabled: savingViagem,
            children: savingViagem ? "Salvando..." : "Salvar viagem"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-light w-full sm:w-auto",
            type: "button",
            onClick: fecharFormularioViagem,
            disabled: savingViagem,
            children: "Cancelar"
          }
        )
      ] }),
      formError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red" }, children: formError })
    ] }),
    !showForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row mobile-stack", style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: "1 1 220px", minWidth: 200 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            placeholder: "Cliente ou produto...",
            value: busca,
            onChange: (e) => setBusca(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: "1 1 180px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            className: "form-select",
            value: statusFiltro,
            onChange: (e) => setStatusFiltro(e.target.value),
            children: STATUS_OPCOES.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: op.value, children: op.label }, op.value))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: compactDateFieldStyle, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Inicio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            className: "form-input",
            value: inicio,
            onChange: (e) => {
              const nextInicio = e.target.value;
              setInicio(nextInicio);
              if (fim && nextInicio && fim < nextInicio) {
                setFim(nextInicio);
              }
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: compactDateFieldStyle, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Final" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            className: "form-input",
            value: fim,
            min: inicio || void 0,
            onChange: (e) => {
              const nextFim = e.target.value;
              const boundedFim = inicio && nextFim && nextFim < inicio ? inicio : nextFim;
              setFim(boundedFim);
            }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group viagens-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-strong", type: "button", onClick: buscar, disabled: loading, children: loading ? "Atualizando..." : "Atualizar" }),
        podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-primary",
            type: "button",
            onClick: abrirFormularioViagem,
            disabled: showForm,
            children: "Nova viagem"
          }
        )
      ] })
    ] }),
    !showForm && erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red" }, children: erro }),
    !showForm && sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", style: { color: "#0f172a", fontWeight: 700 }, children: sucesso }),
    !showForm && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "table-container overflow-x-auto",
        style: { maxHeight: "65vh", overflowY: "auto" },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-teal table-mobile-cards min-w-[760px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Início" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Fim" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: totalColunasTabela, children: "Carregando viagens..." }) }),
            !loading && viagensFiltradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: totalColunasTabela, children: "Nenhuma viagem encontrada." }) }),
            viagensFiltradas.map((v) => {
              const statusLabel = obterStatusExibicao(v);
              const recibos = v.recibos || [];
              const produtoLabel = recibos.length > 1 ? `Múltiplos (${recibos.length})` : recibos[0]?.tipo_produtos?.nome || recibos[0]?.tipo_produtos?.tipo || recibos[0]?.produto_id || "-";
              const valorTotal = recibos.reduce((total, r) => total + (r.valor_total || 0), 0);
              const valorLabel = recibos.length > 0 ? formatarMoeda(valorTotal) : "-";
              const whatsappLink = construirLinkWhatsApp(v.clientes?.whatsapp || null);
              return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Cliente", children: v.clientes?.nome || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Início", children: formatarDataParaExibicao(v.data_inicio) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Fim", children: formatarDataParaExibicao(v.data_fim) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Status", children: statusLabel }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Produto", children: produtoLabel }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Valor", children: valorLabel }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", "data-label": "Ações", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "action-buttons viagens-action-buttons", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      className: "btn-icon",
                      href: `/operacao/viagens/${v.id}`,
                      title: "Ver viagem",
                      children: "👁️"
                    }
                  ),
                  whatsappLink && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      className: "btn-icon",
                      href: whatsappLink,
                      title: "Enviar WhatsApp",
                      target: "_blank",
                      rel: "noreferrer",
                      children: "💬"
                    }
                  ),
                  podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      className: "btn-icon",
                      href: `/operacao/viagens/${v.id}?modo=editar`,
                      title: "Editar viagem",
                      children: "✏️"
                    }
                  ),
                  podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn-icon btn-danger",
                      title: "Excluir viagem",
                      onClick: () => excluirViagem(v),
                      disabled: deletandoViagemId === v.id,
                      children: deletandoViagemId === v.id ? "..." : "🗑️"
                    }
                  )
                ] }) })
              ] }, v.id);
            })
          ] })
        ] })
      }
    )
  ] }) });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "operacao_viagens";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Viagens", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Viagens", "subtitle": "Acompanhe as viagens planejadas, em andamento e conclu\xEDdas.", "color": "teal" })} ${renderComponent($$result2, "ViagensListaIsland", ViagensListaIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ViagensListaIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/operacao/viagens/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/operacao/viagens/index.astro";
const $$url = "/operacao/viagens";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
