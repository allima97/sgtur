import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { construirLinkWhatsApp } from "../../lib/whatsapp";
import { normalizeText } from "../../lib/normalizeText";
import DataTable from "../ui/DataTable";
import ConfirmDialog from "../ui/ConfirmDialog";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";
import PaginationControls from "../ui/PaginationControls";

function formatarDataCorretamente(dataString: string | null | undefined): string {
  if (!dataString) return "-";
  const partes = dataString.split("T")[0].split("-");
  if (partes.length !== 3) return "-";
  const [ano, mes, dia] = partes;
  const date = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function isSeguroRecibo(recibo: Recibo) {
  const tipo = recibo.tipo_produtos?.tipo?.toLowerCase() || "";
  const nome = (recibo.tipo_produtos?.nome || recibo.produto_nome || "").toLowerCase();
  return tipo.includes("seguro") || nome.includes("seguro");
}

function obterResumoReciboComplementar(recibo?: Recibo, venda?: Venda) {
  const numero = recibo?.numero_recibo ? `Recibo ${recibo.numero_recibo}` : "Recibo";
  const cliente = venda?.cliente_nome || "Cliente";
  const titulo = `${numero} - ${cliente}`.trim();
  const produto = recibo?.produto_nome || "";
  const destino = venda?.destino_cidade_nome || venda?.destino_nome || "";
  const valor = typeof recibo?.valor_total === "number" ? formatCurrency(recibo.valor_total) : "";
  const detalhes = [produto, destino, valor].filter(Boolean).join(" - ");
  return { titulo, detalhes };
}

function criarChaveBuscaReciboComplementar(recibo?: Recibo, venda?: Venda) {
  const texto = [
    recibo?.numero_recibo,
    recibo?.id,
    recibo?.produto_nome,
    venda?.cliente_nome,
    venda?.destino_nome,
    venda?.destino_cidade_nome,
    venda?.id,
  ]
    .filter(Boolean)
    .join(" ");
  return normalizeText(texto);
}

type Venda = {
  id: string;
  vendedor_id?: string | null;
  cliente_id: string;
  destino_id: string;
  destino_cidade_id?: string | null;
  data_lancamento: string;
  data_embarque: string | null;
  cliente_nome?: string;
  destino_nome?: string;
  destino_cidade_nome?: string;
  clientes?: { whatsapp?: string | null } | null;
};

type Recibo = {
  id: string;
  venda_id: string;
  produto_id: string | null;
  produto_resolvido_id?: string | null;
  numero_recibo: string | null;
  valor_total: number | null;
  valor_taxas: number | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  produto_nome?: string | null;
  tipo_produtos?: { id: string; nome?: string | null; tipo?: string | null } | null;
};

type ReciboComplementar = {
  id: string;
  venda_id: string;
  recibo_id: string;
};

type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

type UserCtx = {
  usuarioId: string;
  papel: Papel;
  vendedorIds: string[];
};

export default function VendasConsultaIsland() {
  // ================================
  // PERMISSÕES
  // ================================
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadPerm = loadingPerms || !ready;

  const podeVer = can("Vendas");
  const podeCriar = can("Vendas", "create");
  const podeEditar = can("Vendas", "edit");
  const podeExcluir = can("Vendas", "delete");
  const isAdmin = can("Vendas", "admin");

  // ================================
  // ESTADOS
  // ================================
  const [userCtx, setUserCtx] = useState<UserCtx | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [recibosComplementares, setRecibosComplementares] = useState<ReciboComplementar[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  // modal
  const [modalVenda, setModalVenda] = useState<Venda | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [excluindoRecibo, setExcluindoRecibo] = useState<string | null>(null);
  const [buscaReciboComplementar, setBuscaReciboComplementar] = useState("");
  const [mostrarComplementares, setMostrarComplementares] = useState(false);
  const [vinculandoComplementar, setVinculandoComplementar] = useState(false);
  const [removendoComplementar, setRemovendoComplementar] = useState<string | null>(null);
  const [confirmVendaCancelamento, setConfirmVendaCancelamento] = useState<Venda | null>(null);
  const [confirmReciboExclusao, setConfirmReciboExclusao] = useState<{ id: string; vendaId: string } | null>(
    null
  );
  const [confirmComplementarRemover, setConfirmComplementarRemover] = useState<ReciboComplementar | null>(
    null
  );
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });
  const [kpiMesAtual, setKpiMesAtual] = useState({
    totalVendas: 0,
    totalTaxas: 0,
    totalLiquido: 0,
    totalSeguro: 0,
  });
  const [kpiMesLoading, setKpiMesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalVendasDb, setTotalVendasDb] = useState(0);
  const [carregouTodos, setCarregouTodos] = useState(false);

  // ================================
  // CONTEXTO DE USUÁRIO (papel/vendedorIds)
  // ================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setPendingOpenId(idParam);
  }, []);

  useEffect(() => {
    async function carregarUserCtx() {
      try {
        setErro(null);
        setLoadingUser(true);

        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuário não autenticado.");
          return;
        }

        const { data: usuarioDb } = await supabase
          .from("users")
          .select("id, user_types(name)")
          .eq("id", userId)
          .maybeSingle();

        const tipoName =
          ((usuarioDb as any)?.user_types as any)?.name ||
          (auth?.user?.user_metadata as any)?.name ||
          "";
        const tipoNorm = String(tipoName || "").toUpperCase();

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
          vendedorIds = []; // sem filtro
        }

        setUserCtx({ usuarioId: userId, papel, vendedorIds });
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUser(false);
      }
    }

    carregarUserCtx();
  }, []);

  // ================================
  // CARREGAR LISTA
  // ================================
  async function carregarResumoMesAtual() {
    if (!podeVer || !userCtx) return;

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioISO = inicioMes.toISOString().slice(0, 10);
    const hojeISO = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
      .toISOString()
      .slice(0, 10);

    try {
      setKpiMesLoading(true);
      let query = supabase
        .from("vendas")
        .select("id, vendedor_id, data_lancamento")
        .gte("data_lancamento", inicioISO)
        .lte("data_lancamento", hojeISO);

      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }

      const { data: vendasMes, error: vendasError } = await query;
      if (vendasError) throw vendasError;

      const vendaIds = (vendasMes || []).map((v: any) => v.id);
      if (vendaIds.length === 0) {
        setKpiMesAtual({ totalVendas: 0, totalTaxas: 0, totalLiquido: 0, totalSeguro: 0 });
        return;
      }

      const { data: recibosData, error: recibosError } = await supabase
        .from("vendas_recibos")
        .select("venda_id, valor_total, valor_taxas, tipo_produtos (id, nome, tipo)")
        .in("venda_id", vendaIds);
      if (recibosError) throw recibosError;

      let totalVendas = 0;
      let totalTaxas = 0;
      let totalSeguro = 0;
      (recibosData || []).forEach((r: any) => {
        totalVendas += r.valor_total || 0;
        totalTaxas += r.valor_taxas || 0;
        if (isSeguroRecibo(r)) totalSeguro += r.valor_total || 0;
      });

      setKpiMesAtual({
        totalVendas,
        totalTaxas,
        totalLiquido: totalVendas - totalTaxas,
        totalSeguro,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setKpiMesLoading(false);
    }
  }

  async function carregar() {
    if (!podeVer || !userCtx) return;

    try {
      setLoading(true);
      const buscaAtiva = busca.trim();
      const forcarCargaCompleta = Boolean(pendingOpenId);
      const paginaAtual = Math.max(1, page);
      const tamanhoPagina = Math.max(1, pageSize);
      const inicio = (paginaAtual - 1) * tamanhoPagina;
      const fim = inicio + tamanhoPagina - 1;

      let query = supabase
        .from("vendas")
        .select(
          `
          id,
          vendedor_id,
          cliente_id,
          destino_id,
          destino_cidade_id,
          data_lancamento,
          data_embarque,
          clientes(nome, whatsapp),
          destinos:produtos!destino_id (
            nome,
            cidade_id
          )
        `,
          { count: "exact" }
        )
        .order("data_lancamento", { ascending: false });

      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }

      if (!buscaAtiva && !forcarCargaCompleta) {
        query = query.range(inicio, fim);
        setCarregouTodos(false);
      } else {
        setCarregouTodos(true);
      }

      const { data: vendasData, error, count } = await query;
      if (error) throw error;
      if (!buscaAtiva && !forcarCargaCompleta) {
        setTotalVendasDb(count ?? (vendasData ? vendasData.length : 0));
      }

      const cidadeIds = Array.from(
        new Set(
          (vendasData || [])
            .map((row: any) => row.destino_cidade_id || row.destinos?.cidade_id)
            .filter((id: string | null | undefined): id is string => Boolean(id))
        )
      );

      let cidadesMap: Record<string, string> = {};
      if (cidadeIds.length > 0) {
        const { data: cidadesData, error: cidadesError } = await supabase
          .from("cidades")
          .select("id, nome")
          .in("id", cidadeIds);
        if (cidadesError) {
          console.error(cidadesError);
        } else {
          cidadesMap = Object.fromEntries(
            (cidadesData || []).map((c: any) => [c.id, c.nome])
          );
        }
      }

        const v = (vendasData || []).map((row: any) => {
          const cidadeId = row.destino_cidade_id || row.destinos?.cidade_id || "";
          return {
            id: row.id,
            vendedor_id: row.vendedor_id,
            cliente_id: row.cliente_id,
            destino_id: row.destino_id,
            destino_cidade_id: cidadeId,
            data_lancamento: row.data_lancamento,
            data_embarque: row.data_embarque,
            cliente_nome: row.clientes?.nome || "",
            destino_nome: row.destinos?.nome || "",
            destino_cidade_nome: cidadeId ? cidadesMap[cidadeId] || "" : "",
            clientes: row.clientes,
          };
        });

      setVendas(v);

      const vendaIds = v.map((i) => i.id);
      if (vendaIds.length === 0) {
        setRecibos([]);
        setRecibosComplementares([]);
      } else {
        const { data: recibosData } = await supabase
          .from("vendas_recibos")
          .select("*, tipo_produtos (id, nome, tipo)")
          .in("venda_id", vendaIds);

        const produtoIds = Array.from(
          new Set(
            (recibosData || [])
              .map((r: any) => r.produto_id)
              .filter((id: string | null | undefined): id is string => Boolean(id))
          )
        );
        const produtoResolvidoIds = Array.from(
          new Set(
            (recibosData || [])
              .map((r: any) => r.produto_resolvido_id)
              .filter((id: string | null | undefined): id is string => Boolean(id))
          )
        );

        const vendaCidadeMap = v.reduce<Record<string, string>>((acc, vendaItem) => {
          if (vendaItem.destino_cidade_id) acc[vendaItem.id] = vendaItem.destino_cidade_id;
          return acc;
        }, {});

        let produtosLista: any[] = [];
        let produtosPorIdMap: Record<string, any> = {};
        let tipoProdMap: Record<string, string> = {};

        if (produtoIds.length > 0) {
          const { data: produtosData, error: prodErr } = await supabase
            .from("produtos")
            .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
            .in("tipo_produto", produtoIds);
          if (!prodErr && produtosData) produtosLista = produtosData as any[];
          else if (prodErr) console.error(prodErr);

          const { data: tiposData, error: tipoErr } = await supabase
            .from("tipo_produtos")
            .select("id, nome")
            .in("id", produtoIds);
          if (!tipoErr && tiposData) {
            tipoProdMap = Object.fromEntries(
              (tiposData as any[]).map((t) => [t.id, t.nome || "Produto"])
            );
          } else if (tipoErr) {
            console.error(tipoErr);
          }
        }

        if (produtoResolvidoIds.length > 0) {
          const { data: produtosResolvidosData, error: prodResolvidoErr } = await supabase
            .from("produtos")
            .select("id, nome, cidade_id, tipo_produto, todas_as_cidades")
            .in("id", produtoResolvidoIds);
          if (!prodResolvidoErr && produtosResolvidosData) {
            produtosResolvidosData.forEach((p) => {
              if (p?.id) {
                produtosPorIdMap[p.id] = p;
              }
            });
          } else if (prodResolvidoErr) {
            console.error(prodResolvidoErr);
          }
        }

        const recibosEnriquecidos =
          (recibosData || []).map((r: any) => {
            const cidadeVenda = vendaCidadeMap[r.venda_id] || "";
            const produtoResolvido =
              r.produto_resolvido_id && produtosPorIdMap[r.produto_resolvido_id];
            const candidato = produtosLista.find((p) => {
              const ehGlobal = !!p?.todas_as_cidades;
              return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
            });
            const tipoNome = tipoProdMap[r.produto_id as string];
            const nomeProduto =
              produtoResolvido?.nome || candidato?.nome || tipoNome || "";
            return {
              ...r,
              produto_nome: nomeProduto,
              produto_resolvido_id: r.produto_resolvido_id ?? null,
            };
          }) || [];

        setRecibos(recibosEnriquecidos);

        const { data: complementaresData, error: complementaresError } = await supabase
          .from("vendas_recibos_complementares")
          .select("id, venda_id, recibo_id")
          .in("venda_id", vendaIds);
        if (complementaresError) {
          console.error(complementaresError);
          setRecibosComplementares([]);
        } else {
          setRecibosComplementares((complementaresData || []) as ReciboComplementar[]);
        }
      }

      if (pendingOpenId) {
        const alvo = v.find((i) => i.id === pendingOpenId);
        if (alvo) setModalVenda(alvo);
        setPendingOpenId(null);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas.");
      showToast("Erro ao carregar vendas.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loadPerm || !podeVer || !userCtx) return;
    if (busca.trim()) {
      if (!carregouTodos) {
        carregar();
      }
      return;
    }
    carregar();
  }, [loadPerm, podeVer, userCtx, page, pageSize, busca]);

  useEffect(() => {
    if (loadPerm || !podeVer || !userCtx) return;
    carregarResumoMesAtual();
  }, [loadPerm, podeVer, userCtx]);

  useEffect(() => {
    setBuscaReciboComplementar("");
    setMostrarComplementares(false);
    setRemovendoComplementar(null);
    setVinculandoComplementar(false);
  }, [modalVenda?.id]);

  const filtroLabel = useMemo(() => {
    if (!userCtx) return "";
    if (userCtx.papel === "ADMIN") return "Todas as vendas";
    if (userCtx.papel === "GESTOR") return "Vendas da sua equipe";
    return "Suas vendas";
  }, [userCtx]);

  // ================================
  // FILTRO
  // ================================
  const vendasFiltradas = useMemo(() => {
    if (!busca.trim()) return vendas;

    const t = normalizeText(busca);

    const produtosPorVenda = new Map<string, string[]>();
    recibos.forEach((recibo) => {
      if (!recibo.venda_id) return;
      const nome = recibo.produto_nome || "";
      if (!nome) return;
      const lista = produtosPorVenda.get(recibo.venda_id) || [];
      lista.push(nome);
      produtosPorVenda.set(recibo.venda_id, lista);
    });

    return vendas.filter(
      (v) =>
        normalizeText(v.cliente_nome || "").includes(t) ||
        normalizeText(v.destino_nome || "").includes(t) ||
        normalizeText(v.destino_cidade_nome || "").includes(t) ||
        (produtosPorVenda.get(v.id) || []).some((p) => normalizeText(p).includes(t)) ||
        normalizeText(v.id).includes(t)
    );
  }, [vendas, busca, recibos]);
  const usaPaginacaoServidor = !busca.trim() && !carregouTodos;
  const totalVendas = usaPaginacaoServidor ? totalVendasDb : vendasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalVendas / Math.max(pageSize, 1)));
  const paginaAtual = Math.min(page, totalPaginas);
  const vendasExibidas = useMemo(() => {
    if (usaPaginacaoServidor) return vendas;
    const inicio = (paginaAtual - 1) * pageSize;
    return vendasFiltradas.slice(inicio, inicio + pageSize);
  }, [usaPaginacaoServidor, vendas, vendasFiltradas, paginaAtual, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [busca]);

  useEffect(() => {
    if (page > totalPaginas) {
      setPage(totalPaginas);
    }
  }, [page, totalPaginas]);

  const vendasPorId = useMemo(() => {
    return Object.fromEntries(vendas.map((v) => [v.id, v]));
  }, [vendas]);

  const recibosPorId = useMemo(() => {
    return Object.fromEntries(recibos.map((r) => [r.id, r]));
  }, [recibos]);

  const complementaresAtuais = useMemo(() => {
    if (!modalVenda) return [];
    return complementaresDaVenda(modalVenda.id);
  }, [modalVenda, recibosComplementares]);

  const complementaresAtuaisIds = useMemo(() => {
    return new Set(complementaresAtuais.map((item) => item.recibo_id));
  }, [complementaresAtuais]);

  const sugestoesReciboComplementar = useMemo(() => {
    if (!modalVenda) return [];
    const termo = normalizeText(buscaReciboComplementar.trim());
    if (termo.length < 2) return [];
    return recibos
      .filter((r) => r.venda_id !== modalVenda.id)
      .filter((r) => !complementaresAtuaisIds.has(r.id))
      .map((r) => {
        const vendaRef = vendasPorId[r.venda_id];
        return {
          recibo: r,
          venda: vendaRef,
          resumo: obterResumoReciboComplementar(r, vendaRef),
          chaveBusca: criarChaveBuscaReciboComplementar(r, vendaRef),
        };
      })
      .filter((item) => item.chaveBusca.includes(termo))
      .slice(0, 6);
  }, [
    buscaReciboComplementar,
    modalVenda,
    recibos,
    complementaresAtuaisIds,
    vendasPorId,
  ]);

  // ================================
  // RECIBOS POR VENDA
  // ================================
  function recibosDaVenda(id: string) {
    return recibos.filter((r) => r.venda_id === id);
  }

  function complementaresDaVenda(id: string) {
    return recibosComplementares.filter((r) => r.venda_id === id);
  }

  function obterReciboReferenciaDaVenda(venda?: Venda | null) {
    if (!venda) return null;
    const lista = recibosDaVenda(venda.id);
    if (lista.length === 0) return null;
    if (venda.destino_id) {
      const principal = lista.find((r) => r.produto_resolvido_id === venda.destino_id);
      if (principal) return principal;
    }
    return lista[0];
  }

  const textoPeriodoKpi = useMemo(() => {
    const hoje = new Date();
    const diaAtual = String(hoje.getDate()).padStart(2, "0");
    const mesIdx = hoje.getMonth();
    const ano = hoje.getFullYear();
    const meses = [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ];
    const mesNome = meses[mesIdx] || "";
    return `Resultados do dia 01 ${mesNome} até o dia ${diaAtual} ${mesNome} de ${ano}`;
  }, []);

  // ================================
  // CANCELAR VENDA
  // ================================
  async function cancelarVenda(venda: Venda) {
    if (!podeExcluir && !isAdmin) return;

    try {
      setCancelando(true);

      // EXCLUI TODOS OS RECIBOS → a venda deixa de existir
      await supabase.from("vendas_recibos").delete().eq("venda_id", venda.id);

      // deleta a venda
      await supabase.from("vendas").delete().eq("id", venda.id);

      // LOG
      await registrarLog({
        acao: "venda_cancelada",
        modulo: "Vendas",
        detalhes: { id: venda.id },
      });

      await carregar();
      setModalVenda(null);
      showToast("Venda cancelada.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao cancelar venda.");
      showToast("Erro ao cancelar venda.", "error");
    } finally {
      setCancelando(false);
    }
  }

  function solicitarCancelamentoVenda(venda: Venda) {
    if (!podeExcluir && !isAdmin) return;
    setConfirmVendaCancelamento(venda);
  }

  // ================================
  // EXCLUIR RECIBO
  // ================================
  async function excluirRecibo(id: string, vendaId: string) {
    if (!podeExcluir) return;

    try {
      setExcluindoRecibo(id);

      await supabase.from("vendas_recibos").delete().eq("id", id);

      await registrarLog({
        acao: "recibo_excluido",
        modulo: "Vendas",
        detalhes: { recibo_id: id, venda_id: vendaId },
      });

      await carregar();
      showToast("Recibo excluído.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir recibo.");
      showToast("Erro ao excluir recibo.", "error");
    } finally {
      setExcluindoRecibo(null);
    }
  }

  function solicitarExclusaoRecibo(id: string, vendaId: string) {
    if (!podeExcluir) return;
    setConfirmReciboExclusao({ id, vendaId });
  }

  // ================================
  // RECIBOS COMPLEMENTARES
  // ================================
  async function vincularReciboComplementar(reciboId: string, vendaId: string) {
    if (!podeEditar) return;
    const recibo = recibosPorId[reciboId];
    if (!recibo) {
      showToast("Recibo não encontrado.", "error");
      return;
    }
    if (recibo.venda_id === vendaId) {
      showToast("Este recibo já pertence a esta venda.", "error");
      return;
    }
    const jaVinculado = recibosComplementares.some(
      (item) => item.venda_id === vendaId && item.recibo_id === reciboId
    );
    if (jaVinculado) {
      showToast("Recibo já vinculado como complementar.", "error");
      return;
    }
    const vendaAtual = vendasPorId[vendaId];
    if (!vendaAtual) {
      showToast("Venda atual não encontrada.", "error");
      return;
    }
    const vendaRecibo = vendasPorId[recibo.venda_id];
    if (!vendaRecibo) {
      showToast("Venda do recibo complementar não encontrada.", "error");
      return;
    }
    const reciboReferenciaAtual = obterReciboReferenciaDaVenda(vendaAtual);
    if (!reciboReferenciaAtual) {
      showToast("Venda atual sem recibo para vínculo cruzado.", "error");
      return;
    }
    const cruzadoJaVinculado = recibosComplementares.some(
      (item) => item.venda_id === vendaRecibo.id && item.recibo_id === reciboReferenciaAtual.id
    );

    try {
      setVinculandoComplementar(true);

      const vinculoPrimario = { venda_id: vendaId, recibo_id: reciboId };
      const vinculoCruzado = { venda_id: vendaRecibo.id, recibo_id: reciboReferenciaAtual.id };

      const { error: primarioError } = await supabase
        .from("vendas_recibos_complementares")
        .upsert(vinculoPrimario, { onConflict: "venda_id,recibo_id", ignoreDuplicates: true });
      if (primarioError) throw primarioError;

      if (!cruzadoJaVinculado) {
        const { error: cruzadoError } = await supabase
          .from("vendas_recibos_complementares")
          .upsert(vinculoCruzado, { onConflict: "venda_id,recibo_id", ignoreDuplicates: true });
        if (cruzadoError) {
          await supabase
            .from("vendas_recibos_complementares")
            .delete()
            .match(vinculoPrimario);
          throw cruzadoError;
        }
      }

      await registrarLog({
        acao: "recibo_complementar_vinculado",
        modulo: "Vendas",
        detalhes: {
          venda_id: vendaId,
          recibo_id: reciboId,
          venda_cruzada_id: vendaRecibo.id,
          recibo_cruzado_id: reciboReferenciaAtual.id,
        },
      });

      await carregar();
      setBuscaReciboComplementar("");
      showToast("Recibo complementar vinculado.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao vincular recibo complementar.");
      showToast("Erro ao vincular recibo complementar.", "error");
    } finally {
      setVinculandoComplementar(false);
    }
  }

  async function removerReciboComplementar(link: ReciboComplementar) {
    if (!podeEditar) return;

    try {
      setRemovendoComplementar(link.id);

      const recibo = recibosPorId[link.recibo_id];
      const vendaAtual = vendasPorId[link.venda_id];
      const vendaRecibo = recibo ? vendasPorId[recibo.venda_id] : undefined;
      const idsParaRemover = new Set([link.id]);

      if (vendaAtual && vendaRecibo) {
        const recibosVendaAtual = new Set(recibosDaVenda(vendaAtual.id).map((r) => r.id));
        recibosComplementares.forEach((item) => {
          if (item.venda_id === vendaRecibo.id && recibosVendaAtual.has(item.recibo_id)) {
            idsParaRemover.add(item.id);
          }
        });
      }

      const idsLista = Array.from(idsParaRemover);
      const { error } = await supabase
        .from("vendas_recibos_complementares")
        .delete()
        .in("id", idsLista);
      if (error) throw error;

      await registrarLog({
        acao: "recibo_complementar_removido",
        modulo: "Vendas",
        detalhes: {
          venda_id: link.venda_id,
          recibo_id: link.recibo_id,
          ids_removidos: idsLista,
        },
      });

      await carregar();
      showToast("Recibo complementar removido.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover recibo complementar.");
      showToast("Erro ao remover recibo complementar.", "error");
    } finally {
      setRemovendoComplementar(null);
    }
  }

  function solicitarRemocaoComplementar(link: ReciboComplementar) {
    if (!podeEditar) return;
    setConfirmComplementarRemover(link);
  }

  // ================================
  // BLOQUEIO TOTAL DE MÓDULO
  // ================================
  if (loadingUser || loadPerm) {
    return <LoadingUsuarioContext />;
  }

  if (!podeVer) {
    return (
      <div className="card-base card-config">
        <strong>Acesso negado ao módulo de Vendas.</strong>
      </div>
    );
  }

  if (!podeVer) {
    return (
      <div className="card-base card-config">
        <strong>Você não possui permissão para visualizar Vendas.</strong>
      </div>
    );
  }

  // ================================
  // UI — LISTAGEM
  // ================================
  return (
    <div className={`vendas-consulta-page${podeCriar ? " has-mobile-actionbar" : ""}`}>
      {/* BUSCA */}
      <div
        className="card-base mb-3 list-toolbar-sticky"
        style={{ background: "#ecfdf3", borderColor: "#bbf7d0" }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="form-group flex-1 min-w-0">
            <label className="form-label">Buscar venda</label>
            <input
              className="form-input"
              placeholder="Nome, destino ou ID..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {filtroLabel && (
              <small style={{ color: "#64748b" }}>
                {filtroLabel} {userCtx?.papel !== "ADMIN" ? "(restrição por vendedor)" : ""}
              </small>
            )}
          </div>
          {podeCriar && (
            <div className="hidden sm:flex sm:items-end sm:ml-auto">
              <a className="btn btn-primary" href="/vendas/cadastro" style={{ textDecoration: "none" }}>
                Nova venda
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="card-base mb-2" style={{ textAlign: "center", fontWeight: 700 }}>
        {textoPeriodoKpi}
      </div>

      <div className="dashboard-grid-kpi mb-3">
        <div className="kpi-card kpi-vendas">
          <div style={{ width: "100%", textAlign: "center" }}>
            <div className="kpi-label">Total de Vendas</div>
            <div className="kpi-value">{formatCurrency(kpiMesAtual.totalVendas)}</div>
          </div>
        </div>
        <div className="kpi-card kpi-diferenciado">
          <div style={{ width: "100%", textAlign: "center" }}>
            <div className="kpi-label">Seguro Viagem</div>
            <div className="kpi-value">{formatCurrency(kpiMesAtual.totalSeguro)}</div>
          </div>
        </div>
        <div className="kpi-card kpi-meta">
          <div style={{ width: "100%", textAlign: "center" }}>
            <div className="kpi-label">Taxas</div>
            <div className="kpi-value">{formatCurrency(kpiMesAtual.totalTaxas)}</div>
          </div>
        </div>
        <div className="kpi-card kpi-ticket">
          <div style={{ width: "100%", textAlign: "center" }}>
            <div className="kpi-label">Total Líquido</div>
            <div className="kpi-value">{formatCurrency(kpiMesAtual.totalLiquido)}</div>
          </div>
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      <PaginationControls
        page={paginaAtual}
        pageSize={pageSize}
        totalItems={totalVendas}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* TABELA */}
      <DataTable
        className="table-default table-header-green table-mobile-cards min-w-[820px]"
        containerStyle={{ maxHeight: "65vh", overflowY: "auto" }}
        headers={
          <tr>
            <th>Cliente</th>
            <th>Destino</th>
            <th>Produto</th>
            <th style={{ textAlign: "center" }}>Embarque</th>
            <th>Valor</th>
            <th>Taxas</th>
            {podeVer && <th className="th-actions" style={{ textAlign: "center" }}>Ações</th>}
          </tr>
        }
        loading={loading}
        loadingMessage="Carregando..."
        empty={!loading && vendasExibidas.length === 0}
        emptyMessage="Nenhuma venda encontrada."
        colSpan={7}
      >
        {vendasExibidas.map((v) => {
          const totalValor = recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_total || 0), 0);
          const totalTaxas = recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_taxas || 0), 0);
          const produtosVenda = recibosDaVenda(v.id)
            .map((r) => r.produto_nome || "")
            .filter(Boolean);
          const whatsappLink = construirLinkWhatsApp(v.clientes?.whatsapp);

          return (
            <tr key={v.id}>
              <td data-label="Cliente">{v.cliente_nome}</td>
              <td data-label="Destino">{v.destino_cidade_nome || "-"}</td>
              <td data-label="Produto">
                {produtosVenda.length === 0 ? (
                  "-"
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {produtosVenda.map((p, idx) => (
                      <span key={`${v.id}-prod-${idx}`}>{p}</span>
                    ))}
                  </div>
                )}
              </td>
              <td data-label="Embarque" style={{ textAlign: "center" }}>
                {formatarDataCorretamente(v.data_embarque)}
              </td>
              <td data-label="Valor">
                R${" "}
                {totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td data-label="Taxas">
                {totalTaxas === 0
                  ? "-"
                  : `R$ ${totalTaxas.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`}
              </td>
              <td className="th-actions" data-label="Ações">
                <div className="action-buttons">
                  {whatsappLink && (
                    <a
                      className="btn-icon"
                      href={whatsappLink}
                      title="Enviar WhatsApp"
                      target="_blank"
                      rel="noreferrer"
                    >
                      💬
                    </a>
                  )}
                  <button
                    className="btn-icon"
                    title="Ver detalhes"
                    onClick={() => setModalVenda(v)}
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>

      {/* ================================
          MODAL DETALHES
      ================================= */}
      {modalVenda && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: "820px" }}>
            <div className="modal-header">
              <div>
                <div
                  className="modal-title"
                  style={{ color: "#16a34a", fontSize: "1.15rem", fontWeight: 800 }}
                >
                  Detalhes da venda
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setModalVenda(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div
                className="mb-3"
                style={{ display: "grid", gap: 6, lineHeight: 1.4 }}
              >
                <div>
                  <strong>Cliente:</strong> {modalVenda.cliente_nome || "-"}
                </div>
                <div>
                  <strong>Cidade:</strong> {modalVenda.destino_cidade_nome || "Não informada"}
                </div>
                <div>
                  <strong>Lançada em:</strong>{" "}
                  {formatarDataCorretamente(modalVenda.data_lancamento)}
                </div>
                <div>
                  <strong>Embarque:</strong>{" "}
                  {formatarDataCorretamente(modalVenda.data_embarque)}
                </div>
              </div>

              {/* RECIBOS */}
              <h4 style={{ marginBottom: 8, textAlign: "center" }}>Recibos</h4>
              <div className="table-container overflow-x-auto">
                <table
                  className="table-default table-header-green table-mobile-cards"
                  style={{ minWidth: 520 }}
                >
                  <thead>
                    <tr>
                      <th>Número</th>
                      <th>Produto</th>
                      <th style={{ textAlign: "center" }}>Início</th>
                      <th style={{ textAlign: "center" }}>Fim</th>
                      <th>Valor</th>
                      <th>Taxas</th>
                      {podeExcluir && (
                        <th className="th-actions" style={{ textAlign: "center" }}>
                          Ações
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {recibosDaVenda(modalVenda.id).map((r) => {
                      const valorFmt = (r.valor_total || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      const taxasNum = r.valor_taxas || 0;
                      const taxasFmt =
                        taxasNum === 0
                          ? "-"
                          : `R$ ${taxasNum.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`;

                      const formatarData = (value: string | null | undefined) =>
                        formatarDataCorretamente(value);

                      return (
                        <tr key={r.id}>
                          <td data-label="Número">{r.numero_recibo || "-"}</td>
                          <td data-label="Produto">{r.produto_nome || "-"}</td>
                          <td data-label="Início" style={{ textAlign: "center" }}>
                            {formatarData(r.data_inicio)}
                          </td>
                          <td data-label="Fim" style={{ textAlign: "center" }}>
                            {formatarData(r.data_fim)}
                          </td>
                          <td data-label="Valor">R$ {valorFmt}</td>
                          <td data-label="Taxas">{taxasFmt}</td>
                          {podeExcluir && (
                            <td className="th-actions" data-label="Ações">
                              <div className="action-buttons">
                                <button
                                  className="btn-icon btn-danger"
                                  disabled={excluindoRecibo === r.id}
                                  onClick={() => solicitarExclusaoRecibo(r.id, modalVenda.id)}
                                >
                                  {excluindoRecibo === r.id ? "…" : "🗑️"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* RECIBOS COMPLEMENTARES */}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <h4 style={{ margin: 0 }}>Recibos complementares</h4>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setMostrarComplementares((prev) => !prev)}
                  >
                    {mostrarComplementares
                      ? "Ocultar"
                      : `Mostrar (${complementaresAtuais.length})`}
                  </button>
                </div>

                {mostrarComplementares && (
                  <div
                    style={{
                      marginTop: 8,
                      border: "1px dashed #cbd5e1",
                      borderRadius: 12,
                      padding: 12,
                      background: "#f8fafc",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    {podeEditar && (
                      <div className="form-row" style={{ marginBottom: 4 }}>
                        <div className="form-group" style={{ flex: 1, minWidth: 220 }}>
                          <label className="form-label">Buscar recibo</label>
                          <input
                            className="form-input"
                            placeholder="Número, cliente ou destino..."
                            value={buscaReciboComplementar}
                            onChange={(e) => setBuscaReciboComplementar(e.target.value)}
                          />
                          <small style={{ color: "#64748b" }}>
                            Digite ao menos 2 caracteres para localizar recibos.
                          </small>
                        </div>
                      </div>
                    )}

                    {podeEditar &&
                      buscaReciboComplementar.trim().length >= 2 &&
                      sugestoesReciboComplementar.length === 0 && (
                        <div style={{ color: "#64748b" }}>
                          Nenhum recibo encontrado com essa busca.
                        </div>
                      )}

                    {podeEditar && sugestoesReciboComplementar.length > 0 && (
                      <div style={{ display: "grid", gap: 6 }}>
                        {sugestoesReciboComplementar.map((item) => {
                          const detalhes = item.resumo.detalhes;
                          return (
                            <button
                              key={item.recibo.id}
                              type="button"
                              onClick={() =>
                                vincularReciboComplementar(item.recibo.id, modalVenda.id)
                              }
                              disabled={vinculandoComplementar}
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                textAlign: "left",
                                border: "1px solid #e2e8f0",
                                background: "#fff",
                                borderRadius: 10,
                                padding: "8px 10px",
                                cursor: vinculandoComplementar ? "not-allowed" : "pointer",
                                opacity: vinculandoComplementar ? 0.6 : 1,
                              }}
                            >
                              <div style={{ display: "grid", gap: 2 }}>
                                <span style={{ fontWeight: 600 }}>{item.resumo.titulo}</span>
                                {detalhes && (
                                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                    {detalhes}
                                  </span>
                                )}
                              </div>
                              <span
                                style={{ color: "#16a34a", fontWeight: 700, fontSize: "0.85rem" }}
                              >
                                {vinculandoComplementar ? "Salvando..." : "Adicionar"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: "grid", gap: 6 }}>
                      {complementaresAtuais.length === 0 && (
                        <div style={{ color: "#64748b" }}>
                          Nenhum recibo complementar vinculado.
                        </div>
                      )}

                      {complementaresAtuais.map((link) => {
                        const recibo = recibosPorId[link.recibo_id];
                        const vendaRef = recibo ? vendasPorId[recibo.venda_id] : undefined;
                        const resumo = recibo
                          ? obterResumoReciboComplementar(recibo, vendaRef)
                          : { titulo: "Recibo complementar", detalhes: `ID: ${link.recibo_id}` };
                        return (
                          <div
                            key={link.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 12,
                              border: "1px solid #e2e8f0",
                              background: "#fff",
                              borderRadius: 10,
                              padding: "8px 10px",
                            }}
                          >
                            <div style={{ display: "grid", gap: 2 }}>
                              <span style={{ fontWeight: 600 }}>{resumo.titulo}</span>
                              {resumo.detalhes && (
                                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                  {resumo.detalhes}
                                </span>
                              )}
                            </div>
                            {podeEditar && (
                              <button
                                type="button"
                                className="btn-icon"
                                title="Remover recibo complementar"
                                onClick={() => solicitarRemocaoComplementar(link)}
                                disabled={removendoComplementar === link.id}
                              >
                                {removendoComplementar === link.id ? "..." : "✕"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer mobile-stack-buttons">
              {podeEditar && (
                <button
                  className="btn btn-outline w-full sm:w-auto"
                  style={{ backgroundColor: "#dcfce7", color: "#166534", borderColor: "#86efac" }}
                  onClick={() => {
                    const url = `/vendas/cadastro?id=${modalVenda.id}${
                      modalVenda.destino_cidade_id ? `&cidadeId=${modalVenda.destino_cidade_id}` : ""
                    }${
                      modalVenda.destino_cidade_nome
                        ? `&cidadeNome=${encodeURIComponent(modalVenda.destino_cidade_nome)}`
                        : ""
                    }`;
                    window.location.href = url;
                  }}
                >
                  Editar
                </button>
              )}

              {podeExcluir && (
                <button
                  className="btn btn-danger w-full sm:w-auto"
                  onClick={() => solicitarCancelamentoVenda(modalVenda)}
                  disabled={cancelando}
                >
                  {cancelando ? "Cancelando..." : "Cancelar Venda"}
                </button>
              )}

              <button
                type="button"
                className="btn btn-light w-full sm:w-auto"
                style={{ backgroundColor: "#e5e7eb", color: "#111827" }}
                onClick={() => setModalVenda(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <ConfirmDialog
        open={Boolean(confirmVendaCancelamento)}
        title="Cancelar venda"
        message="Tem certeza que deseja cancelar esta venda? Esta ação remove recibos vinculados."
        confirmLabel={cancelando ? "Cancelando..." : "Cancelar venda"}
        confirmVariant="danger"
        confirmDisabled={Boolean(cancelando)}
        onCancel={() => setConfirmVendaCancelamento(null)}
        onConfirm={async () => {
          if (!confirmVendaCancelamento) return;
          await cancelarVenda(confirmVendaCancelamento);
          setConfirmVendaCancelamento(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmReciboExclusao)}
        title="Excluir recibo"
        message="Deseja excluir este recibo?"
        confirmLabel={excluindoRecibo ? "Excluindo..." : "Excluir recibo"}
        confirmVariant="danger"
        confirmDisabled={Boolean(excluindoRecibo)}
        onCancel={() => setConfirmReciboExclusao(null)}
        onConfirm={async () => {
          if (!confirmReciboExclusao) return;
          await excluirRecibo(confirmReciboExclusao.id, confirmReciboExclusao.vendaId);
          setConfirmReciboExclusao(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmComplementarRemover)}
        title="Remover recibo complementar"
        message="Deseja remover este recibo complementar?"
        confirmLabel={removendoComplementar ? "Removendo..." : "Remover"}
        confirmVariant="danger"
        confirmDisabled={Boolean(removendoComplementar)}
        onCancel={() => setConfirmComplementarRemover(null)}
        onConfirm={async () => {
          if (!confirmComplementarRemover) return;
          await removerReciboComplementar(confirmComplementarRemover);
          setConfirmComplementarRemover(null);
        }}
      />
      {podeCriar && (
        <div className="mobile-actionbar sm:hidden">
          <a className="btn btn-primary" href="/vendas/cadastro" style={{ textDecoration: "none" }}>
            Nova venda
          </a>
        </div>
      )}
    </div>
  );
}
