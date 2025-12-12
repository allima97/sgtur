globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_CwEMmlUN.mjs';
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
  pais_id: "",
  codigo_admin1: "",
  tipo: ""
};
function SubdivisoesIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [paises, setPaises] = reactExports.useState([]);
  const [subdivisoes, setSubdivisoes] = reactExports.useState([]);
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
      const [{ data: paisData, error: paisErr }, { data: subdivisaoData, error: subErr }] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("subdivisoes").select("id, nome, pais_id, codigo_admin1, tipo, created_at").order(todos ? "nome" : "created_at", { ascending: !todos }).limit(todos ? void 0 : 10)
      ]);
      if (paisErr) throw paisErr;
      if (subErr) throw subErr;
      setPaises(paisData || []);
      setSubdivisoes(subdivisaoData || []);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar subdivisoes.");
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
  const subdivisoesEnriquecidas = reactExports.useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return subdivisoes.map((s) => ({
      ...s,
      pais_nome: paisMap.get(s.pais_id) || ""
    }));
  }, [subdivisoes, paises]);
  const filtrados = reactExports.useMemo(() => {
    if (!busca.trim()) return subdivisoesEnriquecidas;
    const termo = normalizeText(busca);
    return subdivisoesEnriquecidas.filter(
      (s) => normalizeText(s.nome).includes(termo) || normalizeText(s.pais_nome).includes(termo) || normalizeText(s.codigo_admin1).includes(termo)
    );
  }, [busca, subdivisoesEnriquecidas]);
  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }
  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }
  function iniciarEdicao(subdivisao) {
    setEditandoId(subdivisao.id);
    setForm({
      nome: subdivisao.nome,
      pais_id: subdivisao.pais_id,
      codigo_admin1: subdivisao.codigo_admin1,
      tipo: subdivisao.tipo || ""
    });
  }
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Voce nao tem permissao para salvar subdivisoes.");
      return;
    }
    if (!form.nome.trim() || !form.pais_id || !form.codigo_admin1.trim()) {
      setErro("Preencha nome, codigo e pais.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: titleCaseWithExceptions(form.nome),
        pais_id: form.pais_id,
        codigo_admin1: form.codigo_admin1.trim(),
        tipo: form.tipo.trim() || null
      };
      if (editandoId) {
        const { error } = await supabase.from("subdivisoes").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subdivisoes").insert(payload);
        if (error) throw error;
      }
      iniciarNovo();
      await carregarDados(carregouTodos);
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar subdivisao.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir subdivisoes.");
      return;
    }
    if (!confirm("Excluir esta subdivisao?")) return;
    try {
      setExcluindoId(id);
      const { error } = await supabase.from("subdivisoes").delete().eq("id", id);
      if (error) throw error;
      await carregarDados(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir subdivisao. Verifique se nao existem cidades vinculadas.");
    } finally {
      setExcluindoId(null);
    }
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paises-page", children: "Carregando permissoes..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "paises-page", children: "Voce nao possui acesso ao modulo de Cadastros." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "paises-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome da subdivisao *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              onBlur: (e) => handleChange("nome", titleCaseWithExceptions(e.target.value)),
              placeholder: "Ex: Sao Paulo, California..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Codigo admin1 *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.codigo_admin1,
              onChange: (e) => handleChange("codigo_admin1", e.target.value),
              placeholder: "Ex: SP, CA, NY..."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.tipo,
              onChange: (e) => handleChange("tipo", e.target.value),
              placeholder: "Ex: Estado, Provincia, Regiao..."
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Pais *" }),
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
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando || permissao === "view", children: salvando ? "Salvando..." : editandoId ? "Salvar alteracoes" : "Adicionar Estado/Província" }),
        editandoId && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: iniciarNovo, children: "Cancelar edicao" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar subdivisao" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Nome, pais ou codigo..."
        }
      )
    ] }) }),
    !carregouTodos && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Ultimas Subdivisoes Cadastradas (10). Digite na busca para consultar todas." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[720px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Subdivisao" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Codigo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Pais" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Acoes" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Carregando subdivisoes..." }) }),
        !loading && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhuma subdivisao encontrada." }) }),
        !loading && filtrados.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.codigo_admin1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.pais_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.tipo || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", title: "Editar", onClick: () => iniciarEdicao(s), children: "✏️" }),
            permissao === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluir(s.id),
                disabled: excluindoId === s.id,
                children: excluindoId === s.id ? "..." : "🗑️"
              }
            )
          ] }) })
        ] }, s.id))
      ] })
    ] }) })
  ] });
}

const $$Estados = createComponent(($$result, $$props, $$slots) => {
  const activePage = "subdivisoes";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Estados/Prov\xEDncias", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Estados/Prov\xEDncias", "subtitle": "Gerencie estados/prov\xEDncias vinculados a pa\xEDses.", "color": "blue" })} ${renderComponent($$result2, "SubdivisoesIsland", SubdivisoesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/EstadosIsland.tsx", "client:component-export": "default" })} ` })}`;
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
