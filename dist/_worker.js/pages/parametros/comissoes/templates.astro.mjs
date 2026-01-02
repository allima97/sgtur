globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../../chunks/astro/server_Cob7n0Cm.mjs';
import { $ as $$DashboardLayout } from '../../../chunks/DashboardLayout_m0KiXmHP.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../../chunks/supabase_DZ5sCzw7.mjs';
import { a as reactExports } from '../../../chunks/_@astro-renderers_DxUIN8pq.mjs';
export { r as renderers } from '../../../chunks/_@astro-renderers_DxUIN8pq.mjs';
import { u as usePermissao } from '../../../chunks/usePermissao_B808B4Oq.mjs';
import { r as registrarLog } from '../../../chunks/logs_D7YAwHh5.mjs';
import { L as LoadingUsuarioContext } from '../../../chunks/LoadingUsuarioContext_B9z1wb0a.mjs';

const initialForm = {
  id: "",
  nome: "",
  descricao: "",
  modo: "FIXO",
  meta_nao_atingida: null,
  meta_atingida: null,
  super_meta: null,
  esc_ativado: false,
  esc_inicial_pct: null,
  esc_final_pct: null,
  esc_incremento_pct_meta: null,
  esc_incremento_pct_comissao: null,
  esc2_ativado: false,
  esc2_inicial_pct: null,
  esc2_final_pct: null,
  esc2_incremento_pct_meta: null,
  esc2_incremento_pct_comissao: null,
  ativo: true
};
function CommissionTemplatesIsland() {
  const { ativo: acessoAtivo, loading: loadingPerm } = usePermissao("Parametros");
  const [form, setForm] = reactExports.useState(initialForm);
  const [editId, setEditId] = reactExports.useState(null);
  const [lista, setLista] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [carregando, setCarregando] = reactExports.useState(true);
  const [sucesso, setSucesso] = reactExports.useState(null);
  reactExports.useEffect(() => {
    carregar();
  }, []);
  async function carregar() {
    try {
      setCarregando(true);
      setErro(null);
      setSucesso(null);
      const { data, error } = await supabase.from("commission_templates").select("*").order("nome", { ascending: true });
      if (error) throw error;
      setLista(data);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar templates.");
    } finally {
      setCarregando(false);
    }
  }
  const filtrados = reactExports.useMemo(() => {
    if (!busca.trim()) return lista;
    const t = busca.toLowerCase();
    return lista.filter(
      (x) => x.nome.toLowerCase().includes(t) || (x.descricao || "").toLowerCase().includes(t)
    );
  }, [lista, busca]);
  function handleChange(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  }
  async function salvar(e) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (form.modo === "FIXO") {
      if (!form.meta_nao_atingida && !form.meta_atingida && !form.super_meta) {
        setErro("Informe ao menos um percentual no modo Fixo.");
        return;
      }
    }
    try {
      setSalvando(true);
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao?.trim() || null,
        modo: form.modo,
        meta_nao_atingida: form.meta_nao_atingida,
        meta_atingida: form.meta_atingida,
        super_meta: form.super_meta,
        esc_ativado: form.esc_ativado,
        esc_inicial_pct: form.esc_inicial_pct,
        esc_final_pct: form.esc_final_pct,
        esc_incremento_pct_meta: form.esc_incremento_pct_meta,
        esc_incremento_pct_comissao: form.esc_incremento_pct_comissao,
        esc2_ativado: form.esc2_ativado,
        esc2_inicial_pct: form.esc2_inicial_pct,
        esc2_final_pct: form.esc2_final_pct,
        esc2_incremento_pct_meta: form.esc2_incremento_pct_meta,
        esc2_incremento_pct_comissao: form.esc2_incremento_pct_comissao,
        ativo: form.ativo
      };
      if (editId) {
        const { error } = await supabase.from("commission_templates").update(payload).eq("id", editId);
        if (error) throw error;
        await registrarLog({
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          acao: "template_comissao_atualizado",
          modulo: "Parametros",
          detalhes: { id: editId, payload }
        });
      } else {
        const { error } = await supabase.from("commission_templates").insert(payload);
        if (error) throw error;
        await registrarLog({
          user_id: (await supabase.auth.getUser()).data.user?.id || null,
          acao: "template_comissao_criado",
          modulo: "Parametros",
          detalhes: { payload }
        });
      }
      await carregar();
      iniciarNovo();
      setSucesso("Template salvo com sucesso.");
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar template.");
    } finally {
      setSalvando(false);
    }
  }
  function iniciarNovo() {
    setEditId(null);
    setForm(initialForm);
  }
  function iniciarEdicao(t) {
    setEditId(t.id);
    setForm(t);
    setSucesso(null);
    setErro(null);
  }
  async function excluir(id) {
    if (!window.confirm("Excluir este template?")) return;
    try {
      const { error } = await supabase.from("commission_templates").delete().eq("id", id);
      if (error) throw error;
      await registrarLog({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        acao: "template_comissao_excluido",
        modulo: "Parametros",
        detalhes: { id }
      });
      await carregar();
    } catch (e) {
      setErro("Erro ao excluir template.");
    }
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!acessoAtivo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso bloqueado ao módulo Parâmetros." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "commission-templates-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Modo *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.modo,
              onChange: (e) => handleChange("modo", e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "FIXO", children: "Fixo" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ESCALONAVEL", children: "Escalonável" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.ativo ? "true" : "false",
              onChange: (e) => handleChange("ativo", e.target.value === "true"),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
              ]
            }
          )
        ] })
      ] }),
      form.modo === "FIXO" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "% Não atingida" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              value: form.meta_nao_atingida ?? "",
              min: 0,
              step: "0.1",
              onChange: (e) => handleChange(
                "meta_nao_atingida",
                e.target.value ? Number(e.target.value) : null
              )
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "% Atingida" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              value: form.meta_atingida ?? "",
              min: 0,
              step: "0.1",
              onChange: (e) => handleChange(
                "meta_atingida",
                e.target.value ? Number(e.target.value) : null
              )
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "% Super Meta" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              value: form.super_meta ?? "",
              min: 0,
              step: "0.1",
              onChange: (e) => handleChange(
                "super_meta",
                e.target.value ? Number(e.target.value) : null
              )
            }
          )
        ] })
      ] }),
      form.modo === "ESCALONAVEL" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-2", children: "Escalonamento 1" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativado?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: form.esc_ativado ? "true" : "false",
                onChange: (e) => handleChange("esc_ativado", e.target.value === "true"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Inicial %" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc_inicial_pct ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc_inicial_pct",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Final %" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc_final_pct ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc_final_pct",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Incremento % Meta" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc_incremento_pct_meta ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc_incremento_pct_meta",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Incremento % Comissão" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc_incremento_pct_comissao ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc_incremento_pct_comissao",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mt-2", children: "Escalonamento 2" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativado?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: form.esc2_ativado ? "true" : "false",
                onChange: (e) => handleChange("esc2_ativado", e.target.value === "true"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Inicial %" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc2_inicial_pct ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc2_inicial_pct",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Final %" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc2_final_pct ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc2_final_pct",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Incremento % Meta" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc2_incremento_pct_meta ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc2_incremento_pct_meta",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Incremento % Comissão" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: form.esc2_incremento_pct_comissao ?? "",
                min: 0,
                step: "0.1",
                onChange: (e) => handleChange(
                  "esc2_incremento_pct_comissao",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Descrição" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: form.descricao || "",
            onChange: (e) => handleChange("descricao", e.target.value)
          }
        )
      ] }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config mb-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Erro:" }),
        " ",
        erro
      ] }),
      sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-green mb-2", children: sucesso }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : editId ? "Salvar alterações" : "Criar template" }),
      editId && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn-light",
          style: { marginLeft: 8 },
          onClick: iniciarNovo,
          children: "Cancelar"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar template" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Busque por nome ou descrição..."
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[820px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Modo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        carregando && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Carregando templates..." }) }),
        !carregando && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum template encontrado." }) }),
        !carregando && filtrados.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t.modo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t.ativo ? "Sim" : "Não" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: "Editar",
                onClick: () => iniciarEdicao(t),
                children: "✏️"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluir(t.id),
                children: "🗑️"
              }
            )
          ] })
        ] }, t.id))
      ] })
    ] }) })
  ] });
}

const $$Templates = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = "Templates de Comiss\xE3o";
  return renderTemplate`${renderComponent($$result, "Layout", $$DashboardLayout, { "title": pageTitle, "module": "Parametros" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">${pageTitle}</h1> ${renderComponent($$result2, "CommissionTemplatesIsland", CommissionTemplatesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/CommissionTemplatesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/comissoes/templates.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/comissoes/templates.astro";
const $$url = "/parametros/comissoes/templates";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Templates,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
