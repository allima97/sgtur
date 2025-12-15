globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_BQoodnBS.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';

function DashboardAdminIsland() {
  const { ativo, loading: loadingPerm } = usePermissao("AdminDashboard");
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [empresas, setEmpresas] = reactExports.useState([]);
  const [usuarios, setUsuarios] = reactExports.useState([]);
  const [gestores, setGestores] = reactExports.useState([]);
  const [sistema, setSistema] = reactExports.useState({
    clientes: 0,
    vendas: 0,
    produtos: 0,
    tipos: 0
  });
  const [isAdmin, setIsAdmin] = reactExports.useState(false);
  reactExports.useEffect(() => {
    async function loadAdmin() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        const { data: u } = await supabase.from("users").select("id, user_types(name)").eq("id", data.user.id).maybeSingle();
        const tipo = u?.user_types?.name?.toUpperCase() || "";
        setIsAdmin(tipo.includes("ADMIN"));
      } catch (e) {
        console.error(e);
      }
    }
    loadAdmin();
  }, []);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando permissões..." });
  if (!ativo || !isAdmin)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Apenas administradores podem acessar este dashboard." }) });
  reactExports.useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setErro(null);
        const { data: emp } = await supabase.from("companies").select("*").order("nome_fantasia");
        setEmpresas(emp || []);
        const { data: usu } = await supabase.from("users").select("id, nome_completo, email, active, user_types(name)").order("nome_completo");
        setUsuarios(usu || []);
        const { data: gest } = await supabase.from("users").select("id, nome_completo, user_types(name)").contains("user_types(name)", ["GESTOR"]);
        let listaGestores = [];
        if (gest) {
          for (const g of gest) {
            const { count } = await supabase.from("gestor_vendedor").select("*", { count: "exact", head: true }).eq("gestor_id", g.id);
            listaGestores.push({
              id: g.id,
              nome_completo: g.nome_completo,
              vendedores: count || 0
            });
          }
        }
        setGestores(listaGestores);
        const tabelas = [
          { chave: "clientes", tabela: "clientes" },
          { chave: "vendas", tabela: "vendas" },
          { chave: "produtos", tabela: "produtos" },
          // destinos/produtos cadastrados
          { chave: "tipos", tabela: "tipo_produtos" }
        ];
        const resultado = { clientes: 0, vendas: 0, produtos: 0, tipos: 0 };
        for (const { chave, tabela } of tabelas) {
          const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true });
          resultado[chave] = count || 0;
        }
        setSistema(resultado);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados administrativos.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-admin-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          marginBottom: 16,
          padding: "12px 16px",
          background: "#4c0519",
          border: "1px solid #be123c",
          borderRadius: 8,
          color: "#fecdd3"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Dashboard Administrativo" }),
          " — Controle Geral do Sistema"
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 12 }, children: "Visão geral do sistema" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Clientes" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.clientes })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.vendas })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Produtos" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.produtos })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Tipos de produto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.tipos })
            ] })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 10 }, children: "Empresas cadastradas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[760px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome fantasia" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Razão Social" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CNPJ" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "UF" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          empresas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma empresa cadastrada." }) }),
          empresas.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.nome_fantasia }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.nome_empresa }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.cnpj }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.cidade || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.estado || "-" })
          ] }, e.id))
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 10 }, children: "Usuários do sistema" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[640px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "E-mail" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          usuarios.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum usuário encontrado." }) }),
          usuarios.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.nome_completo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.email || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.user_types?.name || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "td",
              {
                style: {
                  color: u.active ? "#22c55e" : "#ef4444",
                  fontWeight: "bold"
                },
                children: u.active ? "Sim" : "Não"
              }
            )
          ] }, u.id))
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 10 }, children: "Gestores & Equipes" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[520px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Gestor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qtd. Vendedores" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          gestores.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 2, children: "Nenhum gestor encontrado." }) }),
          gestores.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: g.nome_completo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: g.vendedores })
          ] }, g.id))
        ] })
      ] }) })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: erro }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados..." })
  ] });
}

const $$Admin = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<!-- Apenas ADMIN deve acessar — middleware + island verificam isso -->${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Administrativo" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section style="
      padding: 16px;
      width: 100%;
      max-width: 1300px;
      margin: 0 auto;
    "> ${renderComponent($$result2, "DashboardAdminIsland", DashboardAdminIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardAdminIsland.tsx", "client:component-export": "default" })} </section> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/admin.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/admin.astro";
const $$url = "/dashboard/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
