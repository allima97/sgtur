import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Parametros = {
  usar_taxas_na_meta: boolean;
  foco_valor: "bruto" | "liquido";
  foco_faturamento: "bruto" | "liquido";
};

type UserCtx = {
  id: string;
  nome: string;
  tipo?: string;
};

type MetaVendedor = {
  id: string;
  meta_geral: number;
};

type MetaProduto = {
  produto_id: string;
  valor: number;
};

type Regra = {
  id: string;
  tipo: "GERAL" | "ESCALONAVEL";
  meta_nao_atingida: number | null;
  meta_atingida: number | null;
  super_meta: number | null;
  commission_tier?: Tier[];
};

type RegraProduto = {
  produto_id: string;
  rule_id: string | null;
  fix_meta_nao_atingida: number | null;
  fix_meta_atingida: number | null;
  fix_super_meta: number | null;
};

type Produto = {
  id: string;
  nome: string | null;
  regra_comissionamento: string;
  soma_na_meta: boolean;
  usa_meta_produto?: boolean | null;
  meta_produto_valor?: number | null;
  comissao_produto_meta_pct?: number | null;
  descontar_meta_geral?: boolean | null;
  exibe_kpi_comissao?: boolean | null;
};

type Recibo = {
  valor_total: number | null;
  valor_taxas: number | null;
  produto_id: string | null;
  tipo_produtos?: Produto | null;
  regra_produto?: RegraProduto | null;
};

type Tier = {
  faixa: "PRE" | "POS";
  de_pct: number;
  ate_pct: number;
  inc_pct_meta: number;
  inc_pct_comissao: number;
};

type Venda = {
  id: string;
  data_lancamento: string;
  cancelada: boolean | null;
  vendas_recibos: Recibo[];
};

const PERIODO_OPCOES = [
  { id: "mes_atual", label: "Mês atual" },
  { id: "mes_anterior", label: "Mês anterior" },
  { id: "trim", label: "Últimos 3 meses" },
  { id: "sem", label: "Últimos 6 meses" },
  { id: "ano", label: "Últimos 12 meses" },
];

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function formatISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function calcPeriodo(preset: string) {
  const hoje = new Date();
  let inicio: Date;
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

function formatPeriodoLabel(value: string) {
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
    "dez",
  ];
  const partes = value.split("-");
  if (partes.length < 3) return value;
  const [ano, mes, dia] = partes;
  const mesIdx = Number(mes) - 1;
  const mesLabel = meses[mesIdx] || mes;
  return `${dia}-${mesLabel}-${ano}`;
}

function isSeguroProduto(produto?: Produto | null) {
  const nome = (produto?.nome || "").toLowerCase();
  return nome.includes("seguro");
}

