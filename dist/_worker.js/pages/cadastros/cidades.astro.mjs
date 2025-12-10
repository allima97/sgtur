globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout__E2c9QIl.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialForm = {
  nome: "",
  estado_id: "",
  descricao: ""
};
function CidadesIsland() {
  const permCidade = usePermissao("Cidades");
  const permCadastros = usePermissao("Cadastros");
  const isAdmin = permCidade.isAdmin || permCadastros.isAdmin;
  const carregando = permCidade.loading || permCadastros.loading;
  const permissao = isAdmin ? "admin" : permCidade.permissao !== "none" ? permCidade.permissao : permCadastros.permissao;
  const podeVer = isAdmin || permissao !== "none";
  const podeCriar = isAdmin || permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar = isAdmin || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = isAdmin || permissao === "delete" || permissao === "admin";
  const [paises, setPaises] = reactExports.useState([]);
  const [estados, setEstados] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [form, setForm] = reactExports.useState(initialForm);
  const [editId, setEditId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [carregouTodos, setCarregouTodos] = reactExports.useState(false);
  async function carregar(todos = false) {
    if (!podeVer) return;
    async function carregarCidades() {
      if (todos) {
        const todas = [];
        const pageSize = 1e3;
        let from = 0;
        while (true) {
          const { data, error } = await supabase.from("cidades").select("id, nome, estado_id, descricao, created_at").order("nome").range(from, from + pageSize - 1);
          if (error) throw error;
          todas.push(...data || []);
          if (!data || data.length < pageSize) break;
          from += pageSize;
        }
        return todas;
      } else {
        const { data, error } = await supabase.from("cidades").select("id, nome, estado_id, descricao, created_at").order("created_at", { ascending: false }).limit(10);
        if (error) throw error;
        return data || [];
      }
    }
    try {
      setLoading(true);
      const [{ data: paisesData }, { data: estadosData }, cidadesData] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("estados").select("id, nome, pais_id").order("nome"),
        carregarCidades()
      ]);
      setPaises(paisesData || []);
      setEstados(estadosData || []);
      setCidades(cidadesData || []);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar cidades.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (carregando) return;
    if (!podeVer) {
      setLoading(false);
      return;
    }
    carregar(false);
  }, [carregando, podeVer]);
  reactExports.useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregar(true);
    }
  }, [busca, carregouTodos]);
  const cidadesEnriquecidas = reactExports.useMemo(() => {
    const estadoMap = new Map(estados.map((e) => [e.id, e]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    return cidades.map((c) => {
      const estado = estadoMap.get(c.estado_id);
      const pais = estado ? paisMap.get(estado.pais_id) : void 0;
      return {
        ...c,
        estado_nome: estado?.nome || "",
        pais_nome: pais?.nome || ""
      };
    });
  }, [cidades, estados, paises]);
  const filtradas = reactExports.useMemo(() => {
    if (!busca.trim()) return cidadesEnriquecidas;
    const t = normalizeText(busca);
    return cidadesEnriquecidas.filter(
      (c) => normalizeText(c.nome).includes(t) || normalizeText(c.estado_nome).includes(t) || normalizeText(c.pais_nome).includes(t)
    );
  }, [busca, cidadesEnriquecidas]);
  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function iniciarEdicao(c) {
    if (!podeEditar) return;
    setEditId(c.id);
    setForm({
      nome: c.nome,
      estado_id: c.estado_id,
      descricao: c.descricao || ""
    });
  }
  function iniciarNovo() {
    if (!podeCriar) return;
    setEditId(null);
    setForm(initialForm);
  }
  async function salvar(e) {
    e.preventDefault();
    if (!podeCriar && !podeEditar) return;
    if (!form.estado_id) {
      setErro("Estado é obrigatório.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome,
        estado_id: form.estado_id,
        descricao: form.descricao || null
      };
      if (editId) {
        const { error } = await supabase.from("cidades").update(payload).eq("id", editId);
        if (error) throw error;
        await registrarLog({
          user_id: null,
          acao: "cidade_editada",
          modulo: "Cadastros",
          detalhes: { id: editId, payload }
        });
      } else {
        const { error } = await supabase.from("cidades").insert(payload);
        if (error) throw error;
        await registrarLog({
          user_id: null,
          acao: "cidade_criada",
          modulo: "Cadastros",
          detalhes: payload
        });
      }
      iniciarNovo();
      carregar(carregouTodos);
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar cidade.");
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (!podeExcluir) return;
    if (!confirm("Excluir cidade?")) return;
    try {
      setExcluindoId(id);
      const { error } = await supabase.from("cidades").delete().eq("id", id);
      if (error) throw error;
      await registrarLog({
        user_id: null,
        acao: "cidade_excluida",
        modulo: "Cadastros",
        detalhes: { id }
      });
      carregar(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir cidade (provavelmente usada em produtos/destinos).");
    } finally {
      setExcluindoId(null);
    }
  }
  if (!podeVer && !isAdmin) {
    if (carregando) {
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-info", children: "Carregando permissões..." });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: "Você não possui permissão para visualizar Cidades." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "cidades-page", children: [
    (podeCriar || podeEditar) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: editId ? "Editar cidade" : "Nova cidade" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              required: true
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Estado *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.estado_id,
              onChange: (e) => handleChange("estado_id", e.target.value),
              required: true,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione o estado" }),
                estados.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: e.id, children: [
                  e.nome,
                  " — ",
                  paises.find((p) => p.id === e.pais_id)?.nome || "Sem país"
                ] }, e.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Descrição" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: form.descricao,
            onChange: (e) => handleChange("descricao", e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : editId ? "Salvar alterações" : "Adicionar cidade" }),
        editId && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: iniciarNovo, children: "Cancelar" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar cidade" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          placeholder: "Nome, estado ou país...",
          value: busca,
          onChange: (e) => setBusca(e.target.value)
        }
      )
    ] }) }) }),
    carregando && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-info mb-3", children: "Carregando permissões..." }),
    !carregando && erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    !carregouTodos && !erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Últimas Cidades Cadastradas (10). Digite na busca para consultar todas." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[720px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "País" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criada em" }),
        (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Carregando..." }) }),
        !loading && filtradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma cidade encontrada." }) }),
        !loading && filtradas.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.estado_nome || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.pais_nome || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.created_at ? c.created_at.slice(0, 10) : "—" }),
          (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                onClick: () => iniciarEdicao(c),
                title: "Editar",
                children: "✏️"
              }
            ),
            podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                onClick: () => excluir(c.id),
                disabled: excluindoId === c.id,
                title: "Excluir",
                children: excluindoId === c.id ? "..." : "🗑️"
              }
            )
          ] })
        ] }, c.id))
      ] })
    ] }) })
  ] });
}

const $$Cidades = createComponent(($$result, $$props, $$slots) => {
  const activePage = "cidades";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Cidades", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Cidades", "subtitle": "Gerencie a base de cidades utilizada nos destinos.", "color": "blue" })} ${renderComponent($$result2, "CidadesIsland", CidadesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/CidadesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/cidades.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/cidades.astro";
const $$url = "/cadastros/cidades";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cidades,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
