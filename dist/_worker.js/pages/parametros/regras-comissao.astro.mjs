globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                         */
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_BFfFlWsu.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_ChD594_G.mjs';
import { r as registrarLog } from '../../chunks/logs_D3Eb6w9w.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_XbJI-A09.mjs';

const emptyRule = {
  id: "",
  nome: "",
  descricao: "",
  tipo: "GERAL",
  meta_nao_atingida: 0,
  meta_atingida: 0,
  super_meta: 0,
  ativo: true,
  tiers: []
};
function CommissionRulesIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const podeEditar = permissao === "admin" || permissao === "edit";
  const [rules, setRules] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState(emptyRule);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [editId, setEditId] = reactExports.useState(null);
  const [erroValidacao, setErroValidacao] = reactExports.useState(null);
  reactExports.useEffect(() => {
    carregar();
  }, []);
  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase.from("commission_rule").select("*, commission_tier(*)").order("created_at", { ascending: false });
      if (error) throw error;
      setRules(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar regras de comissão.");
    } finally {
      setLoading(false);
    }
  }
  function handleChange(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }
  function addTier(faixa) {
    setForm((prev) => ({
      ...prev,
      tiers: [
        ...prev.tiers || [],
        { faixa, de_pct: 0, ate_pct: 0, inc_pct_meta: 0, inc_pct_comissao: 0 }
      ]
    }));
  }
  function updateTier(idx, campo, valor) {
    setForm((prev) => {
      const list = [...prev.tiers || []];
      list[idx][campo] = valor;
      return { ...prev, tiers: list };
    });
  }
  function removeTier(idx) {
    setForm((prev) => ({
      ...prev,
      tiers: (prev.tiers || []).filter((_, i) => i !== idx)
    }));
  }
  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) return;
    setErroValidacao(null);
    if (!form.nome.trim()) {
      setErro("Informe o nome da regra.");
      return;
    }
    if (form.tipo === "ESCALONAVEL") {
      if (!form.tiers || form.tiers.length === 0) {
        setErroValidacao("Adicione pelo menos uma faixa PRE ou POS.");
        return;
      }
      for (const t of form.tiers) {
        if (t.de_pct > t.ate_pct) {
          setErroValidacao("Em uma faixa, o valor inicial não pode ser maior que o final.");
          return;
        }
      }
      const faixas = ["PRE", "POS"];
      for (const faixa of faixas) {
        const lista = (form.tiers || []).filter((t) => t.faixa === faixa).sort((a, b) => a.de_pct - b.de_pct);
        for (let i = 1; i < lista.length; i++) {
          const prev = lista[i - 1];
          const curr = lista[i];
          if (prev.ate_pct > curr.de_pct) {
            setErroValidacao(
              `Faixas ${faixa} sobrepostas: finalize a faixa anterior em ${prev.ate_pct}% antes de iniciar ${curr.de_pct}%.`
            );
            return;
          }
        }
      }
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao || null,
        tipo: form.tipo,
        meta_nao_atingida: form.meta_nao_atingida ?? 0,
        meta_atingida: form.meta_atingida ?? 0,
        super_meta: form.super_meta ?? 0,
        ativo: form.ativo
      };
      let regraId = editId;
      if (editId) {
        const { error } = await supabase.from("commission_rule").update(payload).eq("id", editId);
        if (error) throw error;
        regraId = editId;
      } else {
        const { data, error } = await supabase.from("commission_rule").insert(payload).select("id").single();
        if (error) throw error;
        regraId = data?.id;
      }
      if (regraId) {
        await supabase.from("commission_tier").delete().eq("rule_id", regraId);
        if (form.tiers && form.tiers.length > 0) {
          const tiers = form.tiers.map((t) => ({
            rule_id: regraId,
            faixa: t.faixa,
            de_pct: Number(t.de_pct) || 0,
            ate_pct: Number(t.ate_pct) || 0,
            inc_pct_meta: Number(t.inc_pct_meta) || 0,
            inc_pct_comissao: Number(t.inc_pct_comissao) || 0,
            ativo: true
          }));
          const { error: tierErr } = await supabase.from("commission_tier").insert(tiers);
          if (tierErr) throw tierErr;
        }
      }
      await registrarLog({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        acao: editId ? "commission_rule_editada" : "commission_rule_criada",
        modulo: "Parametros",
        detalhes: payload
      });
      setForm(emptyRule);
      setEditId(null);
      await carregar();
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar regra.");
    } finally {
      setSalvando(false);
    }
  }
  async function inativar(id) {
    if (!podeEditar) return;
    if (!confirm("Inativar esta regra?")) return;
    const { error } = await supabase.from("commission_rule").update({ ativo: false }).eq("id", id);
    if (!error) carregar();
  }
  async function excluirRegra(id) {
    if (!podeEditar) return;
    if (!confirm("Excluir permanentemente esta regra?")) return;
    const { error: tierErr } = await supabase.from("commission_tier").delete().eq("rule_id", id);
    if (tierErr) {
      setErro("Erro ao excluir faixas da regra.");
      return;
    }
    const { error } = await supabase.from("commission_rule").delete().eq("id", id);
    if (error) {
      setErro("Erro ao excluir regra.");
      return;
    }
    await registrarLog({
      user_id: (await supabase.auth.getUser()).data.user?.id || null,
      acao: "commission_rule_excluida",
      modulo: "Parametros",
      detalhes: { id }
    });
    carregar();
  }
  function editar(regra) {
    setEditId(regra.id);
    setForm({
      id: regra.id,
      nome: regra.nome,
      descricao: regra.descricao || "",
      tipo: regra.tipo,
      meta_nao_atingida: regra.meta_nao_atingida ?? 0,
      meta_atingida: regra.meta_atingida ?? 0,
      super_meta: regra.super_meta ?? 0,
      ativo: regra.ativo,
      tiers: regra.tipo === "ESCALONAVEL" ? regra.commission_tier?.map((t) => ({
        faixa: t.faixa,
        de_pct: t.de_pct,
        ate_pct: t.ate_pct,
        inc_pct_meta: t.inc_pct_meta,
        inc_pct_comissao: t.inc_pct_comissao
      })) || [] : []
    });
  }
  if (loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: "Acesso negado ao módulo de Parâmetros." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 6 }, children: "Regras de Comissionamento" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { marginTop: 0, marginBottom: 12, color: "#475569", fontSize: "0.9rem" }, children: "Configure regras gerais ou escalonadas usadas em produtos e metas." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    erroValidacao && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erroValidacao }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              required: true,
              disabled: !podeEditar
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.tipo,
              onChange: (e) => handleChange("tipo", e.target.value === "ESCALONAVEL" ? "ESCALONAVEL" : "GERAL"),
              disabled: !podeEditar,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "GERAL", children: "Geral (percentuais fixos)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "ESCALONAVEL", children: "Escalonável (faixas)" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Meta não atingida (%)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: form.meta_nao_atingida,
              onChange: (e) => handleChange("meta_nao_atingida", Number(e.target.value)),
              disabled: !podeEditar
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Meta atingida (%)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: form.meta_atingida,
              onChange: (e) => handleChange("meta_atingida", Number(e.target.value)),
              disabled: !podeEditar
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Super meta (%)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: form.super_meta,
              onChange: (e) => handleChange("super_meta", Number(e.target.value)),
              disabled: !podeEditar
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
            rows: 2,
            value: form.descricao || "",
            onChange: (e) => handleChange("descricao", e.target.value),
            disabled: !podeEditar
          }
        )
      ] }),
      form.tipo === "ESCALONAVEL" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-2", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { margin: 0 }, children: "Faixas (PRE/POS)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: () => addTier("PRE"), disabled: !podeEditar, children: "+ Faixa PRE" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: () => addTier("POS"), disabled: !podeEditar, children: "+ Faixa POS" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[800px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Faixa" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "De (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Até (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Inc. Meta (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Inc. Comissão (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            (!form.tiers || form.tiers.length === 0) && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhuma faixa adicionada." }) }),
            form.tiers?.map((t, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: t.faixa }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "number",
                  step: "0.01",
                  value: t.de_pct,
                  onChange: (e) => updateTier(idx, "de_pct", Number(e.target.value)),
                  disabled: !podeEditar
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "number",
                  step: "0.01",
                  value: t.ate_pct,
                  onChange: (e) => updateTier(idx, "ate_pct", Number(e.target.value)),
                  disabled: !podeEditar
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "number",
                  step: "0.01",
                  value: t.inc_pct_meta,
                  onChange: (e) => updateTier(idx, "inc_pct_meta", Number(e.target.value)),
                  disabled: !podeEditar
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "number",
                  step: "0.01",
                  value: t.inc_pct_comissao,
                  onChange: (e) => updateTier(idx, "inc_pct_comissao", Number(e.target.value)),
                  disabled: !podeEditar
                }
              ) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "btn-icon btn-danger",
                  onClick: () => removeTier(idx),
                  disabled: !podeEditar,
                  children: "🗑️"
                }
              ) })
            ] }, idx))
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 flex-wrap mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "submit", disabled: !podeEditar || salvando, children: salvando ? "Salvando..." : editId ? "Atualizar regra" : "Criar regra" }),
        editId && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => {
              setForm(emptyRule);
              setEditId(null);
            },
            children: "Cancelar edição"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mt-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mb-2", children: "Regras cadastradas" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[900px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Faixas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Carregando..." }) }),
          !loading && rules.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma regra cadastrada." }) }),
          !loading && rules.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.tipo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.ativo ? "Sim" : "Não" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.commission_tier?.length || 0 }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", onClick: () => editar(r), title: "Editar", children: "✏️" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon btn-danger",
                  onClick: () => inativar(r.id),
                  disabled: !podeEditar,
                  title: "Inativar",
                  children: "⏸️"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon btn-danger",
                  onClick: () => excluirRegra(r.id),
                  disabled: !podeEditar,
                  title: "Excluir",
                  children: "🗑️"
                }
              )
            ] })
          ] }, r.id))
        ] })
      ] }) })
    ] })
  ] });
}

const $$RegrasComissao = createComponent(($$result, $$props, $$slots) => {
  const activePage = "regras-comissao";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Regras de Comiss\xE3o", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Regras de Comissionamento</h1> <p class="page-subtitle">
Cadastre regras gerais ou escalonadas para aplicar em produtos e cálculos de metas.
</p> ${renderComponent($$result2, "CommissionRulesIsland", CommissionRulesIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/CommissionRulesIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/regras-comissao.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/regras-comissao.astro";
const $$url = "/parametros/regras-comissao";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$RegrasComissao,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
