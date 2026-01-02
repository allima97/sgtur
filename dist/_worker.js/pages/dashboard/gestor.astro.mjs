globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_Cob7n0Cm.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_m0KiXmHP.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_DZ5sCzw7.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_DxUIN8pq.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DxUIN8pq.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_B808B4Oq.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_B9z1wb0a.mjs';
import { R as ResponsiveContainer, L as LineChart, X as XAxis, Y as YAxis, T as Tooltip, a as Line } from '../../chunks/LineChart_BFD1u74K.mjs';

function formatCurrency(v) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
function getMonthBounds() {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISO = (d) => d.toISOString().substring(0, 10);
  return { inicio: toISO(start), fim: toISO(end) };
}
function DashboardGestorIsland() {
  const { ativo, loading: loadingPerm } = usePermissao("Dashboard");
  const [papel, setPapel] = reactExports.useState("OUTRO");
  const [userId, setUserId] = reactExports.useState("");
  const [equipeIds, setEquipeIds] = reactExports.useState([]);
  const [equipeNomes, setEquipeNomes] = reactExports.useState({});
  const [inicio, setInicio] = reactExports.useState("");
  const [fim, setFim] = reactExports.useState("");
  const [vendas, setVendas] = reactExports.useState([]);
  const [metas, setMetas] = reactExports.useState([]);
  const [loadingDados, setLoadingDados] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const { inicio: inicio2, fim: fim2 } = getMonthBounds();
    setInicio(inicio2);
    setFim(fim2);
  }, []);
  reactExports.useEffect(() => {
    async function loadUser() {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setErro("Usuário não autenticado.");
          return;
        }
        setUserId(auth.user.id);
        const { data: u, error: errU } = await supabase.from("users").select("id, nome_completo, user_types(name)").eq("id", auth.user.id).maybeSingle();
        if (errU) throw errU;
        const tipo = u?.user_types?.name?.toUpperCase() || "";
        let papel2 = "OUTRO";
        if (tipo.includes("ADMIN")) papel2 = "ADMIN";
        else if (tipo.includes("GESTOR")) papel2 = "GESTOR";
        else if (tipo.includes("VENDEDOR")) papel2 = "VENDEDOR";
        setPapel(papel2);
        if (papel2 === "GESTOR") {
          const { data: eq, error: eqErr } = await supabase.from("gestor_vendedor").select("vendedor_id").eq("gestor_id", auth.user.id);
          if (eqErr) throw eqErr;
          const vendedores = eq?.map((i) => i.vendedor_id).filter(Boolean);
          setEquipeIds(vendedores);
          const { data: nomes } = await supabase.from("users").select("id, nome_completo").in("id", vendedores);
          const map = {};
          nomes?.forEach((n) => {
            map[n.id] = n.nome_completo;
          });
          setEquipeNomes(map);
        }
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar contexto do gestor.");
      }
    }
    loadUser();
  }, [papel]);
  reactExports.useEffect(() => {
    if (!inicio || !fim || papel !== "GESTOR" && papel !== "ADMIN")
      return;
    async function loadAll() {
      try {
        setLoadingDados(true);
        setErro(null);
        let q = supabase.from("vendas").select(
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
        ).gte("data_lancamento", inicio).lte("data_lancamento", fim).eq("cancelada", false);
        if (papel === "GESTOR" && equipeIds.length > 0) {
          q = q.in("vendedor_id", equipeIds);
        }
        const { data: vendasData, error: vErr } = await q;
        if (vErr) throw vErr;
        setVendas(vendasData || []);
        let qMeta = supabase.from("metas_vendedor").select("vendedor_id, meta_geral, scope").gte("periodo", inicio).lte("periodo", fim).eq("ativo", true);
        if (papel === "GESTOR" && equipeIds.length > 0) {
          qMeta = qMeta.in("vendedor_id", equipeIds);
        }
        const { data: metasData, error: mErr } = await qMeta;
        if (mErr) throw mErr;
        setMetas(metasData || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados do dashboard do gestor.");
      } finally {
        setLoadingDados(false);
      }
    }
    loadAll();
  }, [inicio, fim, equipeIds, papel]);
  const {
    totalTeamSales,
    totalTeamDeals,
    ticketMedioEquipe,
    metaEquipe,
    atingimentoEquipe,
    rankingEquipe
  } = reactExports.useMemo(() => {
    let totalTeamSales2 = 0;
    const porVendedor = {};
    let metaEquipeAgregada = 0;
    vendas.forEach((v) => {
      const totalVenda = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );
      totalTeamSales2 += totalVenda;
      const vid = v.vendedor_id || "0";
      porVendedor[vid] = (porVendedor[vid] || 0) + totalVenda;
    });
    metas.forEach((m) => {
      if (m.scope === "equipe") {
        metaEquipeAgregada += Number(m.meta_geral || 0);
      } else {
        metaEquipeAgregada += Number(m.meta_geral || 0);
      }
    });
    const totalTeamDeals2 = vendas.length;
    const ticketMedioEquipe2 = totalTeamDeals2 > 0 ? totalTeamSales2 / totalTeamDeals2 : 0;
    const atingimento = metaEquipeAgregada > 0 ? totalTeamSales2 / metaEquipeAgregada * 100 : 0;
    const ranking = Object.entries(porVendedor).map(([id, tot]) => ({
      vendedor_id: id,
      nome: equipeNomes[id] || "Vendedor",
      total: tot
    })).sort((a, b) => a.total < b.total ? 1 : -1);
    return {
      totalTeamSales: totalTeamSales2,
      totalTeamDeals: totalTeamDeals2,
      ticketMedioEquipe: ticketMedioEquipe2,
      metaEquipe: metaEquipeAgregada,
      atingimentoEquipe: atingimento,
      rankingEquipe: ranking
    };
  }, [vendas, metas, equipeNomes]);
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao Dashboard." });
  if (papel !== "GESTOR" && papel !== "ADMIN") {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Somente Gestores podem acessar este dashboard." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-geral-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          marginBottom: 15,
          padding: "12px 16px",
          borderRadius: 8,
          background: "#312e81",
          border: "1px solid #4338ca",
          color: "#e0e7ff"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Dashboard do Gestor" }),
          " — período:",
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: 6 }, children: [
            new Date(inicio).toLocaleDateString("pt-BR"),
            " até",
            " ",
            new Date(fim).toLocaleDateString("pt-BR")
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-purple mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))",
          gap: 10
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas da equipe" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(totalTeamSales) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Qtd. Vendas" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: totalTeamDeals })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Ticket médio" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(ticketMedioEquipe) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta da equipe" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(metaEquipe) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Atingimento" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-value", children: [
              atingimentoEquipe.toFixed(1),
              "%"
            ] })
          ] })
        ]
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Ranking da equipe" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[480px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Vendedor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Total vendido" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          rankingEquipe.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 2, children: "Sem vendas no período." }) }),
          rankingEquipe.map((item, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              "#",
              idx + 1,
              " — ",
              item.nome
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatCurrency(item.total) })
          ] }, item.vendedor_id))
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Evolução de vendas da equipe" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: "100%", height: 260 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        LineChart,
        {
          data: rankingEquipe.map((r, i) => ({
            name: r.nome,
            total: r.total
          })),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Tooltip,
              {
                formatter: (value) => formatCurrency(Number(value || 0))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Line,
              {
                type: "monotone",
                dataKey: "total",
                stroke: "#a855f7",
                strokeWidth: 2
              }
            )
          ]
        }
      ) }) })
    ] }),
    loadingDados && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando..." }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: erro })
  ] });
}

const $$Gestor = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<!--
  Dashboard do Gestor
  Rota protegida:
  – Somente GESTOR (ou ADMIN) pode acessar
-->${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard do Gestor" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section style="
      padding: 16px;
      width: 100%;
      max-width: 1300px;
      margin: 0 auto;
    "> ${renderComponent($$result2, "DashboardGestorIsland", DashboardGestorIsland, { "client:visible": true, "client:component-hydration": "visible", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardGestorIsland.tsx", "client:component-export": "default" })} </section> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/gestor.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/gestor.astro";
const $$url = "/dashboard/gestor";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Gestor,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
