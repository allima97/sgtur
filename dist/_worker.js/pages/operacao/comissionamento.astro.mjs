globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_CwEMmlUN.mjs';
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
  const metaProdEnabled = import.meta?.env?.PUBLIC_META_PRODUTO_ENABLED !== "false";
  const [user, setUser] = reactExports.useState(null);
  const [parametros, setParametros] = reactExports.useState(null);
  const [metaGeral, setMetaGeral] = reactExports.useState(null);
  const [metasProduto, setMetasProduto] = reactExports.useState([]);
  const [regras, setRegras] = reactExports.useState({});
  const [regraProdutoMap, setRegraProdutoMap] = reactExports.useState({});
  const [produtos, setProdutos] = reactExports.useState({});
  const [vendas, setVendas] = reactExports.useState([]);
  const [suportaExibeKpi, setSuportaExibeKpi] = reactExports.useState(true);
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
      const { data: paramsData } = await supabase.from("parametros_comissao").select("usar_taxas_na_meta, foco_valor").maybeSingle();
      const { data: metaData } = await supabase.from("metas_vendedor").select("id, meta_geral").eq("vendedor_id", userId).eq("periodo", periodoAtual.inicio.slice(0, 7) + "-01").maybeSingle();
      const tipoProdBaseCols = "id, nome, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral";
      const tentarSelectProdutos = async (incluiExibe) => {
        const cols = incluiExibe ? `${tipoProdBaseCols}, exibe_kpi_comissao` : tipoProdBaseCols;
        return supabase.from("tipo_produtos").select(cols);
      };
      let produtosDataRes = await tentarSelectProdutos(true);
      let suportaKpi = true;
      if (produtosDataRes.error && produtosDataRes.error.message?.toLowerCase().includes("exibe_kpi_comissao")) {
        suportaKpi = false;
        produtosDataRes = await tentarSelectProdutos(false);
      }
      const nestedTipoProdCols = suportaKpi ? "id, nome, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao" : "id, nome, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral";
      let vendasDataRes = await supabase.from("vendas").select(
        `
          id,
          data_lancamento,
          cancelada,
          vendas_recibos (
            valor_total,
            valor_taxas,
            produto_id,
            tipo_produtos (
              ${nestedTipoProdCols}
            )
          )
        `
      ).eq("cancelada", false).gte("data_lancamento", periodoAtual.inicio).lte("data_lancamento", periodoAtual.fim);
      if (vendasDataRes.error && vendasDataRes.error.message?.toLowerCase().includes("exibe_kpi_comissao")) {
        vendasDataRes = await supabase.from("vendas").select(
          `
          id,
          data_lancamento,
          cancelada,
          vendas_recibos (
            valor_total,
            valor_taxas,
            produto_id,
            tipo_produtos (
              ${tipoProdBaseCols}
            )
          )
        `
        ).eq("cancelada", false).gte("data_lancamento", periodoAtual.inicio).lte("data_lancamento", periodoAtual.fim);
        suportaKpi = false;
      }
      const [metasProdDataRes, regrasDataRes, regrasProdDataRes] = await Promise.all([
        supabase.from("metas_vendedor_produto").select("produto_id, valor").eq("meta_vendedor_id", metaData?.id || ""),
        supabase.from("commission_rule").select("id, tipo, meta_nao_atingida, meta_atingida, super_meta"),
        supabase.from("product_commission_rule").select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta")
      ]);
      const metasProdData = metasProdDataRes.data;
      const regrasData = regrasDataRes.data;
      const regrasProdData = regrasProdDataRes.data;
      const produtosData = produtosDataRes.data;
      const vendasData = vendasDataRes.data;
      setSuportaExibeKpi(suportaKpi);
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
          soma_na_meta: p.soma_na_meta,
          usa_meta_produto: p.usa_meta_produto,
          meta_produto_valor: p.meta_produto_valor,
          comissao_produto_meta_pct: p.comissao_produto_meta_pct,
          descontar_meta_geral: p.descontar_meta_geral,
          exibe_kpi_comissao: suportaKpi ? p.exibe_kpi_comissao : void 0
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
      setVendas(vendasData || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados de comissionamento.");
    } finally {
      setLoading(false);
    }
  }
  const resumo = reactExports.useMemo(() => {
    if (!parametros) return null;
    const metasProdutoMap = {};
    metasProduto.forEach((m) => {
      metasProdutoMap[m.produto_id] = m.valor;
    });
    const baseMetaPorProduto = {};
    const brutoPorProduto = {};
    const liquidoPorProduto = {};
    let baseMeta = 0;
    let totalBruto = 0;
    let totalTaxas = 0;
    let comissaoGeral = 0;
    let comissaoDif = 0;
    const comissaoDifDetalhe = {};
    const produtosDiferenciados = [];
    let comissaoMetaProd = 0;
    const comissaoMetaProdDetalhe = {};
    Object.values(produtos).forEach((p) => {
      if (p.regra_comissionamento === "diferenciado") {
        produtosDiferenciados.push(p.id);
        comissaoDifDetalhe[p.id] = 0;
      }
      if (p.usa_meta_produto) {
        comissaoMetaProdDetalhe[p.id] = 0;
      }
    });
    vendas.forEach((v) => {
      (v.vendas_recibos || []).forEach((r) => {
        const prodId = r.tipo_produtos?.id || r.produto_id || "";
        const prod = produtos[prodId];
        if (!prod) return;
        const valTotalBruto = Number(r.valor_total || 0);
        const valTaxas = Number(r.valor_taxas || 0);
        const valLiquido = valTotalBruto - valTaxas;
        const valParaMeta = parametros.usar_taxas_na_meta ? valTotalBruto : valLiquido;
        brutoPorProduto[prodId] = (brutoPorProduto[prodId] || 0) + valTotalBruto;
        liquidoPorProduto[prodId] = (liquidoPorProduto[prodId] || 0) + valLiquido;
        baseMetaPorProduto[prodId] = (baseMetaPorProduto[prodId] || 0) + valParaMeta;
        if (prod.soma_na_meta) baseMeta += valParaMeta;
        totalBruto += valTotalBruto;
        totalTaxas += valTaxas;
      });
    });
    const valorLiquido = totalBruto - totalTaxas;
    const pctMetaGeral = metaGeral?.meta_geral && metaGeral.meta_geral > 0 ? baseMeta / metaGeral.meta_geral * 100 : 0;
    Object.keys(brutoPorProduto).forEach((prodId) => {
      const prod = produtos[prodId];
      if (!prod) return;
      const baseCom = parametros.foco_valor === "liquido" ? liquidoPorProduto[prodId] || 0 : brutoPorProduto[prodId] || 0;
      if (prod.regra_comissionamento === "diferenciado") {
        const regProd = regraProdutoMap[prodId];
        if (!regProd) return;
        const metaProd = metasProdutoMap[prodId] || 0;
        const baseMetaProd = baseMetaPorProduto[prodId] || 0;
        const temMetaProd = metaProd > 0;
        const pctMetaProd = temMetaProd ? baseMetaProd / metaProd * 100 : 0;
        const pctCom = temMetaProd ? baseMetaProd < metaProd ? 0 : pctMetaProd >= 120 ? regProd.fix_super_meta ?? regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0 : regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0 : regProd.fix_meta_nao_atingida ?? regProd.fix_meta_atingida ?? regProd.fix_super_meta ?? 0;
        const val = baseCom * (pctCom / 100);
        const jogaParaGeral = prod.soma_na_meta && !prod.usa_meta_produto;
        if (jogaParaGeral) {
          comissaoGeral += val;
        } else {
          comissaoDif += val;
        }
        comissaoDifDetalhe[prodId] = val;
      } else {
        const ruleId = regraProdutoMap[prodId]?.rule_id;
        const reg = ruleId ? regras[ruleId] : void 0;
        let pctCom = 0;
        if (reg) {
          if (pctMetaGeral < 100) pctCom = reg.meta_nao_atingida || 0;
          else if (pctMetaGeral >= 120) pctCom = reg.super_meta ?? reg.meta_atingida ?? reg.meta_nao_atingida ?? 0;
          else pctCom = reg.meta_atingida ?? reg.meta_nao_atingida ?? 0;
        }
        const valGeral = baseCom * (pctCom / 100);
        comissaoGeral += valGeral;
        if (metaProdEnabled && prod.usa_meta_produto && prod.meta_produto_valor && prod.comissao_produto_meta_pct) {
          const baseMetaProd = baseMetaPorProduto[prodId] || 0;
          const pctMetaProd = baseMetaProd / prod.meta_produto_valor * 100;
          const atingiuMetaProd = pctMetaProd >= 100;
          if (atingiuMetaProd) {
            const valMetaProd = baseCom * ((prod.comissao_produto_meta_pct || 0) / 100);
            const diff = prod.descontar_meta_geral === false ? valMetaProd : Math.max(valMetaProd - valGeral, 0);
            comissaoMetaProd += diff;
            comissaoMetaProdDetalhe[prodId] = (comissaoMetaProdDetalhe[prodId] || 0) + diff;
          }
        }
      }
    });
    return {
      baseMeta,
      totalBruto,
      totalTaxas,
      valorLiquido,
      pctMetaGeral,
      comissaoGeral,
      comissaoDif,
      comissaoMetaProd: metaProdEnabled ? comissaoMetaProd : 0,
      totalComissao: metaProdEnabled ? comissaoGeral + comissaoDif + comissaoMetaProd : comissaoGeral + comissaoDif,
      comissaoDifDetalhe,
      comissaoMetaProdDetalhe: metaProdEnabled ? comissaoMetaProdDetalhe : {},
      produtosDiferenciados
    };
  }, [vendas, parametros, produtos, regraProdutoMap, metasProduto, metaGeral, regras, metaProdEnabled]);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando permissões..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Vendas." });
  const cardColStyle = {
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center"
  };
  const metaProdEntries = metaProdEnabled && resumo ? Object.entries(resumo.comissaoMetaProdDetalhe || {}).filter(
    ([pid]) => produtos[pid]?.exibe_kpi_comissao !== false
  ) : [];
  const difProdutos = resumo && resumo.produtosDiferenciados ? resumo.produtosDiferenciados.filter((pid) => produtos[pid]?.exibe_kpi_comissao !== false) : [];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { background: "transparent", boxShadow: "none", padding: 0 }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base", style: { marginBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginBottom: 0 }, children: [
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
    ] }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados..." }),
    !loading && resumo && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginBottom: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", fontWeight: 700, fontSize: 18, marginBottom: 16 }, children: "Como está seu Progresso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "kpi-grid",
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
              marginBottom: 4
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: { ...cardColStyle, color: "#16a34a" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta do mês" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: (metaGeral?.meta_geral || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: { ...cardColStyle, color: "#ca8a04" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Total Bruto" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: { ...cardColStyle, color: "#c2410c" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Total Taxas" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalTaxas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: { ...cardColStyle, color: "#0ea5e9" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Valor Liquido" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: { ...cardColStyle, color: "#2563eb" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta atingida" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-value", children: [
                  resumo.pctMetaGeral.toFixed(1),
                  "%"
                ] })
              ] })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", fontWeight: 700, fontSize: 18, margin: "0 0 16px" }, children: "Seus Valores a Receber" }),
        metaProdEnabled && metaProdEntries.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", color: "#0f172a", marginBottom: 8, fontSize: "0.9rem" }, children: "Produtos com meta específica" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "kpi-grid",
            style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: cardColStyle, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão (geral)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.comissaoGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] }),
              metaProdEnabled && metaProdEntries.map(([pid, val]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: cardColStyle, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: produtos[pid]?.nome || "(produto)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) }),
                val === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#dc2626" }, children: "Meta não atingida" })
              ] }, `meta-${pid}`)),
              difProdutos.map((pid) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", style: cardColStyle, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: produtos[pid]?.nome || "(produto)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: (resumo.comissaoDifDetalhe?.[pid] || 0).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) }),
                (resumo.comissaoDifDetalhe?.[pid] || 0) === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#dc2626" }, children: "Sem comissão" })
              ] }, pid)),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card kpi-highlight", style: cardColStyle, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão total" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] })
            ]
          }
        )
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
