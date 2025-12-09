export type CommissionTemplate = {
  id: string;
  modo: "FIXO" | "ESCALONAVEL";
  meta_nao_atingida: number | null;
  meta_atingida: number | null;
  super_meta: number | null;

  esc_ativado: boolean;
  esc_inicial_pct: number | null;
  esc_final_pct: number | null;
  esc_incremento_pct_meta: number | null;
  esc_incremento_pct_comissao: number | null;

  esc2_ativado: boolean;
  esc2_inicial_pct: number | null;
  esc2_final_pct: number | null;
  esc2_incremento_pct_meta: number | null;
  esc2_incremento_pct_comissao: number | null;
};

export type ParametrosComissao = {
  usar_taxas_na_meta: boolean;
  foco_valor?: "bruto" | "liquido";
};

export type ResumoPeriodo = {
  valor_total_bruto: number;   // soma das vendas (com taxas)
  valor_total_taxas: number;   // soma das taxas
  percentual_meta_atingido: number; // ex: 87.5 (em %)
};

/**
 * Base da meta:
 * - se usar_taxas_na_meta = true → valor_total_bruto
 * - se false → valor_liquido (sem taxas)
 */
export function calcularBaseMeta(
  resumo: ResumoPeriodo,
  params: ParametrosComissao
) {
  const valorLiquido =
    resumo.valor_total_bruto - resumo.valor_total_taxas;

  // foco_valor prioriza base de comparação de meta:
  if (params.foco_valor === "liquido") {
    return valorLiquido;
  }

  if (params.usar_taxas_na_meta) {
    return resumo.valor_total_bruto;
  }
  return valorLiquido;
}

/**
 * Calcula o percentual de comissão conforme template + % de meta atingida.
 */
export function calcularPercentualComissao(
  template: CommissionTemplate,
  pctMeta: number
): number {
  // Modo fixo simples
  if (template.modo === "FIXO" || !template.esc_ativado) {
    if (pctMeta < 100) {
      return template.meta_nao_atingida ?? 0;
    }
    if (pctMeta >= 100 && pctMeta < 120) {
      return template.meta_atingida ?? template.meta_nao_atingida ?? 0;
    }
    // acima de super meta
    return template.super_meta
      ?? template.meta_atingida
      ?? template.meta_nao_atingida
      ?? 0;
  }

  // Modo escalonável
  let basePct =
    template.meta_atingida
      ?? template.meta_nao_atingida
      ?? 0;

  let result = basePct;

  // ESC 1
  if (template.esc_ativado) {
    const ini = template.esc_inicial_pct ?? 100;
    const fim = template.esc_final_pct ?? pctMeta;
    const stepMeta = template.esc_incremento_pct_meta ?? 5;
    const stepCom = template.esc_incremento_pct_comissao ?? 0;

    if (pctMeta > ini && stepMeta > 0) {
      const limite = Math.min(pctMeta, fim);
      const steps = Math.floor((limite - ini) / stepMeta);
      result += steps * stepCom;
    }
  }

  // ESC 2 (faixa adicional)
  if (template.esc2_ativado) {
    const ini2 = template.esc2_inicial_pct ?? 120;
    const fim2 = template.esc2_final_pct ?? pctMeta;
    const stepMeta2 = template.esc2_incremento_pct_meta ?? 5;
    const stepCom2 = template.esc2_incremento_pct_comissao ?? 0;

    if (pctMeta > ini2 && stepMeta2 > 0) {
      const limite2 = Math.min(pctMeta, fim2);
      const steps2 = Math.floor((limite2 - ini2) / stepMeta2);
      result += steps2 * stepCom2;
    }
  }

  return result;
}

/**
 * Comissão em valor (R$):
 * - SEMPRE usa valor líquido como base da comissão.
 */
export function calcularValorComissao(
  resumo: ResumoPeriodo,
  template: CommissionTemplate,
  params: ParametrosComissao
) {
  const baseMeta = calcularBaseMeta(resumo, params);

  // "Meta teórica" pode vir de metas_vendedor (meta_geral / meta_diferenciada)
  // Aqui vamos assumir que pctMeta já foi calculado externamente:
  // pctMeta = (baseMeta / meta_planejada) * 100
  // Então essa função recebe pctMeta como parte do resumo:
  const pctMeta = resumo.percentual_meta_atingido;

  const pctComissao = calcularPercentualComissao(template, pctMeta);

  const valorLiquido =
    resumo.valor_total_bruto - resumo.valor_total_taxas;

  const valorComissao = valorLiquido * (pctComissao / 100);

  return {
    baseMeta,
    pctMeta,
    pctComissao,
    valorLiquido,
    valorComissao,
  };
}
