import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { construirLinkWhatsApp } from "../../lib/whatsapp";

type Orcamento = {
  id: string;
  status: string | null;
  valor: number | null;
  data_orcamento: string | null;
  data_viagem: string | null;
  notas: string | null;
  cliente_id?: string | null;
  destino_id?: string | null;
  produto_id?: string | null;
  numero_venda?: string | null;
  venda_criada?: boolean | null;
  clientes?: { nome: string; whatsapp?: string | null } | null;
  destinos?: { nome: string } | null;
  produtos?: { nome: string; tipo?: string } | null;
  itens?: OrcamentoItem[];
};

type OrcamentoItem = {
  id: string;
  orcamento_id?: string | null;
  cidade_id?: string | null;
  tipo_produto_id?: string | null;
  produto_id?: string | null;
  valor: number | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  cidade?: { nome: string; subdivisao_nome?: string | null } | null;
  tipo_produto?: { nome: string | null; tipo?: string | null } | null;
  produto?: { nome: string | null } | null;
};

type InteracaoOrcamento = {
  id: string;
  tipo: string | null;
  mensagem: string | null;
  created_at: string | null;
  usuario_id?: string | null;
  responsavel_id?: string | null;
  anexo_url?: string | null;
  users?: { email?: string | null } | null;
  responsavel?: { email?: string | null } | null;
};

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

type StatusOrcamento = "novo" | "enviado" | "negociando" | "fechado" | "perdido";

function gerarNumeroVenda(data: Date) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  const h = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `VND-${y}${m}${d}-${h}${min}-${rand}`;
}

function formatarCidadeLabel(cidade?: { nome: string; subdivisao_nome?: string | null } | null) {
  if (!cidade?.nome) return "";
  return cidade.nome;
}

function stripEstadoCidade(valor: string) {
  if (!valor) return "";
  const partes = valor.split(" - ");
  return (partes[0] || valor).trim();
}

function normalizarTexto(valor: string) {
  return (valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function formatarPeriodo(inicio?: string | null, fim?: string | null) {
  if (!inicio && !fim) return "";
  if (inicio && fim && fim !== inicio) return `${inicio} a ${fim}`;
  return inicio || fim || "";
}

function formatarDataBR(dataIso?: string | null) {
  if (!dataIso) return "";
  const [year, month, day] = dataIso.split("-");
  if (!year || !month || !day) return dataIso;
  return `${day}/${month}/${year}`;
}

function formatarItemResumo(item: OrcamentoItem) {
  const cidade = formatarCidadeLabel(item.cidade);
  const tipo = item.tipo_produto?.nome || item.tipo_produto?.tipo || "";
  const produto = item.produto?.nome || "";
  const periodo = formatarPeriodo(item.periodo_inicio, item.periodo_fim);
  const partes = [cidade, tipo, produto].filter(Boolean).join(" | ");
  const detalhes = [
    periodo,
    item.valor != null
      ? Number(item.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "",
  ]
    .filter(Boolean)
    .join(" • ");
  return detalhes ? `${partes} • ${detalhes}` : partes;
}

function extrairItensNotas(notas?: string | null) {
  if (!notas) return { cidades: [] as string[], produtos: [] as string[] };
  const linhas = notas
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!linhas.length) return { cidades: [], produtos: [] };
  const indice = linhas.findIndex((l) => l.toLowerCase().startsWith("itens do orçamento"));
  const linhasItens = indice >= 0 ? linhas.slice(indice + 1) : linhas;
  const cidades: string[] = [];
  const produtos: string[] = [];
  for (const linhaOriginal of linhasItens) {
    let linha = linhaOriginal;
    const prefixo = linha.match(/^\d+\.\s*(.*)$/);
    if (prefixo?.[1]) {
      linha = prefixo[1].trim();
    }
    if (!linha.includes("|")) continue;
    const partes = linha
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length >= 3) {
      if (partes[0]) cidades.push(stripEstadoCidade(partes[0]));
      if (partes[2]) produtos.push(partes[2]);
    } else if (partes.length >= 2) {
      if (partes[0]) cidades.push(stripEstadoCidade(partes[0]));
      if (partes[1]) produtos.push(partes[1]);
    }
  }
  return {
    cidades: Array.from(new Set(cidades)),
    produtos: Array.from(new Set(produtos)),
  };
}

function parseValorMonetario(valor?: string | null) {
  if (!valor) return null;
  const limpo = valor.replace(/[^0-9,.-]/g, "");
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(",") && limpo.includes(".")) {
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (limpo.includes(",")) {
    normalizado = limpo.replace(",", ".");
  }
  const num = Number(normalizado);
  return Number.isNaN(num) ? null : num;
}

function parseCidadeDetalhada(valor: string) {
  const partes = valor.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return { nome: "", subdivisao: null as string | null };
  return {
    nome: partes[0],
    subdivisao: partes.slice(1).join(" - ") || null,
  };
}

function parseItensNotasDetalhados(notas?: string | null) {
  if (!notas) return [];
  const linhas = notas
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!linhas.length) return [];
  const indice = linhas.findIndex((l) => l.toLowerCase().startsWith("itens do orçamento"));
  const linhasItens = indice >= 0 ? linhas.slice(indice + 1) : linhas;
  const itens: {
    cidadeNome: string;
    cidadeEstado?: string | null;
    tipoNome: string;
    produtoNome: string;
    periodoInicio: string | null;
    periodoFim: string | null;
    valor: number | null;
  }[] = [];

  for (const linhaOriginal of linhasItens) {
    let linha = linhaOriginal;
    const prefixo = linha.match(/^\d+\.\s*(.*)$/);
    if (prefixo?.[1]) linha = prefixo[1].trim();
    if (!linha.includes("|")) continue;

    const partes = linha.split("|").map((p) => p.trim()).filter(Boolean);
    if (partes.length < 3) continue;

    const cidadePart = partes[0] || "";
    const tipoPart = partes[1] || "";
    const produtoPart = partes[2] || "";
    const periodoPart = partes[3] || "";
    const valorPart = partes[4] || "";

    const datas =
      (periodoPart.match(/\d{4}-\d{2}-\d{2}/g) ||
        linha.match(/\d{4}-\d{2}-\d{2}/g) ||
        []) as string[];
    const periodoInicio = datas[0] || null;
    const periodoFim = datas[1] || datas[0] || null;

    const valor = parseValorMonetario(valorPart) ?? parseValorMonetario(linha);
    const cidadeInfo = parseCidadeDetalhada(cidadePart);

    itens.push({
      cidadeNome: cidadeInfo.nome,
      cidadeEstado: cidadeInfo.subdivisao,
      tipoNome: tipoPart,
      produtoNome: produtoPart,
      periodoInicio,
      periodoFim,
      valor,
    });
  }

  return itens;
}

function listarCidadesItens(orcamento: Orcamento) {
  const cidades =
    orcamento.itens
      ?.map((item) => stripEstadoCidade(formatarCidadeLabel(item.cidade)))
      .filter(Boolean) || [];
  const unicas = Array.from(new Set(cidades));
  if (unicas.length) return unicas;
  return extrairItensNotas(orcamento.notas).cidades.map(stripEstadoCidade);
}

function listarProdutosItens(orcamento: Orcamento) {
  const produtos =
    orcamento.itens?.map((item) => item.produto?.nome || "").filter(Boolean) || [];
  const unicos = Array.from(new Set(produtos));
  if (unicos.length) return unicos;
  const fallbackNotas = extrairItensNotas(orcamento.notas).produtos;
  if (fallbackNotas.length) return fallbackNotas;
  const fallback = orcamento.destinos?.nome || "";
  return fallback ? [fallback] : [];
}

function podeConverterOrcamento(orcamento: Orcamento) {
  const itensNotas = parseItensNotasDetalhados(orcamento.notas);
  return Boolean(
    orcamento.cliente_id &&
      (orcamento.destino_id || (orcamento.itens || []).length > 0 || itensNotas.length > 0)
  );
}

