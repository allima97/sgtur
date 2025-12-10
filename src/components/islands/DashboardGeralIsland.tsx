import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// ----------------- TIPOS -----------------

type PapelUsuario = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

type UserContext = {
  usuarioId: string;
  nome: string | null;
  papel: PapelUsuario;
  vendedorIds: string[]; // se GESTOR: ele + equipe | se VENDEDOR: só ele | se ADMIN: vazio = todos
};

type Venda = {
  id: string;
  data_lancamento: string;
  data_embarque: string | null;
  cancelada: boolean | null;
  vendedor_id: string | null;
  clientes?: { id: string; nome: string | null } | null;
  destinos?: { id: string; nome: string | null } | null;
  vendas_recibos?: {
    id: string;
    valor_total: number | null;
    valor_taxas: number | null;
    produtos?: {
      id: string;
      nome: string | null;
      regra_comissionamento: string | null;
    } | null;
  }[];
};

type Orcamento = {
  id: string;
  data_orcamento: string;
  data_viagem: string | null;
  status: string | null;
  valor: number | null;
  notas: string | null;
  clientes?: { id: string; nome: string | null } | null;
  destinos?: { id: string; nome: string | null } | null;
};

type MetaVendedor = {
  id: string;
  vendedor_id: string;
  periodo: string; // date
  meta_geral: number;
  meta_diferenciada: number;
  ativo: boolean;
};

type Cliente = {
  id: string;
  nome: string;
  nascimento: string | null;
  telefone: string | null;
};

type PresetPeriodo = "mes_atual" | "ultimos_30" | "personalizado";

type WidgetId =
  | "kpis"
  | "vendas_destino"
  | "vendas_produto"
  | "timeline"
  | "orcamentos"
  | "aniversariantes";

type KpiId =
  | "kpi_vendas_total"
  | "kpi_qtd_vendas"
  | "kpi_ticket_medio"
  | "kpi_diferenciado"
  | "kpi_orcamentos"
  | "kpi_conversao"
  | "kpi_meta"
  | "kpi_atingimento";

type ChartType = "pie" | "bar" | "line";

const ALL_WIDGETS: { id: WidgetId; titulo: string }[] = [
  { id: "kpis", titulo: "KPIs principais" },
  { id: "vendas_destino", titulo: "Vendas por destino" },
  { id: "vendas_produto", titulo: "Vendas por produto" },
  { id: "timeline", titulo: "Evolução das vendas" },
  { id: "orcamentos", titulo: "Orçamentos recentes" },
  { id: "aniversariantes", titulo: "Aniversariantes" },
];

const ALL_KPIS: { id: KpiId; titulo: string }[] = [
  { id: "kpi_vendas_total", titulo: "Vendas no período" },
  { id: "kpi_qtd_vendas", titulo: "Qtd. vendas" },
  { id: "kpi_ticket_medio", titulo: "Ticket médio" },
  { id: "kpi_diferenciado", titulo: "Comissão Diferenciada" },
  { id: "kpi_orcamentos", titulo: "Orçamentos" },
  { id: "kpi_conversao", titulo: "Conv. Orç → Vendas" },
  { id: "kpi_meta", titulo: "Meta somada (R$)" },
  { id: "kpi_atingimento", titulo: "Atingimento da meta" },
];

// ----------------- HELPERS -----------------

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISO = (d: Date) => d.toISOString().substring(0, 10);
  return { inicio: toISO(start), fim: toISO(end) };
}

function getLastNDaysBounds(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (n - 1));
  const toISO = (d: Date) => d.toISOString().substring(0, 10);
  return { inicio: toISO(start), fim: toISO(end) };
}

function calcularIdade(nascimentoStr: string | null): number | null {
  if (!nascimentoStr) return null;
  const nasc = new Date(nascimentoStr);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}

const COLORS_PURPLE = ["#7c3aed", "#a855f7", "#6366f1", "#ec4899", "#22c55e"];

// ----------------- COMPONENTE -----------------

