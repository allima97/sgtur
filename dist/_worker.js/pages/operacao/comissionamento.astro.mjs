globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_G6itN-OC.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_CncspAO2.mjs';

const PERIODO_OPCOES = [
  { id: "mes_atual", label: "Mês atual" },
  { id: "mes_anterior", label: "Mês anterior" },
  { id: "trim", label: "Últimos 3 meses" },
  { id: "sem", label: "Últimos 6 meses" },
  { id: "ano", label: "Últimos 12 meses" }
];
function addMonths(base, delta) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}
function formatISODate(d) {
  return d.toISOString().slice(0, 10);
}
function calcPeriodo(preset) {
  const hoje = /* @__PURE__ */ new Date();
  let inicio;
  switch (preset) {
    case "mes_anterior": {
      const first = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      inicio = first;
      break;
    }
    case "trim":
      inicio = addMonths(hoje, -3);
      break;
    case "sem":
      inicio = addMonths(hoje, -6);
      break;
    case "ano":
      inicio = addMonths(hoje, -12);
      break;
    case "mes_atual":
    default:
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      break;
  }
  return { inicio: formatISODate(inicio), fim: formatISODate(hoje) };
}
function ComissionamentoIsland() {
  const { ativo, loading: loadingPerm } = usePermissao("Vendas");
  const [user, setUser] = reactExports.useState(null);
  const [parametros, setParametros] = reactExports.useState(null);
  const [metaGeral, setMetaGeral] = reactExports.useState(null);
  const [metasProduto, setMetasProduto] = reactExports.useState([]);
  const [regras, setRegras] = reactExports.useState({});
  const [regraProdutoMap, setRegraProdutoMap] = reactExports.useState({});
  const [produtos, setProdutos] = reactExports.useState({});
  const [vendas, setVendas] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [preset, setPreset] = reactExports.useState("mes_atual");
  const [periodo, setPeriodo] = reactExports.useState(() => calcPeriodo("mes_atual"));
  reactExports.useEffect(() => {
    if (loadingPerm || !ativo) return;
    carregarTudo();
  }, [loadingPerm, ativo, preset]);
  reactExports.useEffect(() => {
    setPeriodo(calcPeriodo(preset));
  }, [preset]);
  async function carregarTudo() {
    try {
      setLoading(true);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id || null;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }
      setUser({ id: userId, nome: auth?.user?.email || "" });
      const periodoAtual = calcPeriodo(preset);
      const [
        { data: paramsData },
        { data: metaData },
        { data: metasProdData },
        { data: regrasData },
        { data: regrasProdData },
        { data: produtosData },
        vendasData
      ] = await Promise.all([
        supabase.from("parametros_comissao").select("usar_taxas_na_meta, foco_valor").maybeSingle(),
        supabase.from("metas_vendedor").select("id, meta_geral").eq("vendedor_id", userId).eq("periodo", periodoAtual.inicio.slice(0, 7) + "-01").maybeSingle(),
        supabase.from("metas_vendedor_produto").select("produto_id, valor").eq("meta_vendedor_id", metaData?.id || ""),
        supabase.from("commission_rule").select("id, tipo, meta_nao_atingida, meta_atingida, super_meta"),
        supabase.from("product_commission_rule").select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta"),
        supabase.from("tipo_produtos").select("id, nome, regra_comissionamento, soma_na_meta"),
        supabase.from("vendas").select(
          `
          id,
          data_lancamento,
          cancelada,
          vendas_recibos (
            valor_total,
            valor_taxas,
            produto_id,
            tipo_produtos (
              id, nome, regra_comissionamento, soma_na_meta
            )
          )
        `
        ).eq("cancelada", false).gte("data_lancamento", periodoAtual.inicio).lte("data_lancamento", periodoAtual.fim)
      ]);
      const regrasMap = {};
      (regrasData || []).forEach((r) => {
        regrasMap[r.id] = {
          id: r.id,
          tipo: r.tipo || "GERAL",
          meta_nao_atingida: r.meta_nao_atingida,
          meta_atingida: r.meta_atingida,
          super_meta: r.super_meta
        };
      });
      const regProdMap = {};
      (regrasProdData || []).forEach((rp) => {
        regProdMap[rp.produto_id] = {
          produto_id: rp.produto_id,
          rule_id: rp.rule_id,
          fix_meta_nao_atingida: rp.fix_meta_nao_atingida,
          fix_meta_atingida: rp.fix_meta_atingida,
          fix_super_meta: rp.fix_super_meta
        };
      });
      const prodMap = {};
      (produtosData || []).forEach((p) => {
        prodMap[p.id] = {
          id: p.id,
          nome: p.nome,
          regra_comissionamento: p.regra_comissionamento,
          soma_na_meta: p.soma_na_meta
        };
      });
      setParametros(
        paramsData ? {
          usar_taxas_na_meta: !!paramsData.usar_taxas_na_meta,
          foco_valor: paramsData.foco_valor || "bruto"
        } : { usar_taxas_na_meta: true, foco_valor: "bruto" }
      );
      setMetaGeral(metaData);
      setMetasProduto(metasProdData || []);
      setRegras(regrasMap);
      setRegraProdutoMap(regProdMap);
      setProdutos(prodMap);
      setVendas(vendasData.data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados de comissionamento.");
    } finally {
      setLoading(false);
    }
  }
  const resumo = reactExports.useMemo(() => {
    if (!parametros) return null;
    let baseMeta = 0;
    let valorLiquido = 0;
    let comissaoGeral = 0;
    let comissaoDif = 0;
    parametros.foco_valor === "liquido";
    vendas.forEach((v) => {
      (v.vendas_recibos || []).forEach((r) => {
        const prodId = r.tipo_produtos?.id || r.produto_id || "";
        const prod = produtos[prodId];
        if (!prod) return;
        const valTotal = Number(r.valor_total || 0);
        const valTaxas = Number(r.valor_taxas || 0);
        const valBruto = valTotal + valTaxas;
        const valParaMeta = parametros.foco_valor === "liquido" ? valTotal : parametros.usar_taxas_na_meta ? valBruto : valTotal;
        if (prod.soma_na_meta) baseMeta += valParaMeta;
        const regProd = regraProdutoMap[prodId];
        const isDif = prod.regra_comissionamento === "diferenciado";
        const baseCom = valTotal;
        if (isDif && regProd) {
          const metaProd = metasProduto.find((m) => m.produto_id === prodId)?.valor || 0;
          const pctMetaProd = metaProd > 0 ? baseMeta / metaProd * 100 : 0;
          const pctCom = pctMetaProd >= 120 ? regProd.fix_super_meta || regProd.fix_meta_atingida || regProd.fix_meta_nao_atingida || 0 : pctMetaProd >= 100 ? regProd.fix_meta_atingida || regProd.fix_meta_nao_atingida || 0 : regProd.fix_meta_nao_atingida || 0;
          comissaoDif += baseCom * (pctCom / 100);
        } else {
          const ruleId = regProd?.rule_id;
          const reg = ruleId ? regras[ruleId] : void 0;
          const pctMetaGeral2 = metaGeral?.meta_geral && metaGeral.meta_geral > 0 ? baseMeta / metaGeral.meta_geral * 100 : 0;
          let pctCom = 0;
          if (reg) {
            if (pctMetaGeral2 < 100) pctCom = reg.meta_nao_atingida || 0;
            else if (pctMetaGeral2 >= 120) pctCom = reg.super_meta || reg.meta_atingida || reg.meta_nao_atingida || 0;
            else pctCom = reg.meta_atingida || reg.meta_nao_atingida || 0;
          }
          comissaoGeral += baseCom * (pctCom / 100);
        }
        valorLiquido += valTotal;
      });
    });
    const pctMetaGeral = metaGeral?.meta_geral && metaGeral.meta_geral > 0 ? baseMeta / metaGeral.meta_geral * 100 : 0;
    return {
      baseMeta,
      valorLiquido,
      pctMetaGeral,
      comissaoGeral,
      comissaoDif,
      totalComissao: comissaoGeral + comissaoDif
    };
  }, [vendas, parametros, produtos, regraProdutoMap, metasProduto, metaGeral, regras]);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando permissões..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Vendas." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginBottom: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Período" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "form-select", value: preset, onChange: (e) => setPreset(e.target.value), children: PERIODO_OPCOES.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.label }, o.id)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Início" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: periodo.inicio, readOnly: true })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Fim" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: periodo.fim, readOnly: true })
      ] })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados..." }),
    !loading && resumo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-grid", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta (base)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.baseMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta geral" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: (metaGeral?.meta_geral || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta atingida" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-value", children: [
          resumo.pctMetaGeral.toFixed(1),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Faturamento líquido" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão (geral)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.comissaoGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão (diferenciado)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.comissaoDif.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card kpi-highlight", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
      ] })
    ] })
  ] });
}

const $$Comissionamento = createComponent(($$result, $$props, $$slots) => {
  const activePage = "comissionamento";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Comissionamento", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Comissionamento", "subtitle": "Resumo de comiss\xF5es por regra e produtos diferenciados.", "color": "green" })} ${renderComponent($$result2, "ComissionamentoIsland", ComissionamentoIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ComissionamentoIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/operacao/comissionamento.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/operacao/comissionamento.astro";
const $$url = "/operacao/comissionamento";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Comissionamento,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
