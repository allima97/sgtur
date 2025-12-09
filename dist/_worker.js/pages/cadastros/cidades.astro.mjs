globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_Bfm88K_S.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_BpuKPjcn.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';

const initialForm = {
  nome: "",
  pais_id: "",
  estado_provincia: "",
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
  const [cidades, setCidades] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [form, setForm] = reactExports.useState(initialForm);
  const [editId, setEditId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  async function carregar() {
    if (!podeVer) return;
    try {
      setLoading(true);
      const [{ data: paisesData }, { data: cidadesData }] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("cidades").select("*").order("nome")
      ]);
      setPaises(paisesData || []);
      setCidades(cidadesData || []);
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
    carregar();
  }, [carregando, podeVer]);
  const filtradas = reactExports.useMemo(() => {
    if (!busca.trim()) return cidades;
    const t = busca.toLowerCase();
    return cidades.filter(
      (c) => c.nome.toLowerCase().includes(t) || (paises.find((p) => p.id === c.pais_id)?.nome.toLowerCase() || "").includes(t)
    );
  }, [busca, cidades, paises]);
  function handleChange(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }
  function iniciarEdicao(c) {
    if (!podeEditar) return;
    setEditId(c.id);
    setForm({
      nome: c.nome,
      pais_id: c.pais_id,
      estado_provincia: c.estado_provincia || "",
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
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome,
        pais_id: form.pais_id,
        estado_provincia: form.estado_provincia || null,
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
      carregar();
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
      carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir cidade (provavelmente usada em Destinos).");
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "País *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.pais_id,
              onChange: (e) => handleChange("pais_id", e.target.value),
              required: true,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                paises.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome }, p.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Estado/Província" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.estado_provincia,
              onChange: (e) => handleChange("estado_provincia", e.target.value)
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
          placeholder: "Nome ou país...",
          value: busca,
          onChange: (e) => setBusca(e.target.value)
        }
      )
    ] }) }) }),
    carregando && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-info mb-3", children: "Carregando permissões..." }),
    !carregando && erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[720px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Estado/Prov." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "País" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criada em" }),
        (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Carregando..." }) }),
        !loading && filtradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma cidade encontrada." }) }),
        !loading && filtradas.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.estado_provincia || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: paises.find((p) => p.id === c.pais_id)?.nome || "—" }),
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
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Cidades", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Cidades", "subtitle": "Gerencie a base de cidades utilizada nos destinos.", "color": "blue" })} ${renderComponent($$result2, "CidadesIsland", CidadesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgt-astro/src/components/islands/CidadesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/cadastros/cidades.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgt-astro/src/pages/cadastros/cidades.astro";
const $$url = "/cadastros/cidades";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cidades,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
