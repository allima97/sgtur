globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout__E2c9QIl.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialForm = {
  nome: "",
  pais_id: ""
};
function EstadosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [paises, setPaises] = reactExports.useState([]);
  const [estados, setEstados] = reactExports.useState([]);
  const [form, setForm] = reactExports.useState(initialForm);
  const [busca, setBusca] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [editandoId, setEditandoId] = reactExports.useState(null);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [carregouTodos, setCarregouTodos] = reactExports.useState(false);
  async function carregarDados(todos = false) {
    try {
      setLoading(true);
      setErro(null);
      const [{ data: paisData, error: paisErr }, { data: estadoData, error: estErr }] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("estados").select("id, nome, pais_id, created_at").order(todos ? "nome" : "created_at", { ascending: !todos }).limit(todos ? void 0 : 10)
      ]);
      if (paisErr) throw paisErr;
      if (estErr) throw estErr;
      setPaises(paisData || []);
      setEstados(estadoData || []);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar estados.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    carregarDados(false);
  }, []);
  reactExports.useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarDados(true);
    }
  }, [busca, carregouTodos]);
  const estadosEnriquecidos = reactExports.useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return estados.map((e) => ({
      ...e,
      pais_nome: paisMap.get(e.pais_id) || ""
    }));
  }, [estados, paises]);
  const filtrados = reactExports.useMemo(() => {
    if (!busca.trim()) return estadosEnriquecidos;
    const termo = normalizeText(busca);
    return estadosEnriquecidos.filter(
      (e) => normalizeText(e.nome).includes(termo) || normalizeText(e.pais_nome).includes(termo)
    );
  }, [busca, estadosEnriquecidos]);
  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }
  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }
  function iniciarEdicao(estado) {
    setEditandoId(estado.id);
    setForm({
      nome: estado.nome,
      pais_id: estado.pais_id
    });
  }
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Você não tem permissão para salvar estados.");
      return;
    }
    if (!form.nome.trim() || !form.pais_id) {
      setErro("Preencha nome e país.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome.trim(),
        pais_id: form.pais_id
      };
      if (editandoId) {
        const { error } = await supabase.from("estados").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estados").insert(payload);
        if (error) throw error;
      }
      iniciarNovo();
      await carregarDados(carregouTodos);
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar estado.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir estados.");
      return;
    }
    if (!confirm("Excluir este estado?")) return;
    try {
      setExcluindoId(id);
      const { error } = await supabase.from("estados").delete().eq("id", id);
      if (error) throw error;
      await carregarDados(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir estado. Verifique se não existem cidades vinculadas.");
    } finally {
      setExcluindoId(null);
    }
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paises-page", children: "Carregando permissões..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paises-page", children: "Você não possui acesso ao módulo de Cadastros." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "paises-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome do estado *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              placeholder: "Ex: São Paulo, Califórnia..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "País *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.pais_id,
              onChange: (e) => handleChange("pais_id", e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                paises.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome }, p.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando || permissao === "view", children: salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar estado" }),
        editandoId && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: iniciarNovo, children: "Cancelar edição" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar estado" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Nome ou país..."
        }
      )
    ] }) }),
    !carregouTodos && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Últimos Estados Cadastrados (10). Digite na busca para consultar todos." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[640px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "País" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Carregando estados..." }) }),
        !loading && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum estado encontrado." }) }),
        !loading && filtrados.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.pais_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", title: "Editar", onClick: () => iniciarEdicao(e), children: "✏️" }),
            permissao === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluir(e.id),
                disabled: excluindoId === e.id,
                children: excluindoId === e.id ? "..." : "🗑️"
              }
            )
          ] }) })
        ] }, e.id))
      ] })
    ] }) })
  ] });
}

const $$Estados = createComponent(($$result, $$props, $$slots) => {
  const activePage = "estados";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Estados", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Estados", "subtitle": "Gerencie estados/prov\xEDncias vinculados a pa\xEDses.", "color": "blue" })} ${renderComponent($$result2, "EstadosIsland", EstadosIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/EstadosIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/estados.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/estados.astro";
const $$url = "/cadastros/estados";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Estados,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