export default function ComissionamentoIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Vendas");
  const metaProdEnabled = import.meta.env.PUBLIC_META_PRODUTO_ENABLED !== "false";
  const [user, setUser] = useState<UserCtx | null>(null);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [metaGeral, setMetaGeral] = useState<MetaVendedor | null>(null);
  const [metaIds, setMetaIds] = useState<string[]>([]);
  const [metasProduto, setMetasProduto] = useState<MetaProduto[]>([]);
  const [regras, setRegras] = useState<Record<string, Regra>>({});
  const [regraProdutoMap, setRegraProdutoMap] = useState<Record<string, RegraProduto>>({});
  const [produtos, setProdutos] = useState<Record<string, Produto>>({});
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [suportaExibeKpi, setSuportaExibeKpi] = useState(true);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("mes_atual");
  const [periodo, setPeriodo] = useState(() => calcPeriodo("mes_atual"));

  useEffect(() => {
    if (loadingPerm || !ativo) return;
    carregarTudo();
  }, [loadingPerm, ativo, preset, permissao]);

  useEffect(() => {
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

      const { data: usuarioDb } = await supabase
        .from("users")
        .select("id, company_id, user_types(name)")
        .eq("id", userId)
        .maybeSingle();
      const tipoUser =
        ((usuarioDb?.user_types?.name || "") as string).toUpperCase();
      const isUsuarioVendedor = tipoUser.includes("VENDEDOR");
      const companyId = (usuarioDb as any)?.company_id || null;

      setUser({
        id: userId,
        nome: auth?.user?.email || "",
        tipo: tipoUser,
      });

      const paramsCols = "usar_taxas_na_meta, foco_valor, foco_faturamento";
      let paramsData: any = null;
      if (companyId) {
        const { data } = await supabase
          .from("parametros_comissao")
          .select(paramsCols)
          .eq("company_id", companyId)
          .maybeSingle();
        paramsData = data;
      }
      if (!paramsData) {
        const { data } = await supabase
          .from("parametros_comissao")
          .select(paramsCols)
          .is("company_id", null)
          .maybeSingle();
        paramsData = data;
      }

      const periodoMeta = periodoAtual.inicio.slice(0, 7) + "-01";
      let metasQuery = supabase
        .from("metas_vendedor")
        .select("id, meta_geral")
        .eq("periodo", periodoMeta);
      if (isUsuarioVendedor) {
        metasQuery = metasQuery.eq("vendedor_id", userId);
      }
      const { data: metasData, error: metasError } = await metasQuery;
      if (metasError) throw metasError;
      const metasList = (metasData || []) as MetaVendedor[];
      const metaIds = metasList.map((m) => m.id);
      const metaSum = metasList.reduce((sum, m) => sum + (m.meta_geral || 0), 0);
      setMetaIds(metaIds);
      setMetaGeral(metaIds.length > 0 ? { id: metaIds[0], meta_geral: metaSum } : null);

      const tipoProdBaseCols =
        "id, nome, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral";

      const tentarSelectProdutos = async (incluiExibe: boolean) => {
        const cols = incluiExibe ? `${tipoProdBaseCols}, exibe_kpi_comissao` : tipoProdBaseCols;
        return supabase.from("tipo_produtos").select(cols);
      };

      let produtosDataRes = await tentarSelectProdutos(true);
      let suportaKpi = true;
      if (produtosDataRes.error && produtosDataRes.error.message?.toLowerCase().includes("exibe_kpi_comissao")) {
        suportaKpi = false;
        produtosDataRes = await tentarSelectProdutos(false);
      }

      const nestedTipoProdCols = suportaKpi
        ? "id, nome, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao"
        : "id, nome, regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral";

      let vendasQuery = supabase
        .from("vendas")
        .select(
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
        )
        .eq("cancelada", false)
        .gte("data_lancamento", periodoAtual.inicio)
        .lte("data_lancamento", periodoAtual.fim);
      if (!isAdminPermissao && userId) {
        vendasQuery = vendasQuery.eq("vendedor_id", userId);
      }
      let vendasDataRes = await vendasQuery;

      if (vendasDataRes.error && vendasDataRes.error.message?.toLowerCase().includes("exibe_kpi_comissao")) {
        let fallbackQuery = supabase
          .from("vendas")
          .select(
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
          )
          .eq("cancelada", false)
          .gte("data_lancamento", periodoAtual.inicio)
          .lte("data_lancamento", periodoAtual.fim);
        if (!isAdminPermissao && userId) {
          fallbackQuery = fallbackQuery.eq("vendedor_id", userId);
        }
        vendasDataRes = await fallbackQuery;
        suportaKpi = false;
      }

      const metasProdPromise =
        metaIds.length > 0
          ? supabase
              .from("metas_vendedor_produto")
              .select("produto_id, valor")
              .in("meta_vendedor_id", metaIds)
          : Promise.resolve({ data: [], error: null as null });

      const [metasProdDataRes, regrasDataRes, regrasProdDataRes] = await Promise.all([
        metasProdPromise,
        supabase
          .from("commission_rule")
          .select("id, tipo, meta_nao_atingida, meta_atingida, super_meta, commission_tier (faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao)"),
        supabase
          .from("product_commission_rule")
          .select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta"),
      ]);

      const metasProdData = metasProdDataRes.data;
      const regrasData = regrasDataRes.data;
      const regrasProdData = regrasProdDataRes.data;
      const produtosData = produtosDataRes.data;
      const vendasData = vendasDataRes.data;

      setSuportaExibeKpi(suportaKpi);

      const regrasMap: Record<string, Regra> = {};
      (regrasData || []).forEach((r: any) => {
        regrasMap[r.id] = {
          id: r.id,
          tipo: (r.tipo || "GERAL") as any,
          meta_nao_atingida: r.meta_nao_atingida,
          meta_atingida: r.meta_atingida,
          super_meta: r.super_meta,
          commission_tier: r.commission_tier || [],
        };
      });

      const regProdMap: Record<string, RegraProduto> = {};
      (regrasProdData || []).forEach((rp: any) => {
        regProdMap[rp.produto_id] = {
          produto_id: rp.produto_id,
          rule_id: rp.rule_id,
          fix_meta_nao_atingida: rp.fix_meta_nao_atingida,
          fix_meta_atingida: rp.fix_meta_atingida,
          fix_super_meta: rp.fix_super_meta,
        };
      });

      const prodMap: Record<string, Produto> = {};
      (produtosData || []).forEach((p: any) => {
        prodMap[p.id] = {
          id: p.id,
          nome: p.nome,
          regra_comissionamento: p.regra_comissionamento,
          soma_na_meta: p.soma_na_meta,
          usa_meta_produto: p.usa_meta_produto,
          meta_produto_valor: p.meta_produto_valor,
          comissao_produto_meta_pct: p.comissao_produto_meta_pct,
          descontar_meta_geral: p.descontar_meta_geral,
          exibe_kpi_comissao: suportaKpi ? p.exibe_kpi_comissao : undefined,
        };
      });

      setParametros(
        paramsData
          ? ({
              usar_taxas_na_meta: !!paramsData.usar_taxas_na_meta,
              foco_valor: paramsData.foco_valor === "liquido" ? "liquido" : "bruto",
              foco_faturamento:
                paramsData.foco_faturamento === "liquido" ? "liquido" : "bruto",
            } as Parametros)
          : { usar_taxas_na_meta: true, foco_valor: "bruto", foco_faturamento: "bruto" }
      );
      setMetasProduto((metasProdData || []) as MetaProduto[]);
      setRegras(regrasMap);
      setRegraProdutoMap(regProdMap);
      setProdutos(prodMap);
      setVendas((vendasData || []) as any);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar dados de comissionamento.");
    } finally {
      setLoading(false);
    }
  }

  function calcularPctEscalonavel(regra: Regra, pctMeta: number) {
    const faixa = pctMeta < 100 ? "PRE" : "POS";
    const tiers = (regra.commission_tier || []).filter((t) => t.faixa === faixa);
    const tier = tiers.find((t) => pctMeta >= Number(t.de_pct) && pctMeta <= Number(t.ate_pct));

    const base =
      faixa === "PRE"
        ? regra.meta_nao_atingida ?? regra.meta_atingida ?? 0
        : regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;

    if (!tier) {
      // fallback para fora das faixas: usa base/super_meta
      if (faixa === "POS" && pctMeta >= 120) {
        return regra.super_meta ?? base;
      }
      return base;
    }

    const incMeta = Number(tier.inc_pct_meta || 0);
    const incCom = Number(tier.inc_pct_comissao || 0); // em pontos percentuais

    if (incMeta <= 0) {
      // se não houver incremento definido, usa o inc_pct_comissao como valor absoluto
      return incCom || base;
    }

    const steps = Math.max(0, Math.floor((pctMeta - Number(tier.de_pct)) / incMeta));
    const pct = base + steps * (incCom / 100);
    return pct;
  }

  const resumo = useMemo(() => {
    if (!parametros) return null;

    // Map meta por produto para cálculo de diferenciados
    const metasProdutoMap: Record<string, number> = {};
    metasProduto.forEach((m) => {
      metasProdutoMap[m.produto_id] = m.valor;
    });

    // Agregadores por produto
    const baseMetaPorProduto: Record<string, number> = {};
    const brutoPorProduto: Record<string, number> = {};
    const liquidoPorProduto: Record<string, number> = {};

    let baseMeta = 0;
    let totalBruto = 0;
    let totalTaxas = 0;
    let comissaoGeral = 0;
    let comissaoDif = 0;
    const comissaoDifDetalhe: Record<string, number> = {};
    const produtosDiferenciados: string[] = [];
    let comissaoFixaProdutos = 0;
    let comissaoMetaProd = 0;
    const comissaoMetaProdDetalhe: Record<string, number> = {};
    let comissaoPassagemFacial = 0;
    let comissaoSeguroViagem = 0;
    let totalValorMetaDiferenciada = 0;
    let totalValorMetaEscalonavel = 0;
    let totalValorMetaGeral = 0;
    const usaFocoFaturamentoLiquido = parametros.foco_faturamento === "liquido";

    Object.values(produtos).forEach((p) => {
      if (p.regra_comissionamento === "diferenciado") {
        produtosDiferenciados.push(p.id);
        comissaoDifDetalhe[p.id] = 0; // garante cartão mesmo sem recibos
      }
      if (p.usa_meta_produto) {
        comissaoMetaProdDetalhe[p.id] = 0;
      }
    });

    // 1) Agrega totais por produto e base de meta
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
    const pctMetaGeral =
      metaGeral?.meta_geral && metaGeral.meta_geral > 0 ? (baseMeta / metaGeral.meta_geral) * 100 : 0;

    // 2) Calcula comissões com base nos agregados
    Object.keys(brutoPorProduto).forEach((prodId) => {
      const prod = produtos[prodId];
      if (!prod) return;

      const valorLiquidoProduto = liquidoPorProduto[prodId] || 0;
      const baseCom = usaFocoFaturamentoLiquido
        ? liquidoPorProduto[prodId] || 0
        : brutoPorProduto[prodId] || 0;
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
        const pctMetaProd = temMetaProd ? (baseMetaProd / metaProd) * 100 : 0;
        const pctCom = temMetaProd
          ? baseMetaProd < metaProd
            ? 0
            : pctMetaProd >= 120
            ? regProd.fix_super_meta ?? regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0
            : regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0
          : regProd.fix_meta_nao_atingida ?? regProd.fix_meta_atingida ?? regProd.fix_super_meta ?? 0;
        const val = baseCom * (pctCom / 100);
        comissaoFixaProdutos += val;
        const jogaParaGeral = prod.soma_na_meta && !prod.usa_meta_produto;
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
        const reg = ruleId ? regras[ruleId] : undefined;
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
        const isPassagemFacial = normalizedNome.includes("passagem facial");
        if (isPassagemFacial) {
          comissaoPassagemFacial += valGeral;
        } else {
          comissaoGeral += valGeral;
        }

        if (metaProdEnabled && prod.usa_meta_produto && prod.meta_produto_valor && prod.comissao_produto_meta_pct) {
          const baseMetaProd = baseMetaPorProduto[prodId] || 0;
          const pctMetaProd = (baseMetaProd / prod.meta_produto_valor) * 100;
          const atingiuMetaProd = pctMetaProd >= 100;
          if (atingiuMetaProd) {
            const valMetaProd = baseCom * ((prod.comissao_produto_meta_pct || 0) / 100);
            const diff = prod.descontar_meta_geral === false ? valMetaProd : Math.max(valMetaProd - valGeral, 0);
            comissaoMetaProd += diff;
            comissaoMetaProdDetalhe[prodId] = (comissaoMetaProdDetalhe[prodId] || 0) + diff;
            if (isSeguro) {
              comissaoSeguroViagem += diff;
            }
          }
        }
      }
    });

    const totalComissao = metaProdEnabled
      ? comissaoGeral + comissaoDif + comissaoMetaProd + comissaoPassagemFacial
      : comissaoGeral + comissaoDif + comissaoPassagemFacial;
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
      comissaoMetaProd: metaProdEnabled ? comissaoMetaProd : 0,
      comissaoPassagemFacial,
      comissaoSeguroViagem,
      totalComissaoKpi,
      totalComissaoKpiSeguro,
      totalComissao,
      comissaoDifDetalhe,
      comissaoMetaProdDetalhe: metaProdEnabled ? comissaoMetaProdDetalhe : {},
      produtosDiferenciados,
      totalVendas: vendas.length,
    };
  }, [vendas, parametros, produtos, regraProdutoMap, metasProduto, metaGeral, regras, metaProdEnabled]);

  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!ativo) return <div>Você não possui acesso ao módulo de Vendas.</div>;

  const cardColStyle = {};

  return (
    <div className="card-base bg-transparent shadow-none p-0">
      <div className="card-base mb-3">
        <div className="form-row mb-0">
          <div className="form-group">
            <label className="form-label">Período</label>
            <select className="form-select" value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PERIODO_OPCOES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
            <div className="form-group">
              <label className="form-label">Início</label>
              <input className="form-input" value={formatPeriodoLabel(periodo.inicio)} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Fim</label>
              <input className="form-input" value={formatPeriodoLabel(periodo.fim)} readOnly />
            </div>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {loading && <div>Carregando dados...</div>}

      {!loading && resumo && (
        <>
          <div className="card-base mb-3">
            <div className="text-center font-bold text-lg mb-4">Como está seu Progresso</div>
            <div className="grid gap-3 mb-1" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
              <div className="kpi-card flex flex-col items-center text-center" style={{ color: '#16a34a' }}>
                <div className="kpi-label">Meta do mês</div>
                <div className="kpi-value">
                  {(metaGeral?.meta_geral || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center" style={{ color: '#ca8a04' }}>
                <div className="kpi-label">Total Bruto</div>
                <div className="kpi-value">
                  {resumo.totalBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center" style={{ color: '#c2410c' }}>
                <div className="kpi-label">Total Líquido</div>
                <div className="kpi-value">
                  {resumo.totalLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center" style={{ color: '#0ea5e9' }}>
                <div className="kpi-label">Taxas</div>
                <div className="kpi-value">
                  {resumo.totalTaxas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center" style={{ color: '#2563eb' }}>
                <div className="kpi-label">Vendas</div>
                <div className="kpi-value">{resumo.totalVendas}</div>
              </div>
              {resumo.totalValorMetaDiferenciada > 0 && (
                <div className="kpi-card flex flex-col items-center text-center">
                  <div className="kpi-label">Metas Diferenciadas</div>
                  <div className="kpi-value">
                    {resumo.totalValorMetaDiferenciada.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
              )}
              {resumo.totalValorMetaEscalonavel > 0 && (
                <div className="kpi-card flex flex-col items-center text-center">
                  <div className="kpi-label">Meta Escalonável</div>
                  <div className="kpi-value">
                    {resumo.totalValorMetaEscalonavel.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
              )}
              {resumo.totalValorMetaGeral > 0 && (
                <div className="kpi-card flex flex-col items-center text-center">
                  <div className="kpi-label">Produtos com meta geral</div>
                  <div className="kpi-value">
                    {resumo.totalValorMetaGeral.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-base">
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, margin: "0 0 16px" }}>
              Seus Valores a Receber
            </div>
            <div
              className="kpi-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
            >
              <div className="kpi-card flex flex-col items-center text-center">
                <div className="kpi-label">Comissão</div>
                <div className="kpi-value">
                  {resumo.comissaoGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center">
                <div className="kpi-label">Passagem Facial</div>
                <div className="kpi-value">
                  {resumo.comissaoPassagemFacial.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center">
                <div className="kpi-label">Comissão total</div>
                <div className="kpi-value">
                  {resumo.totalComissaoKpi.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              </div>
              <div className="kpi-card flex flex-col items-center text-center">
                <div className="kpi-label">Seguro Viagem</div>
                <div className="kpi-value">
                  {resumo.comissaoSeguroViagem.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              </div>
              <div className="kpi-card kpi-highlight flex flex-col items-center text-center">
                <div className="kpi-label">Comissão + Seguro</div>
                <div className="kpi-value">
                  {resumo.totalComissaoKpiSeguro.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
