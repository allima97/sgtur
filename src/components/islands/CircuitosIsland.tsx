import React, { useEffect, useMemo, useRef, useState } from "react";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Circuito = {
  id: string;
  nome: string;
  codigo: string | null;
  operador: string | null;
  resumo: string | null;
  ativo: boolean | null;
  created_at: string | null;
};

type CircuitoLista = Circuito & {
  cidades_roteiro: string[];
  roteiro_busca: string;
};

type CircuitoPreview = {
  circuito: Circuito;
  dias: Array<{ dia_numero: number; titulo: string | null; descricao: string; cidades: string[] }>;
  datas: Array<{
    data_inicio: string;
    cidade_inicio_nome: string | null;
    dias_extra_antes: number;
    dias_extra_depois: number;
  }>;
};

type CidadeBusca = {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  populacao: number | null;
  subdivisao_nome: string | null;
  pais_nome: string | null;
  subdivisao_id?: string | null;
};

type CidadeSelecionada = {
  id: string;
  nome: string;
  label: string;
};

type CircuitoDia = {
  id?: string;
  tempId: string;
  dia_numero: number;
  titulo: string;
  descricao: string;
  cidades: CidadeSelecionada[];
};

type CircuitoData = {
  id?: string;
  tempId: string;
  data_inicio: string;
  cidade_inicio_id: string;
  cidade_inicio_label: string;
  dias_extra_antes: string;
  dias_extra_depois: string;
};

type CidadeContexto = {
  tipo: "dia" | "data";
  id: string;
};

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const ROTULO_CIRCUITO = /^Circuito\s*:/i;
const ROTULO_OPERADOR = /^Operador\s+por\s*:/i;
const ROTULO_CODIGO = /^C[óo]digo\s*:/i;
const ROTULO_DATA_INICIO = /^Data\s+e\s+cidade\s+de\s+in[ií]cio:/i;
const REGEX_DIA = /^Dia\s+(\d+)\s*:\s*(.*)$/i;
const ROTULOS_BLOQUEIO = [ROTULO_CIRCUITO, ROTULO_OPERADOR, ROTULO_CODIGO, REGEX_DIA, ROTULO_DATA_INICIO];

