import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

type Papel = "ADMIN" | "GESTOR" | "VENDEDOR" | "OUTRO";

// ---------- Types ----------
type Venda = {
  id: string;
  data_lancamento: string;
  vendedor_id: string | null;
  clientes?: { nome: string | null } | null;
  destinos?: { nome: string | null } | null;
  vendas_recibos?: {
    id: string;
    valor_total: number | null;
    produtos?: { nome: string | null } | null;
  }[];
};

type Meta = {
  vendedor_id: string;
  meta_geral: number;
};

type Usuario = {
  id: string;
  nome_completo: string;
};

// ---------- Helpers ----------
function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", {
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

const COLORS = ["#7c3aed", "#a855f7", "#818cf8", "#ec4899", "#22c55e"];

// =====================================================================
// DASHBOARD DO GESTOR
// =====================================================================

export default function DashboardGestorIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("Dashboard");

  const [papel, setPapel] = useState<Papel>("OUTRO");
  const [userId, setUserId] = useState("");

  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [equipeNomes, setEquipeNomes] = useState<Record<string, string>>({});

  // período
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  // dados
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loadingDados, setLoadingDados] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // INIT período
  useEffect(() => {
    const { inicio, fim } = getMonthBounds();
    setInicio(inicio);
    setFim(fim);
  }, []);

  // =====================================================================
  // Carregar papel + equipe do gestor
  // =====================================================================

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setErro("Usuário não autenticado.");
          return;
        }

        setUserId(auth.user.id);

        // buscar tipo
        const { data: u, error: errU } = await supabase
          .from("users")
          .select("id, nome_completo, user_types(name)")
          .eq("id", auth.user.id)
          .maybeSingle();

        if (errU) throw errU;

        const tipo =
          (u as any)?.user_types?.name?.toUpperCase() || "";

        let papel: Papel = "OUTRO";
        if (tipo.includes("ADMIN")) papel = "ADMIN";
        else if (tipo.includes("GESTOR")) papel = "GESTOR";
        else if (tipo.includes("VENDEDOR")) papel = "VENDEDOR";

        setPapel(papel);

        // ---------- SE FOR GESTOR -> CARREGA A EQUIPE ----------
        if (papel === "GESTOR") {
          const { data: eq, error: eqErr } = await supabase
            .from("gestor_vendedor")
            .select("vendedor_id")
            .eq("gestor_id", auth.user.id);

          if (eqErr) throw eqErr;

          const vendedores = eq
            ?.map((i: any) => i.vendedor_id)
            .filter(Boolean);

          setEquipeIds(vendedores);

          // buscar nomes
          const { data: nomes } = await supabase
            .from("users")
            .select("id, nome_completo")
            .in("id", vendedores);

          const map: Record<string, string> = {};
          nomes?.forEach((n) => {
            map[n.id] = n.nome_completo;
          });

          setEquipeNomes(map);
        }
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar contexto do gestor.");
      }
    }

    loadUser();
  }, [papel]);

  // =====================================================================
  // CARREGAR DADOS (VENDAS + METAS)
  // =====================================================================

  useEffect(() => {
    if (!inicio || !fim || (papel !== "GESTOR" && papel !== "ADMIN"))
      return;

    async function loadAll() {
      try {
        setLoadingDados(true);
        setErro(null);

        // VENDAS
        let q = supabase
          .from("vendas")
          .select(
            `
          id,
          data_lancamento,
          vendedor_id,
          clientes:clientes (nome),
          destinos:produtos!destino_id (nome),
          vendas_recibos (
            id,
            valor_total,
            produtos:tipo_produtos!produto_id (nome)
          )
        `
          )
          .gte("data_lancamento", inicio)
          .lte("data_lancamento", fim)
          .eq("cancelada", false);

        // gestor vê equipe – admin vê tudo
        if (papel === "GESTOR" && equipeIds.length > 0) {
          q = q.in("vendedor_id", equipeIds);
        }

        const { data: vendasData, error: vErr } = await q;
        if (vErr) throw vErr;

        setVendas(vendasData || []);

        // METAS
        // metas individuais e de equipe (gestor)
        let qMeta = supabase
          .from("metas_vendedor")
          .select("vendedor_id, meta_geral, scope")
          .gte("periodo", inicio)
          .lte("periodo", fim)
          .eq("ativo", true);

        if (papel === "GESTOR" && equipeIds.length > 0) {
          qMeta = qMeta.in("vendedor_id", equipeIds);
        }

        const { data: metasData, error: mErr } = await qMeta;
        if (mErr) throw mErr;

        setMetas(metasData || []);
      } catch (e: any) {
        console.error(e);
        setErro("Erro ao carregar dados do dashboard do gestor.");
      } finally {
        setLoadingDados(false);
      }
    }

    loadAll();
  }, [inicio, fim, equipeIds, papel]);

  // =====================================================================
  // KPIs DERIVADOS DO GESTOR
  // =====================================================================

  const {
    totalTeamSales,
    totalTeamDeals,
    ticketMedioEquipe,
    metaEquipe,
    atingimentoEquipe,
    rankingEquipe,
  } = useMemo(() => {
    let totalTeamSales = 0;
    const porVendedor: Record<string, number> = {};
    let metaEquipeAgregada = 0;

    vendas.forEach((v) => {
      const totalVenda = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );

      totalTeamSales += totalVenda;

      const vid = v.vendedor_id || "0";
      porVendedor[vid] = (porVendedor[vid] || 0) + totalVenda;
    });

    metas.forEach((m) => {
      // metas de escopo equipe contam como meta total da equipe (gestor)
      if (m.scope === "equipe") {
        metaEquipeAgregada += Number(m.meta_geral || 0);
      } else {
        // metas individuais somam no total se pertencem à equipe
        metaEquipeAgregada += Number(m.meta_geral || 0);
      }
    });

    const totalTeamDeals = vendas.length;

    const ticketMedioEquipe =
      totalTeamDeals > 0 ? totalTeamSales / totalTeamDeals : 0;

    const atingimento =
      metaEquipeAgregada > 0 ? (totalTeamSales / metaEquipeAgregada) * 100 : 0;

    const ranking = Object.entries(porVendedor)
      .map(([id, tot]) => ({
        vendedor_id: id,
        nome: equipeNomes[id] || "Vendedor",
        total: tot,
      }))
      .sort((a, b) => (a.total < b.total ? 1 : -1));

    return {
      totalTeamSales,
      totalTeamDeals,
      ticketMedioEquipe,
      metaEquipe: metaEquipeAgregada,
      atingimentoEquipe: atingimento,
      rankingEquipe: ranking,
    };
  }, [vendas, metas, equipeNomes]);

  // =====================================================================
  // RENDER
  // =====================================================================

  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!podeVer) return <div>Você não possui acesso ao Dashboard.</div>;

  if (papel !== "GESTOR" && papel !== "ADMIN") {
    return (
      <div style={{ padding: 20 }}>
        <h3>Somente Gestores podem acessar este dashboard.</h3>
      </div>
    );
  }

  return (
    <div className="dashboard-geral-page">

      {/* INDICADOR */}
      <div
        style={{
          marginBottom: 15,
          padding: "12px 16px",
          borderRadius: 8,
          background: "#312e81",
          border: "1px solid #4338ca",
          color: "#e0e7ff",
        }}
      >
        <strong>Dashboard do Gestor</strong> — período:
        <span style={{ marginLeft: 6 }}>
          {new Date(inicio).toLocaleDateString("pt-BR")} até{" "}
          {new Date(fim).toLocaleDateString("pt-BR")}
        </span>
      </div>

      {/* KPIs */}
      <div className="card-base card-purple mb-3">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
            gap: 10,
          }}
        >
          <div className="kpi-card">
            <div className="kpi-label">Vendas da equipe</div>
            <div className="kpi-value">{formatCurrency(totalTeamSales)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Qtd. Vendas</div>
            <div className="kpi-value">{totalTeamDeals}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Ticket médio</div>
            <div className="kpi-value">{formatCurrency(ticketMedioEquipe)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Meta da equipe</div>
            <div className="kpi-value">{formatCurrency(metaEquipe)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-label">Atingimento</div>
            <div className="kpi-value">{atingimentoEquipe.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* RANKING DA EQUIPE */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>Ranking da equipe</h3>

        <div className="table-container overflow-x-auto">
          <table className="table-default min-w-[480px]">
            <thead>
              <tr>
                <th>Vendedor</th>
                <th>Total vendido</th>
              </tr>
            </thead>

            <tbody>
              {rankingEquipe.length === 0 && (
                <tr>
                  <td colSpan={2}>Sem vendas no período.</td>
                </tr>
              )}

              {rankingEquipe.map((item, idx) => (
                <tr key={item.vendedor_id}>
                  <td>
                    #{idx + 1} — {item.nome}
                  </td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GRÁFICO TIMELINE DA EQUIPE */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>
          Evolução de vendas da equipe
        </h3>

        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart
              data={rankingEquipe.map((r, i) => ({
                name: r.nome,
                total: r.total,
              }))}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: any) =>
                  formatCurrency(Number(value || 0))
                }
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#a855f7"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loadingDados && <div>Carregando...</div>}

      {erro && (
        <div className="card-base card-config">{erro}</div>
      )}
    </div>
  );
}