function normalizarItensConversao(orcamento: Orcamento): OrcamentoItem[] {
  const itens = (orcamento.itens || []).map((item, index) => ({
    ...item,
    id: item.id || `item-${index}`,
  }));
  if (itens.length) return itens;
  const itensNotas = parseItensNotasDetalhados(orcamento.notas);
  if (itensNotas.length) {
    return itensNotas.map((item, index) => ({
      id: `nota-${orcamento.id}-${index + 1}`,
      orcamento_id: orcamento.id,
      cidade_id: null,
      tipo_produto_id: null,
      produto_id: null,
      valor: item.valor ?? 0,
      periodo_inicio: item.periodoInicio || orcamento.data_viagem || null,
      periodo_fim: item.periodoFim || item.periodoInicio || orcamento.data_viagem || null,
      cidade: item.cidadeNome
        ? { nome: stripEstadoCidade(item.cidadeNome), subdivisao_nome: item.cidadeEstado || null }
        : null,
      tipo_produto: item.tipoNome ? { nome: item.tipoNome, tipo: null } : null,
      produto: item.produtoNome ? { nome: item.produtoNome } : null,
    }));
  }
  const fallbackProdutoId = orcamento.destino_id || null;
  const fallbackTipoId = orcamento.produto_id || null;
  if (!fallbackProdutoId && !fallbackTipoId) return [];
  return [
    {
      id: `fallback-${orcamento.id}`,
      orcamento_id: orcamento.id,
      cidade_id: null,
      tipo_produto_id: fallbackTipoId,
      produto_id: fallbackProdutoId,
      valor: orcamento.valor ?? 0,
      periodo_inicio: orcamento.data_viagem ?? null,
      periodo_fim: orcamento.data_viagem ?? null,
      cidade: null,
      tipo_produto: orcamento.produtos
        ? { nome: orcamento.produtos.nome ?? null, tipo: orcamento.produtos.tipo ?? null }
        : null,
      produto: orcamento.destinos ? { nome: orcamento.destinos.nome ?? null } : null,
    },
  ];
}

type OrcamentosConsultaProps = {
  suppressLoadingMessage?: boolean;
};

