export type Tier = {
  faixa: "PRE" | "POS";
  de_pct: number;
  ate_pct: number;
  inc_pct_meta: number;
  inc_pct_comissao: number;
};

export type Regra = {
  id: string;
  tipo: "GERAL" | "ESCALONAVEL";
  meta_nao_atingida: number | null;
  meta_atingida: number | null;
  super_meta: number | null;
  commission_tier?: Tier[];
};

export type RegraProduto = {
  produto_id: string;
  rule_id: string | null;
  fix_meta_nao_atingida: number | null;
  fix_meta_atingida: number | null;
  fix_super_meta: number | null;
};

export type ParametrosComissao = {
  usar_taxas_na_meta: boolean;
  foco_valor?: "bruto" | "liquido";
  foco_faturamento?: "bruto" | "liquido";
};

export function calcularPctEscalonavel(regra: Regra, pctMeta: number) {
  const faixa = pctMeta >= 0 ? (pctMeta < 100 ? "PRE" : "POS") : "PRE";
  const base =
    faixa === "PRE"
      ? regra.meta_nao_atingida ?? regra.meta_atingida ?? 0
      : regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;

  const tier = (regra.commission_tier || [])
    .filter((t) => t.faixa === faixa)
    .find((t) => {
      const valor = Number(pctMeta || 0);
      return valor >= t.de_pct && valor <= t.ate_pct;
    });

  if (!tier) {
    if (pctMeta >= 120) {
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
  return base + steps * (incCom / 100);
}

export function calcularPctPorRegra(regra: Regra, pctMeta: number): number {
  if (regra.tipo === "ESCALONAVEL") {
    return calcularPctEscalonavel(regra, pctMeta);
  }

  if (pctMeta < 100) return regra.meta_nao_atingida ?? 0;
  if (pctMeta >= 120) {
    return regra.super_meta ?? regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
  }
  return regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
}
