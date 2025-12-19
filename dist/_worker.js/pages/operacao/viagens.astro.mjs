globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B-SnFw9s.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_BjbZI5-O.mjs';

const STATUS_OPCOES = [
  { value: "", label: "Todas" },
  { value: "planejada", label: "Planejada" },
  { value: "confirmada", label: "Confirmada" },
  { value: "em_viagem", label: "Em viagem" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" }
];
function ViagensListaIsland() {
  const { permissao, loading: loadingPerm, ativo } = usePermissao("Operacao");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const [statusFiltro, setStatusFiltro] = reactExports.useState("");
  const [inicio, setInicio] = reactExports.useState("");
  const [fim, setFim] = reactExports.useState("");
  const [viagens, setViagens] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [showForm, setShowForm] = reactExports.useState(false);
  const [formError, setFormError] = reactExports.useState(null);
  const [savingViagem, setSavingViagem] = reactExports.useState(false);
  const [cadastroForm, setCadastroForm] = reactExports.useState({
    origem: "",
    destino: "",
    data_inicio: "",
    data_fim: "",
    status: "planejada",
    cliente_id: ""
  });
  const [cidades, setCidades] = reactExports.useState([]);
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [userId, setUserId] = reactExports.useState(null);
  const [clientes, setClientes] = reactExports.useState([]);
  const [clientesErro, setClientesErro] = reactExports.useState(null);
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
  async function buscar() {
    try {
      setLoading(true);
      setErro(null);
      let query = supabase.from("viagens").select("id, data_inicio, data_fim, status, origem, destino, responsavel_user_id, cliente_id, clientes (nome)").order("data_inicio", { ascending: true });
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
    let orcamentoId = null;
    try {
      setSavingViagem(true);
      setFormError(null);
      const origemLabel = cadastroForm.origem.trim();
      const destinoLabel = cadastroForm.destino.trim();
      const { data: orcamentoData, error: orcamentoError } = await supabase.from("orcamentos").insert({
        cliente_id: cadastroForm.cliente_id,
        status: "novo",
        data_viagem: cadastroForm.data_inicio,
        notas: `Viagem criada via Operacao: ${origemLabel} -> ${destinoLabel}`
      }).select("id").single();
      if (orcamentoError) throw orcamentoError;
      orcamentoId = orcamentoData?.id || null;
      if (!orcamentoId) {
        throw new Error("Nao foi possivel vincular um orcamento.");
      }
      const payload = {
        company_id: companyId,
        responsavel_user_id: userId,
        cliente_id: cadastroForm.cliente_id,
        origem: origemLabel,
        destino: destinoLabel,
        data_inicio: cadastroForm.data_inicio,
        data_fim: cadastroForm.data_fim || null,
        status: cadastroForm.status,
        orcamento_id: orcamentoId
      };
      const { error } = await supabase.from("viagens").insert(payload);
      if (error) throw error;
      setCadastroForm({
        origem: "",
        destino: "",
        data_inicio: "",
        data_fim: "",
        status: "planejada",
        cliente_id: ""
      });
      setShowForm(false);
      buscar();
    } catch (e) {
      console.error(e);
      if (orcamentoId) {
        const { error: cleanupError } = await supabase.from("orcamentos").delete().eq("id", orcamentoId);
        if (cleanupError) {
          console.warn("Nao foi possivel remover o orcamento temporario:", cleanupError);
        }
      }
      const errorMessage = e && typeof e === "object" && e !== null && "message" in e && typeof e.message === "string" ? e.message : null;
      setFormError(errorMessage || "Erro ao criar viagem.");
    } finally {
      setSavingViagem(false);
    }
  }
  const proximasViagens = reactExports.useMemo(() => {
    return [...viagens].sort((a, b) => {
      const da = a.data_inicio || "";
      const db = b.data_inicio || "";
      if (da === db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    });
  }, [viagens]);
  if (!ativo && !loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Operação/Viagens." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-purple", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [
    podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: "Viagens" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-primary",
          type: "button",
          onClick: () => setShowForm((prev) => !prev),
          children: showForm ? "Cancelar" : "Nova viagem"
        }
      )
    ] }),
    showForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue", style: { padding: 16 }, children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
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
              onChange: (e) => setCadastroForm((prev) => ({ ...prev, data_inicio: e.target.value }))
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
              onChange: (e) => setCadastroForm((prev) => ({ ...prev, data_fim: e.target.value }))
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
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignSelf: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-primary",
            type: "button",
            onClick: criarViagem,
            disabled: savingViagem,
            children: savingViagem ? "Salvando..." : "Criar viagem"
          }
        ) })
      ] }),
      formError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red" }, children: formError })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Início a partir de" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            className: "form-input",
            value: inicio,
            onChange: (e) => setInicio(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Início até" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "date",
            className: "form-input",
            value: fim,
            onChange: (e) => setFim(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignSelf: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", type: "button", onClick: buscar, disabled: loading, children: loading ? "Atualizando..." : "Atualizar" }) })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red" }, children: erro }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[760px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Início" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Fim" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Origem" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Responsável" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ver" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Carregando viagens..." }) }),
        !loading && proximasViagens.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Nenhuma viagem encontrada." }) }),
        proximasViagens.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_inicio ? new Date(v.data_inicio).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_fim ? new Date(v.data_fim).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.status || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.origem || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.clientes?.nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.responsavel_user_id || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn btn-light", href: `/operacao/viagens/${v.id}`, children: "Abrir" }) })
        ] }, v.id))
      ] })
    ] }) })
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
