import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import { registrarLog } from "../../lib/logs";
import { normalizeText } from "../../lib/normalizeText";
import CalculatorModal from "../ui/CalculatorModal";

type Cliente = { id: string; nome: string; cpf?: string | null };
type Cidade = { id: string; nome: string };
type CidadeSugestao = { id: string; nome: string; subdivisao_nome?: string | null; pais_nome?: string | null };
type CidadePrefill = { id: string; nome: string };
type Produto = {
  id: string;
  nome: string;
  cidade_id: string | null;
  tipo_produto: string | null;
  isVirtual?: boolean;
  todas_as_cidades?: boolean;
};

type FormVenda = {
  cliente_id: string;
  destino_id: string;
  data_lancamento: string;
  data_embarque: string;
  data_final: string;
};

type FormRecibo = {
  id?: string;
  produto_id: string;
  produto_resolvido_id?: string;
  numero_recibo: string;
  valor_total: string;
  valor_taxas: string;
  data_inicio: string;
  data_fim: string;
  principal: boolean;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

const initialVenda: FormVenda = {
  cliente_id: "",
  destino_id: "",
  data_lancamento: new Date().toISOString().substring(0, 10),
  data_embarque: "",
  data_final: "",
};

const initialRecibo: FormRecibo = {
  produto_id: "",
  produto_resolvido_id: "",
  numero_recibo: "",
  valor_total: "",
  valor_taxas: "0",
  data_inicio: "",
  data_fim: "",
  principal: false,
};

function formatarValorDigitado(valor: string) {
  const apenasDigitos = valor.replace(/\D/g, "");
  if (!apenasDigitos) return "";
  const num = Number(apenasDigitos) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarNumeroComoMoeda(valor: number | string | null | undefined) {
  const num = Number(valor);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function moedaParaNumero(valor: string) {
  if (!valor) return NaN;
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return num;
}

function dataParaInput(value?: string | Date | null) {
  if (value == null) return "";
  if (typeof value === "string") {
    if (value.includes("T")) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0];
      }
      return value.split("T")[0];
    }
    return value;
  }
  return value.toISOString().split("T")[0];
}

