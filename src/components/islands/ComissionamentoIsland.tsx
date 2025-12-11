import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Parametros = {
  usar_taxas_na_meta: boolean;
  foco_valor: "bruto" | "liquido";
};

type UserCtx = {
  id: string;
  nome: string;
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
};

type Recibo = {
  valor_total: number | null;
  valor_taxas: number | null;
  produto_id: string | null;
  produto?: {
    id: string;
    nome: string | null;
    regra_comissionamento: string;
    soma_na_meta: boolean;
  } | null;
  regra_produto?: RegraProduto | null;
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

export default function ComissionamentoIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Vendas");
  const [user, setUser] = useState<UserCtx | null>(null);
  const [parametros, setParametros] = useState<Parametros | null>(null);
  const [metaGeral, setMetaGeral] = useState<MetaVendedor | null>(null);
  const [metasProduto, setMetasProduto] = useState<MetaProduto[]>([]);
  const [regras, setRegras] = useState<Record<string, Regra>>({});
  const [regraProdutoMap, setRegraProdutoMap] = useState<Record<string, RegraProduto>>({});
  const [produtos, setProdutos] = useState<Record<string, Produto>>({});
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [preset, setPreset] = useState<string>("mes_atual");
  const [periodo, setPeriodo] = useState(() => calcPeriodo("mes_atual"));

  useEffect(() => {
    if (loadingPerm || !ativo) return;
    carregarTudo();
  }, [loadingPerm, ativo, preset]);

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
      setUser({ id: userId, nome: auth?.user?.email || "" });

      const periodoAtual = calcPeriodo(preset);

      const { data: paramsData } = await supabase
        .from("parametros_comissao")
        .select("usar_taxas_na_meta, foco_valor")
        .maybeSingle();

      const { data: metaData } = await supabase
        .from("metas_vendedor")
        .select("id, meta_geral")
        .eq("vendedor_id", userId)
        .eq("periodo", periodoAtual.inicio.slice(0, 7) + "-01")
        .maybeSingle();

      const [metasProdDataRes, regrasDataRes, regrasProdDataRes, produtosDataRes, vendasDataRes] = await Promise.all([
        supabase
          .from("metas_vendedor_produto")
          .select("produto_id, valor")
          .eq("meta_vendedor_id", metaData?.id || ""),
        supabase.from("commission_rule").select("id, tipo, meta_nao_atingida, meta_atingida, super_meta"),
        supabase
          .from("product_commission_rule")
          .select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta"),
        supabase.from("tipo_produtos").select("id, nome, regra_comissionamento, soma_na_meta"),
        supabase
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
              id, nome, regra_comissionamento, soma_na_meta
            )
          )
        `
          )
          .eq("cancelada", false)
          .gte("data_lancamento", periodoAtual.inicio)
          .lte("data_lancamento", periodoAtual.fim),
      ]);

      const metasProdData = metasProdDataRes.data;
      const regrasData = regrasDataRes.data;
      const regrasProdData = regrasProdDataRes.data;
      const produtosData = produtosDataRes.data;
      const vendasData = vendasDataRes.data;

      const regrasMap: Record<string, Regra> = {};
      (regrasData || []).forEach((r: any) => {
        regrasMap[r.id] = {
          id: r.id,
          tipo: (r.tipo || "GERAL") as any,
          meta_nao_atingida: r.meta_nao_atingida,
          meta_atingida: r.meta_atingida,
          super_meta: r.super_meta,
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
        };
      });

      setParametros(
        paramsData
          ? ({
              usar_taxas_na_meta: !!paramsData.usar_taxas_na_meta,
              foco_valor: (paramsData.foco_valor as any) || "bruto",
            } as Parametros)
          : { usar_taxas_na_meta: true, foco_valor: "bruto" }
      );
      setMetaGeral(metaData as any);
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

  const resumo = useMemo(() => {
    if (!parametros) return null;

    // Map meta por produto para cálculo de diferenciados
    const metasProdutoMap: Record<string, number> = {};
    metasProduto.forEach((m) => {
      metasProdutoMap[m.produto_id] = m.valor;
    });

    // Agregadores por produto
    const baseMetaPorProduto: Record<string, number> = {};
    const liquidoPorProduto: Record<string, number> = {};

    let baseMeta = 0;
    let valorLiquido = 0;
    let comissaoGeral = 0;
    let comissaoDif = 0;
    const comissaoDifDetalhe: Record<string, number> = {};
    const produtosDiferenciados: string[] = [];

    Object.values(produtos).forEach((p) => {
      if (p.regra_comissionamento === "diferenciado") {
        produtosDiferenciados.push(p.id);
        comissaoDifDetalhe[p.id] = 0; // garante cartão mesmo sem recibos
      }
    });

    // 1) Agrega totais por produto e base de meta
    vendas.forEach((v) => {
      (v.vendas_recibos || []).forEach((r) => {
        const prodId = r.tipo_produtos?.id || r.produto_id || "";
        const prod = produtos[prodId];
        if (!prod) return;
        const valTotal = Number(r.valor_total || 0);
        const valTaxas = Number(r.valor_taxas || 0);
        const valParaMeta =
          parametros.foco_valor === "liquido"
            ? valTotal
            : parametros.usar_taxas_na_meta
            ? valTotal + valTaxas
            : valTotal;

        liquidoPorProduto[prodId] = (liquidoPorProduto[prodId] || 0) + valTotal;
        baseMetaPorProduto[prodId] = (baseMetaPorProduto[prodId] || 0) + valParaMeta;

        if (prod.soma_na_meta) baseMeta += valParaMeta;
        valorLiquido += valTotal;
      });
    });

    const pctMetaGeral =
      metaGeral?.meta_geral && metaGeral.meta_geral > 0 ? (baseMeta / metaGeral.meta_geral) * 100 : 0;

    // 2) Calcula comissões com base nos agregados
    Object.keys(liquidoPorProduto).forEach((prodId) => {
      const prod = produtos[prodId];
      if (!prod) return;

      const baseCom = liquidoPorProduto[prodId] || 0;
      if (prod.regra_comissionamento === "diferenciado") {
        const regProd = regraProdutoMap[prodId];
        if (!regProd) return;
        const metaProd = metasProdutoMap[prodId] || 0;
        const baseMetaProd = baseMetaPorProduto[prodId] || 0;
        const pctMetaProd = metaProd > 0 ? (baseMetaProd / metaProd) * 100 : 0;
        const pctCom =
          pctMetaProd >= 120
            ? regProd.fix_super_meta ?? regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0
            : pctMetaProd >= 100
            ? regProd.fix_meta_atingida ?? regProd.fix_meta_nao_atingida ?? 0
            : regProd.fix_meta_nao_atingida ?? 0;
        const val = baseCom * (pctCom / 100);
        comissaoDif += val;
        comissaoDifDetalhe[prodId] = val;
      } else {
        const ruleId = regraProdutoMap[prodId]?.rule_id;
        const reg = ruleId ? regras[ruleId] : undefined;
        let pctCom = 0;
        if (reg) {
          if (pctMetaGeral < 100) pctCom = reg.meta_nao_atingida || 0;
          else if (pctMetaGeral >= 120) pctCom = reg.super_meta ?? reg.meta_atingida ?? reg.meta_nao_atingida ?? 0;
          else pctCom = reg.meta_atingida ?? reg.meta_nao_atingida ?? 0;
        }
        comissaoGeral += baseCom * (pctCom / 100);
      }
    });

    return {
      baseMeta,
      valorLiquido,
      pctMetaGeral,
      comissaoGeral,
      comissaoDif,
      totalComissao: comissaoGeral + comissaoDif,
      comissaoDifDetalhe,
      produtosDiferenciados,
    };
  }, [vendas, parametros, produtos, regraProdutoMap, metasProduto, metaGeral, regras]);

  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!ativo) return <div>Você não possui acesso ao módulo de Vendas.</div>;

  const cardColStyle = {
    flexDirection: "column" as const,
    alignItems: "center" as const,
    textAlign: "center" as const,
  };

  return (
    <div className="card-base" style={{ background: "transparent", boxShadow: "none", padding: 0 }}>
      <div className="card-base" style={{ marginBottom: 12 }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
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
            <input className="form-input" value={periodo.inicio} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Fim</label>
            <input className="form-input" value={periodo.fim} readOnly />
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
          <div className="card-base" style={{ marginBottom: 12 }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
              Como está seu Progresso
            </div>
            <div
              className="kpi-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 4,
              }}
            >
              <div className="kpi-card" style={{ ...cardColStyle, color: "#16a34a" }}>
                <div className="kpi-label">Meta do mês</div>
                <div className="kpi-value">
                  {(metaGeral?.meta_geral || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card" style={{ ...cardColStyle, color: "#ca8a04" }}>
                <div className="kpi-label">Vendas do mês</div>
                <div className="kpi-value">
                  {resumo.baseMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              <div className="kpi-card" style={{ ...cardColStyle, color: "#2563eb" }}>
                <div className="kpi-label">Meta atingida</div>
                <div className="kpi-value">{resumo.pctMetaGeral.toFixed(1)}%</div>
              </div>
              <div className="kpi-card" style={{ ...cardColStyle, color: "#c2410c" }}>
                <div className="kpi-label">Base para comissionamento</div>
                <div className="kpi-value">
                  {resumo.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
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
              <div className="kpi-card" style={cardColStyle}>
                <div className="kpi-label">Comissão (geral)</div>
                <div className="kpi-value">
                  {resumo.comissaoGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
              {(resumo.produtosDiferenciados || []).map((pid) => (
                <div key={pid} className="kpi-card" style={cardColStyle}>
                  <div className="kpi-label">Comissão {produtos[pid]?.nome || "(produto)"}</div>
                  <div className="kpi-value">
                    {(resumo.comissaoDifDetalhe?.[pid] || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </div>
              ))}
              <div className="kpi-card kpi-highlight" style={cardColStyle}>
                <div className="kpi-label">Comissão total</div>
                <div className="kpi-value">
                  {resumo.totalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
