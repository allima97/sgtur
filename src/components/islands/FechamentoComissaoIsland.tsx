import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import {
  calcularValorComissao,
} from "../../lib/comissao";

type Usuario = {
  id: string;
  nome_completo: string;
  uso_individual: boolean;
  company_id: string | null;
};

type Template = {
  id: string;
  nome: string;
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

type MetaVendedor = {
  id: string;
  vendedor_id: string;
  periodo: string; // YYYY-MM-01
  meta_geral: number;
  meta_diferenciada: number;
  ativo: boolean;
  template_id?: string | null;
};

type VendaRecibo = {
  valor_total: number | null;
  valor_taxas: number | null;
  produto_id?: string | null;
};

type Venda = {
  id: string;
  data_lancamento: string;
  cancelada: boolean | null;
  vendas_recibos: VendaRecibo[] | null;
};

type RegraProduto = {
  id: string;
  nome: string;
  tipo: "GERAL" | "ESCALONAVEL";
  meta_nao_atingida: number | null;
  meta_atingida: number | null;
  super_meta: number | null;
  commission_tier?: {
    faixa: "PRE" | "POS";
    de_pct: number;
    ate_pct: number;
    inc_pct_meta: number;
    inc_pct_comissao: number;
  }[];
};

type ParametrosComissao = {
  usar_taxas_na_meta: boolean;
  foco_valor?: "bruto" | "liquido";
};

function getPeriodoAtualYYYYMM() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

function getPrimeiroDiaMes(periodoYYYYMM: string) {
  return `${periodoYYYYMM}-01`;
}

function getPrimeiroDiaMesSeguinte(periodoYYYYMM: string) {
  const [anoStr, mesStr] = periodoYYYYMM.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);

  const proximoMes = mes === 12 ? 1 : mes + 1;
  const anoFinal = mes === 12 ? ano + 1 : ano;

  const mesFinal = String(proximoMes).padStart(2, "0");
  return `${anoFinal}-${mesFinal}-01`;
}

