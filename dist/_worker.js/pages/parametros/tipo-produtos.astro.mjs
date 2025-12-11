globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_BaV_SJmL.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function TipoProdutosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const [tipos, setTipos] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [busca, setBusca] = reactExports.useState("");
  const [editandoId, setEditandoId] = reactExports.useState(null);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [regras, setRegras] = reactExports.useState([]);
  const [produtoRegraMap, setProdutoRegraMap] = reactExports.useState({});
  const [regraSelecionada, setRegraSelecionada] = reactExports.useState("");
  const [fixMetaNao, setFixMetaNao] = reactExports.useState("");
  const [fixMetaAtingida, setFixMetaAtingida] = reactExports.useState("");
  const [fixSuperMeta, setFixSuperMeta] = reactExports.useState("");
  const [form, setForm] = reactExports.useState({
    nome: "",
    tipo: "",
    regra_comissionamento: "geral",
    soma_na_meta: true,
    ativo: true
  });
  function handleChange(campo, valor) {
    setForm((prev) => {
      if (campo === "nome") {
        const nomeVal = String(valor);
        return { ...prev, nome: nomeVal, tipo: prev.tipo || nomeVal };
      }
      return { ...prev, [campo]: valor };
    });
  }
  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      const [{ data, error }, regrasData, mapData] = await Promise.all([
        supabase.from("tipo_produtos").select("*").order("nome", { ascending: true }),
        supabase.from("commission_rule").select("id, nome, tipo").eq("ativo", true).order("nome"),
        supabase.from("product_commission_rule").select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta")
      ]);
      if (error) throw error;
      setTipos(data || []);
      setRegras(regrasData.data || []);
      const map = {};
      mapData.data?.forEach((r) => {
        map[r.produto_id] = {
          rule_id: r.rule_id || "",
          fix_meta_nao_atingida: r.fix_meta_nao_atingida,
          fix_meta_atingida: r.fix_meta_atingida,
          fix_super_meta: r.fix_super_meta
        };
      });
      setProdutoRegraMap(map);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar tipos de produto.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    carregar();
  }, []);
  function iniciarNovo() {
    setForm({
      nome: "",
      tipo: "",
      regra_comissionamento: "geral",
      soma_na_meta: true,
      ativo: true
    });
    setRegraSelecionada("");
    setFixMetaNao("");
    setFixMetaAtingida("");
    setFixSuperMeta("");
    setEditandoId(null);
    setErro(null);
  }
  function iniciarEdicao(tipoProd) {
    setEditandoId(tipoProd.id);
    setForm({
      nome: tipoProd.nome || tipoProd.tipo,
      tipo: tipoProd.tipo || tipoProd.nome || "",
      regra_comissionamento: tipoProd.regra_comissionamento,
      soma_na_meta: tipoProd.soma_na_meta,
      ativo: tipoProd.ativo
    });
    const comissao = produtoRegraMap[tipoProd.id] || {};
    setRegraSelecionada(comissao.rule_id || "");
    setFixMetaNao(
      comissao.fix_meta_nao_atingida !== null && comissao.fix_meta_nao_atingida !== void 0 ? String(comissao.fix_meta_nao_atingida) : ""
    );
    setFixMetaAtingida(
      comissao.fix_meta_atingida !== null && comissao.fix_meta_atingida !== void 0 ? String(comissao.fix_meta_atingida) : ""
    );
    setFixSuperMeta(
      comissao.fix_super_meta !== null && comissao.fix_super_meta !== void 0 ? String(comissao.fix_super_meta) : ""
    );
  }
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Você não tem permissão para salvar tipos de produto.");
      return;
    }
    const nome = form.nome.trim();
    const tipo = form.tipo.trim() || nome;
    if (!nome) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (form.regra_comissionamento === "geral" && !regraSelecionada) {
      setErro("Selecione uma regra de comissão para produtos do tipo 'geral'.");
      return;
    }
    try {
      setErro(null);
      const payload = {
        nome,
        tipo,
        regra_comissionamento: form.regra_comissionamento,
        soma_na_meta: form.soma_na_meta,
        ativo: form.ativo
      };
      let tipoId = editandoId;
      if (editandoId) {
        const { error } = await supabase.from("tipo_produtos").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { data: insertData, error } = await supabase.from("tipo_produtos").insert(payload).select("id").single();
        if (error) throw error;
        tipoId = insertData?.id || null;
      }
      if (tipoId) {
        const fixNao = form.regra_comissionamento === "diferenciado" ? Number(fixMetaNao) || null : null;
        const fixAt = form.regra_comissionamento === "diferenciado" ? Number(fixMetaAtingida) || null : null;
        const fixSup = form.regra_comissionamento === "diferenciado" ? Number(fixSuperMeta) || null : null;
        if (regraSelecionada || form.regra_comissionamento === "diferenciado") {
          await supabase.from("product_commission_rule").upsert(
            {
              produto_id: tipoId,
              rule_id: regraSelecionada || null,
              ativo: true,
              fix_meta_nao_atingida: fixNao,
              fix_meta_atingida: fixAt,
              fix_super_meta: fixSup
            },
            { onConflict: "produto_id" }
          );
        } else {
          await supabase.from("product_commission_rule").delete().eq("produto_id", tipoId);
        }
      }
      iniciarNovo();
      await carregar();
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar tipo de produto.");
    }
  }
  async function excluir(id) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir tipos de produto.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este tipo de produto?")) return;
    try {
      setExcluindoId(id);
      const { error } = await supabase.from("tipo_produtos").delete().eq("id", id);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir tipo de produto. Talvez esteja vinculado a vendas/recibos.");
    } finally {
      setExcluindoId(null);
    }
  }
  const tiposFiltrados = reactExports.useMemo(() => {
    if (!busca.trim()) return tipos;
    const termo = normalizeText(busca);
    return tipos.filter((p) => normalizeText(p.nome || p.tipo || "").includes(termo));
  }, [busca, tipos]);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando permissões..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Parâmetros." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "produtos-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Modelo de comissão" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-input",
              value: form.regra_comissionamento,
              onChange: (e) => {
                const val = e.target.value;
                handleChange("regra_comissionamento", val);
                if (val === "diferenciado") {
                  setRegraSelecionada("");
                }
              },
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "geral", children: "Geral (usa regra cadastrada)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "diferenciado", children: "Diferenciado (percentual fixo)" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row mt-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Soma na meta?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-input",
              value: form.soma_na_meta ? "1" : "0",
              onChange: (e) => handleChange("soma_na_meta", e.target.value === "1"),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "1", children: "Sim" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "0", children: "Não" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo?" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-input",
              value: form.ativo ? "1" : "0",
              onChange: (e) => handleChange("ativo", e.target.value === "1"),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "1", children: "Sim" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "0", children: "Não" })
              ]
            }
          )
        ] })
      ] }),
      form.regra_comissionamento === "geral" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Regra de Comissão *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-input",
            value: regraSelecionada,
            onChange: (e) => setRegraSelecionada(e.target.value),
            disabled: permissao === "view",
            required: true,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
              regras.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: r.id, children: [
                r.nome,
                " (",
                r.tipo,
                ")"
              ] }, r.id))
            ]
          }
        )
      ] }),
      form.regra_comissionamento === "diferenciado" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Comissão fixa (meta não atingida) %" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: fixMetaNao,
              onChange: (e) => setFixMetaNao(e.target.value),
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Comissão fixa (meta atingida) %" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: fixMetaAtingida,
              onChange: (e) => setFixMetaAtingida(e.target.value),
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Comissão fixa (super meta) %" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              step: "0.01",
              value: fixSuperMeta,
              onChange: (e) => setFixSuperMeta(e.target.value),
              disabled: permissao === "view"
            }
          )
        ] })
      ] }),
      permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", type: "submit", children: editandoId ? "Salvar alterações" : "Adicionar tipo" }),
        editandoId && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: iniciarNovo, children: "Cancelar edição" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar tipo de produto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Digite parte do nome..."
        }
      )
    ] }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: erro }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[720px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Regra" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Regra vinculada" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Soma meta" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Carregando tipos de produto..." }) }),
        !loading && tiposFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Nenhum tipo encontrado." }) }),
        !loading && tiposFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nome || p.tipo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.regra_comissionamento }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: produtoRegraMap[p.id]?.rule_id ? regras.find((r) => r.id === produtoRegraMap[p.id]?.rule_id)?.nome || "-" : produtoRegraMap[p.id]?.fix_meta_atingida ? "Comissão fixa" : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.soma_na_meta ? "Sim" : "Não" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { color: p.ativo ? "#22c55e" : "#ef4444" }, children: p.ativo ? "Ativo" : "Inativo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", onClick: () => iniciarEdicao(p), children: "✏️" }),
            permissao === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                onClick: () => excluir(p.id),
                disabled: excluindoId === p.id,
                children: excluindoId === p.id ? "..." : "🗑️"
              }
            )
          ] })
        ] }, p.id))
      ] })
    ] }) })
  ] });
}

const $$TipoProdutos = createComponent(($$result, $$props, $$slots) => {
  const activePage = "parametros-tipo-produtos";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Tipo de Produtos", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Tipo de Produtos", "subtitle": "Cadastre tipos de produto e regras de comiss\xE3o associadas.", "color": "blue" })} ${renderComponent($$result2, "TipoProdutosIsland", TipoProdutosIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/TipoProdutosIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/tipo-produtos.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/tipo-produtos.astro";
const $$url = "/parametros/tipo-produtos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$TipoProdutos,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
