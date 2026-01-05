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
  const [valorMin, setValorMin] = useState<string>("");
  const [valorMax, setValorMax] = useState<string>("");

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
      if (valorMin) {
        query = query.gte("valor", parseFloat(valorMin));
      }
      if (valorMax) {
        query = query.lte("valor", parseFloat(valorMax));
      }

      const { data, error } = await query;
      if (error) throw error;
      const listaNova = (data || []) as Orcamento[];
      setLista(listaNova);
      const ids = listaNova.map((o) => o.id).filter(Boolean);
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
      "destino",
      "produto",
      "status",
      "valor",
      "data_orcamento",
      "data_viagem",
      "numero_venda",
    ];
    const linhas = filtrados.map((o) => [
      o.id,
      o.clientes?.nome || "",
      o.destinos?.nome || "",
      o.produtos?.nome || "",
      o.status || "",
      o.valor ?? "",
      o.data_orcamento || "",
      o.data_viagem || "",
      o.numero_venda || "",
    ]);
    const csv = [header.join(","), ...linhas.map((l) => l.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orcamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDragStart(id: string) {
    setDraggingId(id);
    const item = lista.find((o) => o.id === id);
    if (item?.status) setDraggingStatus(item.status as StatusOrcamento);
  }

  async function handleDrop(status: StatusOrcamento) {
    if (!draggingId) return;
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
    const confirmar = window.confirm("Converter este orçamento em venda?");
    if (!confirmar) return;
    try {
      setSucesso(null);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");
      const hoje = new Date();
      const numero = gerarNumeroVenda(hoje);
      const dataLanc = hoje.toISOString().slice(0, 10);

      const { data: vendaData, error: vendaErr } = await supabase
        .from("vendas")
        .insert({
          vendedor_id: userId,
          cliente_id: o.cliente_id,
          destino_id: o.destino_id,
          produto_id: o.produto_id,
          data_lancamento: dataLanc,
          data_embarque: o.data_viagem || null,
          valor_total: o.valor || 0,
          status: "aberto",
          numero_venda: numero,
          notas: o.notas,
        })
        .select("id, numero_venda")
        .maybeSingle();

      if (vendaErr) throw vendaErr;

      if (vendaData?.id && o.produto_id) {
        await supabase.from("vendas_recibos").insert({
          venda_id: vendaData.id,
          produto_id: o.produto_id,
          numero_recibo: numero,
          valor_total: o.valor || 0,
          valor_taxas: 0,
        });
      }

      await supabase
        .from("orcamentos")
        .update({
          status: "fechado",
          notas: `${
            o.notas ? `${o.notas}\n` : ""
          }Convertido para venda ${numero}`,
        })
        .eq("id", o.id);

      setSucesso("Orçamento convertido em venda.");
      showToast("Orçamento convertido em venda.", "success");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao converter para venda.");
      showToast("Erro ao converter para venda.", "error");
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
          <div className="form-group">
            <label className="form-label">Valor min</label>
            <input
              className="form-input"
              type="number"
              value={valorMin}
              onChange={(e) => setValorMin(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Valor max</label>
            <input
              className="form-input"
              type="number"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
            />
          </div>
          {podeCriar && (
            <div
              className="form-group"
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
            >
              <span style={{ visibility: "hidden" }}>botão</span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.dispatchEvent(new CustomEvent("abrir-formulario-orcamento"))}
                disabled={formAberto}
              >
                Adicionar orçamento
              </button>
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
              setValorMin("");
              setValorMax("");
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
                <th>Destino</th>
                <th>Produto</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Valor</th>
                <th style={{ textAlign: "center" }}>Data viagem</th>
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
                      <td>{o.data_orcamento?.slice(0, 10) || "—"}</td>
                      <td>{o.clientes?.nome || "—"}</td>
                      <td>{o.destinos?.nome || "—"}</td>
                      <td>{o.produtos?.nome || "—"}</td>
                      <td style={{ textTransform: "capitalize", textAlign: "center" }}>
                        <select
                          className="form-select"
                          value={o.status || ""}
                          onChange={(e) => alterarStatus(o.id, e.target.value as StatusOrcamento)}
                          disabled={salvandoStatus === o.id}
                        >
                          <option value="novo">Novo</option>
                          <option value="enviado">Enviado</option>
                          <option value="negociando">Negociando</option>
                          <option value="fechado">Fechado</option>
                          <option value="perdido">Perdido</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {o.valor
                          ? o.valor.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })
                          : "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>{o.data_viagem || "—"}</td>
                      <td style={{ textAlign: "center", fontSize: "0.85rem", color: "#475569" }}>
                        {ultima?.tipo || "—"}
                        {ultima?.created_at ? ` • ${new Date(ultima.created_at).toLocaleDateString("pt-BR")}` : ""}
                        {ultima?.mensagem && (
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {resumoMensagem(ultima.mensagem)}
                          </div>
                        )}
                        {ultima?.anexo_url && (
                          <div>
                            <a
                              href={ultima.anexo_url || ""}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#1d4ed8" }}
                            >
                              Abrir anexo
                            </a>
                          </div>
                        )}
                        {semInteracaoRecente && (
                          <div style={{ color: "#b45309", fontWeight: 700 }}>
                            Sem interação há {Number.isFinite(diasInteracao) ? `${diasInteracao}d` : "—"}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {podeExcluir && (
                          <button
                            className="btn-icon btn-danger"
                            onClick={() => excluirOrcamento(o)}
                            disabled={deletandoOrcamentoId === o.id}
                            style={{ marginRight: 6 }}
                            title="Excluir orçamento"
                          >
                            {deletandoOrcamentoId === o.id ? "..." : "🗑️"}
                          </button>
                        )}
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
                            !o.cliente_id ||
                            !o.destino_id ||
                            o.status === "fechado" ||
                            o.status === "perdido"
                          }
                          title={
                            o.status === "fechado" || o.status === "perdido"
                              ? "Orçamento encerrado"
                              : !o.cliente_id || !o.destino_id
                              ? "Selecione cliente e destino para converter"
                              : "Converter em venda"
                          }
                        >
                          $
                        </button>
                        <button
                          className="btn-icon"
                          aria-label="Histórico de interações"
                          onClick={() => abrirHistorico(o)}
                          style={{ marginLeft: 6 }}
                          title="Ver histórico / registrar interação"
                        >
                          🕒
                        </button>
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

                    return (
                      <div
                        key={`kan-card-${o.id}`}
                        draggable
                        onDragStart={() => handleDragStart(o.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDraggingStatus(null);
                        }}
                        className="card-base"
                        style={{
                          padding: 10,
                          cursor: "grab",
                          border: "1px solid #e2e8f0",
                          background: "#fff",
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
