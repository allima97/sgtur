globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderComponent, d as renderTemplate } from '../../chunks/astro/server_CVPGTMFc.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_CdOMU9M7.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_uGVYbAeU.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_BXAzlmjM.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_APQgoOvT.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_APQgoOvT.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_KyAPOmB5.mjs';
import { r as registrarLog } from '../../chunks/logs_BFXSJPZH.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialVenda = {
  cliente_id: "",
  destino_id: "",
  data_lancamento: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10),
  data_embarque: ""
};
const initialRecibo = {
  produto_id: "",
  numero_recibo: "",
  valor_total: "",
  valor_taxas: "0",
  data_inicio: "",
  data_fim: ""
};
function formatarValorDigitado(valor) {
  const apenasDigitos = valor.replace(/\D/g, "");
  if (!apenasDigitos) return "";
  const num = Number(apenasDigitos) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatarNumeroComoMoeda(valor) {
  const num = Number(valor);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function moedaParaNumero(valor) {
  if (!valor) return NaN;
  const limpo = valor.replace(/\./g, "").replace(",", ".");
  const num = Number(limpo);
  return num;
}
function calcularStatusPeriodo(inicio, fim) {
  if (!inicio) return "planejada";
  const hoje = /* @__PURE__ */ new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataInicio = new Date(inicio);
  const dataFim = fim ? new Date(fim) : null;
  if (dataFim && dataFim < hoje) return "concluida";
  if (dataInicio > hoje) return "confirmada";
  if (dataFim && hoje > dataFim) return "concluida";
  return "em_viagem";
}
function VendasCadastroIsland() {
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Vendas");
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const [clientes, setClientes] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [tipos, setTipos] = reactExports.useState([]);
  const [formVenda, setFormVenda] = reactExports.useState(initialVenda);
  const [recibos, setRecibos] = reactExports.useState([]);
  const [editId, setEditId] = reactExports.useState(null);
  const [cidadePrefill, setCidadePrefill] = reactExports.useState({ id: "", nome: "" });
  const [erro, setErro] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  const [loadingVenda, setLoadingVenda] = reactExports.useState(false);
  const [toasts, setToasts] = reactExports.useState([]);
  const [toastCounter, setToastCounter] = reactExports.useState(0);
  const [buscaCliente, setBuscaCliente] = reactExports.useState("");
  const [buscaDestino, setBuscaDestino] = reactExports.useState("");
  const [buscaProduto, setBuscaProduto] = reactExports.useState("");
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = reactExports.useState(false);
  const [resultadosCidade, setResultadosCidade] = reactExports.useState([]);
  const [buscandoCidade, setBuscandoCidade] = reactExports.useState(false);
  const [erroCidade, setErroCidade] = reactExports.useState(null);
  const [buscaCidadeSelecionada, setBuscaCidadeSelecionada] = reactExports.useState("");
  async function carregarDados(vendaId, cidadePrefillParam) {
    try {
      setLoading(true);
      const [c, d, p, tiposResp] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("cidades").select("id, nome").order("nome"),
        supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").order("nome"),
        supabase.from("tipo_produtos").select("id, nome")
      ]);
      setClientes(c.data || []);
      const cidadesLista = d.data || [];
      setCidades(cidadesLista);
      const tiposLista = tiposResp.data || [];
      const produtosLista = (p.data || []).map((prod) => ({
        ...prod,
        todas_as_cidades: prod.todas_as_cidades ?? false
      }));
      setProdutos(produtosLista);
      setTipos(tiposLista);
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
  async function carregarVenda(id, cidadesBase, produtosBase, cidadePrefillParam) {
    try {
      setLoadingVenda(true);
      const { data: vendaData, error: vendaErr } = await supabase.from("vendas").select("id, cliente_id, destino_id, destino_cidade_id, data_lancamento, data_embarque").eq("id", id).maybeSingle();
      if (vendaErr) throw vendaErr;
      if (!vendaData) {
        setErro("Venda não encontrada para edição.");
        return;
      }
      let cidadeId = vendaData.destino_cidade_id || "";
      let cidadeNome = "";
      if (cidadeId) {
        const lista = cidadesBase || cidades;
        const cidadeSelecionada = lista.find((c) => c.id === cidadeId);
        if (cidadeSelecionada) cidadeNome = cidadeSelecionada.nome;
      } else if (vendaData.destino_id) {
        const { data: prodData } = await supabase.from("produtos").select("id, cidade_id").eq("id", vendaData.destino_id).maybeSingle();
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
        data_embarque: vendaData.data_embarque || ""
      });
      setBuscaDestino(cidadeNome || cidadeId || "");
      setBuscaCidadeSelecionada(cidadeNome || cidadeId || "");
      const { data: recibosData, error: recErr } = await supabase.from("vendas_recibos").select("*").eq("venda_id", id);
      if (recErr) throw recErr;
      const produtosLista = produtosBase || produtos;
      setRecibos(
        (recibosData || []).map((r) => ({
          id: r.id,
          produto_id: produtosLista.find((p) => {
            const ehGlobal = !!p.todas_as_cidades;
            return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeId || p.cidade_id === cidadeId);
          })?.id || "",
          numero_recibo: r.numero_recibo || "",
          valor_total: r.valor_total != null ? formatarNumeroComoMoeda(r.valor_total) : "",
          valor_taxas: r.valor_taxas != null ? formatarNumeroComoMoeda(r.valor_taxas) : "0,00",
          data_inicio: r.data_inicio || "",
          data_fim: r.data_fim || ""
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
  reactExports.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setEditId(idParam);
    const cidadeIdParam = params.get("cidadeId") || "";
    const cidadeNomeParam = params.get("cidadeNome") || "";
    if (cidadeIdParam || cidadeNomeParam) {
      setCidadePrefill({ id: cidadeIdParam, nome: cidadeNomeParam });
    }
  }, []);
  reactExports.useEffect(() => {
    if (!loadPerm && ativo) carregarDados(editId || void 0, cidadePrefill);
  }, [loadPerm, ativo, editId, cidadePrefill]);
  reactExports.useEffect(() => {
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
            const { data: dataFallback, error: errorFallback } = await supabase.from("cidades").select("id, nome").ilike("nome", `%${buscaDestino.trim()}%`).order("nome");
            if (errorFallback) {
              console.error("Erro no fallback de cidades:", errorFallback);
              setErroCidade("Erro ao buscar cidades.");
            } else {
              setResultadosCidade(dataFallback || []);
              setErroCidade(null);
            }
          } else {
            setResultadosCidade(data || []);
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
  const normalizarCpf = (v) => v.replace(/\D/g, "");
  const clientesFiltrados = reactExports.useMemo(() => {
    if (!buscaCliente.trim()) return clientes;
    const t = normalizeText(buscaCliente);
    return clientes.filter((c) => {
      const cpf = normalizarCpf(c.cpf || "");
      return normalizeText(c.nome).includes(t) || cpf.includes(normalizarCpf(t));
    });
  }, [clientes, buscaCliente]);
  reactExports.useMemo(() => {
    if (!buscaDestino.trim()) return cidades;
    const t = normalizeText(buscaDestino);
    return cidades.filter((c) => normalizeText(c.nome).includes(t));
  }, [cidades, buscaDestino]);
  const produtosFiltrados = reactExports.useMemo(() => {
    const base = formVenda.destino_id ? produtos.filter((p) => p.todas_as_cidades || p.cidade_id === formVenda.destino_id) : produtos.filter((p) => p.todas_as_cidades);
    if (!buscaProduto.trim()) return base;
    const term = normalizeText(buscaProduto);
    return base.filter((c) => normalizeText(c.nome).includes(term));
  }, [produtos, buscaProduto, formVenda.destino_id]);
  const existeProdutoGlobal = reactExports.useMemo(
    () => produtos.some((p) => !!p.todas_as_cidades),
    [produtos]
  );
  const cidadeObrigatoria = reactExports.useMemo(() => recibos.length > 0, [recibos.length]);
  function handleCidadeDestino(valor) {
    setBuscaDestino(valor);
    const cidadeAtual = cidades.find((c) => c.id === formVenda.destino_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
      setFormVenda((prev) => ({ ...prev, destino_id: "" }));
    }
    setMostrarSugestoesCidade(true);
  }
  function showToast(message, type = "success") {
    setToastCounter((prev) => {
      const id = prev + 1;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id));
      }, 3500);
      return id;
    });
  }
  function addRecibo() {
    setRecibos((prev) => [...prev, { ...initialRecibo }]);
  }
  function updateRecibo(index, campo, valor) {
    setRecibos((prev) => {
      const novo = [...prev];
      novo[index][campo] = valor;
      return novo;
    });
  }
  function updateReciboMonetario(index, campo, valor) {
    const formatado = formatarValorDigitado(valor);
    updateRecibo(index, campo, formatado);
  }
  reactExports.useEffect(() => {
    setBuscaProduto("");
    setRecibos(
      (prev) => prev.map((r) => {
        const prod = produtos.find((p) => p.id === r.produto_id);
        const ehGlobal = !!prod?.todas_as_cidades;
        if (prod && (ehGlobal || prod.cidade_id === formVenda.destino_id)) return r;
        return { ...r, produto_id: "" };
      })
    );
  }, [formVenda.destino_id, produtos]);
  function removerRecibo(index) {
    setRecibos((prev) => prev.filter((_, i) => i !== index));
  }
  function resetFormAndGoToConsulta() {
    setFormVenda({
      ...initialVenda,
      data_lancamento: (/* @__PURE__ */ new Date()).toISOString().substring(0, 10)
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
  async function salvarVenda(e) {
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
      const { data: userRow, error: userRowError } = await supabase.from("users").select("company_id").eq("id", userId).maybeSingle();
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
      const produtoDestinoIdRaw = recibos[0]?.produto_id;
      if (!produtoDestinoIdRaw) {
        setErro("Selecione um produto para o recibo. O primeiro recibo define o destino da venda.");
        showToast("Selecione um produto para o recibo principal.", "error");
        setSalvando(false);
        return;
      }
      const possuiProdutoLocal = recibos.some((r) => {
        const prod = produtos.find((p) => p.id === r.produto_id);
        const ehGlobal = !!prod?.todas_as_cidades || (r.produto_id || "").startsWith("virtual-");
        return prod?.cidade_id && !ehGlobal;
      });
      if (possuiProdutoLocal && !formVenda.destino_id) {
        setErro("Selecione a cidade de destino para vendas com produtos vinculados a cidade.");
        showToast("Selecione a cidade de destino.", "error");
        setSalvando(false);
        return;
      }
      async function resolverProdutoId(recibo) {
        const atualId = recibo.produto_id;
        const existente = produtos.find((p) => p.id === atualId);
        if (existente && !existente.isVirtual) return existente.id;
        const tipoId = existente?.tipo_produto || (atualId?.startsWith("virtual-") ? atualId.replace("virtual-", "") : existente?.tipo_produto);
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
          const { data: globalDb, error: globalErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").eq("tipo_produto", tipoId).eq("todas_as_cidades", true).limit(1).maybeSingle();
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
                  todas_as_cidades: !!globalDb.todas_as_cidades
                }
              ];
            });
            return globalDb.id;
          }
          throw new Error(
            "Produto global selecionado não possui cadastro na tabela de Produtos; cadastre o serviço como global antes de continuar."
          );
        }
        const { data: produtoLocal, error: produtoLocalErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").eq("tipo_produto", tipoId).eq("cidade_id", cidadeDestino).limit(1).maybeSingle();
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
                todas_as_cidades: !!produtoLocal.todas_as_cidades
              }
            ];
          });
          return produtoLocal.id;
        }
        const nomeProd = tipoInfo?.nome || "Produto";
        const { data: novo, error } = await supabase.from("produtos").insert({
          nome: nomeProd,
          destino: nomeProd,
          cidade_id: cidadeDestino,
          tipo_produto: tipoId,
          ativo: true,
          todas_as_cidades: false
        }).select("id").single();
        if (error) throw error;
        const novoId = novo?.id;
        if (novoId) {
          setProdutos((prev) => [
            ...prev,
            {
              id: novoId,
              nome: nomeProd,
              cidade_id: cidadeDestino,
              tipo_produto: tipoId,
              todas_as_cidades: false
            }
          ]);
          return novoId;
        }
        throw new Error("Não foi possível criar produto local.");
      }
      const produtoIdsResolvidos = [];
      for (const r of recibos) {
        const idResolvido = await resolverProdutoId(r);
        produtoIdsResolvidos.push(idResolvido);
      }
      const produtoDestinoId = produtoIdsResolvidos[0];
      let oldReciboIds = [];
      if (editId) {
        const { data: existingRecibos, error: existingRecibosErr } = await supabase.from("vendas_recibos").select("id").eq("venda_id", editId);
        if (existingRecibosErr) throw existingRecibosErr;
        oldReciboIds = (existingRecibos || []).map((item) => item.id).filter(Boolean);
      }
      const getCidadeNome = (cidadeId) => cidades.find((c) => c.id === cidadeId)?.nome || "";
      let vendaId = editId;
      async function criarViagemParaRecibo(params) {
        if (!params.reciboId) return;
        if (!vendaId) {
          throw new Error("Venda não encontrada ao criar viagem.");
        }
        const statusPeriodo = calcularStatusPeriodo(params.dataInicio, params.dataFim);
        const cidadeNome = params.cidade || getCidadeNome(formVenda.destino_id);
        const destinoLabel = params.produtoNome || params.tipoNome || cidadeNome || null;
        const origemLabel = cidadeNome && cidadeNome !== destinoLabel ? cidadeNome : params.produtoNome || params.tipoNome || destinoLabel;
        const { data: viagemData, error: viagemErr } = await supabase.from("viagens").insert({
          company_id: companyId,
          venda_id: vendaId,
          recibo_id: params.reciboId,
          cliente_id: formVenda.cliente_id,
          responsavel_user_id: userId,
          origem: origemLabel || null,
          destino: destinoLabel || null,
          data_inicio: params.dataInicio || null,
          data_fim: params.dataFim || null,
          status: statusPeriodo,
          observacoes: params.numeroRecibo ? `Recibo ${params.numeroRecibo}` : null
        }).select("id").single();
        if (viagemErr) throw viagemErr;
        const viagemId = viagemData?.id;
        if (!viagemId) return;
        const { error: passageiroError } = await supabase.from("viagem_passageiros").insert({
          viagem_id: viagemId,
          cliente_id: formVenda.cliente_id,
          company_id: companyId,
          papel: "passageiro",
          created_by: userId
        });
        if (passageiroError) throw passageiroError;
      }
      async function salvarReciboEViagem(recibo, produtoIdResolvido) {
        if (!vendaId) {
          throw new Error("Venda não encontrada ao salvar recibo.");
        }
        const prod = produtos.find((p) => p.id === produtoIdResolvido);
        const tipoId = prod?.tipo_produto || (recibo.produto_id?.startsWith("virtual-") ? recibo.produto_id.replace("virtual-", "") : prod?.tipo_produto);
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
          numero_recibo: recibo.numero_recibo.trim(),
          valor_total: valTotalNum,
          valor_taxas: valTaxasNum,
          data_inicio: recibo.data_inicio || null,
          data_fim: recibo.data_fim || null
        };
        const { data: insertedRecibo, error: insertErr } = await supabase.from("vendas_recibos").insert(insertPayload).select("id, data_inicio, data_fim").single();
        if (insertErr) throw insertErr;
        const cidadeNomeResolvida = getCidadeNome(formVenda.destino_id) || getCidadeNome(prod?.cidade_id);
        await criarViagemParaRecibo({
          reciboId: insertedRecibo?.id,
          dataInicio: insertedRecibo?.data_inicio || null,
          dataFim: insertedRecibo?.data_fim || null,
          tipoNome,
          produtoNome: prod?.nome,
          numeroRecibo: insertPayload.numero_recibo,
          cidade: cidadeNomeResolvida || void 0
        });
      }
      if (editId) {
        const { error: vendaErr } = await supabase.from("vendas").update({
          cliente_id: formVenda.cliente_id,
          destino_id: produtoDestinoId,
          // FK para produtos
          destino_cidade_id: formVenda.destino_id || null,
          data_lancamento: formVenda.data_lancamento,
          data_embarque: formVenda.data_embarque || null
        }).eq("id", editId);
        if (vendaErr) throw vendaErr;
        if (oldReciboIds.length > 0) {
          const { error: cleanupError } = await supabase.from("viagens").delete().in("recibo_id", oldReciboIds);
          if (cleanupError) throw cleanupError;
        }
        await supabase.from("vendas_recibos").delete().eq("venda_id", editId);
        for (let idx = 0; idx < recibos.length; idx++) {
          await salvarReciboEViagem(recibos[idx], produtoIdsResolvidos[idx]);
        }
        await registrarLog({
          acao: "venda_atualizada",
          modulo: "Vendas",
          detalhes: { id: editId, venda: formVenda, recibos }
        });
        showToast("Venda atualizada com sucesso!", "success");
        setTimeout(() => resetFormAndGoToConsulta(), 200);
      } else {
        const { data: vendaData, error: vendaErr } = await supabase.from("vendas").insert({
          vendedor_id: userId,
          cliente_id: formVenda.cliente_id,
          destino_id: produtoDestinoId,
          // FK para produtos
          destino_cidade_id: formVenda.destino_id || null,
          data_lancamento: formVenda.data_lancamento,
          data_embarque: formVenda.data_embarque || null
        }).select().single();
        if (vendaErr) throw vendaErr;
        vendaId = vendaData.id;
        for (let idx = 0; idx < recibos.length; idx++) {
          await salvarReciboEViagem(recibos[idx], produtoIdsResolvidos[idx]);
        }
        await registrarLog({
          acao: "venda_criada",
          modulo: "Vendas",
          detalhes: {
            venda: formVenda,
            recibos,
            id: vendaId
          }
        });
        showToast("Venda cadastrada com sucesso!", "success");
        setTimeout(() => resetFormAndGoToConsulta(), 200);
      }
    } catch (e2) {
      console.error(e2);
      const detalhes = e2?.message || e2?.error?.message || "";
      const cod = e2?.code || e2?.error?.code || "";
      setErro(`Erro ao salvar venda.${cod ? ` Código: ${cod}.` : ""}${detalhes ? ` Detalhes: ${detalhes}` : ""}`);
      showToast("Erro ao salvar venda.", "error");
    } finally {
      setSalvando(false);
    }
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso negado ao módulo de Vendas." }) });
  }
  if (!podeCriar && !isAdmin) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Você não possui permissão para cadastrar vendas." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-slate-50 p-2 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: editId ? "Editar venda" : "Cadastro de Venda" }),
      editId && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#0f172a" }, children: "Modo edição — altere cliente, cidade de destino, embarque e recibos." }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvarVenda, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[220px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                list: "listaClientes",
                placeholder: "Buscar cliente...",
                value: clientes.find((c) => c.id === formVenda.cliente_id)?.nome || buscaCliente,
                onChange: (e) => setBuscaCliente(e.target.value),
                onBlur: () => {
                  const texto = buscaCliente.toLowerCase();
                  const cpfTexto = normalizarCpf(buscaCliente);
                  const achado = clientesFiltrados.find((c) => {
                    const cpf = normalizarCpf(c.cpf || "");
                    return c.nome.toLowerCase() === texto || cpfTexto && cpf === cpfTexto;
                  });
                  if (achado) {
                    setFormVenda({
                      ...formVenda,
                      cliente_id: achado.id
                    });
                  }
                },
                required: true
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "listaClientes", children: clientesFiltrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "option",
              {
                value: c.nome,
                label: c.cpf ? `CPF: ${c.cpf}` : void 0
              },
              c.id
            )) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[220px] relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade de Destino *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                placeholder: "Digite o nome da cidade",
                value: buscaDestino,
                onChange: (e) => handleCidadeDestino(e.target.value),
                onFocus: () => setMostrarSugestoesCidade(true),
                onBlur: () => setTimeout(() => setMostrarSugestoesCidade(false), 150),
                required: cidadeObrigatoria,
                style: { marginBottom: 6 }
              }
            ),
            buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280" }, children: "Buscando..." }),
            erroCidade && !buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#dc2626" }, children: erroCidade }),
            mostrarSugestoesCidade && (buscandoCidade || buscaDestino.trim().length >= 2) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "card-base absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto p-1 border border-slate-200 bg-white z-10",
                children: [
                  resultadosCidade.length === 0 && !buscandoCidade && buscaDestino.trim().length >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "4px 6px", color: "#6b7280" }, children: "Nenhuma cidade encontrada." }),
                  resultadosCidade.map((c) => {
                    const label = c.subdivisao_nome ? `${c.nome} (${c.subdivisao_nome})` : c.nome;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        className: `btn btn-light w-full justify-start mb-1 ${formVenda.destino_id === c.id ? "bg-sky-100 border-sky-400" : "bg-white border-slate-200"}`,
                        onMouseDown: (e) => {
                          e.preventDefault();
                          setFormVenda((prev) => ({ ...prev, destino_id: c.id }));
                          setBuscaDestino(label);
                          setMostrarSugestoesCidade(false);
                          setResultadosCidade([]);
                        },
                        children: [
                          label,
                          c.pais_nome ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#6b7280", marginLeft: 6 }, children: [
                            "• ",
                            c.pais_nome
                          ] }) : null
                        ]
                      },
                      c.id
                    );
                  })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data de embarque" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "date",
                value: formVenda.data_embarque,
                onChange: (e) => setFormVenda({
                  ...formVenda,
                  data_embarque: e.target.value
                })
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "mt-3 font-semibold text-lg", children: "Recibos da Venda" }),
        recibos.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Produto *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                list: `listaProdutos-${i}`,
                placeholder: existeProdutoGlobal ? "Escolha uma cidade ou selecione um produto global..." : "Selecione uma cidade primeiro e busque o produto...",
                value: produtos.find((p) => p.id === r.produto_id)?.nome || buscaProduto,
                onChange: (e) => setBuscaProduto(e.target.value),
                onBlur: () => {
                  const achado = produtosFiltrados.find(
                    (p) => p.nome.toLowerCase() === buscaProduto.toLowerCase()
                  );
                  if (achado) {
                    updateRecibo(i, "produto_id", achado.id);
                  }
                },
                required: true,
                disabled: !formVenda.destino_id && !existeProdutoGlobal
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: `listaProdutos-${i}`, children: produtosFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.nome }, p.id)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[120px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Número recibo *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: r.numero_recibo,
                onChange: (e) => updateRecibo(i, "numero_recibo", e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[160px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Início *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "date",
                value: r.data_inicio,
                onChange: (e) => updateRecibo(i, "data_inicio", e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[160px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Fim *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "date",
                value: r.data_fim,
                onChange: (e) => updateRecibo(i, "data_fim", e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[120px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor total *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "text",
                inputMode: "decimal",
                pattern: "[0-9,.]*",
                placeholder: "0,00",
                value: r.valor_total,
                onChange: (e) => updateReciboMonetario(i, "valor_total", e.target.value),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[120px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Taxas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "text",
                inputMode: "decimal",
                pattern: "[0-9,.]*",
                placeholder: "0,00",
                value: r.valor_taxas,
                onChange: (e) => updateReciboMonetario(i, "valor_taxas", e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group flex-none w-20 flex items-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn-icon btn-danger mt-2",
              onClick: () => removerRecibo(i),
              children: "🗑️"
            }
          ) })
        ] }) }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              onClick: addRecibo,
              children: "➕ Adicionar recibo"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              className: "btn btn-success",
              disabled: salvando,
              children: salvando ? "Salvando..." : "Salvar venda"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-outline bg-slate-100 text-slate-800",
              onClick: cancelarCadastro,
              children: "Cancelar"
            }
          )
        ] })
      ] })
    ] }),
    toasts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "fixed",
          bottom: 16,
          right: 16,
          display: "grid",
          gap: 8,
          zIndex: 9999,
          maxWidth: "320px"
        },
        children: toasts.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "card-base",
            style: {
              padding: "10px 12px",
              background: t.type === "success" ? "#ecfdf3" : "#fee2e2",
              border: `1px solid ${t.type === "success" ? "#16a34a" : "#ef4444"}`,
              color: "#0f172a",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)"
            },
            children: t.message
          },
          t.id
        ))
      }
    )
  ] });
}

const $$Cadastro = createComponent(($$result, $$props, $$slots) => {
  const activePage = "vendas";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Cadastro de Vendas", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Cadastro de Vendas", "subtitle": "Registre vendas completas com cliente, destino, produto e recibos.", "color": "green" })} ${renderComponent($$result2, "VendasCadastroIsland", VendasCadastroIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/VendasCadastroIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/vendas/cadastro.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/vendas/cadastro.astro";
const $$url = "/vendas/cadastro";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cadastro,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
