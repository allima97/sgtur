import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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
};

type FormRecibo = {
  id?: string;
  produto_id: string;
  numero_recibo: string;
  valor_total: string;
  valor_taxas: string;
  data_inicio: string;
  data_fim: string;
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
};

const initialRecibo: FormRecibo = {
  produto_id: "",
  numero_recibo: "",
  valor_total: "",
  valor_taxas: "0",
  data_inicio: "",
  data_fim: "",
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

export default function VendasCadastroIsland() {
  // =======================================================
  // PERMISSÕES
  // =======================================================
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Vendas");
  const podeCriar =
    permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar =
    permissao === "edit" || permissao === "delete" || permissao === "admin";

  // =======================================================
  // ESTADOS
  // =======================================================
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [tipos, setTipos] = useState<{ id: string; nome: string | null }[]>([]);

  const [formVenda, setFormVenda] = useState<FormVenda>(initialVenda);
  const [recibos, setRecibos] = useState<FormRecibo[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [cidadePrefill, setCidadePrefill] = useState<CidadePrefill>({ id: "", nome: "" });

  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingVenda, setLoadingVenda] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

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
  async function carregarDados(vendaId?: string, cidadePrefillParam?: CidadePrefill) {
    try {
      setLoading(true);

      const [c, d, p, tiposResp] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("cidades").select("id, nome").order("nome"),
        supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .order("nome"),
        supabase.from("tipo_produtos").select("id, nome"),
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
        .select("id, cliente_id, destino_id, destino_cidade_id, data_lancamento, data_embarque")
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
        data_lancamento: vendaData.data_lancamento,
        data_embarque: vendaData.data_embarque || "",
      });
      setBuscaDestino(cidadeNome || cidadeId || "");
      setBuscaCidadeSelecionada(cidadeNome || cidadeId || "");

      const { data: recibosData, error: recErr } = await supabase
        .from("vendas_recibos")
        .select("*")
        .eq("venda_id", id);
      if (recErr) throw recErr;

      const produtosLista = produtosBase || produtos;
      setRecibos(
        (recibosData || []).map((r: any) => ({
          id: r.id,
          produto_id:
            produtosLista.find((p) => {
              const ehGlobal = !!p.todas_as_cidades;
              return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeId || p.cidade_id === cidadeId);
            })?.id || "",
          numero_recibo: r.numero_recibo || "",
          valor_total: r.valor_total != null ? formatarNumeroComoMoeda(r.valor_total) : "",
          valor_taxas: r.valor_taxas != null ? formatarNumeroComoMoeda(r.valor_taxas) : "0,00",
          data_inicio: r.data_inicio || "",
          data_fim: r.data_fim || "",
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar venda para edição.");
      showToast("Erro ao carregar venda para edição.", "error");
    } finally {
      setLoadingVenda(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setEditId(idParam);
    const cidadeIdParam = params.get("cidadeId") || "";
    const cidadeNomeParam = params.get("cidadeNome") || "";
    if (cidadeIdParam || cidadeNomeParam) {
      setCidadePrefill({ id: cidadeIdParam, nome: cidadeNomeParam });
    }
  }, []);

  useEffect(() => {
    if (!loadPerm && ativo) carregarDados(editId || undefined, cidadePrefill);
  }, [loadPerm, ativo, editId, cidadePrefill]);

  // Busca cidade (autocomplete)
  useEffect(() => {
    if (buscaDestino.trim().length < 2) {
      setResultadosCidade([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
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
            const { data: dataFallback, error: errorFallback } = await supabase
              .from("cidades")
              .select("id, nome")
              .ilike("nome", `%${buscaDestino.trim()}%`)
              .order("nome");
            if (errorFallback) {
              console.error("Erro no fallback de cidades:", errorFallback);
              setErroCidade("Erro ao buscar cidades.");
            } else {
              setResultadosCidade((dataFallback as CidadeSugestao[]) || []);
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
      clearTimeout(t);
    };
  }, [buscaDestino]);

  // =======================================================
  // AUTOCOMPLETE
  // =======================================================
  const normalizarCpf = (v: string) => v.replace(/\D/g, "");

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return clientes;
    const t = normalizeText(buscaCliente);
    return clientes.filter((c) => {
      const cpf = normalizarCpf(c.cpf || "");
      return (
        normalizeText(c.nome).includes(t) ||
        cpf.includes(normalizarCpf(t))
      );
    });
  }, [clientes, buscaCliente]);

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

  function handleCidadeDestino(valor: string) {
    setBuscaDestino(valor);
    const cidadeAtual = cidades.find((c) => c.id === formVenda.destino_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
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

  // =======================================================
  // HANDLERS
  // =======================================================
  function addRecibo() {
    setRecibos((prev) => [...prev, { ...initialRecibo }]);
  }

  function updateRecibo(index: number, campo: string, valor: string) {
    setRecibos((prev) => {
      const novo = [...prev];
      (novo[index] as any)[campo] = valor;
      return novo;
    });
  }

  function updateReciboMonetario(index: number, campo: "valor_total" | "valor_taxas", valor: string) {
    const formatado = formatarValorDigitado(valor);
    updateRecibo(index, campo, formatado);
  }

  useEffect(() => {
    // Ao trocar a cidade, limpa buscas e produtos que não pertencem a ela
    setBuscaProduto("");
    setRecibos((prev) =>
      prev.map((r) => {
        const prod = produtos.find((p) => p.id === r.produto_id);
        const ehGlobal = !!prod?.todas_as_cidades;
        if (prod && (ehGlobal || prod.cidade_id === formVenda.destino_id)) return r;
        return { ...r, produto_id: "" };
      })
    );
  }, [formVenda.destino_id, produtos]);

  function removerRecibo(index: number) {
    setRecibos((prev) => prev.filter((_, i) => i !== index));
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

      if (!recibos.length) {
        setErro("Uma venda precisa ter ao menos 1 recibo.");
        showToast("Inclua ao menos um recibo na venda.", "error");
        setSalvando(false);
        return;
      }

      const produtoDestinoIdRaw = recibos[0]?.produto_id;
      if (!produtoDestinoIdRaw) {
        setErro("Selecione um produto para o recibo. O primeiro recibo define o destino da venda.");
        showToast("Selecione um produto para o recibo principal.", "error");
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

      const produtoDestinoId = produtoIdsResolvidos[0];

      let vendaId = editId;

      if (editId) {
        // Atualiza venda existente
        const { error: vendaErr } = await supabase
          .from("vendas")
          .update({
            cliente_id: formVenda.cliente_id,
            destino_id: produtoDestinoId, // FK para produtos
            destino_cidade_id: formVenda.destino_id || null,
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
          })
          .eq("id", editId);
        if (vendaErr) throw vendaErr;

        // substitui recibos para manter consistência
        await supabase.from("vendas_recibos").delete().eq("venda_id", editId);

        for (let idx = 0; idx < recibos.length; idx++) {
          const r = recibos[idx];
          const resolvedId = produtoIdsResolvidos[idx];
          const prod = produtos.find((p) => p.id === resolvedId);
          const tipoId =
            prod?.tipo_produto ||
            (r.produto_id?.startsWith("virtual-") ? r.produto_id.replace("virtual-", "") : prod?.tipo_produto);
          if (!tipoId) {
            throw new Error("Produto do recibo não possui tipo vinculado.");
          }
          const valTotalNum = moedaParaNumero(r.valor_total);
          const valTaxasNum = moedaParaNumero(r.valor_taxas);
          if (Number.isNaN(valTotalNum)) {
            throw new Error("Valor total inválido. Digite um valor monetário.");
          }
          if (Number.isNaN(valTaxasNum)) {
            throw new Error("Valor de taxas inválido. Digite um valor monetário.");
          }
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: editId,
            produto_id: tipoId, // FK espera tipo_produtos
            numero_recibo: r.numero_recibo.trim(),
            valor_total: valTotalNum,
            valor_taxas: valTaxasNum,
            data_inicio: r.data_inicio || null,
            data_fim: r.data_fim || null,
          });
          if (error) throw error;
        }

        await registrarLog({
          acao: "venda_atualizada",
          modulo: "Vendas",
          detalhes: { id: editId, venda: formVenda, recibos },
        });

        showToast("Venda atualizada com sucesso!", "success");
        setTimeout(() => resetFormAndGoToConsulta(), 200);
      } else {
        // 1) INSERE VENDA
        const { data: vendaData, error: vendaErr } = await supabase
          .from("vendas")
          .insert({
            vendedor_id: userId,
            cliente_id: formVenda.cliente_id,
            destino_id: produtoDestinoId, // FK para produtos
            destino_cidade_id: formVenda.destino_id || null,
            data_lancamento: formVenda.data_lancamento,
            data_embarque: formVenda.data_embarque || null,
          })
          .select()
          .single();

        if (vendaErr) throw vendaErr;

        vendaId = vendaData.id;

        // 2) INSERE RECIBOS
        for (let idx = 0; idx < recibos.length; idx++) {
          const r = recibos[idx];
          const resolvedId = produtoIdsResolvidos[idx];
          const prod = produtos.find((p) => p.id === resolvedId);
          const tipoId =
            prod?.tipo_produto ||
            (r.produto_id?.startsWith("virtual-") ? r.produto_id.replace("virtual-", "") : prod?.tipo_produto);
          if (!tipoId) {
            throw new Error("Produto do recibo não possui tipo vinculado.");
          }
          const valTotalNum = moedaParaNumero(r.valor_total);
          const valTaxasNum = moedaParaNumero(r.valor_taxas);
          if (Number.isNaN(valTotalNum)) {
            throw new Error("Valor total inválido. Digite um valor monetário.");
          }
          if (Number.isNaN(valTaxasNum)) {
            throw new Error("Valor de taxas inválido. Digite um valor monetário.");
          }
          const { error } = await supabase.from("vendas_recibos").insert({
            venda_id: vendaId,
            produto_id: tipoId, // FK espera tipo_produtos
            numero_recibo: r.numero_recibo.trim(),
            valor_total: valTotalNum,
            valor_taxas: valTaxasNum,
            data_inicio: r.data_inicio || null,
            data_fim: r.data_fim || null,
          });

          if (error) throw error;
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
  if (!ativo) {
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
      <div className="card-base card-green mb-3">
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
                  clientes.find((c) => c.id === formVenda.cliente_id)?.nome ||
                  buscaCliente
                }
                onChange={(e) => setBuscaCliente(e.target.value)}
                onBlur={() => {
                  const texto = buscaCliente.toLowerCase();
                  const cpfTexto = normalizarCpf(buscaCliente);
                  const achado = clientesFiltrados.find((c) => {
                    const cpf = normalizarCpf(c.cpf || "");
                    return (
                      c.nome.toLowerCase() === texto ||
                      (cpfTexto && cpf === cpfTexto)
                    );
                  });
                  if (achado) {
                    setFormVenda({
                      ...formVenda,
                      cliente_id: achado.id,
                    });
                  }
                }}
                required
              />
              <datalist id="listaClientes">
                {clientesFiltrados.map((c) => (
                  <option
                    key={c.id}
                    value={c.nome}
                    label={c.cpf ? `CPF: ${c.cpf}` : undefined}
                  />
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
              {buscandoCidade && <div style={{ fontSize: 12, color: "#6b7280" }}>Buscando...</div>}
              {erroCidade && !buscandoCidade && (
                <div style={{ fontSize: 12, color: "#dc2626" }}>{erroCidade}</div>
              )}
              {mostrarSugestoesCidade && (buscandoCidade || buscaDestino.trim().length >= 2) && (
                <div
                  className="card-base absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto p-1 border border-slate-200 bg-white z-10"
                >
                  {resultadosCidade.length === 0 && !buscandoCidade && buscaDestino.trim().length >= 2 && (
                    <div style={{ padding: "4px 6px", color: "#6b7280" }}>Nenhuma cidade encontrada.</div>
                  )}
                  {resultadosCidade.map((c) => {
                    const label = c.subdivisao_nome ? `${c.nome} (${c.subdivisao_nome})` : c.nome;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`btn btn-light w-full justify-start mb-1 ${formVenda.destino_id === c.id ? 'bg-sky-100 border-sky-400' : 'bg-white border-slate-200'}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFormVenda((prev) => ({ ...prev, destino_id: c.id }));
                          setBuscaDestino(label);
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
                className="form-input"
                type="date"
                value={formVenda.data_embarque}
                onChange={(e) =>
                  setFormVenda({
                    ...formVenda,
                    data_embarque: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* RECIBOS */}
          <h4 className="mt-3 font-semibold text-lg">Recibos da Venda</h4>

          {recibos.map((r, i) => (
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
                    value={produtos.find((p) => p.id === r.produto_id)?.nome || buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    onBlur={() => {
                      const achado = produtosFiltrados.find(
                        (p) => p.nome.toLowerCase() === buscaProduto.toLowerCase()
                      );
                      if (achado) {
                        updateRecibo(i, "produto_id", achado.id);
                      }
                    }}
                    required
                    disabled={!formVenda.destino_id && !existeProdutoGlobal}
                  />
                  <datalist id={`listaProdutos-${i}`}>
                    {produtosFiltrados.map((p) => (
                      <option key={p.id} value={p.nome} />
                    ))}
                  </datalist>
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
                    className="form-input"
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
                    className="form-input"
                    type="date"
                    value={r.data_fim}
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
          ))}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={addRecibo}
            >
              ➕ Adicionar recibo
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar venda"}
            </button>
            <button
              type="button"
              className="btn btn-outline bg-slate-100 text-slate-800"
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
    </div>
  );
}
