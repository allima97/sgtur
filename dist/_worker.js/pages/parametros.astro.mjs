globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                      */
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_SPVKIhmk.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../chunks/usePermissao_CncspAO2.mjs';
import { r as registrarLog } from '../chunks/logs_D3Eb6w9w.mjs';

const DEFAULT_PARAMS = {
  company_id: null,
  owner_user_id: null,
  usar_taxas_na_meta: false,
  foco_valor: "bruto",
  modo_corporativo: false,
  politica_cancelamento: "cancelar_venda",
  foco_faturamento: "bruto",
  exportacao_pdf: false,
  exportacao_excel: false
};
function ParametrosSistemaIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const isAdmin = permissao === "admin" || permissao === "edit";
  const [params, setParams] = reactExports.useState(DEFAULT_PARAMS);
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [sucesso, setSucesso] = reactExports.useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = reactExports.useState(null);
  const [origemDados, setOrigemDados] = reactExports.useState("default");
  const [ownerNome, setOwnerNome] = reactExports.useState(null);
  const bloqueado = !ativo || !isAdmin && permissao !== "edit" && permissao !== "delete";
  reactExports.useEffect(() => {
    carregar();
  }, []);
  const focoLabel = reactExports.useMemo(
    () => params.foco_valor === "bruto" ? "Valor bruto" : "Valor líquido",
    [params.foco_valor]
  );
  async function carregar() {
    try {
      setLoading(true);
      setErro(null);
      setSucesso(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }
      const { data: userData, error: userErr } = await supabase.from("users").select("company_id, nome_completo").eq("id", userId).maybeSingle();
      if (userErr) throw userErr;
      const companyId = userData?.company_id || null;
      const usuarioNome = userData?.nome_completo || null;
      const { data, error } = await supabase.from("parametros_comissao").select("*, owner_user:owner_user_id (nome_completo)").eq("company_id", companyId).maybeSingle();
      if (error) {
        console.error(error);
        setParams({ ...DEFAULT_PARAMS, company_id: companyId, owner_user_id: userId });
      } else if (data) {
        setParams({
          id: data.id,
          company_id: companyId,
          owner_user_id: data.owner_user_id || userId,
          owner_user_nome: data.owner_user?.nome_completo || usuarioNome,
          usar_taxas_na_meta: !!data.usar_taxas_na_meta,
          foco_valor: data.foco_valor === "liquido" ? "liquido" : "bruto",
          modo_corporativo: !!data.modo_corporativo,
          politica_cancelamento: data.politica_cancelamento === "estornar_recibos" ? "estornar_recibos" : "cancelar_venda",
          foco_faturamento: data.foco_faturamento === "liquido" ? "liquido" : "bruto",
          exportacao_pdf: !!data.exportacao_pdf,
          exportacao_excel: !!data.exportacao_excel
        });
        setUltimaAtualizacao(data.updated_at || data.created_at || null);
        setOrigemDados("banco");
        setOwnerNome(data.owner_user?.nome_completo || usuarioNome);
      } else {
        setParams({
          ...DEFAULT_PARAMS,
          company_id: companyId,
          owner_user_id: userId,
          owner_user_nome: usuarioNome
        });
        setUltimaAtualizacao(null);
        setOrigemDados("default");
        setOwnerNome(usuarioNome);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar parâmetros.");
    } finally {
      setLoading(false);
    }
  }
  async function salvar() {
    if (bloqueado) return;
    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);
      const payload = {
        company_id: params.company_id,
        owner_user_id: params.owner_user_id,
        usar_taxas_na_meta: params.usar_taxas_na_meta,
        foco_valor: params.foco_valor,
        modo_corporativo: params.modo_corporativo,
        politica_cancelamento: params.politica_cancelamento,
        foco_faturamento: params.foco_faturamento,
        exportacao_pdf: params.exportacao_pdf,
        exportacao_excel: params.exportacao_excel
      };
      const { error } = await supabase.from("parametros_comissao").upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
      await registrarLog({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        acao: "parametros_sistema_salvos",
        modulo: "Parametros",
        detalhes: payload
      });
      setSucesso("Parâmetros salvos com sucesso.");
      setUltimaAtualizacao((/* @__PURE__ */ new Date()).toISOString());
      setOrigemDados("banco");
      setOwnerNome(params.owner_user_nome || null);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar parâmetros.");
    } finally {
      setSalvando(false);
    }
  }
  if (loading || loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando parâmetros do sistema..." });
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Parâmetros bloqueado." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title", children: "Parâmetros do Sistema" }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erro }),
    sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", children: sucesso }),
    ultimaAtualizacao && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginTop: 0, color: "#64748b", fontSize: "0.9rem" }, children: [
      "Última atualização: ",
      new Date(ultimaAtualizacao).toLocaleString("pt-BR")
    ] }),
    origemDados && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginTop: 4, color: "#94a3b8", fontSize: "0.85rem" }, children: [
      "Origem dos dados: ",
      origemDados === "banco" ? "Banco de dados" : "Valores padrão"
    ] }),
    ownerNome && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginTop: 4, color: "#94a3b8", fontSize: "0.85rem" }, children: [
      "Última edição por: ",
      ownerNome
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Meta considera taxas?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: params.usar_taxas_na_meta,
              onChange: (e) => setParams((p) => ({ ...p, usar_taxas_na_meta: e.target.checked })),
              disabled: bloqueado
            }
          ),
          "Incluir taxas no cálculo de meta"
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Foco das metas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: params.foco_valor,
            onChange: (e) => setParams((p) => ({
              ...p,
              foco_valor: e.target.value === "liquido" ? "liquido" : "bruto"
            })),
            disabled: bloqueado,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bruto", children: "Valor bruto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "liquido", children: "Valor líquido" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { style: { color: "#64748b" }, children: [
          focoLabel,
          " será usado em metas e dashboards."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Modo corporativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: params.modo_corporativo,
              onChange: (e) => setParams((p) => ({ ...p, modo_corporativo: e.target.checked })),
              disabled: bloqueado
            }
          ),
          "Ativar modo corporativo (multi-empresa, controles extras)"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Política de cancelamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: params.politica_cancelamento,
            onChange: (e) => setParams((p) => ({
              ...p,
              politica_cancelamento: e.target.value === "estornar_recibos" ? "estornar_recibos" : "cancelar_venda"
            })),
            disabled: bloqueado,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cancelar_venda", children: "Cancelar venda (exclui venda)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "estornar_recibos", children: "Estornar recibos (manter venda)" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Define comportamento padrão ao cancelar vendas." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Foco de faturamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: params.foco_faturamento,
            onChange: (e) => setParams((p) => ({
              ...p,
              foco_faturamento: e.target.value === "liquido" ? "liquido" : "bruto"
            })),
            disabled: bloqueado,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bruto", children: "Valor bruto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "liquido", children: "Valor líquido" })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Define base para faturamento e relatórios financeiros." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Exportações" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: params.exportacao_pdf,
                onChange: (e) => setParams((p) => ({ ...p, exportacao_pdf: e.target.checked })),
                disabled: bloqueado
              }
            ),
            "Habilitar exportação em PDF"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: params.exportacao_excel,
                onChange: (e) => setParams((p) => ({ ...p, exportacao_excel: e.target.checked })),
                disabled: bloqueado
              }
            ),
            "Habilitar exportação em Excel"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Mantém coerência com os módulos de relatórios e orçamentos." })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, marginTop: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-primary",
          onClick: salvar,
          disabled: bloqueado || salvando,
          children: salvando ? "Salvando..." : "Salvar parâmetros"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-secondary", onClick: carregar, disabled: salvando, children: "Recarregar" })
    ] }),
    bloqueado && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { marginTop: 12, color: "#f97316" }, children: "Você não tem permissão para editar. Solicite acesso ao administrador." })
  ] });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "parametros";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Par\xE2metros do Sistema", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Parâmetros do Sistema</h1> <p class="page-subtitle">Ajuste regras globais que impactam metas, cancelamentos e modo corporativo.</p> ${renderComponent($$result2, "ParametrosSistemaIsland", ParametrosSistemaIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ParametrosSistemaIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/index.astro";
const $$url = "/parametros";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
