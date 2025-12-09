globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_Bfm88K_S.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';

const MODULOS = [
  "Dashboard",
  "Clientes",
  "Vendas",
  "Orcamentos",
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
const NIVEIS = [
  { value: "none", label: "Nenhum" },
  { value: "view", label: "Ver" },
  { value: "create", label: "Criar" },
  { value: "edit", label: "Editar" },
  { value: "delete", label: "Excluir" },
  { value: "admin", label: "Admin" }
];
function AdminPermissoesIsland() {
  const { permissao, ativo } = usePermissao("Admin");
  const [usuarioLogadoId, setUsuarioLogadoId] = reactExports.useState(null);
  const [usuarios, setUsuarios] = reactExports.useState([]);
  const [acessos, setAcessos] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [selecionado, setSelecionado] = reactExports.useState(null);
  const [formPermissoes, setFormPermissoes] = reactExports.useState({});
  const [salvando, setSalvando] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const isAdmin = permissao === "admin";
  reactExports.useEffect(() => {
    carregar();
  }, []);
  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id || null;
      setUsuarioLogadoId(userId);
      const { data: usersData, error: usersErr } = await supabase.from("users").select("id, nome_completo, email, active").order("nome_completo", { ascending: true });
      if (usersErr) throw usersErr;
      setUsuarios(usersData || []);
      const { data: acessosData, error: accErr } = await supabase.from("modulo_acesso").select("*");
      if (accErr) throw accErr;
      setAcessos(acessosData || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar permissões.");
    } finally {
      setLoading(false);
    }
  }
  const usuariosFiltrados = reactExports.useMemo(() => {
    if (!busca.trim()) return usuarios;
    const t = busca.toLowerCase();
    return usuarios.filter(
      (u) => u.nome_completo.toLowerCase().includes(t) || (u.email || "").toLowerCase().includes(t)
    );
  }, [usuarios, busca]);
  function abrirEditor(u) {
    setSelecionado(u);
    const perms = {};
    for (const modulo of MODULOS) {
      const reg = acessos.find(
        (a) => a.usuario_id === u.id && a.modulo === modulo
      );
      perms[modulo] = reg ? reg.permissao : "none";
    }
    setFormPermissoes(perms);
  }
  function handleChangeNivel(modulo, value) {
    setFormPermissoes((prev) => ({
      ...prev,
      [modulo]: value
    }));
  }
  async function salvarPermissoes() {
    if (!selecionado) return;
    if (!isAdmin) {
      setErro("Somente ADMIN pode alterar permissões.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      for (const modulo of MODULOS) {
        const nivel = formPermissoes[modulo] || "none";
        const existente = acessos.find(
          (a) => a.usuario_id === selecionado.id && a.modulo === modulo
        );
        if (!existente) {
          await supabase.from("modulo_acesso").insert({
            usuario_id: selecionado.id,
            modulo,
            permissao: nivel,
            ativo: nivel !== "none"
          });
        } else {
          await supabase.from("modulo_acesso").update({
            permissao: nivel,
            ativo: nivel !== "none"
          }).eq("id", existente.id);
        }
      }
      await registrarLog({
        user_id: usuarioLogadoId,
        acao: "permissoes_atualizadas",
        modulo: "Admin",
        detalhes: {
          usuario_alterado_id: selecionado.id,
          permissoes: formPermissoes
        }
      });
      await carregar();
      const u = usuarios.find((x) => x.id === selecionado.id) || null;
      if (u) abrirEditor(u);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar permissões.");
    } finally {
      setSalvando(false);
    }
  }
  async function toggleUsuarioAtivo(u) {
    try {
      const novo = !u.active;
      const { error } = await supabase.from("users").update({ active: novo }).eq("id", u.id);
      if (error) throw error;
      await registrarLog({
        user_id: usuarioLogadoId,
        acao: novo ? "usuario_ativado" : "usuario_bloqueado",
        modulo: "Admin",
        detalhes: { usuario_alterado_id: u.id }
      });
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao alterar status do usuário.");
    }
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Admin bloqueado." });
  }
  if (!isAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Somente usuários ADMIN podem gerenciar permissões." });
  }
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados de permissões..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "admin-permissoes-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar usuário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            value: busca,
            onChange: (e) => setBusca(e.target.value),
            placeholder: "Nome ou e-mail..."
          }
        )
      ] }) }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container mb-3 overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[780px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "E-mail" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        usuariosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum usuário encontrado." }) }),
        usuariosFiltrados.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.nome_completo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.email || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.active ? "Ativo" : "Bloqueado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: "Editar permissões",
                onClick: () => abrirEditor(u),
                children: "⚙️"
              }
            ),
            usuarioLogadoId !== u.id && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: `btn-icon ${u.active ? "btn-danger" : ""}`,
                title: u.active ? "Bloquear usuário" : "Reativar usuário",
                onClick: () => toggleUsuarioAtivo(u),
                children: u.active ? "🚫" : "✅"
              }
            )
          ] })
        ] }, u.id))
      ] })
    ] }) }),
    selecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { children: [
        "Permissões de:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600 }, children: selecionado.nome_completo })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[500px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Módulo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nível" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: MODULOS.map((modulo) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: modulo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              className: "form-select",
              value: formPermissoes[modulo] || "none",
              onChange: (e) => handleChangeNivel(modulo, e.target.value),
              children: NIVEIS.map((n) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: n.value, children: n.label }, n.value))
            }
          ) })
        ] }, modulo)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-primary",
            onClick: salvarPermissoes,
            disabled: salvando,
            children: salvando ? "Salvando..." : "Salvar permissões"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-light",
            style: { marginLeft: 8 },
            onClick: () => setSelecionado(null),
            children: "Fechar"
          }
        )
      ] })
    ] })
  ] });
}

const $$Permissoes = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = "Painel de Permiss\xF5es";
  return renderTemplate`${renderComponent($$result, "Layout", $$DashboardLayout, { "title": pageTitle, "module": "Admin" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">${pageTitle}</h1> ${renderComponent($$result2, "AdminPermissoesIsland", AdminPermissoesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgt-astro/src/components/islands/AdminPermissoesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/admin/permissoes.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/admin/permissoes.astro";
const $$url = "/admin/permissoes";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Permissoes,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
