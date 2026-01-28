import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import { formatarDataParaExibicao } from "../../lib/formatDate";

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
  scope?: string | null;
};

type Usuario = {
  id: string;
  nome_completo: string;
};

type Orcamento = {
  id: string;
  created_at: string;
  status: string | null;
  total: number | null;
  cliente?: { nome?: string | null } | null;
  quote_item?: {
    id?: string;
    title?: string | null;
    product_name?: string | null;
    item_type?: string | null;
    city_name?: string | null;
  }[] | null;
};

type Viagem = {
  id: string;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  destino: string | null;
  clientes?: { nome: string | null } | null;
};

type FollowUpVenda = {
  id: string;
  data_final: string | null;
  clientes?: { nome: string | null } | null;
  destino_cidade?: { nome: string | null } | null;
};

type Cliente = {
  id: string;
  nome: string;
  nascimento: string | null;
  telefone: string | null;
};

// ---------- Helpers ----------
function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getOrcamentoDestino(orc?: Orcamento | null) {
  const item = (orc?.quote_item || [])[0];
  if (!item) return "-";
  return (
    item.city_name ||
    item.product_name ||
    item.title ||
    item.item_type ||
    "-"
  );
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
  const podeVerOperacao = can("Operacao");

  const [papel, setPapel] = useState<Papel>("OUTRO");

  const [equipeIds, setEquipeIds] = useState<string[]>([]);
  const [equipeNomes, setEquipeNomes] = useState<Record<string, string>>({});

  // período
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  // dados
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpVenda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
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

          const equipe = Array.from(new Set([auth.user.id, ...(vendedores || [])]));
          setEquipeIds(equipe);

          // buscar nomes
          const { data: nomes } = await supabase
            .from("users")
            .select("id, nome_completo")
            .in("id", equipe);

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
        const equipeFiltro =
          papel === "GESTOR" && equipeIds.length > 0 ? equipeIds : [];

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
        if (papel === "GESTOR" && equipeFiltro.length > 0) {
          q = q.in("vendedor_id", equipeFiltro);
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

        if (papel === "GESTOR" && equipeFiltro.length > 0) {
          qMeta = qMeta.in("vendedor_id", equipeFiltro);
        }

        const { data: metasData, error: mErr } = await qMeta;
        if (mErr) throw mErr;

        setMetas(metasData || []);

        // ORÇAMENTOS
        let orcamentosQuery = supabase
          .from("quote")
          .select(
            "id, created_at, status, total, client_id, cliente:client_id (nome), quote_item (id, title, product_name, item_type, city_name)"
          )
          .gte("created_at", inicio)
          .lte("created_at", fim)
          .order("created_at", { ascending: false })
          .limit(20);
        if (papel === "GESTOR" && equipeFiltro.length > 0) {
          orcamentosQuery = orcamentosQuery.in("created_by", equipeFiltro);
        }
        const { data: orcData, error: orcErr } = await orcamentosQuery;
        if (orcErr) throw orcErr;
        setOrcamentos((orcData || []) as Orcamento[]);

        // FOLLOW-UP
        const hoje = new Date();
        const ontem = new Date(hoje);
        ontem.setDate(hoje.getDate() - 1);
        const ontemIso = ontem.toISOString().slice(0, 10);
        const fimFollowUp = fim && fim < ontemIso ? fim : ontemIso;
        let followUpData: FollowUpVenda[] = [];
        if (fimFollowUp >= inicio) {
          try {
            let followUpQuery = supabase
              .from("vendas")
              .select(
                `
                id,
                data_final,
                vendedor_id,
                clientes:clientes (nome),
                destino_cidade:cidades!destino_cidade_id (nome)
              `
              )
              .not("data_final", "is", null)
              .gte("data_final", inicio)
              .lte("data_final", fimFollowUp)
              .eq("cancelada", false)
              .order("data_final", { ascending: false })
              .limit(20);
            if (papel === "GESTOR" && equipeFiltro.length > 0) {
              followUpQuery = followUpQuery.in("vendedor_id", equipeFiltro);
            }
            const { data: followUpResp, error: followUpErr } = await followUpQuery;
            if (followUpErr) throw followUpErr;
            followUpData = (followUpResp || []) as FollowUpVenda[];
          } catch (followErr) {
            console.warn("Não foi possível carregar follow-up:", followErr);
            followUpData = [];
          }
        }
        setFollowUps(followUpData);

        // CLIENTES (aniversariantes)
        const { data: clientesData, error: clientesErr } = await supabase
          .from("clientes")
          .select("id, nome, nascimento, telefone");
        if (clientesErr) throw clientesErr;
        setClientes((clientesData || []) as Cliente[]);

        // VIAGENS (próximas)
        if (!podeVerOperacao) {
          setViagens([]);
        } else {
          try {
            const hojeIso = new Date().toISOString().slice(0, 10);
            const limiteData = new Date();
            limiteData.setDate(limiteData.getDate() + 14);
            const limiteIso = limiteData.toISOString().slice(0, 10);
            let viagensQuery = supabase
              .from("viagens")
              .select(
                `
                id,
                data_inicio,
                data_fim,
                status,
                destino,
                responsavel_user_id,
                clientes:clientes (nome)
              `
              )
              .gte("data_inicio", hojeIso)
              .lte("data_inicio", limiteIso)
              .order("data_inicio", { ascending: true })
              .limit(20);
            if (papel === "GESTOR" && equipeFiltro.length > 0) {
              viagensQuery = viagensQuery.in("responsavel_user_id", equipeFiltro);
            }
            const { data: viagensData, error: viagensErr } = await viagensQuery;
            if (viagensErr) throw viagensErr;
            setViagens((viagensData || []) as Viagem[]);
          } catch (viagensErr) {
            console.warn("Não foi possível carregar viagens:", viagensErr);
            setViagens([]);
          }
        }
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

  const orcamentosRecentes = useMemo(() => {
    return [...orcamentos]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5);
  }, [orcamentos]);

  const followUpsRecentes = useMemo(() => {
    return [...followUps]
      .sort((a, b) => (a.data_final || "").localeCompare(b.data_final || ""))
      .reverse()
      .slice(0, 5);
  }, [followUps]);

  const viagensProximas = useMemo(() => {
    return [...viagens]
      .sort((a, b) => (a.data_inicio || "").localeCompare(b.data_inicio || ""))
      .slice(0, 5);
  }, [viagens]);

  const aniversariantesMes = useMemo(() => {
    const mesAtual = new Date().getMonth();
    return clientes
      .filter((c) => {
        if (!c.nascimento) return false;
        const data = new Date(c.nascimento);
        if (Number.isNaN(data.getTime())) return false;
        return data.getMonth() === mesAtual;
      })
      .sort((a, b) => {
        const da = a.nascimento ? new Date(a.nascimento).getDate() : 0;
        const db = b.nascimento ? new Date(b.nascimento).getDate() : 0;
        return da - db;
      })
      .slice(0, 5);
  }, [clientes]);

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

      {/* VENDAS POR CONSULTOR */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>Vendas por consultor</h3>
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
        >
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={rankingEquipe.map((r) => ({ name: r.nome, total: r.total }))}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={90}
                >
                  {rankingEquipe.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value || 0))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={rankingEquipe.map((r) => ({ name: r.nome, total: r.total }))}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value || 0))}
                />
                <Bar dataKey="total" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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

      {/* ORÇAMENTOS RECENTES */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>
          Orçamentos recentes ({orcamentosRecentes.length})
        </h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default min-w-[520px]">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamentosRecentes.length === 0 && (
                <tr>
                  <td colSpan={4}>Nenhum orçamento no período.</td>
                </tr>
              )}
              {orcamentosRecentes.map((o) => (
                <tr key={o.id}>
                  <td>{formatarDataParaExibicao(o.created_at)}</td>
                  <td>{o.cliente?.nome || "—"}</td>
                  <td>{getOrcamentoDestino(o)}</td>
                  <td>{formatCurrency(Number(o.total || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRÓXIMAS VIAGENS */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>
          Próximas viagens ({viagensProximas.length})
        </h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default min-w-[520px]">
            <thead>
              <tr>
                <th>Início</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {viagensProximas.length === 0 && (
                <tr>
                  <td colSpan={4}>Nenhuma viagem nos próximos dias.</td>
                </tr>
              )}
              {viagensProximas.map((v) => (
                <tr key={v.id}>
                  <td>{formatarDataParaExibicao(v.data_inicio)}</td>
                  <td>{v.clientes?.nome || "—"}</td>
                  <td>{v.destino || "—"}</td>
                  <td>{v.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOLLOW-UP */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>
          Follow-up ({followUpsRecentes.length})
        </h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default min-w-[520px]">
            <thead>
              <tr>
                <th>Retorno</th>
                <th>Cliente</th>
                <th>Destino</th>
              </tr>
            </thead>
            <tbody>
              {followUpsRecentes.length === 0 && (
                <tr>
                  <td colSpan={3}>Nenhum follow-up no período.</td>
                </tr>
              )}
              {followUpsRecentes.map((f) => (
                <tr key={f.id}>
                  <td>{formatarDataParaExibicao(f.data_final)}</td>
                  <td>{f.clientes?.nome || "—"}</td>
                  <td>{f.destino_cidade?.nome || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ANIVERSARIANTES */}
      <div className="card-base card-purple mb-3">
        <h3 style={{ marginBottom: 8 }}>
          Aniversariantes do mês ({aniversariantesMes.length})
        </h3>
        <div className="table-container overflow-x-auto">
          <table className="table-default min-w-[520px]">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Data</th>
                <th>Telefone</th>
              </tr>
            </thead>
            <tbody>
              {aniversariantesMes.length === 0 && (
                <tr>
                  <td colSpan={3}>Nenhum aniversariante este mês.</td>
                </tr>
              )}
              {aniversariantesMes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{formatarDataParaExibicao(c.nascimento)}</td>
                  <td>{c.telefone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loadingDados && <div>Carregando...</div>}

      {erro && (
        <div className="card-base card-config">{erro}</div>
      )}
    </div>
  );
}
