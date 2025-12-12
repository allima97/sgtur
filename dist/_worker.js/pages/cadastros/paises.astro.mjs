globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B4UzsGdb.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';
import { t as titleCaseWithExceptions } from '../../chunks/titleCase_DEDuDeMf.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialForm = {
  nome: "",
  codigo_iso: "",
  continente: ""
};
function PaisesIsland() {
  const [paises, setPaises] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [busca, setBusca] = reactExports.useState("");
  const [form, setForm] = reactExports.useState(initialForm);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [editandoId, setEditandoId] = reactExports.useState(null);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [carregouTodos, setCarregouTodos] = reactExports.useState(false);
  async function carregarPaises(todos = false) {
    try {
      setLoading(true);
      setErro(null);
      const query = supabase.from("paises").select("id, nome, codigo_iso, continente, created_at").order(todos ? "nome" : "created_at", { ascending: !todos }).limit(todos ? void 0 : 10);
      const { data, error } = await query;
      if (error) throw error;
      setPaises(data || []);
      setCarregouTodos(todos || false);
    } catch (e) {
      console.error(e);
      setErro(
        "Erro ao carregar países. Verifique se a tabela 'paises' existe e se as colunas estão corretas."
      );
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    carregarPaises(false);
  }, []);
  reactExports.useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarPaises(true);
    }
  }, [busca, carregouTodos]);
  const paisesFiltrados = reactExports.useMemo(() => {
    if (!busca.trim()) return paises;
    const termo = normalizeText(busca);
    return paises.filter((p) => normalizeText(p.nome).includes(termo));
  }, [busca, paises]);
  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }
  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }
  function iniciarEdicao(pais) {
    setEditandoId(pais.id);
    setForm({
      nome: pais.nome,
      codigo_iso: pais.codigo_iso || "",
      continente: pais.continente || ""
    });
  }
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Você não tem permissão para salvar países.");
      return;
    }
    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const nomeNormalizado = titleCaseWithExceptions(form.nome);
      if (editandoId) {
        const { error } = await supabase.from("paises").update({
          nome: nomeNormalizado,
          codigo_iso: form.codigo_iso.trim() || null,
          continente: form.continente.trim() || null
        }).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("paises").insert({
          nome: nomeNormalizado,
          codigo_iso: form.codigo_iso.trim() || null,
          continente: form.continente.trim() || null
        });
        if (error) throw error;
      }
      setForm(initialForm);
      setEditandoId(null);
      await carregarPaises(carregouTodos);
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar país. Verifique se o nome é único.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (permissao !== "admin") {
      window.alert("Somente administradores podem excluir países.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este país?")) return;
    try {
      setExcluindoId(id);
      setErro(null);
      const { error } = await supabase.from("paises").delete().eq("id", id);
      if (error) throw error;
      await carregarPaises(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro(
        "Não foi possível excluir o país. Verifique se não existem destinos vinculados."
      );
    } finally {
      setExcluindoId(null);
    }
  }
  if (loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paises-page", children: "Carregando permissões..." });
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paises-page", children: "Você não possui acesso ao módulo de Cadastros." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "paises-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome do país *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              onBlur: (e) => handleChange("nome", titleCaseWithExceptions(e.target.value)),
              placeholder: "Ex: Brasil, Estados Unidos, França..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Código ISO" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.codigo_iso,
              onChange: (e) => handleChange("codigo_iso", e.target.value),
              placeholder: "Ex: BR, US, FR..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Continente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.continente,
              onChange: (e) => handleChange("continente", e.target.value),
              placeholder: "Ex: América do Sul, Europa..."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "btn btn-primary",
            disabled: salvando || permissao === "view",
            children: salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar país"
          }
        ),
        editandoId && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: iniciarNovo,
            children: "Cancelar edição"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar país" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Digite parte do nome..."
        }
      )
    ] }) }) }),
    !carregouTodos && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Últimos Países Cadastrados (10). Digite na busca para consultar todos." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[520px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Código ISO" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Continente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Carregando países..." }) }),
        !loading && paisesFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhum país encontrado." }) }),
        !loading && paisesFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.codigo_iso || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.continente || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: "Editar",
                onClick: () => iniciarEdicao(p),
                children: "✏️"
              }
            ),
            permissao === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluir(p.id),
                disabled: excluindoId === p.id,
                children: excluindoId === p.id ? "..." : "🗑️"
              }
            )
          ] }) })
        ] }, p.id))
      ] })
    ] }) })
  ] });
}

const $$Paises = createComponent(($$result, $$props, $$slots) => {
  const activePage = "paises";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Pa\xEDses", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Pa\xEDses", "subtitle": "Gerencie a base de pa\xEDses utilizada nos destinos.", "color": "blue" })} ${renderComponent($$result2, "PaisesIsland", PaisesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/PaisesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/paises.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/paises.astro";
const $$url = "/cadastros/paises";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Paises,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