export default function FechamentoComissaoIsland() {
  const { permissao, ativo, loading: loadingPermissao } = usePermissao("Metas");

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vendedores, setVendedores] = useState<Usuario[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [parametros, setParametros] = useState<ParametrosComissao | null>(null);
  const [regrasProduto, setRegrasProduto] = useState<Record<string, RegraProduto>>({});

  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>("");
  const [templateIdSelecionado, setTemplateIdSelecionado] = useState<string>("");
  const [periodo, setPeriodo] = useState<string>(getPeriodoAtualYYYYMM());

  const [metaAtual, setMetaAtual] = useState<MetaVendedor | null>(null);
  const [vendasPeriodo, setVendasPeriodo] = useState<Venda[]>([]);
  const [idsEquipe, setIdsEquipe] = useState<string[]>([]);

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Resultado do cálculo
  const [valorBruto, setValorBruto] = useState<number>(0);
  const [valorTaxas, setValorTaxas] = useState<number>(0);
  const [valorLiquido, setValorLiquido] = useState<number>(0);
  const [baseMetaUsada, setBaseMetaUsada] = useState<number>(0);
  const [pctMeta, setPctMeta] = useState<number>(0);
  const [pctComissao, setPctComissao] = useState<number>(0);
  const [valorComissao, setValorComissao] = useState<number>(0);

  function calcularPctPorRegra(regra: RegraProduto, pctMeta: number): number {
    if (regra.tipo === "GERAL") {
      if (pctMeta < 100) return regra.meta_nao_atingida ?? 0;
      if (pctMeta >= 100 && pctMeta < 120) {
        return regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
      }
      return regra.super_meta ?? regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
    }

    // Escalonável: buscar faixa PRE ou POS com pctMeta
    const faixa = pctMeta >= 0 ? (pctMeta < 100 ? "PRE" : "POS") : "PRE";
    const tiers = (regra.commission_tier || []).filter((t) => t.faixa === faixa);
    const tier = tiers.find((t) => pctMeta >= t.de_pct && pctMeta <= t.ate_pct);
    if (tier) {
      // inc_pct_meta representa base de meta (pode usar como base) e inc_pct_comissao a comissão
      return tier.inc_pct_comissao ?? 0;
    }
    return regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
  }

  // ==========================================
  // PERFIS
  // ==========================================
  const isAdmin = permissao === "admin";
  const isEdit = permissao === "edit";
  const usuarioPodeVerTodos =
    (usuario?.uso_individual === false && (isAdmin || isEdit)) || isAdmin;

  const mostrarSelectVendedor =
    usuario?.uso_individual === false && usuarioPodeVerTodos;

  // ==========================================
  // CARREGAMENTO INICIAL
  // ==========================================
  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  async function carregarDadosIniciais() {
    try {
      setCarregandoDados(true);
      setErro(null);

      // usuário logado
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }

      const { data: usersData, error: usersErr } = await supabase
        .from("users")
        .select("id, nome_completo, uso_individual, company_id");

      if (usersErr) throw usersErr;

      const logado = (usersData || []).find((u: any) => u.id === userId) as Usuario;
      setUsuario(logado || null);

      // vendedores visíveis
      let vendedoresFiltrados: Usuario[] = [];
      if (logado?.company_id) {
        vendedoresFiltrados = (usersData || []).filter(
          (u: any) => u.company_id === logado.company_id
        ) as Usuario[];
      } else {
        vendedoresFiltrados = logado ? [logado] : [];
      }
      setVendedores(vendedoresFiltrados);

      const vendedorDefault = logado?.id ?? "";
      setVendedorSelecionado(vendedorDefault);

      // templates de comissão
      const { data: templatesData, error: tempErr } = await supabase
        .from("commission_templates")
        .select("*")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (tempErr) throw tempErr;

      setTemplates((templatesData || []) as Template[]);
      if (templatesData && templatesData.length > 0) {
        setTemplateIdSelecionado(templatesData[0].id);
      }

      // parâmetros de comissão
      const parametros = await carregarParametrosComissao(logado);
      setParametros(parametros);

      // carregar metas e vendas iniciais
      if (vendedorDefault) {
        await carregarMetaDoPeriodo(vendedorDefault, periodo);
        await carregarVendasPeriodo(vendedorDefault, periodo);
      }

      // carregar regras por produto
      const { data: regrasData } = await supabase
        .from("product_commission_rule")
        .select(
          `
            produto_id,
            commission_rule:rule_id (
              id,
              nome,
              tipo,
              meta_nao_atingida,
              meta_atingida,
              super_meta,
              commission_tier (*)
            )
          `
        );
      const map: Record<string, RegraProduto> = {};
      (regrasData || []).forEach((r: any) => {
        if (r.produto_id && r.commission_rule) {
          map[r.produto_id] = r.commission_rule;
        }
      });
      setRegrasProduto(map);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados iniciais do fechamento.");
    } finally {
      setCarregandoDados(false);
    }
  }

  async function carregarParametrosComissao(user: Usuario | null) {
    if (!user) {
      return { usar_taxas_na_meta: true } as ParametrosComissao;
    }

    // 1º: uso individual → busca por owner_user_id
    if (user.uso_individual) {
      const { data } = await supabase
        .from("parametros_comissao")
        .select("*")
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (data) {
        return {
          usar_taxas_na_meta: data.usar_taxas_na_meta ?? true,
        };
      }
    }

    // 2º: corporativo → busca por company_id
    if (user.company_id) {
      const { data } = await supabase
        .from("parametros_comissao")
        .select("*")
        .eq("company_id", user.company_id)
        .maybeSingle();

      if (data) {
        return {
          usar_taxas_na_meta: data.usar_taxas_na_meta ?? true,
        };
      }
    }

    // fallback
    return { usar_taxas_na_meta: true } as ParametrosComissao;
  }

  // ==========================================
  // CARREGAR META DO PERÍODO
  // ==========================================
  async function carregarMetaDoPeriodo(vendedorId: string, periodoYYYYMM: string) {
    const periodoIni = getPrimeiroDiaMes(periodoYYYYMM);

    const { data } = await supabase
      .from("metas_vendedor")
      .select("*")
      .eq("vendedor_id", vendedorId)
      .eq("periodo", periodoIni)
      .maybeSingle();

    const meta = (data || null) as MetaVendedor | null;
    setMetaAtual(meta);

    if (meta?.template_id) {
      setTemplateIdSelecionado(meta.template_id);
    }
    return meta;
  }

  // ==========================================
  // CARREGAR VENDAS DO PERÍODO
  // ==========================================
  async function carregarEquipeIds(gestorId: string) {
    const ids: string[] = [gestorId];
    try {
      const { data, error } = await supabase
        .from("gestor_vendedor")
        .select("vendedor_id")
        .eq("gestor_id", gestorId);
      if (!error && data) {
        data.forEach((r: any) => {
          if (r.vendedor_id && !ids.includes(r.vendedor_id)) ids.push(r.vendedor_id);
        });
      }
    } catch (e) {
      console.error("Erro ao carregar equipe:", e);
    }
    setIdsEquipe(ids);
    return ids;
  }

  async function carregarVendasPeriodo(vendedorIds: string[], periodoYYYYMM: string) {
    if (!vendedorIds || vendedorIds.length === 0) {
      setVendasPeriodo([]);
      return;
    }

    const inicio = getPrimeiroDiaMes(periodoYYYYMM);
    const proxMes = getPrimeiroDiaMesSeguinte(periodoYYYYMM);

    const { data, error } = await supabase
      .from("vendas")
      .select(
        `
          id,
          data_lancamento,
          cancelada,
          vendas_recibos (
            produto_id,
            valor_total,
            valor_taxas
          )
        `
      )
      .in("vendedor_id", vendedorIds)
      .eq("cancelada", false)
      .gte("data_lancamento", inicio)
      .lt("data_lancamento", proxMes);

    if (error) {
      console.error(error);
      setErro("Erro ao carregar vendas do período.");
      setVendasPeriodo([]);
      return;
    }

    setVendasPeriodo((data || []) as Venda[]);
  }

  // ==========================================
  // REAGIR A MUDANÇA DE VENDEDOR / PERÍODO / TEMPLATE
  // ==========================================
  useEffect(() => {
    if (!vendedorSelecionado) return;
    if (!usuario) return;

    (async () => {
      setErro(null);
      const meta = await carregarMetaDoPeriodo(vendedorSelecionado, periodo);

      let vendedoresParaConsulta = [vendedorSelecionado];
      if (meta?.scope === "equipe") {
        vendedoresParaConsulta = await carregarEquipeIds(vendedorSelecionado);
      } else {
        setIdsEquipe([vendedorSelecionado]);
      }

      await carregarVendasPeriodo(vendedoresParaConsulta, periodo);
    })();
  }, [vendedorSelecionado, periodo]);

  // ==========================================
  // CÁLCULOS EM MEMÓRIA
  // ==========================================
  const valoresCalculados = useMemo(() => {
    let totalBruto = 0;
    let totalTaxas = 0;

    for (const v of vendasPeriodo) {
      for (const r of v.vendas_recibos || []) {
        const vt = r.valor_total ?? 0;
        const tx = r.valor_taxas ?? 0;
        // bruto considera valor + taxas (venda com taxas)
        totalBruto += vt + tx;
        totalTaxas += tx;
      }
    }

    const liquido = totalBruto - totalTaxas;

    return { totalBruto, totalTaxas, liquido };
  }, [vendasPeriodo]);

  // ==========================================
  // FECHAMENTO (BOTÃO CALCULAR)
  // ==========================================
  async function calcularFechamento() {
    if (!templateIdSelecionado) {
      setErro("Selecione um template de comissão.");
      return;
    }
    if (!metaAtual) {
      setErro("Defina uma meta para este período antes de calcular a comissão.");
      return;
    }
    if (!parametros) {
      setErro("Parâmetros de comissão não encontrados.");
      return;
    }

    try {
      setCalculando(true);
      setErro(null);

      const template = templates.find((t) => t.id === templateIdSelecionado);
      if (!template) {
        setErro("Template de comissão não encontrado.");
        return;
      }

      const { totalBruto, totalTaxas, liquido } = valoresCalculados;

      setValorBruto(totalBruto);
      setValorTaxas(totalTaxas);
      setValorLiquido(liquido);

      const baseMeta = parametros.foco_valor === "liquido"
        ? liquido
        : parametros.usar_taxas_na_meta
          ? totalBruto
          : liquido;
      setBaseMetaUsada(baseMeta);

      const metaPlanejada = metaAtual.meta_geral || 0;
      let porcentagemMeta = 0;

      if (metaPlanejada > 0) {
        porcentagemMeta = (baseMeta / metaPlanejada) * 100;
      }

      const resumoPeriodo = {
        valor_total_bruto: totalBruto,
        valor_total_taxas: totalTaxas,
        percentual_meta_atingido: porcentagemMeta,
      };

      const resultado = calcularValorComissao(
        resumoPeriodo as any,
        template as any,
        parametros as any
      );
      const pctBase = resultado.pctComissao;

      // Ajuste por regra de produto: pondera comissão conforme regra vinculada
      let pctComissaoFinal = pctBase;
      if (regrasProduto && vendasPeriodo.length > 0) {
        let somaPeso = 0;
        let somaPct = 0;
        vendasPeriodo.forEach((v) => {
          (v.vendas_recibos || []).forEach((r) => {
            const prodId = (r as any).produto_id;
            const regra = prodId ? regrasProduto[prodId] : null;
            const liquidoRecibo = (r.valor_total ?? 0) - (r.valor_taxas ?? 0);
            if (regra && liquidoRecibo > 0) {
              const pct = calcularPctPorRegra(regra, porcentagemMeta);
              somaPct += pct * liquidoRecibo;
              somaPeso += liquidoRecibo;
            }
          });
        });
        if (somaPeso > 0) {
          pctComissaoFinal = (somaPct / somaPeso) || pctBase;
        }
      }

      const valorComissao = liquido * (pctComissaoFinal / 100);

      setPctMeta(resultado.pctMeta);
      setPctComissao(pctComissaoFinal);
      setValorComissao(valorComissao);
    } catch (e) {
      console.error(e);
      setErro("Erro ao calcular comissão do período.");
    } finally {
      setCalculando(false);
    }
  }

  // ==========================================
  // UI
  // ==========================================

  if (loadingPermissao) return <LoadingUsuarioContext />;

  if (!ativo) {
    return <div>Acesso ao módulo de Metas & Comissões bloqueado.</div>;
  }

  if (carregandoDados) {
    return <div>Carregando dados do fechamento...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6">
      {/* BARRA DE CONTEXTO */}
      <div className="mb-4 p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-100 text-sm flex flex-wrap gap-3 items-center justify-between">
        <div>
          <strong>Módulo:</strong> Fechamento de Comissão
        </div>
        <div>
          <strong>Perfil:</strong>{" "}
          <span style={{ textTransform: "uppercase" }}>
            {usuario?.uso_individual ? "Uso Individual" : "Corporativo"}
          </span>
        </div>
        <div>
          <strong>Permissão:</strong>{" "}
          <span
            style={{
              textTransform: "uppercase",
              fontWeight: "bold",
              color:
                permissao === "admin"
                  ? "#22c55e"
                  : permissao === "edit"
                  ? "#eab308"
                  : "#ef4444",
            }}
          >
            {permissao}
          </span>
        </div>
        <div className="w-full mt-2 flex flex-wrap gap-2">
          <span>
            <strong>Período:</strong> {periodo}
          </span>
          <span>
            <strong>Vendedor:</strong>{" "}
            {vendedores.find((v) => v.id === vendedorSelecionado)?.nome_completo || "N/A"}
          </span>
          <span>
            <strong>Template:</strong>{" "}
            {templates.find((t) => t.id === templateIdSelecionado)?.nome || "Selecione"}
          </span>
          <span>
            <strong>Meta:</strong>{" "}
            {metaAtual?.meta_geral?.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }) || "N/A"}
          </span>
          <span>
            <strong>Base da meta:</strong>{" "}
            {baseMetaUsada.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
          <span>
            <strong>Foco:</strong>{" "}
            {parametros?.foco_valor === "liquido" ? "Valor líquido" : "Valor bruto"}
          </span>
        </div>
        <div className="w-full mt-2 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
          <div>
            <strong>Período:</strong> {periodo}
          </div>
          <div>
            <strong>Vendedor:</strong>{" "}
            {vendedores.find((v) => v.id === vendedorSelecionado)?.nome_completo || "N/A"}
          </div>
          <div>
            <strong>Template:</strong>{" "}
            {templates.find((t) => t.id === templateIdSelecionado)?.nome || "Selecione"}
          </div>
          <div>
            <strong>Meta:</strong>{" "}
            {metaAtual?.meta_geral?.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            }) || "N/A"}
          </div>
          <div>
            <strong>Base da meta:</strong>{" "}
            {baseMetaUsada.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <div>
            <strong>Foco:</strong>{" "}
            {parametros?.foco_valor === "liquido" ? "Valor líquido" : "Valor bruto"}
          </div>
        </div>
        {metaAtual?.scope === "equipe" && (
          <div className="w-full mt-2 text-slate-300">
            <strong>Escopo:</strong> Equipe ({idsEquipe.length} membros)
          </div>
        )}
        {metaAtual?.scope === "equipe" && idsEquipe.length > 0 && (
          <div className="w-full mt-1 text-slate-300 text-sm">
            <strong>Membros:</strong>{" "}
            {idsEquipe
              .map((id) => vendedores.find((v) => v.id === id)?.nome_completo || id)
              .join(", ")}
          </div>
        )}
      </div>

      {/* FILTROS */}
      <div className="card-base card-green mb-3">
        <div className="form-row flex flex-col md:flex-row gap-4">
          {mostrarSelectVendedor && (
            <div className="form-group flex-1 min-w-[180px]">
              <label className="form-label">Vendedor</label>
              <select
                className="form-select"
                value={vendedorSelecionado}
                onChange={(e) => setVendedorSelecionado(e.target.value)}
              >
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome_completo}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group flex-1 min-w-[180px]">
            <label className="form-label">Período</label>
            <input
              type="month"
              className="form-input"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>

          <div className="form-group flex-1 min-w-[180px]">
            <label className="form-label">Template de Comissão</label>
            <select
              className="form-select"
              value={templateIdSelecionado}
              onChange={(e) => setTemplateIdSelecionado(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.modo})
                </option>
              ))}
              {templates.length === 0 && (
                <option value="">Nenhum template disponível</option>
              )}
            </select>
          </div>
        </div>

        <div className="mt-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={calcularFechamento}
            disabled={calculando || !metaAtual}
          >
            {calculando ? "Calculando..." : "Calcular comissão do mês"}
          </button>
          {!metaAtual && (
            <span style={{ marginLeft: 10, fontSize: "0.85rem" }}>
              Defina uma meta para este período em{" "}
              <strong>Metas do Vendedor</strong>.
            </span>
          )}
        </div>

        {erro && (
          <div className="card-base card-config mt-2">
            <strong>{erro}</strong>
          </div>
        )}
      </div>

      {/* KPIs PRINCIPAIS */}
      <div
        className="mb-3 grid gap-3 md:gap-4"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
      >
        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>Meta do mês</div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {metaAtual
              ? metaAtual.meta_geral.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              : "–"}
          </div>
        </div>

        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Base da meta (usando{" "}
            {parametros?.usar_taxas_na_meta
              ? "valor bruto (com taxas)"
              : "valor líquido (sem taxas)"}
            )
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {(() => {
              const base = parametros?.usar_taxas_na_meta
                ? valorBruto
                : valorLiquido;
              return base.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              });
            })()}
          </div>
        </div>

        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            % Meta Atingida
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {pctMeta.toFixed(1)}%
          </div>
        </div>

        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            % Comissão Aplicada
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {pctComissao.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* VALORES FINANCEIROS */}
      <div
        className="mb-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Valor bruto no período (venda + taxas)
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {valorBruto.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>

        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Total de taxas no período
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {valorTaxas.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>

        <div className="card-base card-green">
          <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Valor líquido (base da comissão)
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {valorLiquido.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
        </div>
      </div>

      {/* VALOR FINAL DA COMISSÃO */}
      <div className="card-base card-green mb-3">
        <div style={{ fontSize: "0.9rem", marginBottom: 4 }}>
          Comissão estimada para o período
        </div>
        <div
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#22c55e",
          }}
        >
          {valorComissao.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </div>
        <div style={{ fontSize: "0.8rem", opacity: 0.75, marginTop: 4 }}>
          Cálculo considerando sempre o valor líquido (venda - taxas), conforme
          sua regra de negócio.
        </div>
      </div>

      {/* LISTA DAS VENDAS PARA CONFERÊNCIA */}
      <div className="card-base card-green mb-2">
        <h3>Vendas do período</h3>
        <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
          Somente vendas não canceladas com recibos vinculados.
        </div>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-green min-w-[720px]">
          <thead>
            <tr>
              <th>Data</th>
              <th>Qtd. Recibos</th>
              <th>Bruto (R$)</th>
              <th>Taxas (R$)</th>
              <th>Líquido (R$)</th>
            </tr>
          </thead>
          <tbody>
            {vendasPeriodo.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma venda encontrada no período.</td>
              </tr>
            )}

            {vendasPeriodo.map((v) => {
              let bruto = 0;
              let taxas = 0;

              for (const r of v.vendas_recibos || []) {
                const vt = r.valor_total ?? 0;
                const tx = r.valor_taxas ?? 0;
                bruto += vt + tx;
                taxas += tx;
              }

              const liquido = bruto - taxas;

              return (
                <tr key={v.id}>
                  <td>
                    {v.data_lancamento
                      ? new Date(v.data_lancamento).toLocaleDateString(
                          "pt-BR"
                        )
                      : "-"}
                  </td>
                  <td>{v.vendas_recibos?.length || 0}</td>
                  <td>
                    {bruto.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>
                    {taxas.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td>
                    {liquido.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
