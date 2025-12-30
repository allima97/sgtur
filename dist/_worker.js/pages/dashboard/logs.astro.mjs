globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_CVPGTMFc.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_CdOMU9M7.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_BXAzlmjM.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_APQgoOvT.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_APQgoOvT.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_KyAPOmB5.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_CE96PXyc.mjs';

function LogsIsland() {
  const { ativo, loading: loadingPerm } = usePermissao("AdminDashboard");
  const [isAdmin, setIsAdmin] = reactExports.useState(false);
  const [logs, setLogs] = reactExports.useState([]);
  const [usuarios, setUsuarios] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [filtroUsuario, setFiltroUsuario] = reactExports.useState("");
  const [filtroModulo, setFiltroModulo] = reactExports.useState("");
  const [filtroAcao, setFiltroAcao] = reactExports.useState("");
  const [busca, setBusca] = reactExports.useState("");
  const [logSelecionado, setLogSelecionado] = reactExports.useState(null);
  reactExports.useEffect(() => {
    async function validar() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: u } = await supabase.from("users").select("id, user_types(name)").eq("id", auth.user.id).maybeSingle();
      const tipo = u?.user_types?.name?.toUpperCase() || "";
      setIsAdmin(tipo.includes("ADMIN"));
    }
    validar();
  }, []);
  reactExports.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        const { data: logsData, error: logsErr } = await supabase.from("logs").select(
          `
            *,
            users:users (nome_completo)
          `
        ).order("created_at", { ascending: false });
        if (logsErr) throw logsErr;
        setLogs(logsData || []);
        const { data: uData } = await supabase.from("users").select("id, nome_completo").order("nome_completo");
        setUsuarios(uData || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar logs.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  const logsFiltrados = reactExports.useMemo(() => {
    let result = logs;
    if (filtroUsuario) {
      result = result.filter((l) => l.user_id === filtroUsuario);
    }
    if (filtroModulo) {
      result = result.filter((l) => (l.modulo || "") === filtroModulo);
    }
    if (filtroAcao) {
      result = result.filter((l) => l.acao === filtroAcao);
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      result = result.filter((l) => {
        const texto = JSON.stringify(l).toLowerCase() + (l.users?.nome_completo || "").toLowerCase();
        return texto.includes(t);
      });
    }
    return result;
  }, [logs, filtroUsuario, filtroModulo, filtroAcao, busca]);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo || !isAdmin)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Apenas administradores podem acessar os logs." }) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "logs-admin-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Logs de Auditoria" }),
      " — todas as ações do sistema"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 12 }, children: "Filtros" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Usuário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: filtroUsuario,
              onChange: (e) => setFiltroUsuario(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos" }),
                usuarios.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u.id, children: u.nome_completo }, u.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Módulo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: filtroModulo,
              onChange: (e) => setFiltroModulo(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "permissoes", children: "Permissões" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "vendas", children: "Vendas" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "clientes", children: "Clientes" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cadastros", children: "Cadastros" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "login", children: "Login" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: filtroAcao,
              onChange: (e) => setFiltroAcao(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todas" }),
                Array.from(new Set(logs.map((l) => l.acao))).map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: a }, a))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Busca livre" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            className: "form-input",
            placeholder: "Buscar em qualquer campo...",
            value: busca,
            onChange: (e) => setBusca(e.target.value)
          }
        )
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-3 font-semibold", children: [
        "Registros (",
        logsFiltrados.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[820px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-[150px]", children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Usuário" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Módulo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "IP" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ver" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          logsFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhum log encontrado." }) }),
          logsFiltrados.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: new Date(l.created_at).toLocaleString("pt-BR") }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.users?.nome_completo || "Desconhecido" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.acao }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.modulo || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.ip || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn btn-light",
                onClick: () => setLogSelecionado(l),
                children: "Ver"
              }
            ) })
          ] }, l.id))
        ] })
      ] }) })
    ] }),
    logSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 bg-black/60 flex justify-center items-center z-[100]", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-[95%] max-w-[700px] max-h-[90vh] overflow-y-auto bg-slate-800 p-5 rounded-xl text-slate-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Detalhes do log" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-light",
            onClick: () => setLogSelecionado(null),
            children: "Fechar"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Usuário:" }),
        " ",
        logSelecionado.users?.nome_completo
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Ação:" }),
        " ",
        logSelecionado.acao
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Módulo:" }),
        " ",
        logSelecionado.modulo
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Data:" }),
        " ",
        new Date(logSelecionado.created_at).toLocaleString("pt-BR")
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "IP:" }),
        " ",
        logSelecionado.ip || "-"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Detalhes:" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { className: "bg-slate-900 p-3 rounded text-xs whitespace-pre-wrap", children: JSON.stringify(logSelecionado.detalhes, null, 2) })
    ] }) })
  ] });
}

const $$Logs = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Logs de Auditoria" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> ${renderComponent($$result2, "LogsIsland", LogsIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/LogsIsland.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/logs.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/logs.astro";
const $$url = "/dashboard/logs";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Logs,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