export default function OrcamentosConsultaIsland({
  suppressLoadingMessage = false,
}: OrcamentosConsultaProps) {
  const { ativo, loading: loadingPerm, podeCriar, podeExcluir } = usePermissao("Vendas");
  const [formAberto, setFormAberto] = useState(false);
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoStatus, setSalvandoStatus] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [editando, setEditando] = useState<Orcamento | null>(null);
  const [valorEdit, setValorEdit] = useState<string>("");
  const [dataViagemEdit, setDataViagemEdit] = useState<string>("");
  const [notasEdit, setNotasEdit] = useState<string>("");
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [destinoSelecionado, setDestinoSelecionado] = useState<string>("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [destinos, setDestinos] = useState<{ id: string; nome: string }[]>([]);
  const [produtos, setProdutos] = useState<{ id: string; nome: string | null; tipo?: string }[]>([]);
  const statuses: StatusOrcamento[] = ["novo", "enviado", "negociando", "fechado", "perdido"];
  const LIMITE_INTERACAO_DIAS = 7;
  const statusCores: Record<StatusOrcamento, { bg: string; border: string }> = {
    novo: { bg: "#e0f2fe", border: "#1d4ed8" }, // azul solicitado (#1d4ed8)
    enviado: { bg: "#fef9c3", border: "#facc15" }, // amarelo
    negociando: { bg: "#fff7ed", border: "#fdba74" }, // laranja
    fechado: { bg: "#ecfdf3", border: "#16a34a" }, // verde mais escuro na borda
    perdido: { bg: "#fee2e2", border: "#fca5a5" }, // vermelho mais evidente
  };
  const statusTotal: Record<StatusOrcamento, { qtd: number; valor: number }> = {
    novo: { qtd: 0, valor: 0 },
    enviado: { qtd: 0, valor: 0 },
    negociando: { qtd: 0, valor: 0 },
    fechado: { qtd: 0, valor: 0 },
    perdido: { qtd: 0, valor: 0 },
  };
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingStatus, setDraggingStatus] = useState<StatusOrcamento | null>(null);
  const [periodoIni, setPeriodoIni] = useState<string>("");
  const [periodoFim, setPeriodoFim] = useState<string>("");
  const [importacaoAberta, setImportacaoAberta] = useState(false);
  const [importacaoClienteId, setImportacaoClienteId] = useState<string>("");
  const [erroImportacao, setErroImportacao] = useState<string | null>(null);
  const [importacaoArquivos, setImportacaoArquivos] = useState<File[]>([]);
  const [salvandoImportacao, setSalvandoImportacao] = useState(false);
  const [conversaoAberta, setConversaoAberta] = useState<Orcamento | null>(null);
  const [informarRecibos, setInformarRecibos] = useState(false);
  const [recibosConversao, setRecibosConversao] = useState<Record<string, string>>({});
  const [salvandoConversao, setSalvandoConversao] = useState(false);
  const [erroConversao, setErroConversao] = useState<string | null>(null);

  // Histórico de interações
  const [historicoAberto, setHistoricoAberto] = useState<Orcamento | null>(null);
  const [interacoes, setInteracoes] = useState<InteracaoOrcamento[]>([]);
  const [carregandoInteracoes, setCarregandoInteracoes] = useState(false);
  const [salvandoInteracao, setSalvandoInteracao] = useState(false);
  const [erroInteracao, setErroInteracao] = useState<string | null>(null);
  const [novaInteracaoTipo, setNovaInteracaoTipo] = useState<string>("anotacao");
  const [novaInteracaoMsg, setNovaInteracaoMsg] = useState<string>("");
  const [novaInteracaoAnexo, setNovaInteracaoAnexo] = useState<string>("");
  const [envioCanal, setEnvioCanal] = useState<string>("email");
  const [envioContato, setEnvioContato] = useState<string>("");
  const [envioLink, setEnvioLink] = useState<string>("");
  const [envioMsg, setEnvioMsg] = useState<string>("");
  const [envioStatus, setEnvioStatus] = useState<boolean>(true);
  const [followUpLoadingId, setFollowUpLoadingId] = useState<string | null>(null);
  const [mostrarKanban, setMostrarKanban] = useState<boolean>(false);
  const [somentePendentes, setSomentePendentes] = useState<boolean>(false);
  const [ultimasInteracoes, setUltimasInteracoes] = useState<
    Record<
      string,
      {
        tipo: string | null;
        created_at: string | null;
        mensagem?: string | null;
        anexo_url?: string | null;
      }
    >
  >({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);
  const [deletandoOrcamentoId, setDeletandoOrcamentoId] = useState<string | null>(null);
  const tipoInteracaoOptions: { value: string; label: string }[] = [
    { value: "anotacao", label: "Anotação interna" },
    { value: "contato", label: "Contato com cliente" },
    { value: "envio", label: "Envio de proposta" },
    { value: "follow-up", label: "Follow-up" },
  ];

  useEffect(() => {
    carregar();
    carregarListas();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ aberto: boolean }>;
      setFormAberto(Boolean(custom?.detail?.aberto));
    };
    window.addEventListener("formulario-orcamento-status", handler);
    return () => window.removeEventListener("formulario-orcamento-status", handler);
  }, []);

  useEffect(() => {
    const handler = () => carregar();
    window.addEventListener("orcamento-criado", handler);
    return () => window.removeEventListener("orcamento-criado", handler);
  }, []);

  useEffect(() => {
    const handler = () => carregar();
    window.addEventListener("orcamento-interacao-criada", handler);
    return () => window.removeEventListener("orcamento-interacao-criada", handler);
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      setErro(null);
      setSucesso(null);

      let query = supabase
        .from("orcamentos")
        .select(
          `
            id,
            status,
            valor,
            data_orcamento,
            data_viagem,
            notas,
            cliente_id,
            destino_id,
            produto_id,
            numero_venda,
            venda_criada,
            clientes:cliente_id (nome, whatsapp),
            destinos:produtos!destino_id (nome),
            produtos:tipo_produtos!produto_id (nome, tipo)
          `
        )
        .order("data_orcamento", { ascending: false });

      if (statusFiltro) {
        query = query.eq("status", statusFiltro);
      }
      if (periodoIni) {
        query = query.gte("data_orcamento", periodoIni);
      }
      if (periodoFim) {
        query = query.lte("data_orcamento", periodoFim);
      }

      const { data, error } = await query;
      if (error) throw error;
      const listaNova = (data || []) as Orcamento[];
      const ids = listaNova.map((o) => o.id).filter(Boolean);

      let itensPorOrcamento = new Map<string, OrcamentoItem[]>();
      if (ids.length) {
        const { data: itensData, error: itensError } = await supabase
          .from("orcamento_itens")
          .select(
            `
              id,
              orcamento_id,
              cidade_id,
              tipo_produto_id,
              produto_id,
              valor,
              periodo_inicio,
              periodo_fim,
              cidade:cidades (nome, subdivisao_nome),
              tipo_produto:tipo_produtos (nome, tipo),
              produto:produtos (nome)
            `
          )
          .in("orcamento_id", ids);

        if (!itensError && itensData) {
          itensPorOrcamento = itensData.reduce((map, item) => {
            const orcamentoId = item.orcamento_id || "";
            if (!orcamentoId) return map;
            const lista = map.get(orcamentoId) || [];
            lista.push(item as OrcamentoItem);
            map.set(orcamentoId, lista);
            return map;
          }, new Map<string, OrcamentoItem[]>());
        } else if (itensError) {
          console.warn("Itens do orçamento não carregados:", itensError);
        }
      }

      const listaComItens = listaNova.map((orcamento) => ({
        ...orcamento,
        itens: itensPorOrcamento.get(orcamento.id) || [],
      }));

      setLista(listaComItens);
      if (ids.length) {
        carregarUltimasInteracoes(ids);
      } else {
        setUltimasInteracoes({});
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }




  const pendentesFollowUp = useMemo(() => {
    const relevantes: StatusOrcamento[] = ["novo", "enviado", "negociando"];
    return lista.filter((o) => {
      const status = (o.status as StatusOrcamento) || "novo";
      if (!relevantes.includes(status)) return false;

      const diasViagem = diasAte(o.data_viagem || null);
      const diasCriacao = diasDesde(o.data_orcamento || null);
      const ultima = ultimasInteracoes[o.id];
      const diasInteracao = diasDesdeISO(ultima?.created_at || null);
      const semDataEAntigo = !o.data_viagem && diasCriacao >= 7;
      const viagemProximaOuAtrasada = Number.isFinite(diasViagem) && diasViagem <= 7;
      const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;

      return viagemProximaOuAtrasada || semDataEAntigo || semInteracaoRecente;
    });
  }, [lista, ultimasInteracoes]);

  const pendentesIds = useMemo(() => new Set(pendentesFollowUp.map((o) => o.id)), [pendentesFollowUp]);
  const filtrados = useMemo(
    () => (somentePendentes ? lista.filter((o) => pendentesIds.has(o.id)) : lista),
    [lista, somentePendentes, pendentesIds]
  );
  const itensConversao = useMemo(
    () => (conversaoAberta ? normalizarItensConversao(conversaoAberta) : []),
    [conversaoAberta]
  );

  const porColuna = useMemo(() => {
    const mapa: Record<StatusOrcamento, Orcamento[]> = {
      novo: [],
      enviado: [],
      negociando: [],
      fechado: [],
      perdido: [],
    };
    filtrados.forEach((o) => {
      const s = (o.status as StatusOrcamento) || "novo";
      if (!mapa[s]) mapa[s] = [];
      mapa[s].push(o);
    });
    return mapa;
  }, [filtrados]);

  function diasAte(data: string | null) {
    if (!data) return Number.POSITIVE_INFINITY;
    const hoje = new Date();
    const alvo = new Date(`${data}T00:00:00`);
    const diff = alvo.getTime() - hoje.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function diasDesde(data: string | null) {
    if (!data) return Number.POSITIVE_INFINITY;
    const hoje = new Date();
    const alvo = new Date(`${data}T00:00:00`);
    const diff = hoje.getTime() - alvo.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function resumoMensagem(msg?: string | null, max = 80) {
    if (!msg) return "";
    const clean = msg.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1)}…`;
  }

  function diasDesdeISO(data: string | null) {
    if (!data) return Number.POSITIVE_INFINITY;
    const diff = Date.now() - new Date(data).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastCounter((prev) => prev + 1);
    const id = toastCounter + 1;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }

  const totais = useMemo(() => {
    const acc: Record<StatusOrcamento, { qtd: number; valor: number }> = {
      novo: { qtd: 0, valor: 0 },
      enviado: { qtd: 0, valor: 0 },
      negociando: { qtd: 0, valor: 0 },
      fechado: { qtd: 0, valor: 0 },
      perdido: { qtd: 0, valor: 0 },
    };
    filtrados.forEach((o) => {
      const s = (o.status as StatusOrcamento) || "novo";
      const v = Number(o.valor || 0);
      if (!acc[s]) acc[s] = { qtd: 0, valor: 0 };
      acc[s].qtd += 1;
      acc[s].valor += v;
    });
    return acc;
  }, [filtrados]);

  function exportarCSV() {
    const header = [
      "id",
      "cliente",
      "cidades",
      "produtos",
      "status",
      "valor",
      "data_orcamento",
      "data_viagem",
      "numero_venda",
    ];
    const linhas = filtrados.map((o) => [
      o.id,
      o.clientes?.nome || "",
      listarCidadesItens(o).join(" | "),
      listarProdutosItens(o).join(" | "),
      o.status || "",
      o.valor ?? "",
      o.data_orcamento || "",
      o.data_viagem || "",
      o.numero_venda || "",
    ]);
    const safe = (value: string | number) =>
      `"${String(value).replace(/"/g, "'")}"`;
    const csv = [
      header.map((h) => safe(h)).join(","),
      ...linhas.map((l) => l.map((v) => safe(v)).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orcamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function abrirImportacaoCvc() {
    setErroImportacao(null);
    setImportacaoClienteId("");
    setImportacaoArquivos([]);
    setImportacaoAberta(true);
  }

  function fecharImportacaoCvc() {
    setErroImportacao(null);
    setImportacaoArquivos([]);
    setImportacaoAberta(false);
  }

  async function confirmarImportacaoCvc() {
    if (!importacaoClienteId) {
      setErroImportacao("Selecione um cliente.");
      return;
    }
    if (importacaoArquivos.length === 0) {
      setErroImportacao("Selecione o PDF ou imagens para importar.");
      return;
    }
    setSalvandoImportacao(true);
    try {
      const arquivosSerializados: Array<{ name: string; type: string; data: string }> = [];
      for (const file of importacaoArquivos) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
          reader.readAsDataURL(file);
        });
        arquivosSerializados.push({ name: file.name, type: file.type, data: dataUrl });
      }
      try {
        sessionStorage.setItem(
          "importacao_pdf_files",
          JSON.stringify(arquivosSerializados)
        );
      } catch (err) {
        throw new Error(
          "Nao foi possivel armazenar o arquivo. Tente usar um PDF menor ou imagens separadas."
        );
      }
      const destino = `/orcamentos/novo?import_pdf=1&cliente_id=${encodeURIComponent(
        importacaoClienteId
      )}`;
      window.location.href = destino;
    } catch (e: any) {
      setErroImportacao(e?.message || "Erro ao preparar importacao.");
    } finally {
      setSalvandoImportacao(false);
    }
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
    const item = lista.find((o) => o.id === id);
    if (item?.status) setDraggingStatus(item.status as StatusOrcamento);
  }

  async function handleDrop(status: StatusOrcamento) {
    if (!draggingId) return;
    if (draggingStatus === "fechado") {
      setDraggingId(null);
      setDraggingStatus(null);
      return;
    }
    await alterarStatus(draggingId, status);
    setDraggingId(null);
    setDraggingStatus(null);
  }

  async function carregarListas() {
    try {
      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome"),
      ]);
      if (c.data) setClientes(c.data as any);
      if (d.data) setDestinos(d.data as any);
      if (p.data) setProdutos(p.data as any);
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarUltimasInteracoes(ids: string[]) {
    try {
      const { data, error } = await supabase
        .from("orcamento_interacoes")
        .select("orcamento_id, tipo, created_at, mensagem, anexo_url")
        .in("orcamento_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<
        string,
        { tipo: string | null; created_at: string | null; mensagem?: string | null; anexo_url?: string | null }
      > = {};
      (data || []).forEach((i: any) => {
        if (!map[i.orcamento_id]) {
          map[i.orcamento_id] = { tipo: i.tipo, created_at: i.created_at, mensagem: i.mensagem, anexo_url: i.anexo_url };
        }
      });
      setUltimasInteracoes(map);
    } catch (e) {
      console.error("Erro ao carregar últimas interações", e);
    }
  }

  async function alterarStatus(id: string, status: StatusOrcamento) {
    try {
      const atual = lista.find((o) => o.id === id);
      if (atual?.status === "fechado") {
        showToast("Orçamento fechado não pode ser alterado.", "error");
        return;
      }
      setSalvandoStatus(id);
      setErro(null);
      setSucesso(null);
      const { error } = await supabase
        .from("orcamentos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      setSucesso("Status atualizado.");
      showToast("Status atualizado.", "success");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao alterar status.");
      showToast("Erro ao alterar status.", "error");
    } finally {
      setSalvandoStatus(null);
    }
  }

  async function excluirOrcamento(o: Orcamento) {
    if (!podeExcluir) return;
    const confirmar = window.confirm("Excluir este orçamento e seu histórico?");
    if (!confirmar) return;
    try {
      setDeletandoOrcamentoId(o.id);
      setErro(null);
      setSucesso(null);
      const interacoes = await supabase.from("orcamento_interacoes").delete().eq("orcamento_id", o.id);
      if (interacoes.error) {
        console.warn("Não foi possível limpar interações antes de excluir o orçamento.", interacoes.error);
      }
      const viagensExcluir = await supabase.from("viagens").delete().eq("orcamento_id", o.id);
      if (viagensExcluir.error) {
        console.warn("Não foi possível limpar viagens vinculadas antes de excluir o orçamento.", viagensExcluir.error);
      }
      const { error } = await supabase.from("orcamentos").delete().eq("id", o.id);
      if (error) throw error;
      setSucesso("Orçamento excluído.");
      showToast("Orçamento excluído.", "success");
      await carregar();
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Erro ao excluir orçamento.";
      setErro(message);
      showToast(message, "error");
    } finally {
      setDeletandoOrcamentoId(null);
    }
  }

  function iniciarEdicao(o: Orcamento) {
    setEditando(o);
    setValorEdit(o.valor ? String(o.valor) : "");
    setDataViagemEdit(o.data_viagem || "");
    setNotasEdit(o.notas || "");
    setClienteSelecionado(o.cliente_id || "");
    setDestinoSelecionado(o.destino_id || "");
    setProdutoSelecionado(o.produto_id || "");
    setErro(null);
    setSucesso(null);
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    try {
      setSucesso(null);
      setErro(null);
      const { error } = await supabase
        .from("orcamentos")
        .update({
          valor: valorEdit ? parseFloat(valorEdit) : null,
          data_viagem: dataViagemEdit || null,
          notas: notasEdit || null,
          cliente_id: clienteSelecionado || editando.cliente_id || null,
          destino_id: destinoSelecionado || editando.destino_id || null,
          produto_id: produtoSelecionado || editando.produto_id || null,
        })
        .eq("id", editando.id);
      if (error) throw error;
      setSucesso("Orçamento atualizado.");
      showToast("Orçamento atualizado.", "success");
      setEditando(null);
      await carregar();
    } catch (err) {
      console.error(err);
      setErro("Erro ao salvar edição.");
      showToast("Erro ao salvar edição.", "error");
    }
  }

  async function converterParaVenda(o: Orcamento) {
    setConversaoAberta(o);
    setInformarRecibos(false);
    setRecibosConversao({});
    setErroConversao(null);
  }

  function fecharConversao() {
    setConversaoAberta(null);
    setInformarRecibos(false);
    setRecibosConversao({});
    setErroConversao(null);
  }

  async function confirmarConversaoVenda() {
    if (!conversaoAberta) return;
    try {
      setSalvandoConversao(true);
      setErroConversao(null);
      setSucesso(null);
      setErro(null);

      const itens = normalizarItensConversao(conversaoAberta);
      if (!itens.length) {
        throw new Error("Nenhum item encontrado no orçamento para converter.");
      }

      if (informarRecibos) {
        const faltando = itens.filter((item) => !recibosConversao[item.id]?.trim());
        if (faltando.length) {
          throw new Error("Informe o número do recibo para todos os produtos.");
        }
      }

      const itensComIds = itens.map((item, index) => {
        const possuiTipoNome = Boolean(item.tipo_produto?.nome || item.tipo_produto?.tipo);
        const possuiProdutoNome = Boolean(item.produto?.nome);
        return {
          ...item,
          id: item.id || `item-${index}`,
          tipoId:
            item.tipo_produto_id ||
            (!possuiTipoNome ? conversaoAberta.produto_id || null : null),
          produtoResolvidoId:
            item.produto_id ||
            (!possuiProdutoNome ? conversaoAberta.destino_id || null : null),
        };
      });
      let tiposDisponiveis = produtos;
      if (!tiposDisponiveis.length) {
        const { data: tiposData } = await supabase
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .eq("ativo", true)
          .order("nome");
        tiposDisponiveis = (tiposData || []) as { id: string; nome?: string | null; tipo?: string | null }[];
      }

      const cacheCidade = new Map<string, string | null>();
      const cacheProduto = new Map<string, string | null>();

      const resolverTipoId = (item: (typeof itensComIds)[number]) => {
        if (item.tipoId) return item.tipoId;
        const nome = item.tipo_produto?.nome || item.tipo_produto?.tipo || "";
        if (!nome) return null;
        const alvo = normalizarTexto(nome);
        const encontrado = tiposDisponiveis.find((t) => {
          const nomeTipo = normalizarTexto(t.nome || "");
          const tipo = normalizarTexto(t.tipo || "");
          return alvo === nomeTipo || alvo === tipo;
        });
        return encontrado?.id || null;
      };

      const resolverCidadeId = async (nome?: string | null, estado?: string | null) => {
        const nomeCidade = (nome || "").trim();
        if (!nomeCidade) return null;
        const key = `${normalizarTexto(nomeCidade)}|${normalizarTexto(estado || "")}`;
        if (cacheCidade.has(key)) return cacheCidade.get(key) || null;
        let query = supabase.from("cidades").select("id, nome, subdivisao_nome").ilike("nome", nomeCidade);
        if (estado) {
          query = query.ilike("subdivisao_nome", estado);
        }
        const { data } = await query;
        let dados = data || [];
        if (!dados.length) {
          const { data: fallback } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_nome")
            .ilike("nome", `%${nomeCidade}%`);
          dados = fallback || [];
        }
        let id = dados[0]?.id || null;
        if (!id && estado) {
          const { data: fallback } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_nome")
            .ilike("nome", nomeCidade);
          id = fallback?.[0]?.id || null;
        }
        cacheCidade.set(key, id);
        return id;
      };

      const resolverProdutoId = async (
        item: (typeof itensComIds)[number],
        tipoId: string | null,
        cidadeId: string | null
      ) => {
        if (item.produtoResolvidoId) return item.produtoResolvidoId;
        const nomeProduto = item.produto?.nome || "";
        if (!nomeProduto) return null;
        const key = `${normalizarTexto(nomeProduto)}|${tipoId || ""}|${cidadeId || ""}`;
        if (cacheProduto.has(key)) return cacheProduto.get(key) || null;
        let query = supabase
          .from("produtos")
          .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
          .ilike("nome", nomeProduto);
        if (tipoId) {
          query = query.eq("tipo_produto", tipoId);
        }
        let { data } = await query;
        if (!data || !data.length) {
          let fallbackQuery = supabase
            .from("produtos")
            .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
            .ilike("nome", `%${nomeProduto}%`);
          if (tipoId) {
            fallbackQuery = fallbackQuery.eq("tipo_produto", tipoId);
          }
          const { data: fallback } = await fallbackQuery;
          data = fallback || [];
        }
        let escolhido = data?.[0] || null;
        if (data && data.length) {
          if (cidadeId) {
            escolhido =
              data.find((p) => p.cidade_id === cidadeId) ||
              data.find((p) => p.todas_as_cidades) ||
              data[0];
          } else {
            escolhido = data[0];
          }
        }
        const id = escolhido?.id || null;
        cacheProduto.set(key, id);
        return id;
      };

      const itensResolvidos = [];
      for (const item of itensComIds) {
        const tipoId = resolverTipoId(item);
        const cidadeId =
          item.cidade_id ||
          (await resolverCidadeId(item.cidade?.nome || null, item.cidade?.subdivisao_nome || null));
        const produtoResolvidoId = await resolverProdutoId(item, tipoId, cidadeId);
        itensResolvidos.push({
          ...item,
          tipoId,
          cidade_id: cidadeId,
          produtoResolvidoId,
        });
      }

      const itensSemTipo = itensResolvidos.filter((item) => !item.tipoId);
      if (itensSemTipo.length) {
        throw new Error("Existem itens sem tipo de produto. Edite o orçamento antes de converter.");
      }

      const itensSemProduto = itensResolvidos.filter((item) => !item.produtoResolvidoId);
      if (itensSemProduto.length) {
        throw new Error("Existem itens sem produto vinculado. Edite o orçamento antes de converter.");
      }

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      const hoje = new Date();
      const numeroVenda = gerarNumeroVenda(hoje);
      const dataLanc = hoje.toISOString().slice(0, 10);

      const datasInicio = itensResolvidos
        .map((item) => item.periodo_inicio)
        .filter((data): data is string => Boolean(data))
        .sort();
      const dataEmbarque = datasInicio[0] || conversaoAberta.data_viagem || null;

      const totalItens = itensResolvidos.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
      const totalVenda = totalItens > 0 ? totalItens : Number(conversaoAberta.valor || 0);

      const itemPrincipal = itensResolvidos[0];
      const destinoId = itemPrincipal.produtoResolvidoId;
      if (!destinoId) {
        throw new Error("Não foi possível determinar o produto principal da venda.");
      }
      const cidadePrincipal = itensResolvidos.find((item) => item.cidade_id)?.cidade_id || null;

      const { data: vendaData, error: vendaErr } = await supabase
        .from("vendas")
        .insert({
          vendedor_id: userId,
          cliente_id: conversaoAberta.cliente_id,
          destino_id: destinoId,
          destino_cidade_id: cidadePrincipal,
          data_lancamento: dataLanc,
          data_embarque: dataEmbarque,
          valor_total: totalVenda,
          status: "aberto",
          numero_venda: numeroVenda,
          notas: conversaoAberta.notas,
        })
        .select("id, numero_venda")
        .maybeSingle();

      if (vendaErr) throw vendaErr;
      if (!vendaData?.id) throw new Error("Venda não criada.");

      const recibosPayload = itensResolvidos.map((item, index) => ({
        venda_id: vendaData.id,
        produto_id: item.tipoId,
        produto_resolvido_id: item.produtoResolvidoId,
        numero_recibo: informarRecibos
          ? (recibosConversao[item.id] || "").trim()
          : `${numeroVenda}-${String(index + 1).padStart(2, "0")}`,
        valor_total: Number(item.valor) || 0,
        valor_taxas: 0,
        data_inicio: item.periodo_inicio || null,
        data_fim: item.periodo_fim || item.periodo_inicio || null,
      }));

      const { error: recibosErr } = await supabase.from("vendas_recibos").insert(recibosPayload);
      if (recibosErr) throw recibosErr;

      await supabase
        .from("orcamentos")
        .update({
          status: "fechado",
          venda_criada: true,
          numero_venda: vendaData.numero_venda || numeroVenda,
          notas: `${conversaoAberta.notas ? `${conversaoAberta.notas}\n` : ""}Convertido para venda ${
            vendaData.numero_venda || numeroVenda
          }`,
        })
        .eq("id", conversaoAberta.id);

      setSucesso("Orçamento convertido em venda.");
      showToast("Orçamento convertido em venda.", "success");
      fecharConversao();
      await carregar();
    } catch (e: unknown) {
      console.error(e);
      const message =
        e && typeof e === "object" && "message" in e && typeof e.message === "string"
          ? e.message
          : "Erro ao converter para venda.";
      setErroConversao(message);
      showToast(message, "error");
    } finally {
      setSalvandoConversao(false);
    }
  }

  async function registrarFollowUpRapido(o: Orcamento) {
    try {
      setFollowUpLoadingId(o.id);
      setErro(null);
      setSucesso(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");
      const msg = `Follow-up automático: orçamento ${o.id} (${o.status || "novo"}) ${
        o.data_viagem ? `viagem em ${o.data_viagem}` : "sem data de viagem"
      }.`;
      const { error } = await supabase.from("orcamento_interacoes").insert({
        orcamento_id: o.id,
        usuario_id: userId,
        tipo: "follow-up",
        mensagem: msg,
      });
      if (error) throw error;
      setSucesso("Follow-up registrado.");
      showToast("Follow-up registrado.", "success");
      window.dispatchEvent(
        new CustomEvent("orcamento-interacao-criada", { detail: { orcamentoId: o.id } })
      );
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao registrar follow-up.");
      showToast("Erro ao registrar follow-up.", "error");
    } finally {
      setFollowUpLoadingId(null);
    }
  }

  async function carregarInteracoes(orcamentoId: string) {
    try {
      setCarregandoInteracoes(true);
      setErroInteracao(null);
      const { data, error } = await supabase
        .from("orcamento_interacoes")
        .select(
          `
            id,
            tipo,
            mensagem,
            created_at,
            usuario_id,
            responsavel_id,
            anexo_url,
            users:usuario_id (email),
            responsavel:responsavel_id (email)
          `
        )
        .eq("orcamento_id", orcamentoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInteracoes((data || []) as InteracaoOrcamento[]);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "Erro ao carregar interações.";
      setErroInteracao(`${msg} Verifique se a tabela "orcamento_interacoes" existe com colunas esperadas.`);
    } finally {
      setCarregandoInteracoes(false);
    }
  }

  function abrirHistorico(o: Orcamento) {
    setHistoricoAberto(o);
    setInteracoes([]);
    setNovaInteracaoMsg("");
    setNovaInteracaoTipo("anotacao");
    setNovaInteracaoAnexo("");
    setEnvioCanal("email");
    setEnvioContato("");
    setEnvioLink("");
    setEnvioMsg("");
    setEnvioStatus(true);
    carregarInteracoes(o.id);
  }

  function fecharHistorico() {
    setHistoricoAberto(null);
    setInteracoes([]);
    setErroInteracao(null);
    setNovaInteracaoMsg("");
    setNovaInteracaoTipo("anotacao");
    setNovaInteracaoAnexo("");
    setEnvioCanal("email");
    setEnvioContato("");
    setEnvioLink("");
    setEnvioMsg("");
    setEnvioStatus(true);
  }

  async function adicionarInteracao(e: React.FormEvent) {
    e.preventDefault();
    if (!historicoAberto) return;
    if (!novaInteracaoMsg.trim()) {
      setErroInteracao("Escreva uma mensagem para registrar no histórico.");
      return;
    }
    try {
      setSalvandoInteracao(true);
      setErroInteracao(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      const { error } = await supabase.from("orcamento_interacoes").insert({
        orcamento_id: historicoAberto.id,
        usuario_id: userId,
        tipo: novaInteracaoTipo || "anotacao",
        mensagem: novaInteracaoMsg.trim(),
        anexo_url: novaInteracaoAnexo.trim() || null,
      });
      if (error) throw error;

      setNovaInteracaoMsg("");
      setNovaInteracaoTipo("anotacao");
      setNovaInteracaoAnexo("");
      await carregarInteracoes(historicoAberto.id);
      window.dispatchEvent(
        new CustomEvent("orcamento-interacao-criada", {
          detail: { orcamentoId: historicoAberto.id },
        })
      );
      showToast("Interação registrada.", "success");
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Erro ao salvar interação.";
      setErroInteracao(msg);
      showToast("Erro ao salvar interação.", "error");
    } finally {
      setSalvandoInteracao(false);
    }
  }

  async function registrarEnvio(e: React.FormEvent) {
    e.preventDefault();
    if (!historicoAberto) return;
    if (!envioMsg.trim() && !envioLink.trim()) {
      setErroInteracao("Informe uma mensagem ou um link para registrar o envio/compartilhamento.");
      return;
    }
    try {
      setSalvandoInteracao(true);
      setErroInteracao(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      const msgBase =
        envioMsg.trim() ||
        `Enviado via ${envioCanal}${envioContato ? ` para ${envioContato}` : ""}.`;

      const { error } = await supabase.from("orcamento_interacoes").insert({
        orcamento_id: historicoAberto.id,
        usuario_id: userId,
        tipo: "envio",
        mensagem: msgBase,
        anexo_url: envioLink.trim() || null,
      });
      if (error) throw error;

      // Opcionalmente marca o orçamento como "enviado" (se não estiver fechado/perdido)
      if (envioStatus && historicoAberto.status !== "fechado" && historicoAberto.status !== "perdido") {
        await supabase.from("orcamentos").update({ status: "enviado" }).eq("id", historicoAberto.id);
        await carregar();
      }

      setEnvioMsg("");
      setEnvioLink("");
      setEnvioContato("");
      setEnvioCanal("email");
      await carregarInteracoes(historicoAberto.id);
      window.dispatchEvent(
        new CustomEvent("orcamento-interacao-criada", {
          detail: { orcamentoId: historicoAberto.id },
        })
      );
      showToast("Envio registrado.", "success");
      await carregar();
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || "Erro ao registrar envio/compartilhamento.";
      setErroInteracao(msg);
      showToast("Erro ao registrar envio/compartilhamento.", "error");
    } finally {
      setSalvandoInteracao(false);
    }
  }

  if (loadingPerm) {
    return suppressLoadingMessage ? null : <LoadingUsuarioContext />;
  }

  if (!ativo) return <div>Acesso ao módulo de Vendas bloqueado.</div>;

  return (
    <>
      <div className="card-base">
        <div
          className="grid w-full mt-3 gap-2 md:gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            alignItems: "end",
          }}
        >
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Data início</label>
            <input
              className="form-input"
              type="date"
              value={periodoIni}
              onChange={(e) => setPeriodoIni(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data fim</label>
            <input
              className="form-input"
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
            />
          </div>
          {podeCriar && (
            <div
              className="form-group"
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
            >
              <span style={{ visibility: "hidden" }}>botão</span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "nowrap",
                  gap: 8,
                  alignItems: "center",
                  whiteSpace: "nowrap",
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.dispatchEvent(new CustomEvent("abrir-formulario-orcamento"))}
                  disabled={formAberto}
                >
                  Adicionar orçamento
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={abrirImportacaoCvc}
                  disabled={formAberto}
                >
                  Importar orçamento
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button className="btn btn-secondary min-w-[120px]" onClick={carregar}>
            Atualizar
          </button>
          <button className="btn btn-light min-w-[140px]" onClick={exportarCSV}>
            Exportar CSV
          </button>
          <button
            className="btn btn-light min-w-[140px]"
              onClick={() => {
                setStatusFiltro("");
                setPeriodoIni("");
                setPeriodoFim("");
                carregar();
              }}
            >
            Limpar filtros
          </button>
          <button
            className="btn btn-light min-w-[160px]"
            onClick={() => setMostrarKanban((prev) => !prev)}
          >
            {mostrarKanban ? "Ocultar Kanban" : "Mostrar Kanban"}
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={somentePendentes}
              onChange={(e) => setSomentePendentes(e.target.checked)}
            />
            Só pendentes de follow-up
          </label>
        </div>
      </div>

      {erro && <div className="auth-error">{erro}</div>}
      {sucesso && (
        <div className="auth-success" style={{ color: "#0f172a", fontWeight: 700 }}>
          {sucesso}
        </div>
      )}

      <div className="card-base card-blue mt-3">
        <h3 className="card-title font-semibold">Situação do Orçamento</h3>
        <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', alignItems: 'stretch' }}>
          {statuses.map((status) => (
            <div
              key={`kpi-${status}`}
              className="kpi-card flex flex-col gap-1 items-center justify-center text-center"
              style={{
                background: statusCores[status].bg,
                border: `1px solid ${statusCores[status].border}`,
              }}
            >
              <div className="kpi-label capitalize font-bold">
                {status} - {String(totais[status].qtd).padStart(2, "0")} Itens
              </div>
              <div className="kpi-value text-xl font-extrabold">
                {totais[status].valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pendentesFollowUp.length > 0 && (
        <div className="card-base card-yellow" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div>
              <h3 className="card-title">Pendentes de follow-up</h3>
              <p className="page-subtitle">
                Viagem próxima (≤ 7 dias) ou orçamento sem data há 7+ dias. Clique para registrar follow-up.
              </p>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {pendentesFollowUp.map((o) => {
              const ultima = ultimasInteracoes[o.id];
              const diasInteracao = diasDesdeISO(ultima?.created_at || null);
              const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;

              return (
                <div
                  key={`pend-${o.id}`}
                  className="card-base"
                  style={{ border: "1px solid #facc15", background: "#fffbeb" }}
                >
                  <div style={{ fontWeight: 700 }}>{o.clientes?.nome || "Cliente não informado"}</div>
                  <div style={{ fontSize: "0.9rem", color: "#475569" }}>
                    Status: {(o.status || "novo").toUpperCase()} | Viagem: {o.data_viagem || "—"}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#475569" }}>
                    Valor:{" "}
                    {o.valor
                      ? o.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </div>
                  {semInteracaoRecente && (
                    <div style={{ marginTop: 4, color: "#b45309", fontSize: "0.85rem", fontWeight: 700 }}>
                      Sem interação há {Number.isFinite(diasInteracao) ? `${diasInteracao}d` : "—"}
                    </div>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 8, width: "100%" }}
                    onClick={() => registrarFollowUpRapido(o)}
                    disabled={followUpLoadingId === o.id}
                  >
                    {followUpLoadingId === o.id ? "Registrando..." : "Registrar follow-up"}
                  </button>
                  {ultima?.tipo && (
                    <div style={{ marginTop: 8, fontSize: "0.85rem", color: "#475569" }}>
                      Última: {ultima?.tipo}{" "}
                      {ultima?.created_at
                        ? new Date(ultima?.created_at || "").toLocaleDateString("pt-BR")
                        : ""}
                      {resumoMensagem(ultima?.mensagem) && (
                        <div style={{ color: "#0f172a" }}>
                          {resumoMensagem(ultima?.mensagem)}
                        </div>
                      )}
                      {ultima?.anexo_url && (
                        <div>
                          <a href={ultima?.anexo_url || ""} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>
                            Abrir anexo
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-base" style={{ marginTop: 16 }}>
        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-blue min-w-[1100px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Cidade</th>
                <th>Produtos</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Data viagem</th>
                <th style={{ textAlign: "center" }}>Valor</th>
                <th style={{ textAlign: "center" }}>Última interação</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={9}>Carregando...</td>
                </tr>
              )}
              {!carregando && filtrados.length === 0 && (
                <tr>
                  <td colSpan={9}>Nenhum orçamento encontrado.</td>
                </tr>
              )}

              {!carregando &&
                filtrados.map((o) => {
                  const ultima = ultimasInteracoes[o.id];
                  const diasInteracao = diasDesdeISO(ultima?.created_at || null);
                  const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;
                  const whatsappLink = construirLinkWhatsApp(o.clientes?.whatsapp);

                  return (
                    <tr key={o.id}>
                      <td>{o.data_orcamento ? formatarDataBR(o.data_orcamento.slice(0, 10)) : "—"}</td>
                      <td>{o.clientes?.nome || "—"}</td>
                      <td>
                        {listarCidadesItens(o).length > 0 ? (
                          listarCidadesItens(o).map((cidade) => (
                            <div key={`${o.id}-cidade-${cidade}`} style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                              {cidade}
                            </div>
                          ))
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {listarProdutosItens(o).length > 0 ? (
                          listarProdutosItens(o).map((produto) => (
                            <div key={`${o.id}-produto-${produto}`} style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                              {produto}
                            </div>
                          ))
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ textTransform: "capitalize", textAlign: "center" }}>
                        <select
                          className="form-select"
                          value={o.status || ""}
                          onChange={(e) => alterarStatus(o.id, e.target.value as StatusOrcamento)}
                          disabled={salvandoStatus === o.id || o.status === "fechado"}
                        >
                          <option value="novo">Novo</option>
                          <option value="enviado">Enviado</option>
                          <option value="negociando">Negociando</option>
                          <option value="fechado">Fechado</option>
                          <option value="perdido">Perdido</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {o.data_viagem ? formatarDataBR(o.data_viagem) : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {o.valor
                          ? o.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "0.85rem", color: "#475569" }}>
                        {ultima?.created_at
                          ? new Date(ultima.created_at).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          className="btn-icon"
                          onClick={() => iniciarEdicao(o)}
                          style={{ marginRight: 6 }}
                          disabled={o.status === "fechado" || o.status === "perdido"}
                          title={
                            o.status === "fechado" || o.status === "perdido"
                              ? "Orçamento encerrado"
                              : "Editar"
                          }
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-primary"
                          aria-label="Converter em venda"
                          onClick={() => converterParaVenda(o)}
                          style={{ padding: "4px 8px", fontSize: "0.95rem", marginLeft: 6 }}
                          disabled={
                            !podeConverterOrcamento(o) ||
                            o.status === "fechado" ||
                            o.status === "perdido"
                          }
                          title={
                            o.status === "fechado" || o.status === "perdido"
                              ? "Orçamento encerrado"
                              : !podeConverterOrcamento(o)
                              ? "Selecione cliente e produtos para converter"
                              : "Converter em venda"
                          }
                        >
                          $
                        </button>
                        <button
                          className="btn-icon"
                          aria-label="Histórico de interações"
                          onClick={() => abrirHistorico(o)}
                          style={{ marginLeft: 6, marginRight: 6 }}
                          title="Ver histórico / registrar interação"
                        >
                          🕒
                        </button>
                        {whatsappLink && (
                          <a
                            className="btn-icon"
                            href={whatsappLink}
                            title="Enviar WhatsApp"
                            target="_blank"
                            rel="noreferrer"
                            style={{ marginRight: 6 }}
                          >
                            💬
                          </a>
                        )}
                        {podeExcluir && (
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => excluirOrcamento(o)}
                            disabled={deletandoOrcamentoId === o.id}
                            title="Excluir orçamento"
                          >
                            {deletandoOrcamentoId === o.id ? "..." : "🗑️"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
        </tbody>
      </table>
        </div>
      </div>

      {mostrarKanban && (
        <div className="card-base" style={{ marginTop: 16 }}>
          <div className="page-header" style={{ marginBottom: 8 }}>
            <div>
              <h3 className="card-title">Kanban de Orçamentos</h3>
              <p className="page-subtitle">Arraste os cards entre colunas para alterar o status.</p>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            {statuses.map((status) => (
              <div
                key={`kanban-${status}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(status)}
                style={{
                  border: `2px dashed ${statusCores[status].border}`,
                  background: statusCores[status].bg,
                  minHeight: 120,
                  padding: 8,
                  borderRadius: 10,
                }}
              >
                <div style={{ fontWeight: 800, textTransform: "capitalize", marginBottom: 6 }}>
                  {status} ({porColuna[status]?.length || 0})
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {(porColuna[status] || []).map((o) => {
                    const ultima = ultimasInteracoes[o.id];
                    const diasInteracao = diasDesdeISO(ultima?.created_at || null);
                    const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;

                    const bloqueado = o.status === "fechado";
                    return (
                      <div
                        key={`kan-card-${o.id}`}
                        draggable={!bloqueado}
                        onDragStart={() => {
                          if (bloqueado) return;
                          handleDragStart(o.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDraggingStatus(null);
                        }}
                        className="card-base"
                        style={{
                          padding: 10,
                          cursor: bloqueado ? "not-allowed" : "grab",
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          opacity: bloqueado ? 0.7 : 1,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{o.clientes?.nome || "Cliente não informado"}</div>
                        <div style={{ fontSize: "0.9rem", color: "#475569" }}>
                          Valor:{" "}
                          {o.valor
                            ? o.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : "—"}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#475569" }}>
                          Viagem: {o.data_viagem || "—"}
                        </div>
                        {semInteracaoRecente && (
                          <div style={{ fontSize: "0.85rem", color: "#b45309", fontWeight: 700 }}>
                            Sem interação há {Number.isFinite(diasInteracao) ? `${diasInteracao}d` : "—"}
                          </div>
                        )}
                        {ultima?.tipo && (
                          <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                            Última: {ultima?.tipo}{" "}
                            {ultima?.created_at
                              ? new Date(ultima?.created_at || "").toLocaleDateString("pt-BR")
                              : ""}
                            {resumoMensagem(ultima?.mensagem) && (
                              <div style={{ color: "#0f172a" }}>
                                {resumoMensagem(ultima?.mensagem)}
                              </div>
                            )}
                            {ultima?.anexo_url && (
                              <div>
                                <a href={ultima?.anexo_url || ""} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>
                                  Abrir anexo
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-light"
                            style={{ padding: "4px 8px" }}
                            onClick={() => iniciarEdicao(o)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-light"
                            style={{ padding: "4px 8px" }}
                            onClick={() => abrirHistorico(o)}
                          >
                            Histórico
                          </button>
                          {podeExcluir && (
                            <button
                              className="btn btn-light"
                              style={{
                                padding: "4px 8px",
                                color: "#b91c1c",
                                borderColor: "#fca5a5",
                                background: "#fee2e2",
                              }}
                              onClick={() => excluirOrcamento(o)}
                              disabled={deletandoOrcamentoId === o.id}
                            >
                              {deletandoOrcamentoId === o.id ? "Excluindo..." : "Excluir"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(porColuna[status] || []).length === 0 && (
                    <div style={{ fontSize: "0.9rem", color: "#475569" }}>Sem itens.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editando && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 500 }}>
            <div className="modal-header">
          <div>
            <div className="modal-title">Editar orçamento</div>
            <div style={{ fontSize: "0.85rem", color: "#475569" }}>
              Cliente: {editando.clientes?.nome || "—"} | Destino: {editando.destinos?.nome || "—"}
            </div>
          </div>
          <button className="btn-ghost" onClick={() => setEditando(null)}>✖</button>
        </div>
        <form onSubmit={salvarEdicao}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input
                className="form-input"
                type="number"
                value={valorEdit}
                onChange={(e) => setValorEdit(e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Data da viagem</label>
              <input
                className="form-input"
                type="date"
                value={dataViagemEdit}
                onChange={(e) => setDataViagemEdit(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select
                className="form-select"
                value={clienteSelecionado}
                onChange={(e) => setClienteSelecionado(e.target.value)}
              >
                <option value="">Selecione</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destino</label>
              <select
                className="form-select"
                value={destinoSelecionado}
                onChange={(e) => setDestinoSelecionado(e.target.value)}
              >
                <option value="">Selecione</option>
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Produto</label>
              <select
                className="form-select"
                value={produtoSelecionado}
                onChange={(e) => setProdutoSelecionado(e.target.value)}
              >
                <option value="">(Opcional)</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea
                className="form-input"
                rows={3}
                value={notasEdit}
                onChange={(e) => setNotasEdit(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {historicoAberto && (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 640, width: "90vw" }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Histórico do orçamento</div>
            <div style={{ fontSize: "0.9rem", color: "#475569" }}>
              Cliente: {historicoAberto.clientes?.nome || "—"} | Destino: {historicoAberto.destinos?.nome || "—"} | Produto: {historicoAberto.produtos?.nome || "—"}
            </div>
          </div>
          <button className="btn-ghost" onClick={fecharHistorico}>✖</button>
        </div>

        <div className="modal-body" style={{ display: "grid", gap: 12 }}>
          <form onSubmit={registrarEnvio} className="card-base" style={{ background: "#eef2ff" }}>
            <div className="modal-title" style={{ fontSize: "1rem", marginBottom: 8 }}>
              Registrar envio / compartilhamento
            </div>
            <div className="grid" style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div className="form-group">
                <label className="form-label">Canal</label>
                <select className="form-select" value={envioCanal} onChange={(e) => setEnvioCanal(e.target.value)}>
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="link">Link</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destinatário</label>
                <input
                  className="form-input"
                  type="text"
                  value={envioContato}
                  onChange={(e) => setEnvioContato(e.target.value)}
                  placeholder="E-mail, telefone, nome..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Link</label>
                <input
                  className="form-input"
                  type="url"
                  value={envioLink}
                  onChange={(e) => setEnvioLink(e.target.value)}
                  placeholder="https://... (PDF, drive, WhatsApp, etc.)"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Mensagem</label>
              <textarea
                className="form-input"
                rows={3}
                value={envioMsg}
                onChange={(e) => setEnvioMsg(e.target.value)}
                placeholder="Ex.: Proposta enviada por e-mail. Link do PDF..."
              />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={envioStatus}
                onChange={(e) => setEnvioStatus(e.target.checked)}
              />
              Marcar orçamento como "enviado"
            </label>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={salvandoInteracao}>
                {salvandoInteracao ? "Salvando..." : "Registrar envio"}
              </button>
            </div>
          </form>

          <form onSubmit={adicionarInteracao} className="card-base" style={{ background: "#f8fafc" }}>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={novaInteracaoTipo}
                onChange={(e) => setNovaInteracaoTipo(e.target.value)}
              >
                {tipoInteracaoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Mensagem</label>
              <textarea
                className="form-input"
                rows={3}
                value={novaInteracaoMsg}
                onChange={(e) => setNovaInteracaoMsg(e.target.value)}
                placeholder="Ex.: Enviada proposta por e-mail. Aguardando retorno."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Link / Anexo (opcional)</label>
              <input
                className="form-input"
                type="url"
                value={novaInteracaoAnexo}
                onChange={(e) => setNovaInteracaoAnexo(e.target.value)}
                placeholder="https://... (PDF, drive, WhatsApp, etc.)"
              />
            </div>
            {erroInteracao && <div className="auth-error">{erroInteracao}</div>}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-light" onClick={fecharHistorico}>
                Fechar
              </button>
              <button type="submit" className="btn btn-primary" disabled={salvandoInteracao}>
                {salvandoInteracao ? "Salvando..." : "Registrar"}
              </button>
            </div>
          </form>

          <div className="card-base" style={{ maxHeight: "50vh", overflowY: "auto" }}>
            <div className="modal-title" style={{ fontSize: "1rem", marginBottom: 8 }}>
              Interações
            </div>
            {carregandoInteracoes && <div>Carregando interações...</div>}
            {!carregandoInteracoes && interacoes.length === 0 && (
              <div>Nenhuma interação registrada ainda.</div>
            )}
            {!carregandoInteracoes &&
              interacoes.map((i) => (
                <div
                  key={i.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid #e2e8f0",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        background: "#e2e8f0",
                        color: "#0f172a",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: "0.85rem",
                        textTransform: "capitalize",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {i.tipo || "anotacao"}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#475569", textAlign: "right" }}>
                      {i.created_at ? new Date(i.created_at).toLocaleString("pt-BR") : "—"}
                    </span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", color: "#0f172a" }}>{i.mensagem}</div>
                  <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                    Por: {i.users?.email || i.usuario_id || "—"}
                  </div>
                  {i.anexo_url && (
                    <div style={{ fontSize: "0.9rem" }}>
                      <a href={i.anexo_url} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>
                        Abrir anexo/compartilhamento
                      </a>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )}

  {importacaoAberta && (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 520, width: "90vw" }}>
        <div className="modal-header">
          <div className="modal-title">Importar orçamento (PDF/Imagem)</div>
          <button className="btn-ghost" onClick={fecharImportacaoCvc}>
            ✖
          </button>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Cliente *</label>
            <select
              className="form-select"
              value={importacaoClienteId}
              onChange={(e) => setImportacaoClienteId(e.target.value)}
            >
              <option value="">Selecione</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            {clientes.length === 0 && (
              <div style={{ fontSize: "0.85rem", color: "#b91c1c", marginTop: 6 }}>
                Nenhum cliente ativo encontrado. Cadastre um cliente antes de importar.
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">PDF ou imagens *</label>
            <input
              className="form-input"
              type="file"
              accept="application/pdf,image/*"
              multiple
              onChange={(e) => setImportacaoArquivos(Array.from(e.target.files || []))}
            />
            {importacaoArquivos.length > 0 && (
              <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: 6 }}>
                {importacaoArquivos.map((f) => f.name).join(", ")}
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.9rem", color: "#475569" }}>
            O arquivo será enviado para o carrinho do orçamento e importado automaticamente.
          </div>
          {erroImportacao && <div className="auth-error">{erroImportacao}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-light" onClick={fecharImportacaoCvc}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmarImportacaoCvc}
            disabled={salvandoImportacao}
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  )}

  {conversaoAberta && (
    <div className="modal-backdrop">
      <div className="modal-panel" style={{ maxWidth: 640, width: "90vw" }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Converter orçamento em venda</div>
            <div style={{ fontSize: "0.85rem", color: "#475569" }}>
              Cliente: {conversaoAberta.clientes?.nome || "—"} | Itens: {itensConversao.length}
            </div>
          </div>
          <button className="btn-ghost" onClick={fecharConversao}>
            ✖
          </button>
        </div>
        <div className="modal-body" style={{ display: "grid", gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Recibos</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                <input
                  type="radio"
                  name="modo-recibo"
                  checked={!informarRecibos}
                  onChange={() => setInformarRecibos(false)}
                />
                Gerar automaticamente
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                <input
                  type="radio"
                  name="modo-recibo"
                  checked={informarRecibos}
                  onChange={() => setInformarRecibos(true)}
                />
                Informar manualmente
              </label>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 6 }}>
              {informarRecibos
                ? "Digite o número de recibo para cada produto."
                : "Os recibos serão gerados automaticamente ao converter."}
            </div>
          </div>

          <div className="card-base" style={{ background: "#f8fafc" }}>
            {itensConversao.length === 0 && (
              <div style={{ color: "#b91c1c" }}>
                Nenhum item encontrado. Edite o orçamento e tente novamente.
              </div>
            )}
            {itensConversao.map((item, index) => {
              const cidade = formatarCidadeLabel(item.cidade);
              const tipo = item.tipo_produto?.nome || item.tipo_produto?.tipo || "";
              const produto = item.produto?.nome || "Produto";
              const periodo = formatarPeriodo(item.periodo_inicio, item.periodo_fim);
              const valor =
                item.valor != null
                  ? Number(item.valor).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "—";
              const detalhes = [cidade, tipo, periodo && `Período: ${periodo}`]
                .filter(Boolean)
                .join(" • ");
              return (
                <div
                  key={item.id || `item-${index}`}
                  style={{
                    padding: "10px 0",
                    borderBottom: index === itensConversao.length - 1 ? "none" : "1px solid #e2e8f0",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong style={{ color: "#0f172a" }}>{produto}</strong>
                    <span style={{ fontSize: "0.9rem", color: "#475569" }}>{valor}</span>
                  </div>
                  {detalhes && <div style={{ fontSize: "0.85rem", color: "#64748b" }}>{detalhes}</div>}
                  {informarRecibos && (
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Número do recibo"
                      value={recibosConversao[item.id] || ""}
                      onChange={(e) =>
                        setRecibosConversao((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {erroConversao && <div className="auth-error">{erroConversao}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-light" onClick={fecharConversao} disabled={salvandoConversao}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmarConversaoVenda}
            disabled={salvandoConversao || itensConversao.length === 0}
          >
            {salvandoConversao ? "Convertendo..." : "Converter em venda"}
          </button>
        </div>
      </div>
    </div>
  )}

      {/* Toasts */}
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
    </>
  );
}
