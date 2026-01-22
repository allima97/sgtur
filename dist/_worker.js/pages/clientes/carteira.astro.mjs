globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_Ck_yWTiO.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { c as construirLinkWhatsApp } from '../../chunks/whatsapp_C20KyoZc.mjs';

function ClientesConsultaIsland() {
  const { permissao, loading: loadingPerm, ativo } = usePermissao("Clientes");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "admin";
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [clientes, setClientes] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let mounted = true;
    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !mounted) return;
        const { data, error } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        if (error) {
          console.error(error);
          return;
        }
        if (!mounted) return;
        setCompanyId(data?.company_id || null);
      } catch (e) {
        console.error(e);
      }
    }
    resolveCompany();
    return () => {
      mounted = false;
    };
  }, []);
  async function carregar() {
    if (!podeVer || !companyId) return;
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase.from("clientes").select("id, nome, cpf, telefone, email, whatsapp, company_id").eq("company_id", companyId).order("nome", { ascending: true });
      if (error) throw error;
      setClientes(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (!loadingPerm && podeVer && companyId) carregar();
  }, [loadingPerm, podeVer, companyId]);
  const filtrados = reactExports.useMemo(() => {
    const q = (busca || "").toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(
      (c) => (c.nome || "").toLowerCase().includes(q) || (c.cpf || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
    );
  }, [clientes, busca]);
  const podeEditar = permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = permissao === "delete" || permissao === "admin";
  async function excluirCliente(id) {
    if (!podeExcluir) {
      window.alert("Você não tem permissão para excluir clientes.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este cliente?")) return;
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      setClientes((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      window.alert("Erro ao excluir cliente.");
    }
  }
  async function editarCliente(id, atualNome) {
    if (!podeEditar) {
      window.alert("Você não tem permissão para editar clientes.");
      return;
    }
    const novo = window.prompt("Editar nome do cliente:", atualNome);
    if (!novo || novo.trim() === atualNome) return;
    try {
      const { error } = await supabase.from("clientes").update({ nome: novo.trim() }).eq("id", id);
      if (error) throw error;
      setClientes((prev) => prev.map((c) => c.id === id ? { ...c, nome: novo.trim() } : c));
    } catch (e) {
      console.error(e);
      window.alert("Erro ao editar cliente.");
    }
  }
  function abrirHistorico(id, nome) {
    window.alert(`Abrir histórico do cliente: ${nome || id}`);
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "clientes-page", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: "Carregando contexto..." }) });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "clientes-page", children: "Você não possui acesso ao módulo de Clientes." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `clientes-page${podeCriar ? " has-mobile-actionbar" : ""}`, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3 list-toolbar-sticky", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: busca, onChange: (e) => setBusca(e.target.value), placeholder: "Nome, CPF ou e-mail" })
      ] }),
      podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden sm:flex sm:items-end sm:ml-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/clientes/cadastro?novo=1", className: "btn btn-primary", children: "Adicionar cliente" }) })
    ] }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue clientes-table table-mobile-cards", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "E-mail" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", style: { textAlign: "center" }, children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Carregando..." }) }),
        !loading && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum cliente encontrado." }) }),
        !loading && filtrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Nome", children: c.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "CPF", children: c.cpf }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Telefone", children: c.telefone || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "E-mail", children: c.email || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", "data-label": "Ações", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "action-buttons", children: [
            (() => {
              const whatsappLink = construirLinkWhatsApp(c.whatsapp || c.telefone || "");
              if (whatsappLink) {
                return /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn-icon", href: whatsappLink, title: "Abrir WhatsApp", target: "_blank", rel: "noreferrer", children: "💬" });
              }
              return null;
            })(),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", onClick: () => abrirHistorico(c.id, c.nome), title: "Histórico", children: "🗂️" }),
            podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", onClick: () => editarCliente(c.id, c.nome), title: "Editar", children: "✏️" }),
            podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon btn-danger", onClick: () => excluirCliente(c.id), title: "Excluir", children: "🗑️" })
          ] }) })
        ] }, c.id))
      ] })
    ] }) }),
    podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-actionbar sm:hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "/clientes/cadastro?novo=1", className: "btn btn-primary", children: "Adicionar cliente" }) })
  ] });
}

const $$Carteira = createComponent(($$result, $$props, $$slots) => {
  const activePage = "clientes";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Carteira de Clientes", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Carteira de Clientes", "subtitle": "Gerencie seus clientes com vis\xE3o de CRM.", "color": "blue" })} ${renderComponent($$result2, "ClientesConsultaIsland", ClientesConsultaIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ClientesConsultaIsland.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/clientes/carteira.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/clientes/carteira.astro";
const $$url = "/clientes/carteira";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Carteira,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