function parseDateInput(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function isEndOnOrAfterStart(start: string, end: string) {
  const startDate = parseDateInput(start);
  const endDate = parseDateInput(end);
  if (!startDate || !endDate) return true;
  return endDate.getTime() >= startDate.getTime();
}

function calcularStatusPeriodo(inicio?: string | null, fim?: string | null) {
  if (!inicio) return "planejada";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : null;

  if (dataFim && dataFim < hoje) return "concluida";
  if (dataInicio > hoje) return "confirmada";
  if (dataFim && hoje > dataFim) return "concluida";
  return "em_viagem";
}

export default function VendasCadastroIsland() {
  // =======================================================
  // PERMISSÕES
  // =======================================================
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadPerm = loadingPerms || !ready;
  const podeVer = can("Vendas");
  const podeCriar = can("Vendas", "create");
  const podeEditar = can("Vendas", "edit");
  const isAdmin = can("Vendas", "admin");

  // =======================================================
  // ESTADOS
  // =======================================================
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tipos, setTipos] = useState<
    { id: string; nome: string | null; tipo?: string | null }[]
  >([]);

  const [formVenda, setFormVenda] = useState<FormVenda>(initialVenda);
  const [recibos, setRecibos] = useState<FormRecibo[]>([]);
  const [reciboEmEdicao, setReciboEmEdicao] = useState<number | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [orcamentoId, setOrcamentoId] = useState<string | null>(null);
  const [cidadePrefill, setCidadePrefill] = useState<CidadePrefill>({ id: "", nome: "" });

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVenda, setLoadingVenda] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);

  // AUTOCOMPLETE (cliente, cidade de destino, produto)
  const [buscaCliente, setBuscaCliente] = useState("");
  const [buscaDestino, setBuscaDestino] = useState("");
  const [buscaProduto, setBuscaProduto] = useState("");
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
  const [resultadosCidade, setResultadosCidade] = useState<CidadeSugestao[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidade, setErroCidade] = useState<string | null>(null);
  const [buscaCidadeSelecionada, setBuscaCidadeSelecionada] = useState("");

  // =======================================================
  // CARREGAR DADOS INICIAIS
  // =======================================================
  async function carregarDados(
    vendaId?: string,
    cidadePrefillParam?: CidadePrefill,
    orcamentoIdParam?: string | null
  ) {
    try {
      setLoading(true);

      const [c, d, p, tiposResp] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("cidades").select("id, nome").order("nome"),
        supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo"),
      ]);

      setClientes(c.data || []);
      const cidadesLista = (d.data || []) as Cidade[];
      setCidades(cidadesLista);
      const tiposLista = (tiposResp.data as any[]) || [];
      const produtosLista = ((p.data as any[]) || []).map((prod) => ({
        ...prod,
        todas_as_cidades: (prod as any).todas_as_cidades ?? false,
      } as Produto));
      setProdutos(produtosLista);
      setTipos(tiposLista as any);

      if (vendaId) {
        await carregarVenda(vendaId, cidadesLista, produtosLista, cidadePrefillParam);
      } else if (orcamentoIdParam) {
        await carregarOrcamento(
          orcamentoIdParam,
          cidadesLista,
          produtosLista,
          c.data || [],
          tiposLista as any
        );
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados.");
      showToast("Erro ao carregar dados.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function carregarVenda(
    id: string,
    cidadesBase?: Cidade[],
    produtosBase?: Produto[],
    cidadePrefillParam?: CidadePrefill
  ) {
    try {
      setLoadingVenda(true);

      const { data: vendaData, error: vendaErr } = await supabase
        .from("vendas")
        .select("id, cliente_id, destino_id, destino_cidade_id, data_lancamento, data_embarque, data_final")
        .eq("id", id)
        .maybeSingle();

      if (vendaErr) throw vendaErr;
      if (!vendaData) {
        setErro("Venda não encontrada para edição.");
        return;
      }

      // destino_id na tabela aponta para produto; buscamos cidade desse produto
      let cidadeId = vendaData.destino_cidade_id || "";
      let cidadeNome = "";
      if (cidadeId) {
        const lista = cidadesBase || cidades;
        const cidadeSelecionada = lista.find((c) => c.id === cidadeId);
        if (cidadeSelecionada) cidadeNome = cidadeSelecionada.nome;
      } else if (vendaData.destino_id) {
        const { data: prodData } = await supabase
          .from("produtos")
          .select("id, cidade_id")
          .eq("id", vendaData.destino_id)
          .maybeSingle();
        cidadeId = prodData?.cidade_id || "";
        const lista = cidadesBase || cidades;
        const cidadeSelecionada = lista.find((c) => c.id === cidadeId);
        if (cidadeSelecionada) cidadeNome = cidadeSelecionada.nome;
      }
      if (!cidadeId && cidadePrefillParam?.id) {
        cidadeId = cidadePrefillParam.id;
      }
      if (!cidadeNome && cidadePrefillParam?.nome) {
        cidadeNome = cidadePrefillParam.nome;
      }

      setFormVenda({
        cliente_id: vendaData.cliente_id,
        destino_id: cidadeId,
        data_lancamento: dataParaInput(vendaData.data_lancamento),
        data_embarque: dataParaInput(vendaData.data_embarque),
        data_final: dataParaInput(vendaData.data_final),
      });
      setBuscaDestino(cidadeNome || cidadeId || "");
      setBuscaCidadeSelecionada(cidadeNome || cidadeId || "");

      const { data: recibosData, error: recErr } = await supabase
        .from("vendas_recibos")
        .select("*, produto_resolvido_id")
        .eq("venda_id", id);
      if (recErr) throw recErr;

      const produtosLista = produtosBase || produtos;
      const produtoPrincipalIdDaVenda = vendaData.destino_id;
      const recibosComPrincipal = (recibosData || []).map((r: any) => {
        const produtoResolvidoId = r.produto_resolvido_id || "";
        let produtoSelecionado = produtosLista.find((p) => p.id === produtoResolvidoId);
        if (!produtoSelecionado) {
          produtoSelecionado = produtosLista.find((p) => {
            const ehGlobal = !!p.todas_as_cidades;
            return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeId || p.cidade_id === cidadeId);
          });
        }
        const produtoId = produtoSelecionado?.id || "";
        return {
          id: r.id,
          produto_id: produtoId,
          produto_resolvido_id: produtoId,
          numero_recibo: r.numero_recibo || "",
          valor_total: r.valor_total != null ? formatarNumeroComoMoeda(r.valor_total) : "",
          valor_taxas: r.valor_taxas != null ? formatarNumeroComoMoeda(r.valor_taxas) : "0,00",
          data_inicio: dataParaInput(r.data_inicio),
          data_fim: dataParaInput(r.data_fim),
          principal: produtoSelecionado?.id === produtoPrincipalIdDaVenda,
        };
      });
      setRecibos(garantirReciboPrincipal(recibosComPrincipal));
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar venda para edição.");
      showToast("Erro ao carregar venda para edição.", "error");
    } finally {
      setLoadingVenda(false);
    }
  }

  function formatarValorMoeda(valor?: number | null) {
    if (typeof valor !== "number" || !Number.isFinite(valor)) return "";
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function gerarNumeroRecibo(orcamentoId: string, index: number) {
    const prefixo = (orcamentoId || "").replace(/-/g, "").slice(0, 6).toUpperCase();
    const sequencia = String(index + 1).padStart(2, "0");
    return `ORC-${prefixo}-${sequencia}`;
  }

  function resolverTipoId(tipoLabel: string, tiposBase: { id: string; nome: string | null; tipo?: string | null }[]) {
    const normalized = normalizeText(tipoLabel || "");
    if (!normalized) return "";
    const match = tiposBase.find((t) => {
      if (normalizeText(t.nome || "") === normalized) return true;
      if (normalizeText(t.tipo || "") === normalized) return true;
      return false;
    });
    return match?.id || "";
  }

  async function carregarOrcamento(
    id: string,
    cidadesBase?: Cidade[],
    produtosBase?: Produto[],
    clientesBase?: Cliente[],
    tiposBase?: { id: string; nome: string | null; tipo?: string | null }[]
  ) {
    try {
      const { data: orcamento, error } = await supabase
        .from("quote")
        .select(
          "id, client_id, client_name, destino_cidade_id, data_embarque, data_final, quote_item (id, item_type, title, product_name, total_amount, taxes_amount, start_date, end_date, cidade_id, order_index)"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!orcamento) {
        setErro("Orcamento nao encontrado para conversao.");
        showToast("Orcamento nao encontrado.", "error");
        return;
      }

      const clientesLista = clientesBase || clientes;
      const cidadesLista = cidadesBase || cidades;
      const produtosLista = produtosBase || produtos;
      const tiposLista = tiposBase || tipos;

      let clienteId = orcamento.client_id || "";
      if (!clienteId && orcamento.client_name) {
        const match = clientesLista.find(
          (c) => normalizeText(c.nome) === normalizeText(orcamento.client_name || "")
        );
        if (match) clienteId = match.id;
        else setBuscaCliente(orcamento.client_name);
      }
      if (clienteId) {
        setBuscaCliente("");
      }

      let destinoId = orcamento.destino_cidade_id || "";
      if (!destinoId) {
        const firstItemCity = (orcamento.quote_item || []).find((item: any) => item?.cidade_id)?.cidade_id;
        destinoId = firstItemCity || "";
      }
      const destinoCidade = cidadesLista.find((c) => c.id === destinoId);
      if (destinoCidade) {
        setBuscaDestino(destinoCidade.nome);
        setBuscaCidadeSelecionada(destinoCidade.nome);
      }

      setFormVenda((prev) => ({
        ...prev,
        cliente_id: clienteId,
        destino_id: destinoId,
        data_embarque: dataParaInput(orcamento.data_embarque),
        data_final: dataParaInput(orcamento.data_final),
      }));

      const itensOrdenados = [...(orcamento.quote_item || [])].sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      );
      const produtosAtualizados = [...produtosLista];
      const recibosGerados = itensOrdenados.map((item: any, index: number) => {
        const nomeItem = (item.product_name || item.title || item.item_type || "").trim();
        const nomeNormalizado = normalizeText(nomeItem);
        const cidadeBaseId = item.cidade_id || destinoId || "";
        const tipoId = resolverTipoId(item.item_type || "", tiposLista);

        let produtoMatch =
          produtosAtualizados.find(
            (p) =>
              normalizeText(p.nome) === nomeNormalizado &&
              (!cidadeBaseId || p.cidade_id === cidadeBaseId || p.todas_as_cidades)
          ) ||
          (tipoId
            ? produtosAtualizados.find(
                (p) =>
                  p.tipo_produto === tipoId &&
                  (!cidadeBaseId || p.cidade_id === cidadeBaseId || p.todas_as_cidades)
              )
            : null);

        let produtoId = produtoMatch?.id || "";
        if (!produtoId && nomeItem) {
          const virtualId = `virtual-${tipoId || "sem-tipo"}-${index + 1}`;
          produtosAtualizados.push({
            id: virtualId,
            nome: nomeItem,
            cidade_id: cidadeBaseId || null,
            tipo_produto: tipoId || null,
            todas_as_cidades: false,
            isVirtual: true,
          });
          produtoId = virtualId;
        }

        const dataInicio = dataParaInput(item.start_date || orcamento.data_embarque);
        const dataFim = dataParaInput(
          item.end_date || orcamento.data_final || item.start_date || orcamento.data_embarque
        );

        return {
          ...initialRecibo,
          produto_id: produtoId,
          numero_recibo: gerarNumeroRecibo(orcamento.id, index),
          data_inicio: dataInicio,
          data_fim: dataFim,
          valor_total: formatarValorMoeda(Number(item.total_amount || 0)),
          valor_taxas: formatarValorMoeda(Number(item.taxes_amount || 0)),
          principal: index === 0,
        };
      });

      if (recibosGerados.length) {
        setRecibos(garantirReciboPrincipal(recibosGerados));
      }
      if (produtosAtualizados.length !== produtosLista.length) {
        setProdutos(produtosAtualizados);
      }
    } catch (err) {
      console.error(err);
      setErro("Erro ao carregar orcamento para conversao.");
      showToast("Erro ao carregar orcamento.", "error");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setEditId(idParam);
    const orcamentoParam = params.get("orcamentoId");
    if (orcamentoParam && !idParam) setOrcamentoId(orcamentoParam);
    const cidadeIdParam = params.get("cidadeId") || "";
    const cidadeNomeParam = params.get("cidadeNome") || "";
    if (cidadeIdParam || cidadeNomeParam) {
      setCidadePrefill({ id: cidadeIdParam, nome: cidadeNomeParam });
    }
  }, []);

  useEffect(() => {
    if (!loadPerm && podeVer) carregarDados(editId || undefined, cidadePrefill, orcamentoId);
  }, [loadPerm, podeVer, editId, cidadePrefill, orcamentoId]);

  // Busca cidade (autocomplete)
  useEffect(() => {
    if (buscaDestino.trim().length < 2) {
      setResultadosCidade([]);
      setMostrarSugestoesCidade(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidade(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: buscaDestino.trim(), limite: 10 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            console.error("Erro ao buscar cidades:", error);
            setErroCidade("Erro ao buscar cidades (RPC). Tentando fallback...");
            const { data: fallbackData, error: fallbackError } = await supabase
              .from("cidades")
              .select("id, nome, subdivisao_nome, pais_nome")
              .ilike("nome", `%${buscaDestino.trim()}%`)
              .order("nome");
            if (fallbackError) {
              console.error("Erro no fallback de cidades:", fallbackError);
              setErroCidade("Erro ao buscar cidades.");
            } else {
              setResultadosCidade((fallbackData as CidadeSugestao[]) || []);
              setErroCidade(null);
            }
          } else {
            setResultadosCidade((data as CidadeSugestao[]) || []);
          }
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [buscaDestino]);

  // =======================================================
  // AUTOCOMPLETE
  // =======================================================
  const normalizarCpf = (v: string) => v.replace(/\D/g, "");

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes;
    const t = normalizeText(buscaCliente);
    const cpfTermo = normalizarCpf(buscaCliente);
    return clientes.filter((c) => {
      const cpf = normalizarCpf(c.cpf || "");
      if (normalizeText(c.nome).includes(t)) return true;
      if (cpfTermo && cpf.includes(cpfTermo)) return true;
      return false;
    });
  }, [clientes, buscaCliente]);
  const clienteSelecionado = useMemo(
    () => clientes.find((c) => c.id === formVenda.cliente_id) || null,
    [clientes, formVenda.cliente_id]
  );

  const cidadesFiltradas = useMemo(() => {
    if (!buscaDestino.trim()) return cidades;
    const t = normalizeText(buscaDestino);
    return cidades.filter((c) => normalizeText(c.nome).includes(t));
  }, [cidades, buscaDestino]);

  const produtosFiltrados = useMemo(() => {
    const base = formVenda.destino_id
      ? produtos.filter((p) => p.todas_as_cidades || p.cidade_id === formVenda.destino_id)
      : produtos.filter((p) => p.todas_as_cidades);

    if (!buscaProduto.trim()) return base;
    const term = normalizeText(buscaProduto);
    return base.filter((c) => normalizeText(c.nome).includes(term));
  }, [produtos, buscaProduto, formVenda.destino_id]);

  const existeProdutoGlobal = useMemo(
    () => produtos.some((p) => !!p.todas_as_cidades),
    [produtos]
  );

  const cidadeObrigatoria = useMemo(() => recibos.length > 0, [recibos.length]);

  function handleClienteInputChange(value: string) {
    setBuscaCliente(value);
    const normalized = normalizeText(value);
    const cpfValue = normalizarCpf(value);
    const match = clientes.find((c) => {
      const cpf = normalizarCpf(c.cpf || "");
      return (
        normalizeText(c.nome) === normalized ||
        (cpfValue && cpf === cpfValue)
      );
    });
    setFormVenda((prev) => ({
      ...prev,
      cliente_id: match ? match.id : "",
    }));
  }

  function handleCidadeDestino(valor: string) {
    setBuscaDestino(valor);
    const cidadeAtual = cidades.find((c) => c.id === formVenda.destino_id);
    const valorNormalizado = normalizeText(valor);
    const cidadeAtualNome = normalizeText(cidadeAtual?.nome || "");
    const cidadeSelecionada = normalizeText(buscaCidadeSelecionada);
    const valorMantemCidade =
      (!!cidadeAtualNome &&
        (valorNormalizado === cidadeAtualNome ||
          valorNormalizado.startsWith(cidadeAtualNome))) ||
      (!!cidadeSelecionada && valorNormalizado === cidadeSelecionada);
    if (!cidadeAtual || !valorMantemCidade) {
      setFormVenda((prev) => ({ ...prev, destino_id: "" }));
    }
    setMostrarSugestoesCidade(true);
  }

function showToast(message: string, type: "success" | "error" = "success") {
  setToastCounter((prev) => {
    const id = prev + 1;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
    return id;
  });
}

function garantirReciboPrincipal(recibos: FormRecibo[]): FormRecibo[] {
  if (recibos.length === 0) return [];
  const principalComProduto = recibos.findIndex(
    (r) => r.principal && r.produto_id
  );
  if (principalComProduto >= 0) {
    return recibos.map((r, idx) => ({ ...r, principal: idx === principalComProduto }));
  }
  const comProduto = recibos.findIndex((r) => r.produto_id);
  if (comProduto >= 0) {
    return recibos.map((r, idx) => ({ ...r, principal: idx === comProduto }));
  }
  const principalAtual = recibos.findIndex((r) => r.principal);
  if (principalAtual >= 0) {
    return recibos.map((r, idx) => ({ ...r, principal: idx === principalAtual }));
  }
  return recibos.map((r, idx) => ({ ...r, principal: idx === 0 }));
}

// =======================================================
// HANDLERS
// =======================================================
  function addRecibo() {
    setRecibos((prev) => {
      const novo = [...prev, { ...initialRecibo }];
      return garantirReciboPrincipal(novo);
    });
  }

  function updateRecibo(index: number, campo: string, valor: string) {
    setRecibos((prev) => {
      const novo = [...prev];
      const atualizado = { ...(novo[index] as any), [campo]: valor };
      if (campo === "data_inicio") {
        if (atualizado.data_fim && atualizado.data_fim < valor) {
          atualizado.data_fim = valor;
        }
      }
      if (campo === "data_fim") {
        if (atualizado.data_inicio && atualizado.data_fim < atualizado.data_inicio) {
          atualizado.data_fim = atualizado.data_inicio;
        }
      }
      novo[index] = atualizado;
      return novo;
    });
  }

  function updateReciboMonetario(index: number, campo: "valor_total" | "valor_taxas", valor: string) {
    const formatado = formatarValorDigitado(valor);
    updateRecibo(index, campo, formatado);
  }

  useEffect(() => {
    // Ao trocar a cidade, limpa buscas e produtos que não pertencem a ela
    if (!formVenda.destino_id) return;
    setBuscaProduto("");
    setRecibos((prev) => {
      const atualizado = prev.map((r) => {
        const prod = produtos.find((p) => p.id === r.produto_id);
        const ehGlobal = !!prod?.todas_as_cidades;
        if (prod && (ehGlobal || prod.cidade_id === formVenda.destino_id)) return r;
        return { ...r, produto_id: "", principal: false };
      });
      return garantirReciboPrincipal(atualizado);
    });
  }, [formVenda.destino_id, produtos]);

  function removerRecibo(index: number) {
    setRecibos((prev) => {
      const novo = prev.filter((_, i) => i !== index);
      return garantirReciboPrincipal(novo);
    });
  }

  function marcarReciboPrincipal(index: number) {
    setRecibos((prev) =>
      prev.map((recibo, i) => ({
        ...recibo,
        principal: i === index,
      }))
    );
  }

  function resetFormAndGoToConsulta() {
    setFormVenda({
      ...initialVenda,
      data_lancamento: new Date().toISOString().substring(0, 10),
    });
    setRecibos([]);
    setEditId(null);
    setCidadePrefill({ id: "", nome: "" });
    setBuscaCliente("");
    setBuscaDestino("");
    setBuscaProduto("");
    setBuscaCidadeSelecionada("");
    setResultadosCidade([]);
    setErro(null);
    window.location.href = "/vendas/consulta";
  }

  function cancelarCadastro() {
    setFormVenda(initialVenda);
    setRecibos([]);
    setEditId(null);
    setCidadePrefill({ id: "", nome: "" });
    setBuscaCliente("");
    setBuscaDestino("");
    setBuscaProduto("");
    setBuscaCidadeSelecionada("");
    setResultadosCidade([]);
    setErro(null);
    window.location.href = "/vendas/consulta";
  }

  // =======================================================
  // SALVAR VENDA COMPLETA (VENDA + RECIBOS)
  // =======================================================
  async function salvarVenda(e: React.FormEvent) {
    e.preventDefault();

    if (!podeCriar && !isAdmin) {
      setErro("Você não possui permissão para cadastrar vendas.");
      showToast("Você não possui permissão para cadastrar vendas.", "error");
      return;
    }

    if (recibos.length === 0) {
      setErro("Uma venda precisa ter ao menos 1 recibo.");
      showToast("Inclua ao menos um recibo na venda.", "error");
      return;
    }

    const clienteId = formVenda.cliente_id.trim();
    if (!clienteId) {
      setErro("Selecione um cliente valido antes de salvar.");
      showToast("Selecione um cliente valido antes de salvar.", "error");
      return;
    }

    if (formVenda.data_embarque && formVenda.data_final && !isEndOnOrAfterStart(formVenda.data_embarque, formVenda.data_final)) {
      setErro("A data final deve ser igual ou após a data de embarque.");
      showToast("A data final deve ser igual ou após a data de embarque.", "error");
      return;
    }
    for (let i = 0; i < recibos.length; i += 1) {
      const recibo = recibos[i];
      if (recibo.data_inicio && recibo.data_fim && !isEndOnOrAfterStart(recibo.data_inicio, recibo.data_fim)) {
        const msg = `Recibo ${i + 1}: a data fim deve ser igual ou após a data início.`;
        setErro(msg);
        showToast(msg, "error");
        return;
      }
    }

    try {
      setSalvando(true);
      setErro(null);

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        showToast("Usuário não autenticado.", "error");
        setSalvando(false);
        return;
      }

      const { data: userRow, error: userRowError } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();
      if (userRowError) throw userRowError;
      const companyId = userRow?.company_id;
      if (!companyId) {
        throw new Error("Seu usuário precisa estar vinculado a uma empresa para cadastrar viagens.");
      }

      if (!recibos.length) {
        setErro("Uma venda precisa ter ao menos 1 recibo.");
        showToast("Inclua ao menos um recibo na venda.", "error");
        setSalvando(false);
        return;
      }

      const principalIndex = recibos.findIndex((r) => r.principal);
      const principalRecibo = principalIndex >= 0 ? recibos[principalIndex] : recibos[0];
      const produtoDestinoIdRaw = principalRecibo?.produto_id;
      if (!produtoDestinoIdRaw) {
        setErro("Selecione um produto para o recibo principal da venda.");
        showToast("Selecione o produto principal antes de salvar.", "error");
        setSalvando(false);
        return;
      }

      const possuiProdutoLocal = recibos.some((r) => {
        const prod = produtos.find((p) => p.id === r.produto_id);
        const ehGlobal =
          !!prod?.todas_as_cidades || (r.produto_id || "").startsWith("virtual-");
        return prod?.cidade_id && !ehGlobal;
      });

      if (possuiProdutoLocal && !formVenda.destino_id) {
        setErro("Selecione a cidade de destino para vendas com produtos vinculados a cidade.");
        showToast("Selecione a cidade de destino.", "error");
        setSalvando(false);
        return;
      }

      async function resolverProdutoId(recibo: FormRecibo): Promise<string> {
        const atualId = recibo.produto_id;
        const existente = produtos.find((p) => p.id === atualId);
        if (existente && !existente.isVirtual) return existente.id;

        const tipoId =
          existente?.tipo_produto ||
          (atualId?.startsWith("virtual-") ? atualId.replace("virtual-", "") : existente?.tipo_produto);

        if (!tipoId) throw new Error("Produto inválido. Selecione novamente.");

        const cidadeDestino = formVenda.destino_id;
        if (!cidadeDestino) throw new Error("Selecione a cidade de destino para usar produtos globais.");

        const tipoInfo = tipos.find((t) => t.id === tipoId);
        const isGlobalTipo = !!existente?.todas_as_cidades;

        const produtoDaCidade = produtos.find(
          (p) => p.tipo_produto === tipoId && p.cidade_id === cidadeDestino && !p.todas_as_cidades
        );
        if (produtoDaCidade) return produtoDaCidade.id;

        if (isGlobalTipo) {
          const produtoGlobal = produtos.find((p) => p.tipo_produto === tipoId && !!p.todas_as_cidades);
          if (produtoGlobal) return produtoGlobal.id;
          const { data: globalDb, error: globalErr } = await supabase
            .from("produtos")
            .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
            .eq("tipo_produto", tipoId)
            .eq("todas_as_cidades", true)
            .limit(1)
            .maybeSingle();
          if (globalErr) throw globalErr;
          if (globalDb?.id) {
            setProdutos((prev) => {
              if (prev.some((p) => p.id === globalDb.id)) return prev;
              return [
                ...prev,
                {
                  id: globalDb.id,
                  nome: globalDb.nome,
                  cidade_id: globalDb.cidade_id,
                  tipo_produto: globalDb.tipo_produto,
                  todas_as_cidades: !!globalDb.todas_as_cidades,
                },
              ];
            });
            return globalDb.id;
          }
          throw new Error(
            "Produto global selecionado não possui cadastro na tabela de Produtos; cadastre o serviço como global antes de continuar.",
          );
        }

        const { data: produtoLocal, error: produtoLocalErr } = await supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .eq("tipo_produto", tipoId)
          .eq("cidade_id", cidadeDestino)
          .limit(1)
          .maybeSingle();
        if (produtoLocalErr) throw produtoLocalErr;
        if (produtoLocal?.id) {
          setProdutos((prev) => {
            if (prev.some((p) => p.id === produtoLocal.id)) return prev;
            return [
              ...prev,
              {
                id: produtoLocal.id,
                nome: produtoLocal.nome,
                cidade_id: produtoLocal.cidade_id,
                tipo_produto: produtoLocal.tipo_produto,
                todas_as_cidades: !!produtoLocal.todas_as_cidades,
              },
            ];
          });
          return produtoLocal.id;
        }

        const nomeProd = tipoInfo?.nome || "Produto";
        const { data: novo, error } = await supabase
          .from("produtos")
          .insert({
            nome: nomeProd,
            destino: nomeProd,
            cidade_id: cidadeDestino,
            tipo_produto: tipoId,
            ativo: true,
            todas_as_cidades: false,
          })
          .select("id")
          .single();
        if (error) throw error;
        const novoId = (novo as any)?.id;
        if (novoId) {
          setProdutos((prev) => [
            ...prev,
            {
              id: novoId,
              nome: nomeProd,
              cidade_id: cidadeDestino,
              tipo_produto: tipoId,
              todas_as_cidades: false,
            },
          ]);
          return novoId;
        }
        throw new Error("Não foi possível criar produto local.");
      }

      const produtoIdsResolvidos: string[] = [];
      for (const r of recibos) {
        const idResolvido = await resolverProdutoId(r);
        produtoIdsResolvidos.push(idResolvido);
      }

      const indexPrincipalFinal = principalIndex >= 0 ? principalIndex : 0;
      const produtoDestinoId = produtoIdsResolvidos[indexPrincipalFinal];

      let oldReciboIds: string[] = [];
      if (editId) {
        const { data: existingRecibos, error: existingRecibosErr } = await supabase
          .from("vendas_recibos")
          .select("id")
          .eq("venda_id", editId);
        if (existingRecibosErr) throw existingRecibosErr;
        oldReciboIds = (existingRecibos || []).map((item) => item.id).filter(Boolean);
      }

      const getCidadeNome = (cidadeId?: string | null) =>
        cidades.find((c) => c.id === cidadeId)?.nome || "";

      let vendaId = editId;

      async function marcarOrcamentoFechado() {
        if (!orcamentoId) return;
        const { error: fechamentoErr } = await supabase
          .from("quote")
          .update({
            status_negociacao: "Fechado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orcamentoId);
        if (fechamentoErr) {
          console.error("Erro ao fechar orcamento:", fechamentoErr);
          showToast("Venda salva, mas o orçamento não foi atualizado.", "error");
        }
      }

      async function criarViagemParaRecibo(params: {
        reciboId?: string | null;
        dataInicio?: string | null;
        dataFim?: string | null;
        tipoNome?: string;
        produtoNome?: string;
        numeroRecibo?: string;
        cidade?: string;
      }) {
        if (!params.reciboId) return;
        if (!vendaId) {
          throw new Error("Venda não encontrada ao criar viagem.");
        }
        const statusPeriodo = calcularStatusPeriodo(params.dataInicio, params.dataFim);
        const cidadeNome = params.cidade || getCidadeNome(formVenda.destino_id);
        const destinoLabel = params.produtoNome || params.tipoNome || cidadeNome || null;
        const origemLabel =
          cidadeNome && cidadeNome !== destinoLabel
            ? cidadeNome
            : params.produtoNome || params.tipoNome || destinoLabel;
        const { data: viagemData, error: viagemErr } = await supabase
          .from("viagens")
          .insert({
            company_id: companyId,
            venda_id: vendaId,
            recibo_id: params.reciboId,
            cliente_id: clienteId,
            responsavel_user_id: userId,
            origem: origemLabel || null,
            destino: destinoLabel || null,
            data_inicio: params.dataInicio || null,
            data_fim: params.dataFim || null,
            status: statusPeriodo,
            observacoes: params.numeroRecibo ? `Recibo ${params.numeroRecibo}` : null,
          })
          .select("id")
          .single();
        if (viagemErr) throw viagemErr;
        const viagemId = viagemData?.id;
        if (!viagemId) return;
        const { error: passageiroError } = await supabase.from("viagem_passageiros").insert({
          viagem_id: viagemId,
          cliente_id: clienteId,
          company_id: companyId,
          papel: "passageiro",
          created_by: userId,
        });
        if (passageiroError) throw passageiroError;
      }

      async function salvarReciboEViagem(recibo: FormRecibo, produtoIdResolvido: string) {
        if (!vendaId) {
          throw new Error("Venda não encontrada ao salvar recibo.");
        }
        const prod = produtos.find((p) => p.id === produtoIdResolvido);
        const tipoId =
          prod?.tipo_produto ||
          (recibo.produto_id?.startsWith("virtual-") ? recibo.produto_id.replace("virtual-", "") : prod?.tipo_produto);
        if (!tipoId) {
          throw new Error("Produto do recibo não possui tipo vinculado.");
        }
        const valTotalNum = moedaParaNumero(recibo.valor_total);
        const valTaxasNum = moedaParaNumero(recibo.valor_taxas);
        if (Number.isNaN(valTotalNum)) {
          throw new Error("Valor total inválido. Digite um valor monetário.");
        }
        if (Number.isNaN(valTaxasNum)) {
          throw new Error("Valor de taxas inválido. Digite um valor monetário.");
        }
        const tipoNome = tipos.find((t) => t.id === tipoId)?.nome || prod?.nome || "";
        const insertPayload = {
          venda_id: vendaId,
          produto_id: tipoId,
          produto_resolvido_id: produtoIdResolvido,
          numero_recibo: recibo.numero_recibo.trim(),
          valor_total: valTotalNum,
          valor_taxas: valTaxasNum,
          data_inicio: recibo.data_inicio || null,
          data_fim: recibo.data_fim || null,
        };
        const { data: insertedRecibo, error: insertErr } = await supabase
          .from("vendas_recibos")
          .insert(insertPayload)
          .select("id, data_inicio, data_fim")
          .single();
        if (insertErr) throw insertErr;
        const cidadeNomeResolvida =
          getCidadeNome(formVenda.destino_id) || getCidadeNome(prod?.cidade_id);
        await criarViagemParaRecibo({
          reciboId: insertedRecibo?.id,
          dataInicio: insertedRecibo?.data_inicio || null,
          dataFim: insertedRecibo?.data_fim || null,
          tipoNome,
          produtoNome: prod?.nome,
          numeroRecibo: insertPayload.numero_recibo,
          cidade: cidadeNomeResolvida || undefined,
        });
      }

      if (editId) {
        // Atualiza venda existente
        const { error: vendaErr } = await supabase
          .from("vendas")
          .update({
            cliente_id: clienteId,
            destino_id: produtoDestinoId, // FK para produtos
            destino_cidade_id: formVenda.destino_id || null,
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
            data_final: formVenda.data_final || null,
          })
          .eq("id", editId);
        if (vendaErr) throw vendaErr;

        // removemos viagens vinculadas aos recibos antigos
        if (oldReciboIds.length > 0) {
          const { error: cleanupError } = await supabase
            .from("viagens")
            .delete()
            .in("recibo_id", oldReciboIds);
          if (cleanupError) throw cleanupError;
        }

        // substitui recibos para manter consistência
        await supabase.from("vendas_recibos").delete().eq("venda_id", editId);

        for (let idx = 0; idx < recibos.length; idx++) {
          await salvarReciboEViagem(recibos[idx], produtoIdsResolvidos[idx]);
        }

        await registrarLog({
          acao: "venda_atualizada",
          modulo: "Vendas",
          detalhes: { id: editId, venda: formVenda, recibos },
        });

        await marcarOrcamentoFechado();
        showToast("Venda atualizada com sucesso!", "success");
        setTimeout(() => resetFormAndGoToConsulta(), 200);
      } else {
        // 1) INSERE VENDA
        const { data: vendaData, error: vendaErr } = await supabase
          .from("vendas")
          .insert({
            vendedor_id: userId,
            cliente_id: clienteId,
            destino_id: produtoDestinoId, // FK para produtos
            destino_cidade_id: formVenda.destino_id || null,
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
            data_final: formVenda.data_final || null,
          })
          .select()
          .single();

        if (vendaErr) throw vendaErr;

        vendaId = vendaData.id;

        // 2) INSERE RECIBOS
        for (let idx = 0; idx < recibos.length; idx++) {
          await salvarReciboEViagem(recibos[idx], produtoIdsResolvidos[idx]);
        }

        // 3) AUDITORIA
        await registrarLog({
          acao: "venda_criada",
          modulo: "Vendas",
          detalhes: {
            venda: formVenda,
            recibos,
            id: vendaId,
          },
        });

        await marcarOrcamentoFechado();
        showToast("Venda cadastrada com sucesso!", "success");
        setTimeout(() => resetFormAndGoToConsulta(), 200);
      }
    } catch (e: any) {
      console.error(e);
      const detalhes = e?.message || e?.error?.message || "";
      const cod = e?.code || e?.error?.code || "";
      setErro(`Erro ao salvar venda.${cod ? ` Código: ${cod}.` : ""}${detalhes ? ` Detalhes: ${detalhes}` : ""}`);
      showToast("Erro ao salvar venda.", "error");
    } finally {
      setSalvando(false);
    }
  }

  // =======================================================
  // BLOQUEIO TOTAL
  // =======================================================
  if (!podeVer) {
    return (
      <div className="card-base card-config">
        <strong>Acesso negado ao módulo de Vendas.</strong>
      </div>
    );
  }

  if (!podeCriar && !isAdmin) {
    return (
      <div className="card-base card-config">
        <strong>Você não possui permissão para cadastrar vendas.</strong>
      </div>
    );
  }

  // =======================================================
  // FORM
  // =======================================================
  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-6">

      {/* FORM VENDA */}
      <div className="card-base card-green form-card mb-3">
        <h3>{editId ? "Editar venda" : "Cadastro de Venda"}</h3>
        {editId && (
          <small style={{ color: "#0f172a" }}>
            Modo edição — altere cliente, cidade de destino, embarque e recibos.
          </small>
        )}

        {erro && (
          <div className="card-base card-config mb-3">
            <strong>{erro}</strong>
          </div>
        )}

        <form onSubmit={salvarVenda}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* CLIENTE */}
            <div className="form-group flex-1 min-w-[220px]">
              <label className="form-label">Cliente *</label>
              <input
                className="form-input"
                list="listaClientes"
                placeholder="Buscar cliente..."
                value={
                  buscaCliente || clienteSelecionado?.nome || ""
                }
                onChange={(e) => handleClienteInputChange(e.target.value)}
                onBlur={() => {
                  const texto = normalizeText(buscaCliente);
                  const cpfTexto = normalizarCpf(buscaCliente);
                  const achado = clientesFiltrados.find((c) => {
                    const cpf = normalizarCpf(c.cpf || "");
                    return (
                      normalizeText(c.nome) === texto ||
                      (cpfTexto && cpf === cpfTexto)
                    );
                  });
                  if (achado) {
                    setFormVenda({
                      ...formVenda,
                      cliente_id: achado.id,
                    });
                    setBuscaCliente("");
                  }
                }}
                required
              />
              <datalist id="listaClientes">
                {clientesFiltrados.map((c) => (
                  <React.Fragment key={c.id}>
                    <option value={c.nome} label={c.cpf ? `CPF: ${c.cpf}` : undefined} />
                    {c.cpf ? <option value={c.cpf} label={c.nome} /> : null}
                  </React.Fragment>
                ))}
              </datalist>
            </div>

            {/* CIDADE DE DESTINO */}
            <div className="form-group flex-1 min-w-[220px] relative">
              <label className="form-label">Cidade de Destino *</label>
              <input
                className="form-input"
                placeholder="Digite o nome da cidade"
                value={buscaDestino}
                onChange={(e) => handleCidadeDestino(e.target.value)}
                onFocus={() => setMostrarSugestoesCidade(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoesCidade(false), 150)}
                required={cidadeObrigatoria}
                style={{ marginBottom: 6 }}
              />
              {mostrarSugestoesCidade && (buscandoCidade || buscaDestino.trim().length >= 2) && (
                <div
                  className="card-base card-config"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    maxHeight: 160,
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
                    <div style={{ padding: "6px 12px", color: "#dc2626" }}>{erroCidade}</div>
                  )}
                  {!buscandoCidade && !erroCidade && resultadosCidade.length === 0 && (
                    <div style={{ padding: "6px 12px", color: "#94a3b8" }}>
                      Nenhuma cidade encontrada.
                    </div>
                  )}
                  {!buscandoCidade && !erroCidade && resultadosCidade.map((c) => {
                    const label = c.subdivisao_nome ? `${c.nome} (${c.subdivisao_nome})` : c.nome;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className="btn btn-ghost w-full text-left"
                        style={{ padding: "6px 12px" }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormVenda((prev) => ({ ...prev, destino_id: c.id }));
                          setBuscaDestino(label);
                          setBuscaCidadeSelecionada(label);
                          setMostrarSugestoesCidade(false);
                          setResultadosCidade([]);
                        }}
                      >
                        {label}
                        {c.pais_nome ? <span style={{ color: "#6b7280", marginLeft: 6 }}>• {c.pais_nome}</span> : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* EMBARQUE */}
            <div className="form-group flex-1 min-w-[180px]">
              <label className="form-label">Data de embarque</label>
              <input
                className="form-input w-full"
                type="date"
                value={formVenda.data_embarque}
                onChange={(e) =>
                  setFormVenda((prev) => {
                    const proximaData = e.target.value;
                    const minDataFinal = proximaData || "";
                    const dataFinalAtualizada =
                      prev.data_final && minDataFinal && prev.data_final < minDataFinal
                        ? minDataFinal
                        : prev.data_final;
                    return {
                      ...prev,
                      data_embarque: proximaData,
                      data_final: dataFinalAtualizada,
                    };
                  })
                }
              />
            </div>
            <div className="form-group flex-1 min-w-[180px]">
              <label className="form-label">Data final</label>
              <input
                className="form-input w-full"
                type="date"
                value={formVenda.data_final}
                min={formVenda.data_embarque || undefined}
                onChange={(e) =>
                  setFormVenda({
                    ...formVenda,
                    data_final:
                      formVenda.data_embarque && e.target.value && e.target.value < formVenda.data_embarque
                        ? formVenda.data_embarque
                        : e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* RECIBOS */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-lg">Recibos da Venda</h4>
            <button
              type="button"
              className="btn btn-light w-full sm:w-auto"
              style={{ marginLeft: "auto" }}
              onClick={() => setShowCalculator(true)}
            >
              Calculadora
            </button>
          </div>

          {recibos.map((r, i) => {
            const produtoSelecionado = produtos.find((p) => p.id === r.produto_id);
            const nomeProdutoAtual = produtoSelecionado?.nome || "";
            return (
              <div key={i} className="card-base mb-2">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* PRODUTO */}
                  <div className="form-group flex-1 min-w-[180px]">
                    <label className="form-label">Produto *</label>
                    <input
                      className="form-input"
                      list={`listaProdutos-${i}`}
                      placeholder={
                        existeProdutoGlobal
                          ? "Escolha uma cidade ou selecione um produto global..."
                          : "Selecione uma cidade primeiro e busque o produto..."
                      }
                      value={
                        reciboEmEdicao === i
                          ? buscaProduto || nomeProdutoAtual
                          : nomeProdutoAtual
                      }
                      onFocus={() => {
                        setReciboEmEdicao(i);
                        setBuscaProduto("");
                      }}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    onBlur={() => {
                      const texto = buscaProduto.trim();
                      if (!texto) {
                        updateRecibo(i, "produto_id", "");
                      } else {
                        const achado = produtosFiltrados.find(
                          (p) => p.nome.toLowerCase() === texto.toLowerCase()
                        );
                        if (achado) {
                          updateRecibo(i, "produto_id", achado.id);
                        }
                      }
                      setReciboEmEdicao(null);
                      setBuscaProduto("");
                    }}
                      required
                      disabled={!formVenda.destino_id && !existeProdutoGlobal}
                    />
                    <datalist id={`listaProdutos-${i}`}>
                      {produtosFiltrados.map((p) => (
                        <option key={p.id} value={p.nome} />
                      ))}
                    </datalist>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recibo-principal"
                          checked={r.principal}
                          onChange={() => marcarReciboPrincipal(i)}
                          className="form-radio h-4 w-4 text-sky-600"
                        />
                        <span className="font-semibold text-[11px]">Produto principal</span>
                      </label>
                      <span>Define o produto principal usado nos relatórios.</span>
                    </div>
                  </div>

                  {/* NÚMERO */}
                  <div className="form-group flex-1 min-w-[120px]">
                    <label className="form-label">Número recibo *</label>
                    <input
                      className="form-input"
                      value={r.numero_recibo}
                      onChange={(e) =>
                        updateRecibo(i, "numero_recibo", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* DATA INÍCIO */}
                  <div className="form-group flex-1 min-w-[160px]">
                    <label className="form-label">Início *</label>
                    <input
                      className="form-input w-full"
                      type="date"
                      value={r.data_inicio}
                      onChange={(e) => updateRecibo(i, "data_inicio", e.target.value)}
                      required
                    />
                  </div>

                  {/* DATA FIM */}
                  <div className="form-group flex-1 min-w-[160px]">
                    <label className="form-label">Fim *</label>
                    <input
                      className="form-input w-full"
                      type="date"
                      value={r.data_fim}
                      min={r.data_inicio || undefined}
                      onChange={(e) => updateRecibo(i, "data_fim", e.target.value)}
                      required
                    />
                  </div>

                  {/* VALOR */}
                  <div className="form-group flex-1 min-w-[120px]">
                    <label className="form-label">Valor total *</label>
                    <input
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9,.]*"
                      placeholder="0,00"
                      value={r.valor_total}
                      onChange={(e) => updateReciboMonetario(i, "valor_total", e.target.value)}
                      required
                    />
                  </div>

                  {/* TAXAS */}
                  <div className="form-group flex-1 min-w-[120px]">
                    <label className="form-label">Taxas</label>
                    <input
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9,.]*"
                      placeholder="0,00"
                      value={r.valor_taxas}
                      onChange={(e) => updateReciboMonetario(i, "valor_taxas", e.target.value)}
                    />
                  </div>

                  {/* REMOVER */}
                  <div className="form-group flex-none w-20 flex items-end">
                    <button
                      type="button"
                      className="btn-icon btn-danger mt-2"
                      onClick={() => removerRecibo(i)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="mt-3 mobile-stack-buttons">
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto"
              onClick={addRecibo}
            >
              ➕ Adicionar recibo
            </button>
            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar venda"}
            </button>
            <button
              type="button"
              className="btn btn-light w-full sm:w-auto"
              onClick={cancelarCadastro}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: "grid",
            gap: 8,
            zIndex: 9999,
            maxWidth: "320px",
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className="card-base"
              style={{
                padding: "10px 12px",
                background: t.type === "success" ? "#ecfdf3" : "#fee2e2",
                border: `1px solid ${t.type === "success" ? "#16a34a" : "#ef4444"}`,
                color: "#0f172a",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              }}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
      <CalculatorModal
        open={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </div>
  );
}