function extrairValorRotulo(linhas: string[], rotuloRegex: RegExp) {
  for (let i = 0; i < linhas.length; i += 1) {
    const linha = linhas[i];
    if (!rotuloRegex.test(linha)) continue;
    const direto = linha.replace(rotuloRegex, "").replace(/^[:\s-]+/, "").trim();
    const partes: string[] = [];
    if (direto) partes.push(direto);
    for (let j = i + 1; j < linhas.length; j += 1) {
      const proxima = (linhas[j] || "").trim();
      if (!proxima) {
        if (partes.length) break;
        continue;
      }
      if (ROTULOS_BLOQUEIO.some((regex) => regex.test(proxima))) break;
      partes.push(proxima);
    }
    if (partes.length) return partes.join(" ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function linhaPareceContinuaTitulo(linha: string) {
  const limpo = (linha || "").trim();
  if (!limpo) return false;
  if (/^(e|ou|\/|&|-)/i.test(limpo)) return true;
  if (/^[a-zà-öø-ÿ]/.test(limpo)) return true;
  const letras = limpo.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  if (letras.length) {
    const upper = letras.replace(/[^A-ZÀ-ÖØ-Þ]/g, "");
    if (upper.length / letras.length >= 0.6 && limpo.length <= 60) return true;
  }
  if (limpo.length <= 40 && !/[.!?]/.test(limpo)) return true;
  return false;
}

function gerarIdTemporario() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function formatCidadeLabel(cidade: CidadeBusca) {
  const base = cidade.subdivisao_nome ? `${cidade.nome} (${cidade.subdivisao_nome})` : cidade.nome;
  return cidade.pais_nome ? `${base} - ${cidade.pais_nome}` : base;
}

function parseCircuitoTexto(texto: string) {
  const safe = (texto || "").replace(/\r/g, "");
  const linhas = safe.split("\n").map((linha) => linha.trim());

  const operador = extrairValorRotulo(linhas, ROTULO_OPERADOR);
  const codigo = extrairValorRotulo(linhas, ROTULO_CODIGO);
  const circuito = extrairValorRotulo(linhas, ROTULO_CIRCUITO);

  const dias: Array<{ dia: number; titulo: string; descricao: string }> = [];
  let atual: { dia: number; titulo: string[]; descricao: string[] } | null = null;

  function finalizarAtual() {
    if (!atual) return;
    const titulo = atual.titulo.join(" ").replace(/\s+/g, " ").trim();
    const descricao = atual.descricao.join(" ").replace(/\s+/g, " ").trim();
    if (descricao) {
      dias.push({ dia: atual.dia, titulo, descricao });
    }
    atual = null;
  }

  linhas.forEach((linha) => {
    if (!linha) return;
    const matchDia = linha.match(REGEX_DIA);
    if (matchDia) {
      finalizarAtual();
      const diaNumero = Number(matchDia[1]);
      if (!diaNumero || Number.isNaN(diaNumero)) return;
      const tituloInicial = (matchDia[2] || "").trim();
      atual = { dia: diaNumero, titulo: tituloInicial ? [tituloInicial] : [], descricao: [] };
      return;
    }

    if (!atual) return;
    if (ROTULO_DATA_INICIO.test(linha)) {
      finalizarAtual();
      return;
    }

    if (atual.descricao.length === 0 && (atual.titulo.length === 0 || linhaPareceContinuaTitulo(linha))) {
      atual.titulo.push(linha);
      return;
    }
    atual.descricao.push(linha);
  });

  finalizarAtual();

  return { operador, codigo, circuito, dias };
}

const CIDADES_IGNORADAS = new Set([
  "cidade de origem",
  "cidade de destino",
  "origem",
  "destino",
]);

function extrairCidadesDoTitulo(titulo: string) {
  const limpo = (titulo || "")
    .replace(/\(.*?\)/g, " ")
    .replace(/cidade\s+de\s+origem/gi, " ")
    .replace(/cidade\s+de\s+destino/gi, " ")
    .replace(/\s+e\s+/gi, ",")
    .replace(/\s+\/\s+/g, ",")
    .replace(/\s+-\s+/g, ",")
    .replace(/\s+&\s+/g, ",");

  const partes = limpo
    .split(",")
    .map((p) => p.replace(/\d+/g, "").trim())
    .filter(Boolean);

  const vistos = new Set<string>();
  const cidades: string[] = [];

  partes.forEach((parte) => {
    const normalizado = normalizeText(parte);
    if (!normalizado || normalizado.length < 3) return;
    if (CIDADES_IGNORADAS.has(normalizado)) return;
    if (vistos.has(normalizado)) return;
    vistos.add(normalizado);
    cidades.push(parte.trim());
  });

  return cidades;
}

const initialForm = {
  nome: "",
  codigo: "",
  operador: "",
  resumo: "",
  ativo: true,
};

export default function CircuitosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");

  const [circuitos, setCircuitos] = useState<CircuitoLista[]>([]);
  const [form, setForm] = useState(initialForm);
  const [dias, setDias] = useState<CircuitoDia[]>([]);
  const [datas, setDatas] = useState<CircuitoData[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [cidadeBusca, setCidadeBusca] = useState("");
  const [cidadeContexto, setCidadeContexto] = useState<CidadeContexto | null>(null);
  const [mostrarSugestoesCidade, setMostrarSugestoesCidade] = useState(false);
  const [resultadosCidade, setResultadosCidade] = useState<CidadeBusca[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidadeBusca, setErroCidadeBusca] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErro, setPreviewErro] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<CircuitoPreview | null>(null);
  const [importandoPdf, setImportandoPdf] = useState(false);
  const [erroImportacao, setErroImportacao] = useState<string | null>(null);
  const [pdfSelecionado, setPdfSelecionado] = useState("");
  const [draggingDiaId, setDraggingDiaId] = useState<string | null>(null);
  const [dragOverDiaId, setDragOverDiaId] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const cidadesCacheRef = useRef<Map<string, CidadeSelecionada | null>>(new Map());

  const circuitosFiltrados = useMemo(() => {
    const termo = normalizeText(busca.trim());
    if (!termo) return circuitos;
    return circuitos.filter((c) => {
      const bateCidade = (c.cidades_roteiro || []).some((cidade) =>
        normalizeText(cidade).includes(termo),
      );
      const bateRoteiro = (c.roteiro_busca || "").includes(termo);
      return (
        normalizeText(c.nome).includes(termo) ||
        normalizeText(c.codigo || "").includes(termo) ||
        normalizeText(c.operador || "").includes(termo) ||
        bateCidade ||
        bateRoteiro
      );
    });
  }, [circuitos, busca]);
  const circuitosExibidos = useMemo(() => {
    return busca.trim() ? circuitosFiltrados : circuitosFiltrados.slice(0, 5);
  }, [circuitosFiltrados, busca]);

  useEffect(() => {
    carregarCircuitos();
  }, []);

  async function carregarCircuitos() {
    try {
      setLoading(true);
      setErro(null);
      const { data, error } = await supabase
        .from("circuitos")
        .select(`
          id,
          nome,
          codigo,
          operador,
          resumo,
          ativo,
          created_at,
          circuito_dias (
            titulo,
            descricao,
            cidades:circuito_dias_cidades (
              cidades (nome)
            )
          )
        `)
        .order("nome", { ascending: true });
      if (error) throw error;
      const formatados = (data || []).map((c: any) => {
        const cidadesSet = new Set<string>();
        const textosRoteiro: string[] = [];
        (c.circuito_dias || []).forEach((dia: any) => {
          if (dia?.titulo) textosRoteiro.push(dia.titulo);
          if (dia?.descricao) textosRoteiro.push(dia.descricao);
          (dia.cidades || []).forEach((item: any) => {
            const nome = item?.cidades?.nome;
            if (nome) cidadesSet.add(nome);
          });
        });
        const roteiroBusca = normalizeText([...textosRoteiro, ...Array.from(cidadesSet)].join(" "));
        return {
          id: c.id,
          nome: c.nome,
          codigo: c.codigo,
          operador: c.operador,
          resumo: c.resumo,
          ativo: c.ativo,
          created_at: c.created_at,
          cidades_roteiro: Array.from(cidadesSet),
          roteiro_busca: roteiroBusca,
        } as CircuitoLista;
      });
      setCircuitos(formatados);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar circuitos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cidadeContexto || !mostrarSugestoesCidade) return;
    if (cidadeBusca.trim().length < 2) {
      setResultadosCidade([]);
      setErroCidadeBusca(null);
      setBuscandoCidade(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBuscandoCidade(true);
        const { data, error } = await supabase.rpc("buscar_cidades", {
          q: cidadeBusca.trim(),
          limite: 10,
        });
        if (controller.signal.aborted) return;
        if (error) {
          console.error("Erro ao buscar cidades:", error);
          setErroCidadeBusca("Erro ao buscar cidades (RPC). Tentando fallback...");
          const { data: dataFallback, error: errorFallback } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_id")
            .ilike("nome", `%${cidadeBusca.trim()}%`)
            .order("nome");
          if (errorFallback) {
            console.error("Erro no fallback de cidades:", errorFallback);
            setErroCidadeBusca("Erro ao buscar cidades.");
          } else {
            setResultadosCidade((dataFallback as CidadeBusca[]) || []);
            setErroCidadeBusca(null);
          }
        } else {
          setResultadosCidade((data as CidadeBusca[]) || []);
          setErroCidadeBusca(null);
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [cidadeBusca, cidadeContexto, mostrarSugestoesCidade]);

  function resetFormulario() {
    setForm(initialForm);
    setDias([]);
    setDatas([]);
    setEditandoId(null);
    setErro(null);
    setCidadeBusca("");
    setCidadeContexto(null);
    setMostrarSugestoesCidade(false);
    setErroImportacao(null);
    setPdfSelecionado("");
    if (pdfInputRef.current) {
      pdfInputRef.current.value = "";
    }
  }

  function abrirFormulario() {
    resetFormulario();
    setSucesso(null);
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    resetFormulario();
    setMostrarFormulario(false);
  }

  function handleChange(campo: string, valor: any) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function adicionarDia() {
    const proximoNumero =
      dias.length > 0 ? Math.max(...dias.map((d) => d.dia_numero || 0)) + 1 : 1;
    setDias((prev) => [
      ...prev,
      {
        tempId: gerarIdTemporario(),
        dia_numero: proximoNumero,
        titulo: "",
        descricao: "",
        cidades: [],
      },
    ]);
  }

  function removerDia(tempId: string) {
    setDias((prev) => prev.filter((d) => d.tempId !== tempId));
  }

  function atualizarDia(tempId: string, campo: keyof CircuitoDia, valor: any) {
    setDias((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, [campo]: valor } : d)),
    );
  }

  function reordenarDias(origemId: string, destinoId: string) {
    setDias((prev) => {
      const origemIdx = prev.findIndex((d) => d.tempId === origemId);
      const destinoIdx = prev.findIndex((d) => d.tempId === destinoId);
      if (origemIdx === -1 || destinoIdx === -1 || origemIdx === destinoIdx) return prev;
      const atualizado = [...prev];
      const [movido] = atualizado.splice(origemIdx, 1);
      atualizado.splice(destinoIdx, 0, movido);
      return atualizado.map((item, idx) => ({ ...item, dia_numero: idx + 1 }));
    });
  }

  function iniciarDragDia(tempId: string) {
    setDraggingDiaId(tempId);
    setDragOverDiaId(null);
  }

  function finalizarDragDia() {
    setDraggingDiaId(null);
    setDragOverDiaId(null);
  }

  function handleDragOverDia(event: React.DragEvent, tempId: string) {
    const hasDragData = Array.from(event.dataTransfer.types || []).includes("text/plain");
    if ((!draggingDiaId && !hasDragData) || draggingDiaId === tempId) return;
    event.preventDefault();
    if (dragOverDiaId !== tempId) {
      setDragOverDiaId(tempId);
    }
  }

  function handleDropDia(event: React.DragEvent, tempId: string) {
    const dragId = draggingDiaId || event.dataTransfer.getData("text/plain");
    if (!dragId || dragId === tempId) return;
    reordenarDias(dragId, tempId);
    setDraggingDiaId(null);
    setDragOverDiaId(null);
  }

  function adicionarCidadeAoDia(tempId: string, cidade: CidadeBusca) {
    setDias((prev) =>
      prev.map((d) => {
        if (d.tempId !== tempId) return d;
        if (d.cidades.some((c) => c.id === cidade.id)) return d;
        const label = formatCidadeLabel(cidade);
        return { ...d, cidades: [...d.cidades, { id: cidade.id, nome: cidade.nome, label }] };
      }),
    );
  }

  function removerCidadeDoDia(tempId: string, cidadeId: string) {
    setDias((prev) =>
      prev.map((d) =>
        d.tempId === tempId ? { ...d, cidades: d.cidades.filter((c) => c.id !== cidadeId) } : d,
      ),
    );
  }

  function adicionarData() {
    setDatas((prev) => [
      ...prev,
      {
        tempId: gerarIdTemporario(),
        data_inicio: "",
        cidade_inicio_id: "",
        cidade_inicio_label: "",
        dias_extra_antes: "0",
        dias_extra_depois: "0",
      },
    ]);
  }

  function removerData(tempId: string) {
    setDatas((prev) => prev.filter((d) => d.tempId !== tempId));
  }

  function atualizarData(tempId: string, campo: keyof CircuitoData, valor: any) {
    setDatas((prev) =>
      prev.map((d) => (d.tempId === tempId ? { ...d, [campo]: valor } : d)),
    );
  }

  function handleCidadeInput(tempId: string, tipo: CidadeContexto["tipo"], valor: string) {
    setCidadeContexto({ tipo, id: tempId });
    setCidadeBusca(valor);
    setMostrarSugestoesCidade(true);
    if (tipo === "data") {
      setDatas((prev) =>
        prev.map((d) =>
          d.tempId === tempId ? { ...d, cidade_inicio_label: valor, cidade_inicio_id: "" } : d,
        ),
      );
    }
  }

  function selecionarCidade(cidade: CidadeBusca) {
    if (!cidadeContexto) return;
    if (cidadeContexto.tipo === "dia") {
      adicionarCidadeAoDia(cidadeContexto.id, cidade);
      setCidadeBusca("");
    } else {
      const label = formatCidadeLabel(cidade);
      atualizarData(cidadeContexto.id, "cidade_inicio_id", cidade.id);
      atualizarData(cidadeContexto.id, "cidade_inicio_label", label);
      setCidadeBusca(label);
    }
    setMostrarSugestoesCidade(false);
    setResultadosCidade([]);
    setErroCidadeBusca(null);
  }

  function formatarLabelData(d: CircuitoData) {
    if (cidadeContexto?.tipo === "data" && cidadeContexto.id === d.tempId) {
      return cidadeBusca;
    }
    return d.cidade_inicio_label || "";
  }

  async function resolverTipoCircuitoId() {
    const { data, error } = await supabase
      .from("tipo_produtos")
      .select("id, nome, tipo")
      .or("nome.ilike.%circuito%,tipo.ilike.%circuito%")
      .order("nome", { ascending: true });

    if (!error && data?.length) {
      const match =
        data.find((t: any) => normalizeText(t.nome) === "circuito") ||
        data.find((t: any) => normalizeText(t.tipo) === "circuito") ||
        data[0];
      return match?.id || null;
    }

    const payload = {
      nome: "Circuito",
      tipo: "Circuito",
      regra_comissionamento: "geral",
      soma_na_meta: true,
      ativo: true,
    };

    const { data: criado, error: insertErr } = await supabase
      .from("tipo_produtos")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (insertErr) {
      console.error("Erro ao criar tipo Circuito:", insertErr);
      return null;
    }

    return criado?.id || null;
  }

  async function sincronizarProdutoCircuito(circuitoId: string, nome: string, ativoCircuito: boolean) {
    const tipoId = await resolverTipoCircuitoId();
    if (!tipoId) {
      throw new Error("Nao foi possivel encontrar/criar o tipo de produto Circuito.");
    }

    const { data: existente, error } = await supabase
      .from("produtos")
      .select("id")
      .eq("circuito_id", circuitoId)
      .maybeSingle();
    if (error) throw error;

    const nomeNormalizado = titleCaseWithExceptions(nome);
    const payload = {
      nome: nomeNormalizado,
      destino: nomeNormalizado,
      cidade_id: null,
      tipo_produto: tipoId,
      informacoes_importantes: null,
      atracao_principal: null,
      melhor_epoca: null,
      duracao_sugerida: null,
      nivel_preco: null,
      imagem_url: null,
      ativo: ativoCircuito,
      fornecedor_id: null,
      todas_as_cidades: true,
      circuito_id: circuitoId,
    };

    if (existente?.id) {
      const { error: updateErr } = await supabase.from("produtos").update(payload).eq("id", existente.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase.from("produtos").insert(payload);
      if (insertErr) throw insertErr;
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (permissao === "view") {
      setErro("Voce nao tem permissao para salvar circuitos.");
      return;
    }

    if (!form.nome.trim()) {
      setErro("Nome do circuito e obrigatorio.");
      return;
    }

    if (dias.length === 0) {
      setErro("Inclua ao menos um dia no roteiro.");
      return;
    }

    const numeros = dias.map((d) => d.dia_numero).filter((n) => Number.isFinite(n) && n > 0);
    if (numeros.length !== dias.length) {
      setErro("Informe um numero de dia valido para todos os itens.");
      return;
    }
    const numerosSet = new Set(numeros);
    if (numerosSet.size !== numeros.length) {
      setErro("Nao e possivel repetir o numero do dia.");
      return;
    }

    const diasSemDescricao = dias
      .map((d, idx) => (!d.descricao.trim() ? idx + 1 : null))
      .filter(Boolean) as number[];
    if (diasSemDescricao.length > 0) {
      setErro(`Preencha a descricao dos dias: ${diasSemDescricao.join(", ")}.`);
      return;
    }

    const datasValidas = datas.filter((d) => {
      return (
        d.data_inicio ||
        d.cidade_inicio_id ||
        d.dias_extra_antes !== "0" ||
        d.dias_extra_depois !== "0"
      );
    });

    for (const item of datasValidas) {
      if (!item.data_inicio) {
        setErro("Informe a data de inicio em todas as datas cadastradas.");
        return;
      }
      if (item.cidade_inicio_label && !item.cidade_inicio_id) {
        setErro("Selecione a cidade de inicio usando a busca.");
        return;
      }
      const antes = Number(item.dias_extra_antes || 0);
      const depois = Number(item.dias_extra_depois || 0);
      if (Number.isNaN(antes) || Number.isNaN(depois) || antes < 0 || depois < 0) {
        setErro("Dias extras devem ser numeros validos (0 ou maior).");
        return;
      }
    }

    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);

      const payload = {
        nome: titleCaseWithExceptions(form.nome.trim()),
        codigo: form.codigo.trim() || null,
        operador: titleCaseWithExceptions(form.operador.trim()) || null,
        resumo: form.resumo.trim() || null,
        ativo: form.ativo,
      };

      let circuitoId = editandoId;
      if (circuitoId) {
        const { error: updateErr } = await supabase.from("circuitos").update(payload).eq("id", circuitoId);
        if (updateErr) throw updateErr;
      } else {
        const { data, error } = await supabase.from("circuitos").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        circuitoId = data?.id || null;
      }

      if (!circuitoId) {
        throw new Error("Nao foi possivel identificar o circuito salvo.");
      }

      const diasPayload = dias.map((dia) => ({
        ...(dia.id ? { id: dia.id } : {}),
        circuito_id: circuitoId,
        dia_numero: dia.dia_numero,
        titulo: dia.titulo.trim() || null,
        descricao: dia.descricao.trim(),
      }));

      const { data: diasSalvos, error: diasErr } = await supabase
        .from("circuito_dias")
        .upsert(diasPayload)
        .select("id, dia_numero");
      if (diasErr) throw diasErr;

      const idsDias = (diasSalvos || []).map((d: any) => d.id);
      if (idsDias.length) {
        const { error: deleteCidadesErr } = await supabase
          .from("circuito_dias_cidades")
          .delete()
          .in("circuito_dia_id", idsDias);
        if (deleteCidadesErr) throw deleteCidadesErr;
      }

      const mapDiaId = new Map<number, string>();
      (diasSalvos || []).forEach((d: any) => {
        mapDiaId.set(d.dia_numero, d.id);
      });

      const cidadesPayload: { circuito_dia_id: string; cidade_id: string; ordem: number }[] = [];
      dias.forEach((dia) => {
        const diaId = mapDiaId.get(dia.dia_numero);
        if (!diaId) return;
        dia.cidades.forEach((cidade, idx) => {
          cidadesPayload.push({
            circuito_dia_id: diaId,
            cidade_id: cidade.id,
            ordem: idx + 1,
          });
        });
      });

      if (cidadesPayload.length) {
        const { error: cidadesErr } = await supabase.from("circuito_dias_cidades").insert(cidadesPayload);
        if (cidadesErr) throw cidadesErr;
      }

      if (idsDias.length) {
        const idsDiasSql = `(${idsDias.map((id) => `"${id}"`).join(",")})`;
        const { error: deleteDiasErr } = await supabase
          .from("circuito_dias")
          .delete()
          .eq("circuito_id", circuitoId)
          .not("id", "in", idsDiasSql);
        if (deleteDiasErr) throw deleteDiasErr;
      }

      const datasPayload = datasValidas.map((d) => ({
        ...(d.id ? { id: d.id } : {}),
        circuito_id: circuitoId,
        data_inicio: d.data_inicio,
        cidade_inicio_id: d.cidade_inicio_id || null,
        dias_extra_antes: Number(d.dias_extra_antes || 0),
        dias_extra_depois: Number(d.dias_extra_depois || 0),
      }));

      if (datasPayload.length > 0) {
        const { data: datasSalvas, error: datasErr } = await supabase
          .from("circuito_datas")
          .upsert(datasPayload)
          .select("id");
        if (datasErr) throw datasErr;

        if (datasSalvas?.length) {
          const idsDatas = datasSalvas.map((d: any) => d.id);
          const idsDatasSql = `(${idsDatas.map((id: string) => `"${id}"`).join(",")})`;
          const { error: deleteDatasErr } = await supabase
            .from("circuito_datas")
            .delete()
            .eq("circuito_id", circuitoId)
            .not("id", "in", idsDatasSql);
          if (deleteDatasErr) throw deleteDatasErr;
        }
      } else {
        const { error: deleteDatasErr } = await supabase.from("circuito_datas").delete().eq("circuito_id", circuitoId);
        if (deleteDatasErr) throw deleteDatasErr;
      }

      await sincronizarProdutoCircuito(circuitoId, payload.nome, payload.ativo);

      setSucesso(editandoId ? "Circuito atualizado com sucesso." : "Circuito criado com sucesso.");
      await carregarCircuitos();
      fecharFormulario();
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error?.message || "";
      setErro(`Erro ao salvar circuito.${msg ? ` Detalhes: ${msg}` : ""}`);
    } finally {
      setSalvando(false);
    }
  }

  async function iniciarEdicao(circuitoId: string) {
    try {
      setErro(null);
      setSucesso(null);
      setMostrarFormulario(true);
      setEditandoId(circuitoId);

      const [{ data: circuitoData, error: circuitoErr }, diasResp, datasResp] = await Promise.all([
        supabase
          .from("circuitos")
          .select("id, nome, codigo, operador, resumo, ativo")
          .eq("id", circuitoId)
          .maybeSingle(),
        supabase
          .from("circuito_dias")
          .select("id, dia_numero, titulo, descricao, cidades:circuito_dias_cidades (cidade_id, cidades (id, nome))")
          .eq("circuito_id", circuitoId)
          .order("dia_numero", { ascending: true }),
        supabase
          .from("circuito_datas")
          .select(
            "id, data_inicio, cidade_inicio_id, dias_extra_antes, dias_extra_depois, cidade_inicio:cidades!cidade_inicio_id (id, nome)"
          )
          .eq("circuito_id", circuitoId)
          .order("data_inicio", { ascending: true }),
      ]);

      if (circuitoErr) throw circuitoErr;
      if (diasResp.error) throw diasResp.error;
      if (datasResp.error) throw datasResp.error;

      setForm({
        nome: circuitoData?.nome || "",
        codigo: circuitoData?.codigo || "",
        operador: circuitoData?.operador || "",
        resumo: circuitoData?.resumo || "",
        ativo: circuitoData?.ativo ?? true,
      });

      const diasFormatados: CircuitoDia[] = (diasResp.data || []).map((dia: any) => ({
        id: dia.id,
        tempId: gerarIdTemporario(),
        dia_numero: dia.dia_numero,
        titulo: dia.titulo || "",
        descricao: dia.descricao || "",
        cidades: (dia.cidades || [])
          .map((c: any) => {
            const nome = c?.cidades?.nome || "";
            return { id: c.cidade_id, nome, label: nome };
          })
          .filter((c: CidadeSelecionada) => c.nome),
      }));
      setDias(diasFormatados);

      const datasFormatadas: CircuitoData[] = (datasResp.data || []).map((d: any) => ({
        id: d.id,
        tempId: gerarIdTemporario(),
        data_inicio: d.data_inicio ? String(d.data_inicio).slice(0, 10) : "",
        cidade_inicio_id: d.cidade_inicio_id || "",
        cidade_inicio_label: d.cidade_inicio?.nome || "",
        dias_extra_antes: String(d.dias_extra_antes ?? 0),
        dias_extra_depois: String(d.dias_extra_depois ?? 0),
      }));
      setDatas(datasFormatadas);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar circuito.");
    }
  }

  async function excluir(circuitoId: string) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir circuitos.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este circuito?")) return;

    try {
      setExcluindoId(circuitoId);
      setErro(null);
      await supabase.from("circuitos").delete().eq("id", circuitoId);
      await carregarCircuitos();
    } catch (e) {
      console.error(e);
      setErro("Nao foi possivel excluir o circuito.");
    } finally {
      setExcluindoId(null);
    }
  }

  async function abrirPreview(circuitoId: string) {
    try {
      setPreviewOpen(true);
      setPreviewLoading(true);
      setPreviewErro(null);
      setPreviewData(null);

      const [circuitoResp, diasResp, datasResp] = await Promise.all([
        supabase
          .from("circuitos")
          .select("id, nome, codigo, operador, resumo, ativo, created_at")
          .eq("id", circuitoId)
          .maybeSingle(),
        supabase
          .from("circuito_dias")
          .select("dia_numero, titulo, descricao, cidades:circuito_dias_cidades (ordem, cidades (nome))")
          .eq("circuito_id", circuitoId)
          .order("dia_numero", { ascending: true }),
        supabase
          .from("circuito_datas")
          .select(
            "data_inicio, dias_extra_antes, dias_extra_depois, cidade_inicio:cidades!cidade_inicio_id (nome)"
          )
          .eq("circuito_id", circuitoId)
          .order("data_inicio", { ascending: true }),
      ]);

      if (circuitoResp.error) throw circuitoResp.error;
      if (diasResp.error) throw diasResp.error;
      if (datasResp.error) throw datasResp.error;

      const diasFormatados = (diasResp.data || []).map((dia: any) => ({
        dia_numero: dia.dia_numero,
        titulo: dia.titulo || null,
        descricao: dia.descricao || "",
        cidades: (dia.cidades || [])
          .sort((a: any, b: any) => (a.ordem || 0) - (b.ordem || 0))
          .map((c: any) => c?.cidades?.nome)
          .filter(Boolean),
      }));

      const datasFormatadas = (datasResp.data || []).map((d: any) => ({
        data_inicio: d.data_inicio ? String(d.data_inicio).slice(0, 10) : "",
        cidade_inicio_nome: d.cidade_inicio?.nome || null,
        dias_extra_antes: d.dias_extra_antes ?? 0,
        dias_extra_depois: d.dias_extra_depois ?? 0,
      }));

      setPreviewData({
        circuito: circuitoResp.data as Circuito,
        dias: diasFormatados,
        datas: datasFormatadas,
      });
    } catch (e) {
      console.error(e);
      setPreviewErro("Nao foi possivel carregar o preview do circuito.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function fecharPreview() {
    setPreviewOpen(false);
    setPreviewData(null);
    setPreviewErro(null);
  }

  async function resolverCidadePorNome(nome: string) {
    const chave = normalizeText(nome);
    const cache = cidadesCacheRef.current;
    if (cache.has(chave)) return cache.get(chave) || null;

    try {
      const { data, error } = await supabase.rpc("buscar_cidades", { q: nome, limite: 5 });
      if (!error && data?.length) {
        const match =
          (data as CidadeBusca[]).find((c) => normalizeText(c.nome) === chave) ||
          (data as CidadeBusca[])[0];
        const label = formatCidadeLabel(match);
        const selecionada = { id: match.id, nome: match.nome, label };
        cache.set(chave, selecionada);
        return selecionada;
      }
      if (error) {
        console.error("Erro ao buscar cidades (RPC):", error);
      }
    } catch (err) {
      console.error("Erro ao buscar cidades:", err);
    }

    cache.set(chave, null);
    return null;
  }

  async function preencherCidadesImportadas(diasImportados: CircuitoDia[]) {
    const diasComCidades = await Promise.all(
      diasImportados.map(async (dia) => {
        const candidatos = extrairCidadesDoTitulo(dia.titulo);
        if (candidatos.length === 0) return dia;
        const resolvidas = await Promise.all(candidatos.map((nome) => resolverCidadePorNome(nome)));
        const cidades = resolvidas.filter(Boolean) as CidadeSelecionada[];
        if (!cidades.length) return dia;
        return { ...dia, cidades };
      }),
    );

    setDias(diasComCidades);
  }

  async function extrairTextoPdf(file: File) {
    const buffer = await file.arrayBuffer();
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const linhas: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const items = content.items as Array<{ str: string; transform: number[] }>;
      const linhasMap = new Map<number, { y: number; items: Array<{ x: number; str: string }> }>();

      items.forEach((item) => {
        const y = Math.round(item.transform[5]);
        const x = item.transform[4];
        if (!linhasMap.has(y)) {
          linhasMap.set(y, { y, items: [] });
        }
        linhasMap.get(y)!.items.push({ x, str: item.str });
      });

      const ordenadas = Array.from(linhasMap.values())
        .sort((a, b) => b.y - a.y)
        .map((linha) => {
          const texto = linha.items
            .sort((a, b) => a.x - b.x)
            .map((i) => i.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          return texto;
        })
        .filter(Boolean);

      linhas.push(...ordenadas, "");
    }

    return linhas.join("\n");
  }

  async function importarPdf(file: File) {
    try {
      setImportandoPdf(true);
      setErroImportacao(null);

      const texto = await extrairTextoPdf(file);
      const parsed = parseCircuitoTexto(texto);

      if (!parsed.circuito && parsed.dias.length === 0) {
        setErroImportacao("Nao foi possivel identificar o circuito no PDF.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        nome: parsed.circuito ? titleCaseWithExceptions(parsed.circuito) : prev.nome,
        codigo: parsed.codigo || prev.codigo,
        operador: parsed.operador ? titleCaseWithExceptions(parsed.operador) : prev.operador,
      }));

      if (parsed.dias.length > 0) {
        const diasImportados = parsed.dias.map((dia) => ({
            tempId: gerarIdTemporario(),
            dia_numero: dia.dia,
            titulo: dia.titulo,
            descricao: dia.descricao,
            cidades: [],
          }));
        setDias(diasImportados);
        await preencherCidadesImportadas(diasImportados);
      }
      setSucesso(null);
    } catch (e) {
      console.error(e);
      setErroImportacao("Erro ao importar o PDF. Verifique o arquivo e tente novamente.");
    } finally {
      setImportandoPdf(false);
    }
  }

  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!ativo) return <div>Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="circuitos-page">
      {!mostrarFormulario && (
        <>
          {erro && (
            <div className="card-base card-config mb-3">
              <strong>{erro}</strong>
            </div>
          )}
          {sucesso && (
            <div className="card-base card-green mb-3">
              <strong>{sucesso}</strong>
            </div>
          )}

          <div className="card-base card-blue mb-3 list-toolbar-sticky">
            <div className="form-row mobile-stack">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Buscar circuito</label>
                <input
                  className="form-input"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Busque por nome, codigo, operador ou cidade"
                />
              </div>
              {permissao !== "view" && (
                <div className="form-group" style={{ alignItems: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={abrirFormulario}
                    disabled={mostrarFormulario}
                  >
                    Novo circuito
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {mostrarFormulario && (
        <div className="card-base card-blue mb-3">
          <form onSubmit={salvar}>
            <div className="form-row mobile-stack">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Importar roteiro (PDF)</label>
                <input
                  ref={pdfInputRef}
                  className="sr-only"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPdfSelecionado(file.name);
                      importarPdf(file);
                    }
                    if (!file) {
                      setPdfSelecionado("");
                    }
                    e.currentTarget.value = "";
                  }}
                  disabled={permissao === "view" || importandoPdf}
                />
                <div className="mobile-stack-buttons" style={{ justifyContent: "flex-start" }}>
                  <button
                    type="button"
                    className="btn btn-light w-full sm:w-auto"
                    onClick={() => pdfInputRef.current?.click()}
                    disabled={permissao === "view" || importandoPdf}
                  >
                    Escolher arquivo
                  </button>
                </div>
                <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
                  {pdfSelecionado || "Nenhum arquivo escolhido"}
                </div>
                <small style={{ color: "#64748b" }}>
                  Importa Operador, Codigo, Circuito e o roteiro dia a dia (datas finais sao ignoradas).
                </small>
                {importandoPdf && <div style={{ fontSize: 12, color: "#6b7280" }}>Importando PDF...</div>}
                {erroImportacao && !importandoPdf && (
                  <div style={{ fontSize: 12, color: "#dc2626" }}>{erroImportacao}</div>
                )}
              </div>
            </div>

            <div className="form-row mobile-stack">
              <div className="form-group" style={{ flex: "1 1 320px", minWidth: 240 }}>
                <label className="form-label">Circuito *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  placeholder="Nome do circuito"
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group" style={{ minWidth: 180 }}>
                <label className="form-label">Codigo</label>
                <input
                  className="form-input"
                  value={form.codigo}
                  onChange={(e) => handleChange("codigo", e.target.value)}
                  placeholder="Ex: P25001"
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group" style={{ flex: "1 1 220px", minWidth: 200 }}>
                <label className="form-label">Operador</label>
                <input
                  className="form-input"
                  value={form.operador}
                  onChange={(e) => handleChange("operador", e.target.value)}
                  onBlur={(e) => handleChange("operador", titleCaseWithExceptions(e.target.value))}
                  placeholder="Operador do circuito"
                  disabled={permissao === "view"}
                />
              </div>
            </div>

            <div className="form-row mobile-stack">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Resumo</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={form.resumo}
                  onChange={(e) => handleChange("resumo", e.target.value)}
                  placeholder="Resumo do circuito"
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group sm:max-w-[160px]">
                <label className="form-label">Ativo</label>
                <select
                  className="form-select"
                  value={form.ativo ? "true" : "false"}
                  onChange={(e) => handleChange("ativo", e.target.value === "true")}
                  disabled={permissao === "view"}
                >
                  <option value="true">Sim</option>
                  <option value="false">Nao</option>
                </select>
              </div>
            </div>

            <div className="mt-2 mobile-stack-buttons" style={{ justifyContent: "space-between" }}>
              <div style={{ color: "#64748b" }}>Datas de inicio</div>
              <button
                type="button"
                className="btn btn-light w-full sm:w-auto"
                onClick={adicionarData}
                disabled={permissao === "view"}
              >
                Adicionar data
              </button>
            </div>

            <div className="table-container overflow-x-auto" style={{ marginTop: 12 }}>
              <table className="table-default table-mobile-cards min-w-[760px]">
                <thead>
                  <tr>
                    <th>Data de inicio</th>
                    <th>Cidade de inicio</th>
                    <th>Dias antes</th>
                    <th>Dias depois</th>
                    <th className="th-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {datas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-mobile-center">
                        Nenhuma data informada.
                      </td>
                    </tr>
                  )}
                  {datas.map((item) => (
                    <tr key={item.tempId}>
                      <td data-label="Data de inicio">
                        <input
                          type="date"
                          className="form-input"
                          value={item.data_inicio}
                          onChange={(e) => atualizarData(item.tempId, "data_inicio", e.target.value)}
                          disabled={permissao === "view"}
                        />
                      </td>
                      <td data-label="Cidade de inicio" style={{ minWidth: 220 }}>
                        <input
                          className="form-input"
                          placeholder="Buscar cidade"
                          value={formatarLabelData(item)}
                          onChange={(e) => handleCidadeInput(item.tempId, "data", e.target.value)}
                          onFocus={() => {
                            setCidadeContexto({ tipo: "data", id: item.tempId });
                            setCidadeBusca(item.cidade_inicio_label || "");
                            setMostrarSugestoesCidade(true);
                          }}
                          onBlur={() => setTimeout(() => setMostrarSugestoesCidade(false), 150)}
                          disabled={permissao === "view"}
                        />
                        {cidadeContexto?.tipo === "data" && cidadeContexto.id === item.tempId && (
                          <>
                            {buscandoCidade && (
                              <div style={{ fontSize: 12, color: "#6b7280" }}>Buscando...</div>
                            )}
                            {erroCidadeBusca && !buscandoCidade && (
                              <div style={{ fontSize: 12, color: "#dc2626" }}>{erroCidadeBusca}</div>
                            )}
                            {mostrarSugestoesCidade && (
                              <div
                                className="card-base"
                                style={{
                                  marginTop: 4,
                                  maxHeight: 160,
                                  overflowY: "auto",
                                  padding: 6,
                                  border: "1px solid #e5e7eb",
                                }}
                              >
                                {resultadosCidade.length === 0 && !buscandoCidade && cidadeBusca.trim().length >= 2 && (
                                  <div style={{ padding: "4px 6px", color: "#6b7280" }}>
                                    Nenhuma cidade encontrada.
                                  </div>
                                )}
                                {resultadosCidade.map((cidade) => (
                                  <button
                                    key={cidade.id}
                                    type="button"
                                    className="btn btn-light"
                                    style={{
                                      width: "100%",
                                      justifyContent: "flex-start",
                                      marginBottom: 4,
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selecionarCidade(cidade);
                                    }}
                                  >
                                    {formatCidadeLabel(cidade)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td data-label="Dias antes" style={{ maxWidth: 120 }}>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          value={item.dias_extra_antes}
                          onChange={(e) => atualizarData(item.tempId, "dias_extra_antes", e.target.value)}
                          disabled={permissao === "view"}
                        />
                      </td>
                      <td data-label="Dias depois" style={{ maxWidth: 120 }}>
                        <input
                          className="form-input"
                          type="number"
                          min={0}
                          value={item.dias_extra_depois}
                          onChange={(e) => atualizarData(item.tempId, "dias_extra_depois", e.target.value)}
                          disabled={permissao === "view"}
                        />
                      </td>
                      <td data-label="Ações">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => removerData(item.tempId)}
                          disabled={permissao === "view"}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 mobile-stack-buttons" style={{ justifyContent: "space-between" }}>
              <div style={{ color: "#64748b" }}>Roteiro dia a dia</div>
              <button
                type="button"
                className="btn btn-light w-full sm:w-auto"
                onClick={adicionarDia}
                disabled={permissao === "view"}
              >
                Adicionar dia
              </button>
            </div>

            {dias.map((dia, idx) => {
              const isContextoDia = cidadeContexto?.tipo === "dia" && cidadeContexto.id === dia.tempId;
              const isDragOver = dragOverDiaId === dia.tempId;
              const isDragging = draggingDiaId === dia.tempId;
              const podeArrastar = permissao !== "view" && dias.length > 1;
              return (
                <div
                  key={dia.tempId}
                  className="card-base mb-2"
                  style={{
                    border: isDragOver ? "2px dashed #2563eb" : "1px solid #e5e7eb",
                    marginTop: 12,
                    opacity: isDragging ? 0.7 : 1,
                  }}
                  onDragOver={(e) => {
                    if (podeArrastar) handleDragOverDia(e, dia.tempId);
                  }}
                  onDrop={(e) => {
                    if (podeArrastar) {
                      e.preventDefault();
                      handleDropDia(e, dia.tempId);
                    }
                  }}
                  onDragLeave={() => {
                    if (isDragOver) setDragOverDiaId(null);
                  }}
                >
                  <div className="form-row mobile-stack" style={{ marginTop: 12 }}>
                    <div className="form-group" style={{ alignItems: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-light"
                        draggable={podeArrastar}
                        disabled={!podeArrastar}
                        onDragStart={(e) => {
                          if (!podeArrastar) return;
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", dia.tempId);
                          iniciarDragDia(dia.tempId);
                        }}
                        onDragEnd={finalizarDragDia}
                        title="Arraste para reordenar"
                        style={{
                          cursor: podeArrastar ? "grab" : "not-allowed",
                          padding: "6px 10px",
                          fontSize: 12,
                        }}
                      >
                        Mover
                      </button>
                    </div>
                    <div className="form-group" style={{ maxWidth: 120 }}>
                      <label className="form-label">Dia</label>
                      <input
                        className="form-input"
                        type="number"
                        min={1}
                        value={dia.dia_numero}
                        onChange={(e) => atualizarDia(dia.tempId, "dia_numero", Number(e.target.value))}
                        disabled={permissao === "view"}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Titulo</label>
                      <input
                        className="form-input"
                        value={dia.titulo}
                        onChange={(e) => atualizarDia(dia.tempId, "titulo", e.target.value)}
                        placeholder="Ex: Lisboa e Fatima"
                        disabled={permissao === "view"}
                      />
                    </div>
                    <div className="form-group" style={{ alignItems: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => removerDia(dia.tempId)}
                        disabled={permissao === "view" || dias.length === 1}
                      >
                        Remover dia
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Descricao *</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={dia.descricao}
                      onChange={(e) => atualizarDia(dia.tempId, "descricao", e.target.value)}
                      placeholder={`Descricao do dia ${idx + 1}`}
                      disabled={permissao === "view"}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cidades</label>
                    <div className="flex flex-wrap gap-2" style={{ marginBottom: 6 }}>
                      {dia.cidades.length === 0 && (
                        <span style={{ color: "#64748b", fontSize: 12 }}>Nenhuma cidade adicionada.</span>
                      )}
                      {dia.cidades.map((cidade) => (
                        <span
                          key={cidade.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid #e5e7eb",
                            background: "#f8fafc",
                            fontSize: 12,
                          }}
                        >
                          {cidade.label}
                          <button
                            type="button"
                            className="btn btn-light"
                            style={{ padding: "2px 6px" }}
                            onClick={() => removerCidadeDoDia(dia.tempId, cidade.id)}
                            disabled={permissao === "view"}
                          >
                            x
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      className="form-input"
                      placeholder="Buscar cidade"
                      value={isContextoDia ? cidadeBusca : ""}
                      onChange={(e) => handleCidadeInput(dia.tempId, "dia", e.target.value)}
                      onFocus={() => {
                        setCidadeContexto({ tipo: "dia", id: dia.tempId });
                        setCidadeBusca("");
                        setMostrarSugestoesCidade(true);
                      }}
                      onBlur={() => setTimeout(() => setMostrarSugestoesCidade(false), 150)}
                      disabled={permissao === "view"}
                    />
                    {isContextoDia && (
                      <>
                        {buscandoCidade && <div style={{ fontSize: 12, color: "#6b7280" }}>Buscando...</div>}
                        {erroCidadeBusca && !buscandoCidade && (
                          <div style={{ fontSize: 12, color: "#dc2626" }}>{erroCidadeBusca}</div>
                        )}
                        {mostrarSugestoesCidade && (
                          <div
                            className="card-base"
                            style={{
                              marginTop: 4,
                              maxHeight: 160,
                              overflowY: "auto",
                              padding: 6,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {resultadosCidade.length === 0 && !buscandoCidade && cidadeBusca.trim().length >= 2 && (
                              <div style={{ padding: "4px 6px", color: "#6b7280" }}>
                                Nenhuma cidade encontrada.
                              </div>
                            )}
                            {resultadosCidade.map((cidade) => (
                              <button
                                key={cidade.id}
                                type="button"
                                className="btn btn-light"
                                style={{
                                  width: "100%",
                                  justifyContent: "flex-start",
                                  marginBottom: 4,
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  selecionarCidade(cidade);
                                }}
                              >
                                {formatCidadeLabel(cidade)}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {dias.length === 0 && (
              <div className="card-base empty-mobile-center" style={{ marginTop: 12 }}>
                Nenhum dia cadastrado.
              </div>
            )}

            <div className="mt-2 mobile-stack-buttons" style={{ justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alteracoes" : "Salvar circuito"}
              </button>
              <button type="button" className="btn btn-light" onClick={fecharFormulario} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!mostrarFormulario && (
        <div
          className="table-container overflow-x-auto"
          style={{ maxHeight: "65vh", overflowY: "auto" }}
        >
          <table className="table-default table-header-blue table-mobile-cards min-w-[840px]">
            <thead>
              <tr>
                <th>Circuito</th>
                <th>Codigo</th>
                <th>Operador</th>
                <th>Status</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5}>Carregando...</td>
                </tr>
              )}
              {!loading && circuitosExibidos.length === 0 && (
                <tr>
                  <td colSpan={5}>Nenhum circuito encontrado.</td>
                </tr>
              )}
              {!loading &&
                circuitosExibidos.map((circuito) => (
                  <tr key={circuito.id}>
                    <td data-label="Circuito">{circuito.nome}</td>
                    <td data-label="Codigo">{circuito.codigo || "-"}</td>
                    <td data-label="Operador">{circuito.operador || "-"}</td>
                    <td data-label="Status">{circuito.ativo ? "Ativo" : "Inativo"}</td>
                    <td className="th-actions" data-label="Ações">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => iniciarEdicao(circuito.id)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => abrirPreview(circuito.id)}
                          title="Visualizar"
                        >
                          👁️
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-danger"
                          onClick={() => excluir(circuito.id)}
                          disabled={excluindoId === circuito.id}
                          title="Excluir"
                        >
                          {excluindoId === circuito.id ? "..." : "🗑️"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {previewOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: 980, width: "95vw" }}>
            <div className="modal-header">
              <div className="modal-title">Visualizacao do circuito</div>
              <button className="btn-ghost" onClick={fecharPreview} type="button">
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: "grid", gap: 16 }}>
              {previewLoading && <div>Carregando preview...</div>}
              {previewErro && <div style={{ color: "#dc2626" }}>{previewErro}</div>}
              {!previewLoading && previewData && (
                <div className="card-base" style={{ border: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{previewData.circuito.nome}</h3>
                      <div style={{ color: "#64748b", fontSize: 14 }}>
                        {previewData.circuito.operador ? `Operador: ${previewData.circuito.operador}` : null}
                        {previewData.circuito.operador && previewData.circuito.codigo ? " • " : null}
                        {previewData.circuito.codigo ? `Codigo: ${previewData.circuito.codigo}` : null}
                      </div>
                    </div>

                    {previewData.circuito.resumo && (
                      <div>
                        <strong>Resumo</strong>
                        <div style={{ whiteSpace: "pre-line" }}>{previewData.circuito.resumo}</div>
                      </div>
                    )}

                    {previewData.datas.length > 0 && (
                      <div>
                        <strong>Datas de inicio</strong>
                        <ul style={{ marginTop: 6, display: "grid", gap: 4 }}>
                          {previewData.datas.map((d, idx) => (
                            <li key={`${d.data_inicio}-${idx}`}>
                              {d.data_inicio || "-"}
                              {d.cidade_inicio_nome ? ` - ${d.cidade_inicio_nome}` : ""}
                              {(d.dias_extra_antes || d.dias_extra_depois) && (
                                <span style={{ color: "#64748b" }}>
                                  {` (Dias antes: ${d.dias_extra_antes || 0}, Dias depois: ${d.dias_extra_depois || 0})`}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <strong>Itinerario do circuito</strong>
                      <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                        {previewData.dias.map((dia) => (
                          <div key={dia.dia_numero}>
                            <div style={{ fontWeight: 600 }}>
                              Dia {dia.dia_numero}
                              {dia.titulo ? `: ${dia.titulo}` : ""}
                            </div>
                            {dia.cidades.length > 0 && (
                              <div style={{ color: "#64748b", fontSize: 13 }}>
                                Cidades: {dia.cidades.join(" • ")}
                              </div>
                            )}
                            <div style={{ whiteSpace: "pre-line", marginTop: 4 }}>{dia.descricao}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-light" onClick={fecharPreview} type="button">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
