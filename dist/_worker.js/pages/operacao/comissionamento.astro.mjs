globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_Ck_yWTiO.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_R_BoJegu.mjs';
import { C as CalculatorModal } from '../../chunks/CalculatorModal_yQtdp0pY.mjs';

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
function formatPeriodoLabel(value) {
  if (!value) return "-";
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez"
  ];
  const partes = value.split("-");
  if (partes.length < 3) return value;
  const [ano, mes, dia] = partes;
  const mesIdx = Number(mes) - 1;
  const mesLabel = meses[mesIdx] || mes;
  return `${dia}-${mesLabel}-${ano}`;
}
function isSeguroProduto(produto) {
  const nome = (produto?.nome || "").toLowerCase();
  return nome.includes("seguro");
}
function formatPct(value) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + "%";
}
function formatPctList(values) {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (!filtered.length) return "";
  return filtered.map((v) => formatPct(v)).join(", ");
}
function buildKpiLabel(base, values) {
  const list = formatPctList(values);
  return list ? `${base} (${list})` : base;
}
function buildKpiLabelFromList(base, values) {
  const list = values.filter(Boolean).join(", ");
  return list ? `${base} (${list})` : base;
}
function ComissionamentoIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Vendas");
  const metaProdEnabled = undefined                                            !== "false";
  const [user, setUser] = reactExports.useState(null);
  const [parametros, setParametros] = reactExports.useState(null);
  const [metaGeral, setMetaGeral] = reactExports.useState(null);
  const [metaIds, setMetaIds] = reactExports.useState([]);
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
  const [showCalculator, setShowCalculator] = reactExports.useState(false);
  const [showFilters, setShowFilters] = reactExports.useState(false);
  reactExports.useEffect(() => {
    if (loadingPerm || !ativo) return;
    carregarTudo();
  }, [loadingPerm, ativo, preset, permissao]);
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
      const periodoAtual = calcPeriodo(preset);
      const isAdminPermissao = permissao === "admin";
      const { data: usuarioDb } = await supabase.from("users").select("id, company_id, user_types(name)").eq("id", userId).maybeSingle();
      const tipoUser = (usuarioDb?.user_types?.name || "").toUpperCase();
      const isUsuarioVendedor = tipoUser.includes("VENDEDOR");
      const companyId = usuarioDb?.company_id || null;
      setUser({
        id: userId,
        nome: auth?.user?.email || "",
        tipo: tipoUser
      });
      const paramsCols = "usar_taxas_na_meta, foco_valor, foco_faturamento";
      let paramsData = null;
      if (companyId) {
        const { data } = await supabase.from("parametros_comissao").select(paramsCols).eq("company_id", companyId).maybeSingle();
        paramsData = data;
      }
      if (!paramsData) {
        const { data } = await supabase.from("parametros_comissao").select(paramsCols).is("company_id", null).maybeSingle();
        paramsData = data;
      }
      const periodoMeta = periodoAtual.inicio.slice(0, 7) + "-01";
      let metasQuery = supabase.from("metas_vendedor").select("id, meta_geral").eq("periodo", periodoMeta);
      if (isUsuarioVendedor) {
        metasQuery = metasQuery.eq("vendedor_id", userId);
      }
      const { data: metasData, error: metasError } = await metasQuery;
      if (metasError) throw metasError;
      const metasList = metasData || [];
      const metaIds2 = metasList.map((m) => m.id);
      const metaSum = metasList.reduce((sum, m) => sum + (m.meta_geral || 0), 0);
      setMetaIds(metaIds2);
      setMetaGeral(metaIds2.length > 0 ? { id: metaIds2[0], meta_geral: metaSum } : null);
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
      let vendasQuery = supabase.from("vendas").select(
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
      if (!isAdminPermissao && userId) {
        vendasQuery = vendasQuery.eq("vendedor_id", userId);
      }
      let vendasDataRes = await vendasQuery;
      if (vendasDataRes.error && vendasDataRes.error.message?.toLowerCase().includes("exibe_kpi_comissao")) {
        let fallbackQuery = supabase.from("vendas").select(
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
        if (!isAdminPermissao && userId) {
          fallbackQuery = fallbackQuery.eq("vendedor_id", userId);
        }
        vendasDataRes = await fallbackQuery;
        suportaKpi = false;
      }
      const metasProdPromise = metaIds2.length > 0 ? supabase.from("metas_vendedor_produto").select("produto_id, valor").in("meta_vendedor_id", metaIds2) : Promise.resolve({ data: [], error: null });
      const [metasProdDataRes, regrasDataRes, regrasProdDataRes] = await Promise.all([
        metasProdPromise,
        supabase.from("commission_rule").select("id, tipo, meta_nao_atingida, meta_atingida, super_meta, commission_tier (faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao)"),
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
          super_meta: r.super_meta,
          commission_tier: r.commission_tier || []
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
          foco_valor: paramsData.foco_valor === "liquido" ? "liquido" : "bruto",
          foco_faturamento: paramsData.foco_faturamento === "liquido" ? "liquido" : "bruto"
        } : { usar_taxas_na_meta: true, foco_valor: "bruto", foco_faturamento: "bruto" }
      );
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
  function calcularPctEscalonavel(regra, pctMeta) {
    const faixa = pctMeta < 100 ? "PRE" : "POS";
    const tiers = (regra.commission_tier || []).filter((t) => t.faixa === faixa);
    const tier = tiers.find((t) => pctMeta >= Number(t.de_pct) && pctMeta <= Number(t.ate_pct));
    const base = faixa === "PRE" ? regra.meta_nao_atingida ?? regra.meta_atingida ?? 0 : regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
    if (!tier) {
      if (faixa === "POS" && pctMeta >= 120) {
        return regra.super_meta ?? base;
      }
      return base;
    }
    const incMeta = Number(tier.inc_pct_meta || 0);
    const incCom = Number(tier.inc_pct_comissao || 0);
    if (incMeta <= 0) {
      return incCom || base;
    }
    const steps = Math.max(0, Math.floor((pctMeta - Number(tier.de_pct)) / incMeta));
    const pct = base + steps * (incCom / 100);
    return pct;
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
    const pctComissaoGeralSet = /* @__PURE__ */ new Set();
    const pctPassagemFacialSet = /* @__PURE__ */ new Set();
    const pctSeguroFormulaSet = /* @__PURE__ */ new Set();
    const comissaoDifDetalhe = {};
    const produtosDiferenciados = [];
    let comissaoFixaProdutos = 0;
    let comissaoMetaProd = 0;
    const comissaoMetaProdDetalhe = {};
    let comissaoPassagemFacial = 0;
    let comissaoSeguroViagem = 0;
    let totalValorMetaDiferenciada = 0;
    let totalValorMetaEscalonavel = 0;
    let totalValorMetaGeral = 0;
    const usaFocoFaturamentoLiquido = parametros.foco_faturamento === "liquido";
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
    const totalLiquido = totalBruto - totalTaxas;
    const pctMetaGeral = metaGeral?.meta_geral && metaGeral.meta_geral > 0 ? baseMeta / metaGeral.meta_geral * 100 : 0;
    Object.keys(brutoPorProduto).forEach((prodId) => {
      const prod = produtos[prodId];
      if (!prod) return;
      const valorLiquidoProduto = liquidoPorProduto[prodId] || 0;
      const baseCom = usaFocoFaturamentoLiquido ? liquidoPorProduto[prodId] || 0 : brutoPorProduto[prodId] || 0;
      const nomeProdNormalizado = (prod.nome || "").toLowerCase().replace(/\s+/g, " ").trim();
      const isPassagemFacial = nomeProdNormalizado.includes("passagem facial");
      const isSeguro = isSeguroProduto(prod);
      if (prod.regra_comissionamento === "diferenciado") {
        totalValorMetaDiferenciada += valorLiquidoProduto;
        const regProd = regraProdutoMap[prodId];
        if (!regProd) return;
        const metaProd = metasProdutoMap[prodId] || 0;
        const baseMetaProd = baseMetaPorProduto[prodId] || 0;
        const temMetaProd = metaProd > 0;
        const pctMetaProd = temMetaProd ? baseMetaProd / metaProd * 100 : 0;
        const pctCom = temMetaProd ? baseMetaProd < metaProd ? 0 : pctMetaProd >= 120 ? regProd.fix_super_meta ?? regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0 : regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0 : regProd.fix_meta_nao_atingida ?? regProd.fix_meta_atingida ?? regProd.fix_super_meta ?? 0;
        const val = baseCom * (pctCom / 100);
        comissaoFixaProdutos += val;
        const jogaParaGeral = prod.soma_na_meta && !prod.usa_meta_produto;
        if (jogaParaGeral && pctCom > 0) {
          if (isPassagemFacial) {
            pctPassagemFacialSet.add(pctCom);
          } else {
            pctComissaoGeralSet.add(pctCom);
          }
        }
        if (jogaParaGeral) {
          if (isPassagemFacial) {
            comissaoPassagemFacial += val;
          } else {
            comissaoGeral += val;
          }
        } else {
          comissaoDif += val;
        }
        comissaoDifDetalhe[prodId] = val;
      } else {
        const ruleId = regraProdutoMap[prodId]?.rule_id;
        const reg = ruleId ? regras[ruleId] : void 0;
        if (reg?.tipo === "ESCALONAVEL") {
          totalValorMetaEscalonavel += valorLiquidoProduto;
        } else {
          totalValorMetaGeral += valorLiquidoProduto;
        }
        let pctCom = 0;
        if (reg) {
          if (reg.tipo === "ESCALONAVEL") {
            pctCom = calcularPctEscalonavel(reg, pctMetaGeral);
          } else {
            if (pctMetaGeral < 100) pctCom = reg.meta_nao_atingida || 0;
            else if (pctMetaGeral >= 120) pctCom = reg.super_meta ?? reg.meta_atingida ?? reg.meta_nao_atingida ?? 0;
            else pctCom = reg.meta_atingida ?? reg.meta_nao_atingida ?? 0;
          }
        }
        const valGeral = baseCom * (pctCom / 100);
        const nomeProd = (prod.nome || "").toLowerCase();
        const normalizedNome = nomeProd.replace(/\s+/g, " ").trim();
        const isPassagemFacial2 = normalizedNome.includes("passagem facial");
        if (pctCom > 0) {
          if (isPassagemFacial2) {
            pctPassagemFacialSet.add(pctCom);
          } else {
            pctComissaoGeralSet.add(pctCom);
          }
        }
        if (isPassagemFacial2) {
          comissaoPassagemFacial += valGeral;
        } else {
          comissaoGeral += valGeral;
        }
        if (prod.usa_meta_produto && prod.meta_produto_valor && prod.comissao_produto_meta_pct) {
          const baseMetaProd = baseMetaPorProduto[prodId] || 0;
          const pctMetaProd = baseMetaProd / prod.meta_produto_valor * 100;
          const atingiuMetaProd = pctMetaProd >= 100;
          if (atingiuMetaProd) {
            const valMetaProd = baseCom * ((prod.comissao_produto_meta_pct || 0) / 100);
            const diff = prod.descontar_meta_geral === false ? valMetaProd : Math.max(valMetaProd - valGeral, 0);
            comissaoMetaProd += diff;
            comissaoMetaProdDetalhe[prodId] = (comissaoMetaProdDetalhe[prodId] || 0) + diff;
            if (isSeguro) {
              comissaoSeguroViagem += diff;
              const metaPct = Number(prod.comissao_produto_meta_pct || 0);
              const basePct = prod.descontar_meta_geral === false ? 0 : Number(pctCom || 0);
              const diffPct = Math.max(metaPct - basePct, 0);
              if (metaPct > 0) {
                pctSeguroFormulaSet.add(formatPct(diffPct));
              }
            }
          }
        }
      }
    });
    const totalComissao = comissaoGeral + comissaoDif + comissaoMetaProd + comissaoPassagemFacial ;
    const totalComissaoKpi = comissaoGeral + comissaoFixaProdutos;
    const totalComissaoKpiSeguro = totalComissaoKpi + comissaoSeguroViagem;
    return {
      baseMeta,
      totalBruto,
      totalTaxas,
      totalLiquido,
      totalValorMetaDiferenciada,
      totalValorMetaEscalonavel,
      totalValorMetaGeral,
      pctMetaGeral,
      comissaoGeral,
      comissaoDif,
      comissaoMetaProd: comissaoMetaProd ,
      comissaoPassagemFacial,
      comissaoSeguroViagem,
      pctComissaoGeral: Array.from(pctComissaoGeralSet),
      pctPassagemFacial: Array.from(pctPassagemFacialSet),
      pctSeguroFormula: Array.from(pctSeguroFormulaSet),
      totalComissaoKpi,
      totalComissaoKpiSeguro,
      totalComissao,
      comissaoDifDetalhe,
      comissaoMetaProdDetalhe: comissaoMetaProdDetalhe ,
      produtosDiferenciados,
      totalVendas: vendas.length
    };
  }, [vendas, parametros, produtos, regraProdutoMap, metasProduto, metaGeral, regras, metaProdEnabled]);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Vendas." });
  const labelComissao = resumo ? buildKpiLabel("Comissão", resumo.pctComissaoGeral || []) : "Comissão";
  const labelPassagemFacial = resumo ? buildKpiLabel("Passagem Facial", resumo.pctPassagemFacial || []) : "Passagem Facial";
  const labelSeguro = resumo ? buildKpiLabelFromList("Seguro Viagem", resumo.pctSeguroFormula || []) : "Seguro Viagem";
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base bg-transparent shadow-none p-0", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-stack-buttons sm:hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => setShowFilters(true), children: "Filtros" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => setShowCalculator(true), children: "Calculadora" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "hidden sm:block", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row mb-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Período" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "form-select", value: preset, onChange: (e) => setPreset(e.target.value), children: PERIODO_OPCOES.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.label }, o.id)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Início" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: formatPeriodoLabel(periodo.inicio), readOnly: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Fim" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: formatPeriodoLabel(periodo.fim), readOnly: true })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "form-group",
            style: { justifyContent: "flex-end", alignItems: "flex-end" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", style: { visibility: "hidden" }, children: "Calculadora" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn-light",
                  onClick: () => setShowCalculator(true),
                  children: "Calculadora"
                }
              )
            ]
          }
        )
      ] }) })
    ] }),
    showFilters && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-drawer-backdrop", onClick: () => setShowFilters(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mobile-drawer-panel",
        role: "dialog",
        "aria-modal": "true",
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Filtros" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn-ghost", onClick: () => setShowFilters(false), children: "✕" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Período" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { className: "form-select", value: preset, onChange: (e) => setPreset(e.target.value), children: PERIODO_OPCOES.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o.id, children: o.label }, o.id)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Início" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: formatPeriodoLabel(periodo.inicio), readOnly: true })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Fim" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { className: "form-input", value: formatPeriodoLabel(periodo.fim), readOnly: true })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              style: { marginTop: 12, width: "100%" },
              onClick: () => setShowFilters(false),
              children: "Aplicar filtros"
            }
          )
        ]
      }
    ) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados..." }),
    !loading && resumo && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-center font-bold text-lg mb-4", children: "Como está seu Progresso" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 mb-1", style: { gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", style: { color: "#16a34a" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta do mês" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: (metaGeral?.meta_geral || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", style: { color: "#ca8a04" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: `Total Bruto (${resumo.pctMetaGeral.toFixed(2).replace(".", ",")}%)` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", style: { color: "#c2410c" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Total Líquido" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", style: { color: "#0ea5e9" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Taxas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalTaxas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", style: { color: "#2563eb" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalVendas })
          ] }),
          resumo.totalValorMetaDiferenciada > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas Diferenciadas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalValorMetaDiferenciada.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] }),
          resumo.totalValorMetaEscalonavel > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas Escalonável" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalValorMetaEscalonavel.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] }),
          resumo.totalValorMetaGeral > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Produtos com meta geral" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalValorMetaGeral.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", fontWeight: 700, fontSize: 18, margin: "0 0 16px" }, children: "Seus Valores a Receber" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "kpi-grid",
            style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: labelComissao }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.comissaoGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: labelPassagemFacial }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.comissaoPassagemFacial.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão total" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalComissaoKpi.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card flex flex-col items-center text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: labelSeguro }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.comissaoSeguroViagem.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card kpi-highlight flex flex-col items-center text-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão + Seguro" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: resumo.totalComissaoKpiSeguro.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) })
              ] })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      CalculatorModal,
      {
        open: showCalculator,
        onClose: () => setShowCalculator(false)
      }
    )
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
