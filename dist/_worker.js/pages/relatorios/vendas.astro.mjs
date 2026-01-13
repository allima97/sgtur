globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B2E7go2h.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_pW02Hlay.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as utils, w as writeFileSync } from '../../chunks/xlsx_DyslCs8o.mjs';
import { e as exportTableToPDF } from '../../chunks/pdf_DMFev1hn.mjs';
import { f as formatarDataParaExibicao } from '../../chunks/formatDate_DIYZa49I.mjs';

function calcularPctEscalonavel(regra, pctMeta) {
  const faixa = pctMeta >= 0 ? pctMeta < 100 ? "PRE" : "POS" : "PRE";
  const base = faixa === "PRE" ? regra.meta_nao_atingida ?? regra.meta_atingida ?? 0 : regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
  const tier = (regra.commission_tier || []).filter((t) => t.faixa === faixa).find((t) => {
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
function calcularPctPorRegra(regra, pctMeta) {
  if (regra.tipo === "ESCALONAVEL") {
    return calcularPctEscalonavel(regra, pctMeta);
  }
  if (pctMeta < 100) return regra.meta_nao_atingida ?? 0;
  if (pctMeta >= 120) {
    return regra.super_meta ?? regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
  }
  return regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
}

function hojeISO() {
  return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
}
function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function formatISO(date) {
  return date.toISOString().substring(0, 10);
}
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function csvEscape(value) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
function isSeguroRecibo(recibo) {
  const tipo = (recibo.produto_tipo || "").toLowerCase();
  const nome = (recibo.produto_nome || "").toLowerCase();
  return tipo.includes("seguro") || nome.includes("seguro");
}
function getPeriodosMeses(inicio, fim) {
  const parse = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  let start = parse(inicio) || /* @__PURE__ */ new Date();
  let end = parse(fim) || /* @__PURE__ */ new Date();
  if (end < start) {
    [start, end] = [end, start];
  }
  const meses = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (current <= last) {
    const label = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`;
    meses.push(label);
    current.setMonth(current.getMonth() + 1);
  }
  if (meses.length === 0) {
    const fallback = `${(/* @__PURE__ */ new Date()).getFullYear()}-${String((/* @__PURE__ */ new Date()).getMonth() + 1).padStart(2, "0")}-01`;
    meses.push(fallback);
  }
  return meses;
}
async function carregarProdutosComissionamento() {
  const baseCols = "id, nome, tipo_produto, cidade_id";
  const extraCols = ", regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao";
  const { data, error } = await supabase.from("produtos").select(`${baseCols}${extraCols}`).order("nome", { ascending: true });
  if (error && error.code === "42703") {
    return supabase.from("produtos").select(baseCols).order("nome", { ascending: true });
  }
  return { data, error };
}
async function carregarTiposProdutosComissionamento() {
  const baseCols = "id, nome, tipo";
  const extraCols = ", regra_comissionamento, soma_na_meta, usa_meta_produto, meta_produto_valor, comissao_produto_meta_pct, descontar_meta_geral, exibe_kpi_comissao";
  const { data, error } = await supabase.from("tipo_produtos").select(`${baseCols}${extraCols}`).order("nome", { ascending: true });
  if (error && error.code === "42703") {
    return supabase.from("tipo_produtos").select(baseCols).order("nome", { ascending: true });
  }
  return { data, error };
}
function RelatorioVendasIsland() {
  const [clientes, setClientes] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [tiposProdutos, setTiposProdutos] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [clienteBusca, setClienteBusca] = reactExports.useState("");
  const [destinoBusca, setDestinoBusca] = reactExports.useState("");
  const [cidadeNomeInput, setCidadeNomeInput] = reactExports.useState("");
  const [cidadeFiltro, setCidadeFiltro] = reactExports.useState("");
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = reactExports.useState(false);
  const [cidadeSugestoes, setCidadeSugestoes] = reactExports.useState([]);
  const [buscandoCidade, setBuscandoCidade] = reactExports.useState(false);
  const [erroCidade, setErroCidade] = reactExports.useState(null);
  const [tipoSelecionadoId, setTipoSelecionadoId] = reactExports.useState("");
  const [clienteSelecionado, setClienteSelecionado] = reactExports.useState(null);
  const [dataInicio, setDataInicio] = reactExports.useState(() => {
    const hoje = /* @__PURE__ */ new Date();
    const inicio = addDays(hoje, -7);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = reactExports.useState(hojeISO());
  const [statusFiltro, setStatusFiltro] = reactExports.useState("todos");
  const [valorMin, setValorMin] = reactExports.useState("");
  const [valorMax, setValorMax] = reactExports.useState("");
  const [vendas, setVendas] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [userCtx, setUserCtx] = reactExports.useState(null);
  const [loadingUser, setLoadingUser] = reactExports.useState(true);
  const [exportFlags, setExportFlags] = reactExports.useState({ pdf: true, excel: true });
  const [parametrosComissao, setParametrosComissao] = reactExports.useState(null);
  const [regrasCommission, setRegrasCommission] = reactExports.useState(
    {}
  );
  const [regraProdutoMap, setRegraProdutoMap] = reactExports.useState({});
  const [metaPlanejada, setMetaPlanejada] = reactExports.useState(0);
  const [metaProdutoMap, setMetaProdutoMap] = reactExports.useState(
    {}
  );
  const [, setCommissionLoading] = reactExports.useState(false);
  const [, setCommissionErro] = reactExports.useState(null);
  const metaProdEnabled = undefined                                            !== "false";
  reactExports.useEffect(() => {
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
        const { data: usuarioDb } = await supabase.from("users").select("id, user_types(name), company_id").eq("id", userId).maybeSingle();
        const tipoName = usuarioDb?.user_types?.name || auth?.user?.user_metadata?.name || "";
        const tipoNorm = String(tipoName || "").toUpperCase();
        const companyId = usuarioDb?.company_id || null;
        let papel = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";
        let vendedorIds = [userId];
        if (papel === "GESTOR") {
          const { data: rel } = await supabase.from("gestor_vendedor").select("vendedor_id").eq("gestor_id", userId);
          const extras = rel?.map((r) => r.vendedor_id).filter((id) => Boolean(id)) || [];
          vendedorIds = Array.from(/* @__PURE__ */ new Set([userId, ...extras]));
        } else if (papel === "ADMIN") {
          vendedorIds = [];
        }
        const defaultParametros = {
          usar_taxas_na_meta: true,
          foco_valor: "bruto",
          foco_faturamento: "bruto"
        };
        if (companyId) {
          const { data: params } = await supabase.from("parametros_comissao").select(
            "exportacao_pdf, exportacao_excel, usar_taxas_na_meta, foco_valor, foco_faturamento"
          ).eq("company_id", companyId).maybeSingle();
          if (params) {
            setExportFlags({
              pdf: params.exportacao_pdf ?? true,
              excel: params.exportacao_excel ?? true
            });
            setParametrosComissao({
              usar_taxas_na_meta: !!params.usar_taxas_na_meta,
              foco_valor: params.foco_valor === "liquido" ? "liquido" : "bruto",
              foco_faturamento: params.foco_faturamento === "liquido" ? "liquido" : "bruto"
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
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUser(false);
      }
    }
    carregarUserCtx();
  }, []);
  reactExports.useEffect(() => {
    async function carregarBase() {
      try {
        const [
          { data: clientesData, error: cliErr },
          { data: produtosData, error: prodErr },
          { data: tiposProdutosData, error: tiposErr },
          { data: cidadesData, error: cidadesErr }
        ] = await Promise.all([
          supabase.from("clientes").select("id, nome, cpf").order("nome", { ascending: true }),
          carregarProdutosComissionamento(),
          carregarTiposProdutosComissionamento(),
          supabase.from("cidades").select("id, nome").order("nome", { ascending: true })
        ]);
        if (cliErr) throw cliErr;
        if (prodErr) throw prodErr;
        if (tiposErr) throw tiposErr;
        if (cidadesErr) throw cidadesErr;
        setClientes(clientesData || []);
        setProdutos(produtosData || []);
        setTiposProdutos(tiposProdutosData || []);
        setCidades(cidadesData || []);
      } catch (e) {
        console.error(e);
        setErro(
          "Erro ao carregar bases de clientes e produtos. Verifique o Supabase."
        );
      }
    }
    carregarBase();
  }, []);
  reactExports.useEffect(() => {
    if (!userCtx) return;
    carregarDadosComissao();
  }, [userCtx, dataInicio, dataFim]);
  async function carregarDadosComissao() {
    if (!userCtx) return;
    try {
      setCommissionLoading(true);
      setCommissionErro(null);
      const periodos = getPeriodosMeses(dataInicio, dataFim);
      let metasQuery = supabase.from("metas_vendedor").select("id, meta_geral").in("periodo", periodos);
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
      const metasProdPromise = metaIds.length > 0 ? supabase.from("metas_vendedor_produto").select("produto_id, valor").in("meta_vendedor_id", metaIds) : Promise.resolve({ data: [], error: null });
      const [metasProdRes, regrasRes, regrasProdRes] = await Promise.all([
        metasProdPromise,
        supabase.from("commission_rule").select(
          "id, tipo, meta_nao_atingida, meta_atingida, super_meta, commission_tier (faixa, de_pct, ate_pct, inc_pct_meta, inc_pct_comissao)"
        ),
        supabase.from("product_commission_rule").select("produto_id, rule_id, fix_meta_nao_atingida, fix_meta_atingida, fix_super_meta")
      ]);
      if (metasProdRes.error) throw metasProdRes.error;
      if (regrasRes.error) throw regrasRes.error;
      if (regrasProdRes.error) throw regrasProdRes.error;
      const regrasMap = {};
      (regrasRes.data || []).forEach((rule) => {
        regrasMap[rule.id] = {
          id: rule.id,
          tipo: rule.tipo || "GERAL",
          meta_nao_atingida: rule.meta_nao_atingida,
          meta_atingida: rule.meta_atingida,
          super_meta: rule.super_meta,
          commission_tier: rule.commission_tier || []
        };
      });
      const regraProdMap = {};
      (regrasProdRes.data || []).forEach((rule) => {
        regraProdMap[rule.produto_id] = {
          produto_id: rule.produto_id,
          rule_id: rule.rule_id,
          fix_meta_nao_atingida: rule.fix_meta_nao_atingida,
          fix_meta_atingida: rule.fix_meta_atingida,
          fix_super_meta: rule.fix_super_meta
        };
      });
      const metaProdMap = {};
      (metasProdRes.data || []).forEach((entry) => {
        if (!entry.produto_id) return;
        metaProdMap[entry.produto_id] = (metaProdMap[entry.produto_id] || 0) + Number(entry.valor || 0);
      });
      setRegrasCommission(regrasMap);
      setRegraProdutoMap(regraProdMap);
      setMetaProdutoMap(metaProdMap);
    } catch (e) {
      console.error("Erro ao carregar dados de comissão:", e);
      setCommissionErro("Erro ao carregar dados de comissão.");
    } finally {
      setCommissionLoading(false);
    }
  }
  reactExports.useEffect(() => {
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
          setCidadeSugestoes(data || []);
          setMostrarSugestoesCidade(true);
        }
      } catch (e) {
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
  reactExports.useEffect(() => {
    if (!cidadeFiltro) {
      return;
    }
    const matched = cidades.find((cidade) => cidade.id === cidadeFiltro);
    if (matched) {
      setCidadeNomeInput(matched.nome);
    }
  }, [cidadeFiltro, cidades]);
  const clientesFiltrados = reactExports.useMemo(() => {
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    return clientes.filter((c) => {
      const doc = c.cpf || "";
      return normalizeText(c.nome).includes(termo) || normalizeText(doc).includes(termo);
    });
  }, [clientes, clienteBusca]);
  const tipoNomePorId = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
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
  const cidadePorId = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    cidades.forEach((cidade) => {
      if (cidade.id && cidade.nome) {
        map.set(cidade.id, cidade.nome);
      }
    });
    return map;
  }, [cidades]);
  const recibosEnriquecidos = reactExports.useMemo(() => {
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
        const tipoId = tipoRegistro?.id || produtoResolvido?.tipo_produto || produtoDestino?.tipo_produto || prodMap.get(recibo.produto_id || "")?.tipo_produto || null;
        const tipoLabel = tipoRegistro?.nome || tipoRegistro?.tipo || tipoNomePorId.get(tipoId || "") || tipoId || "(sem tipo)";
        const produtoNome = produtoResolvido?.nome || produtoDestino?.nome || tipoLabel || "(sem produto)";
        const destinoNome = produtoDestino?.nome || produtoResolvido?.nome || v.destino?.nome || "(sem destino)";
        const cidadeId = v.destino_cidade_id || produtoResolvido?.cidade_id || produtoDestino?.cidade_id || prodMap.get(recibo.produto_id || "")?.cidade_id || null;
        const vendaCidadeNome = v.destino_cidade?.nome || "";
        const cidadeNome = vendaCidadeNome || (cidadeId && cidadePorId.get(cidadeId) ? cidadePorId.get(cidadeId) : "");
        const produtoId = produtoResolvido?.id || recibo.produto_id || produtoDestino?.id || null;
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
          status: v.status
        };
      });
    });
  }, [vendas, clientes, produtos, tipoNomePorId]);
  const recibosFiltrados = reactExports.useMemo(() => {
    const termProd = normalizeText(destinoBusca.trim());
    const termCidade = normalizeText(cidadeNomeInput.trim());
    return recibosEnriquecidos.filter((recibo) => {
      const matchTipo = !tipoSelecionadoId || recibo.produto_tipo_id === tipoSelecionadoId;
      const matchCidade = !cidadeFiltro && !termCidade ? true : cidadeFiltro ? recibo.cidade_id === cidadeFiltro : normalizeText(recibo.cidade_nome || "").includes(termCidade);
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
  const formatCurrency = (value) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  const produtosMap = reactExports.useMemo(
    () => new Map(produtos.map((p) => [p.id, p])),
    [produtos]
  );
  const tipoProdutoMap = reactExports.useMemo(
    () => new Map(tiposProdutos.map((tipo) => [tipo.id, tipo])),
    [tiposProdutos]
  );
  const tipoIdFromProduto = reactExports.useCallback(
    (produto) => {
      if (!produto) return void 0;
      if ("tipo_produto" in produto) {
        return produto.tipo_produto || void 0;
      }
      return produto.id;
    },
    []
  );
  const getProdutoPorId = reactExports.useCallback(
    (prodId) => tipoProdutoMap.get(prodId) ?? produtosMap.get(prodId),
    [produtosMap, tipoProdutoMap]
  );
  const getRegraProduto = reactExports.useCallback(
    (prodId, produto) => {
      const direct = regraProdutoMap[prodId];
      if (direct) return direct;
      if (produto) {
        const tipoId = tipoIdFromProduto(produto);
        if (tipoId) {
          return regraProdutoMap[tipoId];
        }
      }
      return void 0;
    },
    [regraProdutoMap, tipoIdFromProduto]
  );
  const commissionAggregates = reactExports.useMemo(() => {
    if (!tipoProdutoMap.size) return null;
    const params = parametrosComissao || {
      usar_taxas_na_meta: true,
      foco_faturamento: "bruto"
    };
    const baseMetaPorProduto = {};
    const liquidoPorProduto = {};
    const brutoPorProduto = {};
    const baseComPorProduto = {};
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
      const baseCom = params.foco_faturamento === "liquido" ? liquido : bruto;
      baseComPorProduto[prodId] = (baseComPorProduto[prodId] || 0) + baseCom;
    });
    const pctMetaGeral = metaPlanejada > 0 ? baseMetaTotal / metaPlanejada * 100 : 0;
    return {
      baseMetaPorProduto,
      liquidoPorProduto,
      brutoPorProduto,
      baseComPorProduto,
      baseMetaTotal,
      pctMetaGeral
    };
  }, [recibosFiltrados, parametrosComissao, tipoProdutoMap, metaPlanejada, getProdutoPorId]);
  const calcularPctParaProduto = reactExports.useCallback(
    (prodId, isSeguro) => {
      const aggregates = commissionAggregates;
      if (!aggregates) return 0;
      const produto = getProdutoPorId(prodId);
      if (!produto) return 0;
      const baseMetaPorProduto = aggregates.baseMetaPorProduto[prodId] || 0;
      const regraProd = getRegraProduto(prodId, produto);
      if (produto.regra_comissionamento === "diferenciado" && !isSeguro) {
        if (!regraProd) return 0;
        const produtoTipoId = tipoIdFromProduto(produto);
        const metaProdValor = metaProdutoMap[prodId] || (produtoTipoId ? metaProdutoMap[produtoTipoId] : 0) || 0;
        const temMetaProd = metaProdValor > 0;
        const pctMetaProd = temMetaProd ? baseMetaPorProduto / metaProdValor * 100 : 0;
        if (temMetaProd) {
          if (baseMetaPorProduto < metaProdValor) {
            return 0;
          }
          if (pctMetaProd >= 120) {
            return regraProd.fix_super_meta ?? regraProd.fix_meta_atingida ?? regraProd.fix_meta_nao_atingida ?? 0;
          }
          return regraProd.fix_meta_atingida ?? regraProd.fix_meta_nao_atingida ?? 0;
        }
        return regraProd.fix_meta_nao_atingida ?? regraProd.fix_meta_atingida ?? regraProd.fix_super_meta ?? 0;
      }
      const regraId = regraProd?.rule_id;
      const regra = regraId ? regrasCommission[regraId] : void 0;
      if (!regra) return 0;
      let pct = calcularPctPorRegra(regra, aggregates.pctMetaGeral);
      if (produto.usa_meta_produto && produto.meta_produto_valor && produto.comissao_produto_meta_pct) {
        const atingiuMetaProd = produto.meta_produto_valor > 0 && baseMetaPorProduto >= produto.meta_produto_valor;
        if (atingiuMetaProd) {
          const baseCom = aggregates.baseComPorProduto[prodId] || 0;
          if (baseCom > 0) {
            const valMetaProd = baseCom * ((produto.comissao_produto_meta_pct || 0) / 100);
            const valGeral = baseCom * (pct / 100);
            const diffValor = produto.descontar_meta_geral === false ? valMetaProd : Math.max(valMetaProd - valGeral, 0);
            if (diffValor > 0) {
              pct += diffValor / baseCom * 100;
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
      getRegraProduto
    ]
  );
  const calcularComissaoRecibo = reactExports.useCallback(
    (recibo) => {
      const aggregates = commissionAggregates;
      if (!aggregates) return 0;
      const params = parametrosComissao || {
        foco_faturamento: "bruto"
      };
      const prodId = recibo.produto_tipo_id || recibo.produto_id || "";
      if (!prodId) return 0;
      const bruto = recibo.valor_total ?? 0;
      const taxas = recibo.valor_taxas ?? 0;
      const liquido = bruto - taxas;
      const baseCom = params.foco_faturamento === "liquido" ? liquido : bruto;
      if (baseCom <= 0) return 0;
      const pct = calcularPctParaProduto(prodId, isSeguroRecibo(recibo));
      return baseCom * (pct / 100);
    },
    [parametrosComissao, commissionAggregates, calcularPctParaProduto]
  );
  const comissaoPorRecibo = reactExports.useMemo(() => {
    const mapa = /* @__PURE__ */ new Map();
    recibosFiltrados.forEach((recibo) => {
      mapa.set(recibo.id, calcularComissaoRecibo(recibo));
    });
    return mapa;
  }, [recibosFiltrados, calcularComissaoRecibo]);
  const somaComissao = reactExports.useMemo(
    () => Array.from(comissaoPorRecibo.values()).reduce((acc, val) => acc + val, 0),
    [comissaoPorRecibo]
  );
  async function carregarVendas() {
    if (!userCtx) return;
    try {
      setLoading(true);
      setErro(null);
      let query = supabase.from("vendas").select(
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
      ).order("data_lancamento", { ascending: false });
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
      setVendas(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas para o relatório. Confira o schema e filtros.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (userCtx) {
      carregarVendas();
    }
  }, [userCtx]);
  function aplicarPeriodoPreset(tipo) {
    const hoje = /* @__PURE__ */ new Date();
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
      "valor_total"
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
      (r.valor_total ?? 0).toString().replace(".", ",")
    ]);
    const all = [header, ...linhas].map((cols) => cols.map((c) => csvEscape(c)).join(";")).join("\n");
    const blob = new Blob([all], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = /* @__PURE__ */ new Date();
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
      "Valor total": r.valor_total ?? 0
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Vendas");
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 12);
    writeFileSync(wb, `relatorio-vendas-${ts}.xlsx`);
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
      "Comissão"
    ];
    const rows = recibosFiltrados.map((r) => {
      const valorTotal = r.valor_total ?? null;
      const valorTaxas = r.valor_taxas ?? null;
      const valorLiquido = valorTotal != null ? valorTotal - (valorTaxas ?? 0) : null;
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
        formatCurrency(comissao)
      ];
    });
    const subtitle = dataInicio && dataFim ? `Período: ${formatarDataParaExibicao(
      dataInicio
    )} até ${formatarDataParaExibicao(dataFim)}` : dataInicio ? `A partir de ${formatarDataParaExibicao(dataInicio)}` : dataFim ? `Até ${formatarDataParaExibicao(dataFim)}` : void 0;
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
      formatCurrency(somaComissao)
    ]);
    exportTableToPDF({
      title: "Relatório de Vendas",
      subtitle,
      headers,
      rows,
      fileName: "relatorio-vendas",
      orientation: "landscape"
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relatorio-vendas-page", children: [
    loadingUser && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Carregando contexto do usuário..." }),
    userCtx && userCtx.papel !== "ADMIN" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config mb-3", style: { color: "#334155" }, children: [
      "Relatório limitado a ",
      userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas",
      "."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: dataInicio,
              onChange: (e) => setDataInicio(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: dataFim,
              onChange: (e) => setDataFim(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: statusFiltro,
              onChange: (e) => setStatusFiltro(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "todos", children: "Todos" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "aberto", children: "Aberto" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "confirmado", children: "Confirmado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cancelado", children: "Cancelado" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor mínimo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: valorMin,
              onChange: (e) => setValorMin(e.target.value),
              placeholder: "0,00"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor máximo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: valorMax,
              onChange: (e) => setValorMax(e.target.value),
              placeholder: "0,00"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: clienteBusca,
              onChange: (e) => {
                setClienteBusca(e.target.value);
                setClienteSelecionado(null);
              },
              placeholder: "Nome ou CPF..."
            }
          ),
          clienteBusca && !clienteSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 4, maxHeight: 180, overflowY: "auto" }, children: [
            clientesFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.85rem" }, children: "Nenhum cliente encontrado." }),
            clientesFiltrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: { padding: "4px 6px", cursor: "pointer" },
                onClick: () => {
                  setClienteSelecionado(c);
                  setClienteBusca(c.nome);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: c.nome }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.7 }, children: c.cpf || "Sem CPF" })
                ]
              },
              c.id
            ))
          ] }),
          clienteSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", marginTop: 4 }, children: [
            "Selecionado: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: clienteSelecionado.nome })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              placeholder: "Digite a cidade",
              value: cidadeNomeInput,
              onChange: (e) => {
                const value = e.target.value;
                setCidadeNomeInput(value);
                setCidadeFiltro("");
                if (value.trim().length > 0) {
                  setMostrarSugestoesCidade(true);
                }
              },
              onFocus: () => {
                if (cidadeNomeInput.trim().length >= 2) {
                  setMostrarSugestoesCidade(true);
                }
              },
              onBlur: () => {
                setTimeout(() => setMostrarSugestoesCidade(false), 150);
                if (!cidadeNomeInput.trim()) {
                  setCidadeFiltro("");
                  return;
                }
                const match = cidades.find(
                  (cidade) => normalizeText(cidade.nome) === normalizeText(cidadeNomeInput)
                );
                if (match) {
                  setCidadeFiltro(match.id);
                  setCidadeNomeInput(match.nome);
                }
              }
            }
          ),
          mostrarSugestoesCidade && cidadeNomeInput.trim().length >= 1 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "card-base card-config",
              style: {
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                maxHeight: 180,
                overflowY: "auto",
                zIndex: 20,
                padding: "4px 0"
              },
              children: [
                buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#64748b" }, children: "Buscando cidades..." }),
                !buscandoCidade && erroCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#dc2626" }, children: erroCidade }),
                !buscandoCidade && !erroCidade && cidadeSugestoes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#94a3b8" }, children: "Nenhuma cidade encontrada." }),
                !buscandoCidade && !erroCidade && cidadeSugestoes.map((cidade) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-ghost w-full text-left",
                    style: { padding: "6px 12px" },
                    onMouseDown: (e) => {
                      e.preventDefault();
                      setCidadeFiltro(cidade.id);
                      setCidadeNomeInput(cidade.nome);
                      setMostrarSugestoesCidade(false);
                    },
                    children: cidade.nome
                  },
                  cidade.id
                ))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo Produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: tipoSelecionadoId,
              onChange: (e) => setTipoSelecionadoId(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os tipos" }),
                tiposProdutos.map((tipo) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: tipo.id, children: tipo.nome || tipo.tipo || `(ID: ${tipo.id})` }, tipo.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: destinoBusca,
              onChange: (e) => setDestinoBusca(e.target.value),
              placeholder: "Nome do produto..."
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("hoje"),
            children: "Hoje"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("7"),
            children: "Últimos 7 dias"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("30"),
            children: "Últimos 30 dias"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("mes_atual"),
            children: "Este mês"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("mes_anterior"),
            children: "Mês anterior"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("limpar"),
            children: "Limpar datas"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: carregarVendas,
            children: "Aplicar filtros"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-purple",
              onClick: exportarCSV,
              children: "Exportar CSV"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              onClick: exportarExcel,
              disabled: !exportFlags.excel,
              title: !exportFlags.excel ? "Exportação Excel desabilitada nos parâmetros" : "",
              children: "Exportar Excel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: exportarPDF,
              disabled: !exportFlags.pdf,
              title: !exportFlags.pdf ? "Exportação PDF desabilitada nos parâmetros" : "",
              children: "Exportar PDF"
            }
          )
        ] })
      ] })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "0.9rem" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalRecibos }),
        " recibo(s) encontrado(s)"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "0.9rem" }, children: [
        "Faturamento:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: somaValores.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "0.9rem" }, children: [
        "Ticket médio:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: ticketMedio.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        }) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-purple min-w-[1100px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data lançamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nº Recibo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data embarque" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor total" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor líquido" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Comissão" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 12, children: "Carregando vendas..." }) }),
        !loading && recibosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 12, children: "Nenhum recibo encontrado com os filtros atuais." }) }),
        !loading && recibosFiltrados.map((r) => {
          const comissao = comissaoPorRecibo.get(r.id) ?? 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.data_lancamento ? new Date(r.data_lancamento).toLocaleDateString("pt-BR") : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.numero_recibo || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.cliente_nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.cliente_cpf }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.produto_tipo }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.cidade_nome || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.produto_nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.data_embarque ? new Date(r.data_embarque).toLocaleDateString("pt-BR") : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.valor_total != null ? formatCurrency(r.valor_total) : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.valor_taxas != null ? formatCurrency(r.valor_taxas) : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.valor_total != null ? formatCurrency(r.valor_total - (r.valor_taxas ?? 0)) : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatCurrency(comissao) })
          ] }, r.id);
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tfoot", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 8, children: "Totais" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: formatCurrency(somaValores) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: formatCurrency(somaTaxas) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: formatCurrency(somaLiquido) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: formatCurrency(somaComissao) })
      ] }) })
    ] }) })
  ] });
}

const $$Vendas = createComponent(($$result, $$props, $$slots) => {
  const activePage = "relatorios-vendas";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Relat\xF3rio de Vendas", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Relat\xF3rio de Vendas", "subtitle": "Filtre e analise vendas por per\xEDodo, cliente, destino e produto.", "color": "purple" })} ${renderComponent($$result2, "RelatorioVendasIsland", RelatorioVendasIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/RelatorioVendasIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas.astro";
const $$url = "/relatorios/vendas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Vendas,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
