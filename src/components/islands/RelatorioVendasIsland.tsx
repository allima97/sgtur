import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import * as XLSX from "xlsx";
import { exportTableToPDF } from "../../lib/pdf";
import { formatarDataParaExibicao } from "../../lib/formatDate";
import {
  ParametrosComissao,
  Regra,
  RegraProduto,
  calcularPctPorRegra,
} from "../../lib/comissaoUtils";

type Cliente = {
  id: string;
  nome: string;
  cpf: string | null;
};

type Produto = {
  id: string;
  nome: string | null;
  tipo_produto: string | null;
  cidade_id: string | null;
  regra_comissionamento?: string | null;
  soma_na_meta?: boolean | null;
  usa_meta_produto?: boolean | null;
  meta_produto_valor?: number | null;
  comissao_produto_meta_pct?: number | null;
  descontar_meta_geral?: boolean | null;
  exibe_kpi_comissao?: boolean | null;
};

type TipoProduto = {
  id: string;
  nome: string | null;
  tipo: string | null;
  regra_comissionamento?: string | null;
  soma_na_meta?: boolean | null;
  usa_meta_produto?: boolean | null;
  meta_produto_valor?: number | null;
  comissao_produto_meta_pct?: number | null;
  descontar_meta_geral?: boolean | null;
  exibe_kpi_comissao?: boolean | null;
};

type Cidade = {
  id: string;
  nome: string;
};

type MetaVendedor = {
  id: string;
  meta_geral: number;
  periodo?: string;
};

type MetaProduto = {
  produto_id: string;
  valor: number;
};

type Venda = {
  id: string;
  numero_venda: string | null;
  cliente_id: string;
  destino_id: string;
  destino_cidade_id?: string | null;
  produto_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  valor_total: number | null;
  status: string | null;
  vendas_recibos?: {
    numero_recibo: string | null;
    valor_total: number | null;
    valor_taxas: number | null;
    produto_id: string | null;
    produto_resolvido_id?: string | null;
    tipo_produtos?: { id: string; nome: string | null; tipo: string | null } | null;
    produto_resolvido?: { id: string; nome: string | null; tipo: string | null } | null;
  }[];
  destino_produto?: { id: string; nome: string | null; tipo?: string | null } | null;
  cliente?: { nome: string | null; cpf: string | null } | null;
  destino?: { nome: string | null } | null;
  destino_cidade?: { nome: string | null } | null;
};

type ReciboEnriquecido = {
  id: string;
  venda_id: string;
  numero_venda: string | null;
  cliente_nome: string;
  cliente_cpf: string;
  destino_nome: string;
  produto_nome: string;
  produto_tipo: string;
  produto_tipo_id: string | null;
  produto_id: string | null;
  cidade_nome: string;
  cidade_id: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  numero_recibo: string | null;
  valor_total: number;
  valor_taxas: number | null;
  status: string | null;
};

type StatusFiltro = "todos" | "aberto" | "confirmado" | "cancelado";

type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

type UserCtx = {
  usuarioId: string;
  papel: Papel;
  vendedorIds: string[];
  companyId: string | null;
};

type ExportFlags = {
  pdf: boolean;
  excel: boolean;
};