const DashboardGeralIsland: React.FC = () => {
  const [userCtx, setUserCtx] = useState<UserContext | null>(null);
  const [loadingUserCtx, setLoadingUserCtx] = useState(true);
  const permissaoData = usePermissao("Dashboard");

  const [presetPeriodo, setPresetPeriodo] =
    useState<PresetPeriodo>("mes_atual");
  const [inicio, setInicio] = useState<string>("");
  const [fim, setFim] = useState<string>("");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [metas, setMetas] = useState<MetaVendedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(ALL_WIDGETS.map((w) => w.id));
  const [widgetVisible, setWidgetVisible] = useState<Record<WidgetId, boolean>>(() =>
    ALL_WIDGETS.reduce((acc, w) => ({ ...acc, [w.id]: true }), {} as Record<WidgetId, boolean>)
  );
  const [showCustomize, setShowCustomize] = useState(false);
  const [kpiOrder, setKpiOrder] = useState<KpiId[]>(ALL_KPIS.map((k) => k.id));
  const [kpiVisible, setKpiVisible] = useState<Record<KpiId, boolean>>(() =>
    ALL_KPIS.reduce((acc, k) => ({ ...acc, [k.id]: true }), {} as Record<KpiId, boolean>)
  );
  const [chartPrefs, setChartPrefs] = useState<Record<WidgetId, ChartType>>({
    vendas_destino: "pie",
    vendas_produto: "bar",
    timeline: "line",
  } as Record<WidgetId, ChartType>);

  const toggleWidget = (id: WidgetId) => {
    const updated = { ...widgetVisible, [id]: !widgetVisible[id] };
    setWidgetVisible(updated);
    salvarPreferencias(widgetOrder, updated, { order: kpiOrder, visible: kpiVisible });
  };

  const toggleKpi = (id: KpiId) => {
    const updated = { ...kpiVisible, [id]: !kpiVisible[id] };
    setKpiVisible(updated);
    salvarPreferencias(widgetOrder, widgetVisible, { order: kpiOrder, visible: updated });
  };

  const moverWidget = (id: WidgetId, direction: "up" | "down") => {
    const idx = widgetOrder.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...widgetOrder];
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[idx], newOrder[swapWith]] = [newOrder[swapWith], newOrder[idx]];
    setWidgetOrder(newOrder);
    salvarPreferencias(newOrder, widgetVisible, { order: kpiOrder, visible: kpiVisible }, chartPrefs);
  };

  const moverKpi = (id: KpiId, direction: "up" | "down") => {
    const idx = kpiOrder.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...kpiOrder];
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[idx], newOrder[swapWith]] = [newOrder[swapWith], newOrder[idx]];
    setKpiOrder(newOrder);
    salvarPreferencias(widgetOrder, widgetVisible, { order: newOrder, visible: kpiVisible }, chartPrefs);
  };

  const alterarChart = (widgetId: WidgetId, tipo: ChartType) => {
    const updated = { ...chartPrefs, [widgetId]: tipo };
    setChartPrefs(updated);
    salvarPreferencias(widgetOrder, widgetVisible, { order: kpiOrder, visible: kpiVisible }, updated);
  };

  const widgetAtivo = (id: WidgetId) => widgetVisible[id] !== false;

  function salvarKpiLocal(order: KpiId[], visible: Record<KpiId, boolean>, charts?: Record<WidgetId, ChartType>) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dashboard_kpis",
        JSON.stringify({ order, visible })
      );
      if (charts) {
        window.localStorage.setItem(
          "dashboard_charts",
          JSON.stringify(charts)
        );
      }
    }
  }

  async function salvarPreferencias(
    order: WidgetId[],
    visible: Record<WidgetId, boolean>,
    kpiState?: { order: KpiId[]; visible: Record<KpiId, boolean> },
    charts?: Record<WidgetId, ChartType>
  ) {
    try {
      if (userCtx?.usuarioId) {
        const payload = order.map((id, idx) => ({
          usuario_id: userCtx.usuarioId,
          widget: id,
          ordem: idx,
          visivel: visible[id] !== false,
          // settings opcional para KPIs; se a coluna não existir, fallback localStorage cuidará
          settings:
            id === "kpis" && kpiState
              ? {
                  kpis: {
                    order: kpiState.order,
                    visible: kpiState.visible,
                  },
                  charts: charts || null,
                }
              : id === "vendas_destino" ||
                id === "vendas_produto" ||
                id === "timeline"
              ? {
                  charts: charts || null,
                }
              : null,
        }));
        await supabase.from("dashboard_widgets").delete().eq("usuario_id", userCtx.usuarioId);
        try {
          await supabase.from("dashboard_widgets").insert(payload);
        } catch (err) {
          // se der erro (ex.: coluna settings não existe), tenta novamente sem settings
          const payloadSemSettings = payload.map((p) => {
            const clone = { ...p };
            delete (clone as any).settings;
            return clone;
          });
          await supabase.from("dashboard_widgets").insert(payloadSemSettings);
        }
      }
    } catch (e) {
      console.warn("Não foi possível salvar preferências no Supabase, mantendo localStorage.", e);
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "dashboard_widgets",
          JSON.stringify({ order, visible })
        );
        if (kpiState) {
          salvarKpiLocal(kpiState.order, kpiState.visible, charts);
        }
        if (charts) {
          window.localStorage.setItem("dashboard_charts", JSON.stringify(charts));
        }
      }
    }
  }

  // orçamentos / aniversários – seleção em modal
  const [orcamentoSelecionado, setOrcamentoSelecionado] =
    useState<Orcamento | null>(null);
  const [clienteSelecionado, setClienteSelecionado] =
    useState<Cliente | null>(null);

  // ----------------- INIT PERÍODO -----------------

  useEffect(() => {
    const { inicio: i, fim: f } = getMonthBounds();
    setInicio(i);
    setFim(f);
    setPresetPeriodo("mes_atual");
  }, []);

  function aplicarPreset(p: PresetPeriodo) {
    setPresetPeriodo(p);
    if (p === "mes_atual") {
      const { inicio: i, fim: f } = getMonthBounds();
      setInicio(i);
      setFim(f);
    } else if (p === "ultimos_30") {
      const { inicio: i, fim: f } = getLastNDaysBounds(30);
      setInicio(i);
      setFim(f);
    }
    // personalizado: usuário vai editar datas manualmente
  }

  // ----------------- CARREGAR CONTEXTO DO USUÁRIO -----------------

  useEffect(() => {
    async function carregarContexto() {
      try {
        setLoadingUserCtx(true);
        setErro(null);

        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError || !authData?.user) {
          setErro("Usuário não autenticado.");
          return;
        }

        const userId = authData.user.id;

        const { data: usuarioDb, error: usuarioErr } = await supabase
          .from("users")
          .select("id, nome_completo, user_types(name)")
          .eq("id", userId)
          .maybeSingle();

        if (usuarioErr) {
          console.error(usuarioErr);
        }

        const tipoName =
          ((usuarioDb as any)?.user_types as any)?.name ||
          (authData.user.user_metadata as any)?.name ||
          "";

        const tipoNorm = String(tipoName || "").toUpperCase();
        let papel: PapelUsuario = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";

        let vendedorIds: string[] = [userId];

        if (papel === "GESTOR") {
          const { data: rel, error: relErr } = await supabase
            .from("gestor_vendedor")
            .select("vendedor_id")
            .eq("gestor_id", userId);

          if (!relErr && rel) {
            const extra = rel
              .map((r) => r.vendedor_id)
              .filter((id): id is string => Boolean(id));
            vendedorIds = Array.from(new Set([userId, ...extra]));
          }
        } else if (papel === "ADMIN") {
          // admin: dashboard geral pode ver tudo (vendedorIds vazio = sem filtro)
          vendedorIds = [];
        }

        setUserCtx({
          usuarioId: userId,
          nome: (usuarioDb as any)?.nome_completo || null,
          papel,
          vendedorIds,
        });
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUserCtx(false);
      }
    }

    carregarContexto();
  }, []);

  // ----------------- CARREGAR DADOS DO DASHBOARD -----------------

  useEffect(() => {
    if (!userCtx || !inicio || !fim) return;

    async function carregarDashboard() {
      try {
        setLoadingDados(true);
        setErro(null);

        // ----- VENDAS + RECIBOS -----
        let vendasQuery = supabase
          .from("vendas")
          .select(
            `
          id,
          data_lancamento,
          data_embarque,
          cancelada,
          vendedor_id,
          clientes:clientes (id, nome),
          destinos:produtos!destino_id (id, nome),
          vendas_recibos (
            id,
            valor_total,
            valor_taxas,
            produtos:tipo_produtos!produto_id (id, nome, regra_comissionamento)
          )
        `
          )
          .gte("data_lancamento", inicio)
          .lte("data_lancamento", fim)
          .eq("cancelada", false);

        if (userCtx.vendedorIds.length > 0) {
          vendasQuery = vendasQuery.in("vendedor_id", userCtx.vendedorIds);
        }

        const { data: vendasData, error: vendasErr } =
          await vendasQuery;

        if (vendasErr) throw vendasErr;

        // ----- ORÇAMENTOS -----
        const { data: orcData, error: orcErr } = await supabase
          .from("orcamentos")
          .select(
            `
          id,
          data_orcamento,
          data_viagem,
          status,
          valor,
          notas,
          clientes:clientes (id, nome),
          destinos:produtos!destino_id (id, nome)
        `
          )
          .gte("data_orcamento", inicio)
          .lte("data_orcamento", fim)
          .order("data_orcamento", { ascending: false });

        if (orcErr) throw orcErr;

        // ----- METAS -----
        let metasQuery = supabase
          .from("metas_vendedor")
          .select(
            "id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo"
          )
          .gte("periodo", inicio)
          .lte("periodo", fim)
          .eq("ativo", true);

        if (userCtx.vendedorIds.length > 0) {
          metasQuery = metasQuery.in("vendedor_id", userCtx.vendedorIds);
        }
        const { data: metasData, error: metasErr } = await metasQuery;
        if (metasErr) throw metasErr;

        // ----- CLIENTES (aniversariantes) -----
        const { data: clientesData, error: clientesErr } = await supabase
          .from("clientes")
          .select("id, nome, nascimento, telefone");

        if (clientesErr) throw clientesErr;

        setVendas((vendasData || []) as Venda[]);
        setOrcamentos((orcData || []) as Orcamento[]);
        setMetas((metasData || []) as MetaVendedor[]);
        setClientes((clientesData || []) as Cliente[]);

        // ----- WIDGETS (preferências) -----
        try {
          const { data: prefData, error: prefErr } = await supabase
            .from("dashboard_widgets")
            .select("widget, ordem, visivel, settings")
            .eq("usuario_id", userCtx.usuarioId)
            .order("ordem", { ascending: true });
          if (!prefErr && prefData && prefData.length > 0) {
            const ordem = prefData
              .map((p: any) => p.widget as WidgetId)
              .filter((id) => ALL_WIDGETS.some((w) => w.id === id));
            const vis: Record<WidgetId, boolean> = { ...widgetVisible };
            let kpiFromDb: { order?: KpiId[]; visible?: Record<KpiId, boolean> } = {};
            let chartsFromDb: Record<WidgetId, ChartType> | null = null;
            prefData.forEach((p: any) => {
              const id = p.widget as WidgetId;
              if (ALL_WIDGETS.some((w) => w.id === id)) {
                vis[id] = p.visivel !== false;
              }
              if (id === "kpis" && p.settings?.kpis) {
                if (Array.isArray(p.settings.kpis.order)) {
                  kpiFromDb.order = p.settings.kpis.order.filter((kid: any) =>
                    ALL_KPIS.some((k) => k.id === kid)
                  );
                }
                if (p.settings.kpis.visible) {
                  kpiFromDb.visible = { ...kpiVisible, ...p.settings.kpis.visible };
                }
              }
              if (p.settings?.charts) {
                chartsFromDb = { ...(chartsFromDb || {}), ...(p.settings.charts as any) };
              }
            });
            if (ordem.length > 0) setWidgetOrder(ordem);
            setWidgetVisible(vis);
            if (kpiFromDb.order && kpiFromDb.order.length > 0) setKpiOrder(kpiFromDb.order);
            if (kpiFromDb.visible) setKpiVisible(kpiFromDb.visible);
            if (chartsFromDb) setChartPrefs((prev) => ({ ...prev, ...chartsFromDb }));
          } else {
            const local = typeof window !== "undefined"
              ? window.localStorage.getItem("dashboard_widgets")
              : null;
            if (local) {
              const parsed = JSON.parse(local);
              if (parsed.order && parsed.visible) {
                setWidgetOrder(parsed.order);
                setWidgetVisible(parsed.visible);
              }
            }
            const localKpi = typeof window !== "undefined"
              ? window.localStorage.getItem("dashboard_kpis")
              : null;
            if (localKpi) {
              const parsed = JSON.parse(localKpi);
              if (parsed.order) setKpiOrder(parsed.order);
              if (parsed.visible) setKpiVisible(parsed.visible);
            }
            const localCharts = typeof window !== "undefined"
              ? window.localStorage.getItem("dashboard_charts")
              : null;
            if (localCharts) {
              const parsed = JSON.parse(localCharts);
              setChartPrefs((prev) => ({ ...prev, ...parsed }));
            }
          }
        } catch (e) {
          console.warn("Preferências do dashboard não carregadas, usando padrão.", e);
          const local = typeof window !== "undefined"
            ? window.localStorage.getItem("dashboard_widgets")
            : null;
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.order && parsed.visible) {
              setWidgetOrder(parsed.order);
              setWidgetVisible(parsed.visible);
            }
          }
          const localKpi = typeof window !== "undefined"
            ? window.localStorage.getItem("dashboard_kpis")
            : null;
          if (localKpi) {
            const parsed = JSON.parse(localKpi);
            if (parsed.order) setKpiOrder(parsed.order);
            if (parsed.visible) setKpiVisible(parsed.visible);
          }
          const localCharts = typeof window !== "undefined"
            ? window.localStorage.getItem("dashboard_charts")
            : null;
          if (localCharts) {
            const parsed = JSON.parse(localCharts);
            setChartPrefs((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar dados do dashboard.");
      } finally {
        setLoadingDados(false);
      }
    }

    carregarDashboard();
  }, [userCtx, inicio, fim]);

  // ----------------- DERIVADOS: KPI -----------------

  const {
    totalVendas,
    qtdVendas,
    ticketMedio,
    totalDiferenciado,
    totalOrcamentos,
    conversao,
    metaSomada,
    atingimentoMeta,
  } = useMemo(() => {
    let totalVendas = 0;
    let qtdVendas = vendas.length;
    let totalDiferenciado = 0;

    vendas.forEach((v) => {
      const recibos = v.vendas_recibos || [];
      let somaVenda = 0;

      recibos.forEach((r) => {
        const valor = Number(r.valor_total || 0);
        somaVenda += valor;
        const regra =
          r.produtos?.regra_comissionamento?.toLowerCase() || "";
        if (regra === "diferenciado") {
          totalDiferenciado += valor;
        }
      });

      totalVendas += somaVenda;
    });

    const ticketMedio =
      qtdVendas > 0 ? totalVendas / qtdVendas : 0;

    const totalOrcamentos = orcamentos.length;
    const conversao =
      totalOrcamentos > 0
        ? (qtdVendas / totalOrcamentos) * 100
        : 0;

    // metas somadas do período e escopo
    const metaSomada = metas.reduce(
      (acc, m) => acc + Number(m.meta_geral || 0),
      0
    );
    const atingimentoMeta =
      metaSomada > 0 ? (totalVendas / metaSomada) * 100 : 0;

    return {
      totalVendas,
      qtdVendas,
      ticketMedio,
      totalDiferenciado,
      totalOrcamentos,
      conversao,
      metaSomada,
      atingimentoMeta,
    };
  }, [vendas, orcamentos, metas]);

  // ----------------- DERIVADOS: GRÁFICOS -----------------

  const vendasPorDestino = useMemo(() => {
    const map = new Map<string, number>();

    vendas.forEach((v) => {
      const destino = v.destinos?.nome || "Sem destino";
      const totalVenda = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );
      map.set(destino, (map.get(destino) || 0) + totalVenda);
    });

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [vendas]);

  const vendasPorProduto = useMemo(() => {
    const map = new Map<string, number>();

    vendas.forEach((v) => {
      (v.vendas_recibos || []).forEach((r) => {
        const nomeProd = r.produtos?.nome || "Sem produto";
        const valor = Number(r.valor_total || 0);
        map.set(nomeProd, (map.get(nomeProd) || 0) + valor);
      });
    });

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [vendas]);

  const vendasTimeline = useMemo(() => {
    const map = new Map<string, number>();

    vendas.forEach((v) => {
      // Normaliza para o formato YYYY-MM-DD e ignora hora/fuso para evitar rótulos deslocados
      const dia = (v.data_lancamento || "").slice(0, 10);
      if (!dia) return;
      const totalVenda = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );
      map.set(dia, (map.get(dia) || 0) + totalVenda);
    });

    const arr = Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, value]) => {
        const [year, month, day] = date.split("-");
        const label =
          year && month && day
            ? `${day.padStart(2, "0")}/${month.padStart(2, "0")}`
            : date;
        return { date, label, value };
      });

    return arr;
  }, [vendas]);

  // ----------------- DERIVADOS: LISTAS -----------------

  const orcamentosRecentes = useMemo(() => {
    const sorted = [...orcamentos].sort((a, b) =>
      a.data_orcamento < b.data_orcamento ? 1 : -1
    );
    return sorted.slice(0, 10);
  }, [orcamentos]);

  const aniversariantesMes = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth(); // 0-11

    return clientes.filter((c) => {
      if (!c.nascimento) return false;
      const d = new Date(c.nascimento);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === mesAtual;
    });
  }, [clientes]);

  // ----------------- RENDER -----------------

  // Evita ficar preso no estado de carregamento caso o hook demore,
  // liberando a renderização assim que já houver contexto básico.

  if ((loadingUserCtx && !userCtx) || permissaoData.loading) {
    return <div>Carregando contexto do dashboard...</div>;
  }

  if (!permissaoData.ativo) {
    return (
      <div>Você não possui acesso ao módulo de Dashboard.</div>
    );
  }

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "kpis":
        return (
          <div className="card-base card-purple mb-3" style={{ paddingBottom: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              {kpiOrder
                .filter((id) => kpiVisible[id] !== false)
                .map((id) => {
                  switch (id) {
                    case "kpi_vendas_total":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Vendas no período</div>
                          <div className="kpi-value">{formatCurrency(totalVendas)}</div>
                        </div>
                      );
                    case "kpi_qtd_vendas":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Qtd. vendas</div>
                          <div className="kpi-value">{qtdVendas}</div>
                        </div>
                      );
                    case "kpi_ticket_medio":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Ticket médio</div>
                          <div className="kpi-value">{formatCurrency(ticketMedio)}</div>
                        </div>
                      );
                    case "kpi_diferenciado":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Comissão Diferenciada</div>
                          <div className="kpi-value">{formatCurrency(totalDiferenciado)}</div>
                        </div>
                      );
                    case "kpi_orcamentos":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Orçamentos</div>
                          <div className="kpi-value">{totalOrcamentos}</div>
                        </div>
                      );
                    case "kpi_conversao":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Conv. Orç → Vendas</div>
                          <div className="kpi-value">{conversao.toFixed(1)}%</div>
                        </div>
                      );
                    case "kpi_meta":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Meta somada (R$)</div>
                          <div className="kpi-value">{formatCurrency(metaSomada)}</div>
                        </div>
                      );
                    case "kpi_atingimento":
                      return (
                        <div
                          className="kpi-card"
                          key={id}
                          style={{ display: "flex", flexDirection: "column", gap: 4 }}
                        >
                          <div className="kpi-label">Atingimento da meta</div>
                          <div className="kpi-value">{atingimentoMeta.toFixed(1)}%</div>
                        </div>
                      );
                    default:
                      return null;
                  }
                })}
            </div>
          </div>
        );
      case "vendas_destino":
        return (
          <div className="card-base card-purple mb-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ marginBottom: 8 }}>Vendas por destino</h3>
              <select
                className="form-select"
                style={{ maxWidth: 160 }}
                value={chartPrefs.vendas_destino || "pie"}
                onChange={(e) => alterarChart("vendas_destino", e.target.value as ChartType)}
              >
                <option value="pie">Pizza</option>
                <option value="bar">Barras</option>
              </select>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              {vendasPorDestino.length === 0 ? (
                <div style={{ fontSize: "0.9rem" }}>Sem dados para o período.</div>
              ) : chartPrefs.vendas_destino === "bar" ? (
                <ResponsiveContainer>
                  <BarChart data={vendasPorDestino}>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                    <Bar dataKey="value">
                      {vendasPorDestino.map((entry, index) => (
                        <Cell key={`cell-dest-${index}`} fill={COLORS_PURPLE[index % COLORS_PURPLE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={vendasPorDestino}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={(entry) => `${entry.name} (${formatCurrency(entry.value)})`}
                    >
                      {vendasPorDestino.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_PURPLE[index % COLORS_PURPLE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );
      case "vendas_produto":
        return (
          <div className="card-base card-purple mb-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ marginBottom: 8 }}>Vendas por produto</h3>
              <select
                className="form-select"
                style={{ maxWidth: 160 }}
                value={chartPrefs.vendas_produto || "bar"}
                onChange={(e) => alterarChart("vendas_produto", e.target.value as ChartType)}
              >
                <option value="bar">Barras</option>
                <option value="pie">Pizza</option>
              </select>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              {vendasPorProduto.length === 0 ? (
                <div style={{ fontSize: "0.9rem" }}>Sem dados para o período.</div>
              ) : chartPrefs.vendas_produto === "pie" ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={vendasPorProduto}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label={(entry) => `${entry.name} (${formatCurrency(entry.value)})`}
                    >
                      {vendasPorProduto.map((entry, index) => (
                        <Cell key={`cell-prod-pie-${index}`} fill={COLORS_PURPLE[index % COLORS_PURPLE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer>
                  <BarChart data={vendasPorProduto}>
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                    <Bar dataKey="value">
                      {vendasPorProduto.map((entry, index) => (
                        <Cell key={`cell-prod-${index}`} fill={COLORS_PURPLE[index % COLORS_PURPLE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );
      case "timeline":
        return (
          <div className="card-base card-purple mb-3">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ marginBottom: 8 }}>Evolução das vendas no período</h3>
              <select
                className="form-select"
                style={{ maxWidth: 160 }}
                value={chartPrefs.timeline || "line"}
                onChange={(e) => alterarChart("timeline", e.target.value as ChartType)}
              >
                <option value="line">Linha</option>
                <option value="bar">Barras</option>
              </select>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              {vendasTimeline.length === 0 ? (
                <div style={{ fontSize: "0.9rem" }}>Sem dados para o período.</div>
              ) : chartPrefs.timeline === "bar" ? (
                <ResponsiveContainer>
                  <BarChart data={vendasTimeline}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                    <Bar dataKey="value">
                      {vendasTimeline.map((entry, index) => (
                        <Cell key={`cell-time-${index}`} fill={COLORS_PURPLE[index % COLORS_PURPLE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer>
                  <LineChart data={vendasTimeline}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value || 0))} />
                    <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );
      case "orcamentos":
        return (
          <div className="card-base card-purple mb-3">
            <h3 style={{ marginBottom: 8 }}>Orçamentos recentes ({orcamentosRecentes.length})</h3>
            <div className="table-container overflow-x-auto">
              <table className="table-default min-w-[680px]">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Destino</th>
                    <th>Status</th>
                    <th>Valor</th>
                    <th>Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentosRecentes.length === 0 && (
                    <tr>
                      <td colSpan={6}>Nenhum orçamento no período.</td>
                    </tr>
                  )}
                  {orcamentosRecentes.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.data_orcamento
                          ? new Date(o.data_orcamento).toLocaleDateString("pt-BR")
                          : "-"}
                      </td>
                      <td>{o.clientes?.nome || "-"}</td>
                      <td>{o.destinos?.nome || "-"}</td>
                      <td>{o.status || "-"}</td>
                      <td>{formatCurrency(Number(o.valor || 0))}</td>
                      <td>
                        <button className="btn btn-light" onClick={() => setOrcamentoSelecionado(o)}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case "aniversariantes":
        return (
          <div className="card-base card-purple mb-3">
            <h3 style={{ marginBottom: 8 }}>Aniversariantes do mês ({aniversariantesMes.length})</h3>
            <div className="table-container overflow-x-auto">
              <table className="table-default min-w-[520px]">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Data nasc.</th>
                    <th>Idade</th>
                    <th>Telefone</th>
                    <th>Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {aniversariantesMes.length === 0 && (
                    <tr>
                      <td colSpan={5}>Nenhum aniversariante este mês.</td>
                    </tr>
                  )}
                  {aniversariantesMes.map((c) => {
                    const idade = calcularIdade(c.nascimento);
                    return (
                      <tr key={c.id}>
                        <td>{c.nome}</td>
                        <td>
                          {c.nascimento
                            ? new Date(c.nascimento).toLocaleDateString("pt-BR")
                            : "-"}
                        </td>
                        <td>{idade ?? "-"}</td>
                        <td>{c.telefone || "-"}</td>
                        <td>
                          <button className="btn btn-light" onClick={() => setClienteSelecionado(c)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className="dashboard-geral-page">
      {/* CONTROLES DE PERÍODO */}
      <div className="card-base card-purple mb-3">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-light"
            style={{
              backgroundColor:
                presetPeriodo === "mes_atual"
                  ? "#4f46e5"
                  : undefined,
              color:
                presetPeriodo === "mes_atual"
                  ? "#e5e7eb"
                  : undefined,
            }}
            onClick={() => aplicarPreset("mes_atual")}
          >
            Mês atual
          </button>
          <button
            type="button"
            className="btn btn-light"
            style={{
              backgroundColor:
                presetPeriodo === "ultimos_30"
                  ? "#4f46e5"
                  : undefined,
              color:
                presetPeriodo === "ultimos_30"
                  ? "#e5e7eb"
                  : undefined,
            }}
            onClick={() => aplicarPreset("ultimos_30")}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            className="btn btn-light"
            style={{
              backgroundColor:
                presetPeriodo === "personalizado"
                  ? "#4f46e5"
                  : undefined,
              color:
                presetPeriodo === "personalizado"
                  ? "#e5e7eb"
                  : undefined,
            }}
            onClick={() => setPresetPeriodo("personalizado")}
          >
            Personalizado
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCustomize(true)}
          >
            Personalizar dashboard
          </button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Data início</label>
            <input
              type="date"
              className="form-input"
              value={inicio}
              onChange={(e) => {
                setPresetPeriodo("personalizado");
                setInicio(e.target.value);
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Data fim</label>
            <input
              type="date"
              className="form-input"
              value={fim}
              onChange={(e) => {
                setPresetPeriodo("personalizado");
                setFim(e.target.value);
              }}
            />
          </div>
        </div>
      </div>

      {/* KPIs em largura total */}
      {widgetAtivo("kpis") && <div>{renderWidget("kpis")}</div>}

      {/* Linha de gráficos */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {widgetOrder
          .filter((id) => ["vendas_destino", "vendas_produto", "timeline"].includes(id) && widgetAtivo(id as WidgetId))
          .map((id) => (
            <div key={id}>{renderWidget(id as WidgetId)}</div>
          ))}
      </div>

      {/* Linha de tabelas/listas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {widgetOrder
          .filter((id) => ["orcamentos", "aniversariantes"].includes(id) && widgetAtivo(id as WidgetId))
          .map((id) => (
            <div key={id}>{renderWidget(id as WidgetId)}</div>
          ))}
      </div>

      {showCustomize && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "95%",
              maxWidth: 520,
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: 10,
              padding: 16,
              color: "#e5e7eb",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 12,
                alignItems: "center",
              }}
            >
              <h3>Personalizar dashboard</h3>
              <button className="btn btn-light" onClick={() => setShowCustomize(false)}>
                Fechar
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {widgetOrder.map((id, idx) => {
                const meta = ALL_WIDGETS.find((w) => w.id === id);
                if (!meta) return null;
                return (
                  <div
                    key={id}
                    style={{
                      border: "1px solid #1f2937",
                      borderRadius: 8,
                      padding: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={widgetAtivo(id)}
                        onChange={() => toggleWidget(id)}
                      />
                      <div style={{ flex: 1 }}>{meta.titulo}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => moverWidget(id, "up")}
                          disabled={idx === 0}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => moverWidget(id, "down")}
                          disabled={idx === widgetOrder.length - 1}
                        >
                          ↓
                        </button>
                      </div>
                    </div>

                    {id === "kpis" && widgetAtivo(id) && (
                      <div
                        style={{
                          width: "100%",
                          borderTop: "1px solid #1f2937",
                          paddingTop: 8,
                          marginTop: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          KPIs visíveis e ordem
                        </div>
                        {kpiOrder.map((kid, kidx) => {
                          const metaKpi = ALL_KPIS.find((k) => k.id === kid);
                          if (!metaKpi) return null;
                          return (
                            <div
                              key={kid}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={kpiVisible[kid] !== false}
                                onChange={() => toggleKpi(kid)}
                              />
                              <div style={{ flex: 1 }}>{metaKpi.titulo}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => moverKpi(kid, "up")}
                                  disabled={kidx === 0}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-light"
                                  onClick={() => moverKpi(kid, "down")}
                                  disabled={kidx === kpiOrder.length - 1}
                                >
                                  ↓
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ORÇAMENTO */}
      {orcamentoSelecionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "95%",
              maxWidth: 700,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#020617",
              borderRadius: 10,
              border: "1px solid #1f2937",
              padding: 18,
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <h3>Detalhes do orçamento</h3>
              <button
                className="btn btn-light"
                onClick={() => setOrcamentoSelecionado(null)}
              >
                Fechar
              </button>
            </div>

            <p>
              <strong>Cliente:</strong>{" "}
              {orcamentoSelecionado.clientes?.nome || "-"}
            </p>
            <p>
              <strong>Destino:</strong>{" "}
              {orcamentoSelecionado.destinos?.nome || "-"}
            </p>
            <p>
              <strong>Data orçamento:</strong>{" "}
              {orcamentoSelecionado.data_orcamento
                ? new Date(
                    orcamentoSelecionado.data_orcamento
                  ).toLocaleDateString("pt-BR")
                : "-"}
            </p>
            <p>
              <strong>Data viagem:</strong>{" "}
              {orcamentoSelecionado.data_viagem
                ? new Date(
                    orcamentoSelecionado.data_viagem
                  ).toLocaleDateString("pt-BR")
                : "-"}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {orcamentoSelecionado.status || "-"}
            </p>
            <p>
              <strong>Valor:</strong>{" "}
              {formatCurrency(
                Number(orcamentoSelecionado.valor || 0)
              )}
            </p>
            {orcamentoSelecionado.notas && (
              <p style={{ marginTop: 8 }}>
                <strong>Notas:</strong>{" "}
                {orcamentoSelecionado.notas}
              </p>
            )}
          </div>
        </div>
      )}

      {/* MODAL CLIENTE */}
      {clienteSelecionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "95%",
              maxWidth: 600,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#020617",
              borderRadius: 10,
              border: "1px solid #1f2937",
              padding: 18,
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <h3>Dados do cliente</h3>
              <button
                className="btn btn-light"
                onClick={() => setClienteSelecionado(null)}
              >
                Fechar
              </button>
            </div>

            <p>
              <strong>Nome:</strong> {clienteSelecionado.nome}
            </p>
            <p>
              <strong>Nascimento:</strong>{" "}
              {clienteSelecionado.nascimento
                ? new Date(
                    clienteSelecionado.nascimento
                  ).toLocaleDateString("pt-BR")
                : "-"}
            </p>
            <p>
              <strong>Idade:</strong>{" "}
              {calcularIdade(clienteSelecionado.nascimento) ??
                "-"}
            </p>
            <p>
              <strong>Telefone:</strong>{" "}
              {clienteSelecionado.telefone || "-"}
            </p>
          </div>
        </div>
      )}

      {loadingDados && (
        <div style={{ marginTop: 12, fontSize: "0.9rem" }}>
          Carregando dados do dashboard...
        </div>
      )}
    </div>
  );
};

export default DashboardGeralIsland;
