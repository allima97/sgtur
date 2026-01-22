globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_R_BoJegu.mjs';

const MODULOS = [
  "Dashboard",
  "Clientes",
  "Vendas",
  "Orcamentos",
  "Operacao",
  "Viagens",
  "Comissionamento",
  "Cadastros",
  "Paises",
  "Cidades",
  "Destinos",
  "Produtos",
  "Relatorios",
  "Parametros",
  "Metas",
  "RegrasComissao",
  "Admin",
  "AdminDashboard",
  "AdminLogs",
  "AdminUsers"
];
function PermissoesAdminIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("AdminDashboard");
  const [usuarios, setUsuarios] = reactExports.useState([]);
  const [permissoes, setPermissoes] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = reactExports.useState("");
  const [isAdmin, setIsAdmin] = reactExports.useState(false);
  reactExports.useEffect(() => {
    async function loadType() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data: u } = await supabase.from("users").select("id, user_types(name)").eq("id", auth.user.id).maybeSingle();
      const tipo = Array.isArray(u?.user_types) && u.user_types.length > 0 ? u.user_types[0].name?.toUpperCase() || "" : "";
      setIsAdmin(tipo.includes("ADMIN"));
    }
    loadType();
  }, []);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo || !isAdmin)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Apenas administradores podem acessar este módulo." }) });
  reactExports.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        const { data: us } = await supabase.from("users").select("id, nome_completo, email, user_types(name)").order("nome_completo");
        const listaUsers = us?.map((u) => ({
          id: u.id,
          nome_completo: u.nome_completo,
          email: u.email,
          tipo: Array.isArray(u.user_types) && u.user_types.length > 0 ? u.user_types[0].name || "OUTRO" : "OUTRO"
        })) || [];
        setUsuarios(listaUsers);
        const { data: perm } = await supabase.from("modulo_acesso").select("*");
        setPermissoes(perm || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  reactExports.useEffect(() => {
    if (!usuarioSelecionadoId && usuarios.length > 0) {
      setUsuarioSelecionadoId(usuarios[0].id);
    }
  }, [usuarioSelecionadoId, usuarios]);
  function getPermissao(usuarioId, modulo) {
    const item = permissaoEncontrada(usuarioId, modulo);
    if (item) return item;
    return {
      id: "",
      usuario_id: usuarioId,
      modulo,
      permissao: "view",
      ativo: false
    };
  }
  function permissaoEncontrada(usuarioId, modulo) {
    return permissaoList.find(
      (p) => p.usuario_id === usuarioId && p.modulo === modulo
    );
  }
  const permissaoList = permissao ? permissoes : [];
  const usuarioSelecionado = usuarios.find((u) => u.id === usuarioSelecionadoId) || null;
  async function salvar(per) {
    try {
      if (!per.id) {
        const { error } = await supabase.from("modulo_acesso").insert({
          usuario_id: per.usuario_id,
          modulo: per.modulo,
          permissao: per.permissao,
          ativo: per.ativo
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("modulo_acesso").update({
          permissao: per.permissao,
          ativo: per.ativo
        }).eq("id", per.id);
        if (error) throw error;
      }
      const { data } = await supabase.from("modulo_acesso").select("*");
      setPermissoes(data || []);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar permissão.");
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "permissoes-admin-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Editor de Permissões" }),
      " — controle total dos módulos"
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: erro }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando..." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sm:hidden", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-red mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Usuário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            className: "form-select",
            value: usuarioSelecionadoId,
            onChange: (e) => setUsuarioSelecionadoId(e.target.value),
            children: usuarios.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u.id, children: u.nome_completo }, u.id))
          }
        )
      ] }) }),
      usuarioSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "mb-3 font-semibold", children: [
          "Permissões de ",
          usuarioSelecionado.nome_completo
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: MODULOS.map((m) => {
          const per = getPermissao(usuarioSelecionado.id, m);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: 12,
                background: "#fff"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: m }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { fontSize: 12 }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        type: "checkbox",
                        checked: per.ativo,
                        onChange: (e) => salvar({
                          ...per,
                          ativo: e.target.checked
                        })
                      }
                    ),
                    " ",
                    "ativo"
                  ] })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "select",
                  {
                    className: "form-select",
                    disabled: !per.ativo,
                    value: per.permissao,
                    onChange: (e) => salvar({
                      ...per,
                      permissao: e.target.value
                    }),
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "view", children: "View" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "edit", children: "Edit" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "admin", children: "Admin" })
                    ]
                  }
                ) })
              ]
            },
            m
          );
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3 font-semibold", children: "Usuários" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red table-mobile-cards min-w-[900px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "min-w-[180px]", children: "Usuário" }),
          MODULOS.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: m }, m))
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: usuarios.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { "data-label": "Usuário", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: u.nome_completo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: u.email }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
              "Tipo: ",
              u.tipo
            ] })
          ] }),
          MODULOS.map((m) => {
            const per = getPermissao(u.id, m);
            return /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": m, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-xs", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    type: "checkbox",
                    checked: per.ativo,
                    onChange: (e) => salvar({
                      ...per,
                      ativo: e.target.checked
                    })
                  }
                ),
                " ",
                "ativo"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  disabled: !per.ativo,
                  value: per.permissao,
                  onChange: (e) => salvar({
                    ...per,
                    permissao: e.target.value
                  }),
                  className: "text-xs bg-indigo-950 text-indigo-100 border border-indigo-900 rounded px-1 py-0.5",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "view", children: "View" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "edit", children: "Edit" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "admin", children: "Admin" })
                  ]
                }
              )
            ] }) }, m);
          })
        ] }, u.id)) })
      ] }) })
    ] }) })
  ] });
}

const $$Permissoes = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Permiss\xF5es do Sistema" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> ${renderComponent($$result2, "PermissoesAdminIsland", PermissoesAdminIsland, { "client:visible": true, "client:component-hydration": "visible", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/PermissoesAdminIsland.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/permissoes.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/permissoes.astro";
const $$url = "/dashboard/permissoes";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Permissoes,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