function hojeISO() {
  return new Date().toISOString().substring(0, 10);
}

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatISO(date: Date) {
  return date.toISOString().substring(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function csvEscape(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function isSeguroRecibo(recibo: ReciboEnriquecido) {
  const tipo = (recibo.produto_tipo || "").toLowerCase();
  const nome = (recibo.produto_nome || "").toLowerCase();
  return tipo.includes("seguro") || nome.includes("seguro");
}

function getPeriodosMeses(inicio: string, fim: string) {
  const parse = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  let start = parse(inicio) || new Date();
  let end = parse(fim) || new Date();
  if (end < start) {
    [start, end] = [end, start];
  }
  const meses: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    const label = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`;
    meses.push(label);
    current.setMonth(current.getMonth() + 1);
  }
  if (meses.length === 0) {
    const fallback = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
    meses.push(fallback);
  }
  return meses;
}

async function carregarProdutosComissionamento() {
  const baseCols = "id, nome, tipo_produto, cidade_id";
  const extraCols =
    ", regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao";

  const { data, error } = await supabase
    .from("produtos")
    .select(`${baseCols}${extraCols}`)
    .order("nome", { ascending: true });

  if (error && error.code === "42703") {
    return supabase.from("produtos").select(baseCols).order("nome", { ascending: true });
  }

  return { data, error };
}

async function carregarTiposProdutosComissionamento() {
  const baseCols = "id, nome, tipo";
  const extraCols =
    ", regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao";

  const { data, error } = await supabase
    .from("tipo_produtos")
    .select(`${baseCols}${extraCols}`)
    .order("nome", { ascending: true });

  if (error && error.code === "42703") {
    return supabase.from("tipo_produtos").select(baseCols).order("nome", { ascending: true });
  }

  return { data, error };
}

export default function RelatorioVendasIsland() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tiposProdutos, setTiposProdutos] = useState<TipoProduto[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);

  const [clienteBusca, setClienteBusca] = useState("");
  const [destinoBusca, setDestinoBusca] = useState("");

  const [cidadeNomeInput, setCidadeNomeInput] = useState("");
  const [cidadeFiltro, setCidadeFiltro] = useState("");
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
  const [cidadeSugestoes, setCidadeSugestoes] = useState<Cidade[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidade, setErroCidade] = useState<string | null>(null);

  const [tipoSelecionadoId, setTipoSelecionadoId] = useState("");

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const [dataInicio, setDataInicio] = useState<string>(() => {
    const hoje = new Date();
    const inicio = addDays(hoje, -7);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = useState<string>(hojeISO());
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [exportFlags, setExportFlags] = useState<ExportFlags>({ pdf: true, excel: true });
  const [parametrosComissao, setParametrosComissao] =
    useState<ParametrosComissao | null>(null);
  const [regrasCommission, setRegrasCommission] = useState<Record<string, Regra>>(
    {}
  );
  const [regraProdutoMap, setRegraProdutoMap] = useState<
    Record<string, RegraProduto>
  >({});
  const [metaPlanejada, setMetaPlanejada] = useState<number>(0);
  const [metaProdutoMap, setMetaProdutoMap] = useState<Record<string, number>>(
    {}
  );
  const [, setCommissionLoading] = useState(false);
  const [, setCommissionErro] = useState<string | null>(null);
  const metaProdEnabled = import.meta.env.PUBLIC_META_PRODUTO_ENABLED !== "false";

  useEffect(() => {
    async function carregarUserCtx() {
      try {
        setLoadingUser(true);
        setErro(null);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuário não autenticado.");
          return;
        }

        const { data: usuarioDb } = await supabase
          .from("users")
          .select("id, user_types(name), company_id")
          .eq("id", userId)
          .maybeSingle();

        const tipoName =
          ((usuarioDb as any)?.user_types as any)?.name ||
          (auth?.user?.user_metadata as any)?.name ||
          "";
        const tipoNorm = String(tipoName || "").toUpperCase();
        const companyId = (usuarioDb as any)?.company_id || null;

        let papel: Papel = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";

        let vendedorIds: string[] = [userId];
        if (papel === "GESTOR") {
          const { data: rel } = await supabase
            .from("gestor_vendedor")
            .select("vendedor_id")
            .eq("gestor_id", userId);
          const extras =
            rel
              ?.map((r: any) => r.vendedor_id)
              .filter((id: string | null): id is string => Boolean(id)) || [];
          vendedorIds = Array.from(new Set([userId, ...extras]));
        } else if (papel === "ADMIN") {
          vendedorIds = [];
        }

        const defaultParametros: ParametrosComissao = {
          usar_taxas_na_meta: true,
          foco_valor: "bruto",
          foco_faturamento: "bruto",
        };
        if (companyId) {
          const { data: params } = await supabase
            .from("parametros_comissao")
            .select(
              "exportacao_pdf, exportacao_excel, usar_taxas_na_meta, foco_valor, foco_faturamento"
            )
            .eq("company_id", companyId)
            .maybeSingle();
          if (params) {
            setExportFlags({
              pdf: params.exportacao_pdf ?? true,
              excel: params.exportacao_excel ?? true,
            });
            setParametrosComissao({
              usar_taxas_na_meta: !!params.usar_taxas_na_meta,
              foco_valor: params.foco_valor === "liquido" ? "liquido" : "bruto",
              foco_faturamento:
                params.foco_faturamento === "liquido" ? "liquido" : "bruto",
            });
          } else {
            setExportFlags({ pdf: true, excel: true });
            setParametrosComissao(defaultParametros);
          }
        } else {
          setExportFlags({ pdf: true, excel: true });
          setParametrosComissao(defaultParametros);
        }

        setUserCtx({ usuarioId: userId, papel, vendedorIds, companyId });
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUser(false);
      }
    }

    carregarUserCtx();
  }, []);

  useEffect(() => {
    async function carregarBase() {
      try {
        const [
          { data: clientesData, error: cliErr },
          { data: produtosData, error: prodErr },
          { data: tiposProdutosData, error: tiposErr },
          { data: cidadesData, error: cidadesErr },
        ] = await Promise.all([
          supabase.from("clientes").select("id, nome, cpf").order("nome", { ascending: true }),
          carregarProdutosComissionamento(),
          carregarTiposProdutosComissionamento(),
          supabase.from("cidades").select("id, nome").order("nome", { ascending: true }),
        ]);

        if (cliErr) throw cliErr;
        if (prodErr) throw prodErr;
        if (tiposErr) throw tiposErr;
        if (cidadesErr) throw cidadesErr;

      setClientes((clientesData || []) as Cliente[]);
      setProdutos((produtosData || []) as Produto[]);
      setTiposProdutos((tiposProdutosData || []) as TipoProduto[]);
      setCidades((cidadesData || []) as Cidade[]);
      } catch (e: any) {
        console.error(e);
        setErro(
          "Erro ao carregar bases de clientes e produtos. Verifique o Supabase."
        );
      }
    }

    carregarBase();
  }, []);

  useEffect(() => {
    if (!userCtx) return;
    carregarDadosComissao();
  }, [userCtx, dataInicio, dataFim]);

  async function carregarDadosComissao() {
    if (!userCtx) return;
    try {
      setCommissionLoading(true);
      setCommissionErro(null);
      const periodos = getPeriodosMeses(dataInicio, dataFim);
      let metasQuery = supabase
        .from("metas_vendedor")
        .select("id, meta_geral")
        .in("periodo", periodos);
      if (userCtx.papel !== "ADMIN" && userCtx.vendedorIds.length > 0) {
        metasQuery = metasQuery.in("vendedor_id", userCtx.vendedorIds);
      }
      const { data: metasData, error: metasError } = await metasQuery;
      if (metasError) throw metasError;
      const metaTotal = (metasData || []).reduce(
        (acc, item) => acc + Number(item.meta_geral || 0),
        0
      );
      setMetaPlanejada(metaTotal);
      const metaIds = (metasData || []).map((item) => item.id).filter(Boolean);
      const metasProdPromise =
        metaIds.length > 0
          ? supabase
              .from("metas_vendedor_produto")
              .select("produto_id, valor")
              .in("meta_vendedor_id", metaIds)
          : Promise.resolve({ data: [], error: null as null });
      const [metasProdRes, regrasRes, regrasProdRes] = await Promise.all([
        metasProdPromise,
        supabase
          .from("commission_rule")
          .select(
            "id, tipo, meta_nao_atingida, meta_atingida, super_meta, commission_tier (faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao)"
          ),
        supabase
          .from("product_commission_rule")
          .select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta"),
      ]);
      if (metasProdRes.error) throw metasProdRes.error;
      if (regrasRes.error) throw regrasRes.error;
      if (regrasProdRes.error) throw regrasProdRes.error;
      const regrasMap: Record<string, Regra> = {};
      (regrasRes.data || []).forEach((rule: any) => {
        regrasMap[rule.id] = {
          id: rule.id,
          tipo: rule.tipo || "GERAL",
          meta_nao_atingida: rule.meta_nao_atingida,
          meta_atingida: rule.meta_atingida,
          super_meta: rule.super_meta,
          commission_tier: rule.commission_tier || [],
        };
      });
      const regraProdMap: Record<string, RegraProduto> = {};
      (regrasProdRes.data || []).forEach((rule: any) => {
        regraProdMap[rule.produto_id] = {
          produto_id: rule.produto_id,
          rule_id: rule.rule_id,
          fix_meta_nao_atingida: rule.fix_meta_nao_atingida,
          fix_meta_atingida: rule.fix_meta_atingida,
          fix_super_meta: rule.fix_super_meta,
        };
      });
      const metaProdMap: Record<string, number> = {};
      (metasProdRes.data || []).forEach((entry: any) => {
        if (!entry.produto_id) return;
        metaProdMap[entry.produto_id] =
          (metaProdMap[entry.produto_id] || 0) + Number(entry.valor || 0);
      });
      setRegrasCommission(regrasMap);
      setRegraProdutoMap(regraProdMap);
      setMetaProdutoMap(metaProdMap);
    } catch (e: any) {
      console.error("Erro ao carregar dados de comissão:", e);
      setCommissionErro("Erro ao carregar dados de comissão.");
    } finally {
      setCommissionLoading(false);
    }
  }

  useEffect(() => {
    if (cidadeNomeInput.trim().length < 2) {
      setCidadeSugestoes([]);
      setMostrarSugestoesCidade(false);
      setErroCidade(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidade(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: cidadeNomeInput.trim(), limite: 8 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            throw error;
          }
          setCidadeSugestoes((data || []) as Cidade[]);
          setMostrarSugestoesCidade(true);
        }
      } catch (e: any) {
        if (!controller.signal.aborted) {
          console.error("Erro ao buscar cidades:", e);
          setErroCidade("Erro ao buscar cidades. Tente novamente.");
          setCidadeSugestoes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoCidade(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cidadeNomeInput]);

  useEffect(() => {
    if (!cidadeFiltro) {
      return;
    }
    const matched = cidades.find((cidade) => cidade.id === cidadeFiltro);
    if (matched) {
      setCidadeNomeInput(matched.nome);
    }
  }, [cidadeFiltro, cidades]);

  const clientesFiltrados = useMemo(() => {
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    return clientes.filter((c) => {
      const doc = c.cpf || "";
      return (
        normalizeText(c.nome).includes(termo) ||
        normalizeText(doc).includes(termo)
      );
    });
  }, [clientes, clienteBusca]);

  const tipoNomePorId = useMemo(() => {
    const map = new Map<string, string>();
    tiposProdutos.forEach((tipo) => {
      const tipoLabel = tipo.tipo?.trim() || "";
      const nomeRaw = tipo.nome?.trim() || "";
      const nomeLimpo = nomeRaw && !nomeRaw.startsWith("--") ? nomeRaw : "";
      const label = tipoLabel || nomeLimpo;
      if (label) {
        map.set(tipo.id, label);
      }
    });
    return map;
  }, [tiposProdutos]);

  const cidadePorId = useMemo(() => {
    const map = new Map<string, string>();
    cidades.forEach((cidade) => {
      if (cidade.id && cidade.nome) {
        map.set(cidade.id, cidade.nome);
      }
    });
    return map;
  }, [cidades]);

  const recibosEnriquecidos: ReciboEnriquecido[] = useMemo(() => {
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    const prodMap = new Map(produtos.map((p) => [p.id, p]));

    return vendas.flatMap((v) => {
      const c = cliMap.get(v.cliente_id) || v.cliente;
      const clienteNome = c?.nome || "(sem cliente)";
      const clienteCpf = c?.cpf || "";
      const produtoDestino = v.destino_produto;
      const recibos = v.vendas_recibos || [];

      return recibos.map((recibo, index) => {
        const produtoResolvido = recibo.produto_resolvido;
        const tipoRegistro = recibo.tipo_produtos;
        const tipoId =
          tipoRegistro?.id ||
          produtoResolvido?.tipo_produto ||
          produtoDestino?.tipo_produto ||
          prodMap.get(recibo.produto_id || "")?.tipo_produto ||
          null;
        const tipoLabel =
          tipoRegistro?.nome ||
          tipoRegistro?.tipo ||
          tipoNomePorId.get(tipoId || "") ||
          tipoId ||
          "(sem tipo)";
        const produtoNome =
          produtoResolvido?.nome ||
          produtoDestino?.nome ||
          tipoLabel ||
          "(sem produto)";
        const destinoNome =
          produtoDestino?.nome ||
          produtoResolvido?.nome ||
          v.destino?.nome ||
          "(sem destino)";
        const cidadeId =
          v.destino_cidade_id ||
          produtoResolvido?.cidade_id ||
          produtoDestino?.cidade_id ||
          prodMap.get(recibo.produto_id || "")?.cidade_id ||
          null;
        const vendaCidadeNome = v.destino_cidade?.nome || "";
        const cidadeNome =
          vendaCidadeNome ||
          (cidadeId && cidadePorId.get(cidadeId) ? cidadePorId.get(cidadeId)! : "");

        const produtoId =
          produtoResolvido?.id ||
          recibo.produto_id ||
          produtoDestino?.id ||
          null;

        return {
          id: `${v.id}-${index}-${recibo.numero_recibo || "recibo"}`,
          venda_id: v.id,
          numero_venda: v.numero_venda || v.id,
          cliente_nome: clienteNome,
          cliente_cpf: clienteCpf,
          destino_nome: destinoNome,
          produto_nome: produtoNome,
          produto_tipo: tipoLabel,
          produto_tipo_id: tipoId,
          produto_id: produtoId,
          cidade_nome: cidadeNome,
          cidade_id: cidadeId,
          data_lancamento: v.data_lancamento,
          data_embarque: v.data_embarque,
          numero_recibo: recibo.numero_recibo,
          valor_total: recibo.valor_total ?? 0,
          valor_taxas: recibo.valor_taxas ?? null,
          status: v.status,
        };
      });
    });
  }, [vendas, clientes, produtos, tipoNomePorId]);

  const recibosFiltrados = useMemo(() => {
    const termProd = normalizeText(destinoBusca.trim());
    const termCidade = normalizeText(cidadeNomeInput.trim());
    return recibosEnriquecidos.filter((recibo) => {
      const matchTipo =
        !tipoSelecionadoId || recibo.produto_tipo_id === tipoSelecionadoId;
      const matchCidade =
        !cidadeFiltro && !termCidade
          ? true
          : cidadeFiltro
          ? recibo.cidade_id === cidadeFiltro
          : normalizeText(recibo.cidade_nome || "").includes(termCidade);
      const nomeProduto = normalizeText(recibo.produto_nome || "");
      const matchProduto = !termProd || nomeProduto.includes(termProd);
      return matchTipo && matchCidade && matchProduto;
    });
  }, [recibosEnriquecidos, destinoBusca, tipoSelecionadoId, cidadeFiltro, cidadeNomeInput]);

  const totalRecibos = recibosFiltrados.length;
  const somaValores = recibosFiltrados.reduce((acc, v) => {
    const val = v.valor_total ?? 0;
    return acc + val;
  }, 0);
  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const somaTaxas = recibosFiltrados.reduce((acc, v) => {
    const taxas = v.valor_taxas ?? 0;
    return acc + taxas;
  }, 0);
  const somaLiquido = recibosFiltrados.reduce((acc, v) => {
    if (v.valor_total == null) return acc;
    const total = v.valor_total;
    const taxas = v.valor_taxas ?? 0;
    return acc + (total - taxas);
  }, 0);
  const ticketMedio = totalRecibos > 0 ? somaValores / totalRecibos : 0;

  const produtosMap = useMemo(
    () => new Map(produtos.map((p) => [p.id, p])),
    [produtos]
  );

  const tipoProdutoMap = useMemo(
    () => new Map(tiposProdutos.map((tipo) => [tipo.id, tipo])),
    [tiposProdutos]
  );

  const tipoIdFromProduto = useCallback(
    (produto?: Produto | TipoProduto) => {
      if (!produto) return undefined;
      if ("tipo_produto" in produto) {
        return produto.tipo_produto || undefined;
      }
      return produto.id;
    },
    []
  );

  const getProdutoPorId = useCallback(
    (prodId: string) => tipoProdutoMap.get(prodId) ?? produtosMap.get(prodId),
    [produtosMap, tipoProdutoMap]
  );

  const getRegraProduto = useCallback(
    (prodId: string, produto?: Produto | TipoProduto) => {
      const direct = regraProdutoMap[prodId];
      if (direct) return direct;
      if (produto) {
        const tipoId = tipoIdFromProduto(produto);
        if (tipoId) {
          return regraProdutoMap[tipoId];
        }
      }
      return undefined;
    },
    [regraProdutoMap, tipoIdFromProduto]
  );

  const commissionAggregates = useMemo(() => {
    if (!tipoProdutoMap.size) return null;
    const params = parametrosComissao || {
      usar_taxas_na_meta: true,
      foco_valor: "bruto",
      foco_faturamento: "bruto",
    };
    const baseMetaPorProduto: Record<string, number> = {};
    const liquidoPorProduto: Record<string, number> = {};
    const brutoPorProduto: Record<string, number> = {};
    const baseComPorProduto: Record<string, number> = {};
    let baseMetaTotal = 0;
    recibosFiltrados.forEach((recibo) => {
      const prodId = recibo.produto_tipo_id || recibo.produto_id || "";
      if (!prodId) return;
      const produto = getProdutoPorId(prodId);
      if (!produto) return;
      const bruto = recibo.valor_total ?? 0;
      const taxas = recibo.valor_taxas ?? 0;
      const liquido = bruto - taxas;
      const valParaMeta = params.usar_taxas_na_meta ? bruto : liquido;
      baseMetaPorProduto[prodId] = (baseMetaPorProduto[prodId] || 0) + valParaMeta;
      if (produto.soma_na_meta) {
        baseMetaTotal += valParaMeta;
      }
      liquidoPorProduto[prodId] = (liquidoPorProduto[prodId] || 0) + liquido;
      brutoPorProduto[prodId] = (brutoPorProduto[prodId] || 0) + bruto;
      const baseCom =
        params.foco_faturamento === "liquido" ? liquido : bruto;
      baseComPorProduto[prodId] = (baseComPorProduto[prodId] || 0) + baseCom;
    });
    const pctMetaGeral =
      metaPlanejada > 0 ? (baseMetaTotal / metaPlanejada) * 100 : 0;
    return {
      baseMetaPorProduto,
      liquidoPorProduto,
      brutoPorProduto,
      baseComPorProduto,
      baseMetaTotal,
      pctMetaGeral,
    };
  }, [recibosFiltrados, parametrosComissao, tipoProdutoMap, metaPlanejada, getProdutoPorId]);

  const calcularPctParaProduto = useCallback(
    (prodId: string, isSeguro: boolean) => {
      const aggregates = commissionAggregates;
      if (!aggregates) return 0;
      const produto = getProdutoPorId(prodId);
      if (!produto) return 0;
      const baseMetaPorProduto = aggregates.baseMetaPorProduto[prodId] || 0;
      const regraProd = getRegraProduto(prodId, produto);
      if (produto.regra_comissionamento === "diferenciado" && !isSeguro) {
        if (!regraProd) return 0;
        const produtoTipoId = tipoIdFromProduto(produto);
        const metaProdValor =
          metaProdutoMap[prodId] ||
          (produtoTipoId ? metaProdutoMap[produtoTipoId] : 0) ||
          0;
        const temMetaProd = metaProdValor > 0;
        const pctMetaProd = temMetaProd
          ? (baseMetaPorProduto / metaProdValor) * 100
          : 0;
        if (temMetaProd) {
          if (baseMetaPorProduto < metaProdValor) {
            return 0;
          }
          if (pctMetaProd >= 120) {
            return (
              regraProd.fix_super_meta ??
              regraProd.fix_meta_atingida ??
              regraProd.fix_meta_nao_atingida ??
              0
            );
          }
          return (
            regraProd.fix_meta_atingida ??
            regraProd.fix_meta_nao_atingida ??
            0
          );
        }
        return (
          regraProd.fix_meta_nao_atingida ??
          regraProd.fix_meta_atingida ??
          regraProd.fix_super_meta ??
          0
        );
      }
      const regraId = regraProd?.rule_id;
      const regra = regraId ? regrasCommission[regraId] : undefined;
      if (!regra) return 0;
      let pct = calcularPctPorRegra(regra, aggregates.pctMetaGeral);
      if (
        metaProdEnabled &&
        produto.usa_meta_produto &&
        produto.meta_produto_valor &&
        produto.comissao_produto_meta_pct
      ) {
        const atingiuMetaProd =
          produto.meta_produto_valor > 0 &&
          baseMetaPorProduto >= produto.meta_produto_valor;
        if (atingiuMetaProd) {
          const baseCom = aggregates.baseComPorProduto[prodId] || 0;
          if (baseCom > 0) {
            const valMetaProd =
              baseCom *
              ((produto.comissao_produto_meta_pct || 0) / 100);
            const valGeral = baseCom * (pct / 100);
            const diffValor =
              produto.descontar_meta_geral === false
                ? valMetaProd
                : Math.max(valMetaProd - valGeral, 0);
            if (diffValor > 0) {
              pct += (diffValor / baseCom) * 100;
            }
          }
        }
      }
      return pct;
    },
    [
      commissionAggregates,
      metaProdEnabled,
      metaProdutoMap,
      tipoProdutoMap,
      regraProdutoMap,
      regrasCommission,
      tipoIdFromProduto,
      getProdutoPorId,
      getRegraProduto,
    ]
  );

  const calcularComissaoRecibo = useCallback(
    (recibo: ReciboEnriquecido) => {
      const aggregates = commissionAggregates;
      if (!aggregates) return 0;
      const params = parametrosComissao || {
        usar_taxas_na_meta: true,
        foco_valor: "bruto",
        foco_faturamento: "bruto",
      };
      const prodId = recibo.produto_tipo_id || recibo.produto_id || "";
      if (!prodId) return 0;
      const bruto = recibo.valor_total ?? 0;
      const taxas = recibo.valor_taxas ?? 0;
      const liquido = bruto - taxas;
      const baseCom =
        params.foco_faturamento === "liquido" ? liquido : bruto;
      if (baseCom <= 0) return 0;
      const pct = calcularPctParaProduto(prodId, isSeguroRecibo(recibo));
      return baseCom * (pct / 100);
    },
    [parametrosComissao, commissionAggregates, calcularPctParaProduto]
  );

  const comissaoPorRecibo = useMemo(() => {
    const mapa = new Map<string, number>();
    recibosFiltrados.forEach((recibo) => {
      mapa.set(recibo.id, calcularComissaoRecibo(recibo));
    });
    return mapa;
  }, [recibosFiltrados, calcularComissaoRecibo]);

  const somaComissao = useMemo(
    () =>
      Array.from(comissaoPorRecibo.values()).reduce((acc, val) => acc + val, 0),
    [comissaoPorRecibo]
  );

  async function carregarVendas() {
    if (!userCtx) return;
    try {
      setLoading(true);
      setErro(null);

        let query = supabase
        .from("vendas")
        .select(
          `
          id,
          vendedor_id,
          numero_venda,
          cliente_id,
          destino_id,
          destino_cidade_id,
          produto_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          cliente:clientes!cliente_id (nome, cpf),
          destino_produto:produtos!destino_id (id, nome, tipo_produto, cidade_id),
          destino_cidade:cidades!destino_cidade_id (nome),
          vendas_recibos (
            numero_recibo,
            valor_total,
            valor_taxas,
            produto_id,
            produto_resolvido_id,
            produto_resolvido:produtos!produto_resolvido_id (id, nome, tipo_produto, cidade_id),
            tipo_produtos (id, nome, tipo)
          )
        `
        )
        .order("data_lancamento", { ascending: false });

      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }

      if (dataInicio) {
        query = query.gte("data_lancamento", dataInicio);
      }
      if (dataFim) {
        query = query.lte("data_lancamento", dataFim);
      }
      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }
      if (clienteSelecionado) {
        query = query.eq("cliente_id", clienteSelecionado.id);
      }

      const vMin = parseFloat(valorMin.replace(",", "."));
      if (!isNaN(vMin)) {
        query = query.gte("valor_total", vMin);
      }
      const vMax = parseFloat(valorMax.replace(",", "."));
      if (!isNaN(vMax)) {
        query = query.lte("valor_total", vMax);
      }

      const { data, error } = await query;

      if (error) throw error;

      setVendas((data || []) as Venda[]);
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao carregar vendas para o relatório. Confira o schema e filtros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (userCtx) {
      carregarVendas();
    }
  }, [userCtx]);

  function aplicarPeriodoPreset(tipo: "hoje" | "7" | "30" | "mes_atual" | "mes_anterior" | "limpar") {
    const hoje = new Date();

    if (tipo === "limpar") {
      setDataInicio("");
      setDataFim("");
      return;
    }

    if (tipo === "hoje") {
      const iso = hojeISO();
      setDataInicio(iso);
      setDataFim(iso);
      return;
    }

    if (tipo === "7") {
      const inicio = addDays(hoje, -7);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }

    if (tipo === "30") {
      const inicio = addDays(hoje, -30);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }

    if (tipo === "mes_atual") {
      const inicio = startOfMonth(hoje);
      const fim = endOfMonth(hoje);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }

    if (tipo === "mes_anterior") {
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const inicio = startOfMonth(mesAnterior);
      const fim = endOfMonth(mesAnterior);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }
  }

  function exportarCSV() {
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const header = [
      "numero_recibo",
      "cliente",
      "cpf",
      "tipo_produto",
      "cidade",
      "produto",
      "data_lancamento",
      "data_embarque",
      "valor_total",
    ];

    const linhas = recibosFiltrados.map((r) => [
      r.numero_recibo || "",
      r.cliente_nome,
      r.cliente_cpf || "",
      r.produto_tipo,
      r.cidade_nome,
      r.produto_nome,
      r.data_lancamento || "",
      r.data_embarque || "",
      (r.valor_total ?? 0).toString().replace(".", ","),
    ]);

    const all = [header, ...linhas]
      .map((cols) => cols.map((c) => csvEscape(c)).join(";"))
      .join("\n");

    const blob = new Blob([all], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio-vendas-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportarExcel() {
    if (!exportFlags.excel) {
      alert("Exportação Excel desabilitada nos parâmetros.");
      return;
    }
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const data = recibosFiltrados.map((r) => ({
      "Número recibo": r.numero_recibo || "",
      Cliente: r.cliente_nome,
      CPF: r.cliente_cpf,
      "Tipo produto": r.produto_tipo,
      Cidade: r.cidade_nome,
      Produto: r.produto_nome,
      "Data lançamento": r.data_lancamento?.slice(0, 10) || "",
      "Data embarque": r.data_embarque?.slice(0, 10) || "",
      "Valor total": r.valor_total ?? 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");

    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
    XLSX.writeFile(wb, `relatorio-vendas-${ts}.xlsx`);
  }

  function exportarPDF() {
    if (!exportFlags.pdf) {
      alert("Exportação PDF desabilitada nos parâmetros.");
      return;
    }
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    const headers = [
      "Data lançamento",
      "Nº Recibo",
      "Cliente",
      "CPF",
      "Tipo produto",
      "Cidade",
      "Produto",
      "Data embarque",
      "Valor total",
      "Taxas",
      "Valor líquido",
      "Comissão",
    ];
    const rows = recibosFiltrados.map((r) => {
      const valorTotal = r.valor_total ?? null;
      const valorTaxas = r.valor_taxas ?? null;
      const valorLiquido =
        valorTotal != null ? valorTotal - (valorTaxas ?? 0) : null;
      const comissao = calcularComissaoRecibo(r);

      return [
        r.data_lancamento?.slice(0, 10) || "",
        r.numero_recibo || "",
        r.cliente_nome,
        r.cliente_cpf,
        r.produto_tipo,
        r.cidade_nome,
        r.produto_nome,
        r.data_embarque?.slice(0, 10) || "",
        valorTotal != null ? formatCurrency(valorTotal) : "-",
        valorTaxas != null ? formatCurrency(valorTaxas) : "-",
        valorLiquido != null ? formatCurrency(valorLiquido) : "-",
        formatCurrency(comissao),
      ];
    });

    const subtitle =
      dataInicio && dataFim
        ? `Período: ${formatarDataParaExibicao(
            dataInicio
          )} até ${formatarDataParaExibicao(dataFim)}`
        : dataInicio
        ? `A partir de ${formatarDataParaExibicao(dataInicio)}`
        : dataFim
        ? `Até ${formatarDataParaExibicao(dataFim)}`
        : undefined;

    rows.push([
      "Totais",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      formatCurrency(somaValores),
      formatCurrency(somaTaxas),
      formatCurrency(somaLiquido),
      formatCurrency(somaComissao),
    ]);

    exportTableToPDF({
      title: "Relatório de Vendas",
      subtitle,
      headers,
      rows,
      fileName: "relatorio-vendas",
      orientation: "landscape",
    });
  }

  return (
    <div className="relatorio-vendas-page">
      {loadingUser && (
        <div className="card-base card-config mb-3">Carregando contexto do usuário...</div>
      )}
      {userCtx && userCtx.papel !== "ADMIN" && (
        <div className="card-base card-config mb-3" style={{ color: "#334155" }}>
          Relatório limitado a {userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas"}.
        </div>
      )}
      <div className="card-base card-purple mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data início</label>
            <input
              type="date"
              className="form-input"
              value={dataInicio}
              onChange={(e) => {
                const nextInicio = e.target.value;
                setDataInicio(nextInicio);
                if (dataFim && nextInicio && dataFim < nextInicio) {
                  setDataFim(nextInicio);
                }
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data fim</label>
            <input
              type="date"
              className="form-input"
              value={dataFim}
              min={dataInicio || undefined}
              onChange={(e) => {
                const nextFim = e.target.value;
                const boundedFim = dataInicio && nextFim && nextFim < dataInicio ? dataInicio : nextFim;
                setDataFim(boundedFim);
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
            >
              <option value="todos">Todos</option>
              <option value="aberto">Aberto</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Valor mínimo</label>
            <input
              className="form-input"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valor máximo</label>
            <input
              className="form-input"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="form-row" style={{ marginTop: 8 }}>
          <div className="form-group">
            <label className="form-label">Cliente</label>
            <input
              className="form-input"
              value={clienteBusca}
              onChange={(e) => {
                setClienteBusca(e.target.value);
                setClienteSelecionado(null);
              }}
              placeholder="Nome ou CPF..."
            />
            {clienteBusca && !clienteSelecionado && (
              <div className="card-base" style={{ marginTop: 4, maxHeight: 180, overflowY: "auto" }}>
                {clientesFiltrados.length === 0 && (
                  <div style={{ fontSize: "0.85rem" }}>Nenhum cliente encontrado.</div>
                )}
                {clientesFiltrados.map((c) => (
                  <div
                    key={c.id}
                    style={{ padding: "4px 6px", cursor: "pointer" }}
                    onClick={() => {
                      setClienteSelecionado(c);
                      setClienteBusca(c.nome);
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{c.nome}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                      {c.cpf || "Sem CPF"}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {clienteSelecionado && (
              <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Selecionado: <strong>{clienteSelecionado.nome}</strong>
              </div>
            )}
          </div>

          <div className="form-group relative">
            <label className="form-label">Cidade</label>
            <input
              className="form-input"
              placeholder="Digite a cidade"
              value={cidadeNomeInput}
              onChange={(e) => {
                const value = e.target.value;
                setCidadeNomeInput(value);
                setCidadeFiltro("");
                if (value.trim().length > 0) {
                  setMostrarSugestoesCidade(true);
                }
              }}
              onFocus={() => {
                if (cidadeNomeInput.trim().length >= 2) {
                  setMostrarSugestoesCidade(true);
                }
              }}
              onBlur={() => {
                setTimeout(() => setMostrarSugestoesCidade(false), 150);
                if (!cidadeNomeInput.trim()) {
                  setCidadeFiltro("");
                  return;
                }
                const match = cidades.find((cidade) =>
                  normalizeText(cidade.nome) === normalizeText(cidadeNomeInput)
                );
                if (match) {
                  setCidadeFiltro(match.id);
                  setCidadeNomeInput(match.nome);
                }
              }}
            />
            {mostrarSugestoesCidade && cidadeNomeInput.trim().length >= 1 && (
              <div
                className="card-base card-config"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: 180,
                  overflowY: "auto",
                  zIndex: 20,
                  padding: "4px 0",
                }}
              >
                {buscandoCidade && (
                  <div style={{ padding: "6px 12px", color: "#64748b" }}>
                    Buscando cidades...
                  </div>
                )}
                {!buscandoCidade && erroCidade && (
                  <div style={{ padding: "6px 12px", color: "#dc2626" }}>
                    {erroCidade}
                  </div>
                )}
                {!buscandoCidade && !erroCidade && cidadeSugestoes.length === 0 && (
                  <div style={{ padding: "6px 12px", color: "#94a3b8" }}>
                    Nenhuma cidade encontrada.
                  </div>
                )}
                {!buscandoCidade &&
                  !erroCidade &&
                  cidadeSugestoes.map((cidade) => (
                    <button
                      key={cidade.id}
                      type="button"
                      className="btn btn-ghost w-full text-left"
                      style={{ padding: "6px 12px" }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCidadeFiltro(cidade.id);
                        setCidadeNomeInput(cidade.nome);
                        setMostrarSugestoesCidade(false);
                      }}
                    >
                      {cidade.nome}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Tipo Produto</label>
            <select
              className="form-select"
              value={tipoSelecionadoId}
              onChange={(e) => setTipoSelecionadoId(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              {tiposProdutos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome || tipo.tipo || `(ID: ${tipo.id})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Produto</label>
            <input
              className="form-input"
              value={destinoBusca}
              onChange={(e) => setDestinoBusca(e.target.value)}
              placeholder="Nome do produto..."
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("hoje")}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("7")}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("30")}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("mes_atual")}
          >
            Este mês
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("mes_anterior")}
          >
            Mês anterior
          </button>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => aplicarPeriodoPreset("limpar")}
          >
            Limpar datas
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={carregarVendas}
          >
            Aplicar filtros
          </button>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-purple"
              onClick={exportarCSV}
            >
              Exportar CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={exportarExcel}
              disabled={!exportFlags.excel}
              title={!exportFlags.excel ? "Exportação Excel desabilitada nos parâmetros" : ""}
            >
              Exportar Excel
            </button>
            <button
              type="button"
              className="btn btn-light"
              onClick={exportarPDF}
              disabled={!exportFlags.pdf}
              title={!exportFlags.pdf ? "Exportação PDF desabilitada nos parâmetros" : ""}
            >
              Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <span style={{ fontSize: "0.9rem" }}>
              <strong>{totalRecibos}</strong> recibo(s) encontrado(s)
            </span>
          </div>
          <div className="form-group">
            <span style={{ fontSize: "0.9rem" }}>
              Faturamento:{" "}
              <strong>
                {somaValores.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </span>
          </div>
          <div className="form-group">
            <span style={{ fontSize: "0.9rem" }}>
              Ticket médio:{" "}
              <strong>
                {ticketMedio.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-purple table-mobile-cards min-w-[1100px]">
          <thead>
            <tr>
              <th>Data lançamento</th>
              <th>Nº Recibo</th>
              <th>Cliente</th>
              <th>CPF</th>
              <th>Tipo produto</th>
              <th>Cidade</th>
              <th>Produto</th>
              <th>Data embarque</th>
              <th>Valor total</th>
              <th>Taxas</th>
              <th>Valor líquido</th>
              <th>Comissão</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12}>Carregando vendas...</td>
              </tr>
            )}

            {!loading && recibosFiltrados.length === 0 && (
              <tr>
                <td colSpan={12}>Nenhum recibo encontrado com os filtros atuais.</td>
              </tr>
            )}

            {!loading &&
              recibosFiltrados.map((r) => {
                const comissao = comissaoPorRecibo.get(r.id) ?? 0;
                return (
                  <tr key={r.id}>
                    <td data-label="Data lançamento">
                      {r.data_lancamento
                        ? new Date(r.data_lancamento).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td data-label="Nº Recibo">{r.numero_recibo || "-"}</td>
                    <td data-label="Cliente">{r.cliente_nome}</td>
                    <td data-label="CPF">{r.cliente_cpf}</td>
                    <td data-label="Tipo produto">{r.produto_tipo}</td>
                    <td data-label="Cidade">{r.cidade_nome || "-"}</td>
                    <td data-label="Produto">{r.produto_nome}</td>
                    <td data-label="Data embarque">
                      {r.data_embarque
                        ? new Date(r.data_embarque).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td data-label="Valor total">
                      {r.valor_total != null ? formatCurrency(r.valor_total) : "-"}
                    </td>
                    <td data-label="Taxas">
                      {r.valor_taxas != null ? formatCurrency(r.valor_taxas) : "-"}
                    </td>
                    <td data-label="Valor líquido">
                      {r.valor_total != null
                        ? formatCurrency(r.valor_total - (r.valor_taxas ?? 0))
                        : "-"}
                    </td>
                    <td data-label="Comissão">{formatCurrency(comissao)}</td>
                  </tr>
                );
              })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={8}>Totais</th>
              <th>{formatCurrency(somaValores)}</th>
              <th>{formatCurrency(somaTaxas)}</th>
              <th>{formatCurrency(somaLiquido)}</th>
              <th>{formatCurrency(somaComissao)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
