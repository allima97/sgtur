globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderComponent, d as renderTemplate } from '../../chunks/astro/server_CVPGTMFc.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_gyyRaPmR.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_uGVYbAeU.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_EsfuoaVO.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';
import { u as utils, w as writeFileSync } from '../../chunks/xlsx_DyslCs8o.mjs';

function hojeISO() {
  return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
}
function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}
function formatISO(date) {
  return date.toISOString().substring(0, 10);
}
function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function csvEscape(value) {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}
function RelatorioAgrupadoDestinoIsland() {
  const [destinos, setDestinos] = reactExports.useState([]);
  const [dataInicio, setDataInicio] = reactExports.useState(() => {
    const hoje = /* @__PURE__ */ new Date();
    const inicio = addDays(hoje, -30);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = reactExports.useState(hojeISO());
  const [statusFiltro, setStatusFiltro] = reactExports.useState("todos");
  const [vendas, setVendas] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [userCtx, setUserCtx] = reactExports.useState(null);
  const [loadingUser, setLoadingUser] = reactExports.useState(true);
  const [exportFlags, setExportFlags] = reactExports.useState({ pdf: true, excel: true });
  const [ordenacao, setOrdenacao] = reactExports.useState("total");
  const [ordemDesc, setOrdemDesc] = reactExports.useState(true);
  reactExports.useEffect(() => {
    async function carregarBase() {
      try {
        const { data, error } = await supabase.from("produtos").select("id, nome").order("nome", { ascending: true });
        if (error) throw error;
        setDestinos(data || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar destinos.");
      }
    }
    carregarBase();
  }, []);
  reactExports.useEffect(() => {
    async function carregarUserCtx() {
      try {
        setLoadingUser(true);
        setErro(null);
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) {
          setErro("Usuário não autenticado.");
          return;
        }
        const { data: usuarioDb } = await supabase.from("users").select("id, user_types(name), company_id").eq("id", userId).maybeSingle();
        const tipoName = usuarioDb?.user_types?.name || auth?.user?.user_metadata?.name || "";
        const tipoNorm = String(tipoName || "").toUpperCase();
        let papel = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";
        let vendedorIds = [userId];
        if (papel === "GESTOR") {
          const { data: rel } = await supabase.from("gestor_vendedor").select("vendedor_id").eq("gestor_id", userId);
          const extras = rel?.map((r) => r.vendedor_id).filter((id) => Boolean(id)) || [];
          vendedorIds = Array.from(/* @__PURE__ */ new Set([userId, ...extras]));
        } else if (papel === "ADMIN") {
          vendedorIds = [];
        }
        const companyId = usuarioDb?.company_id || null;
        if (companyId) {
          const { data: params } = await supabase.from("parametros_comissao").select("exportacao_pdf, exportacao_excel").eq("company_id", companyId).maybeSingle();
          if (params) {
            setExportFlags({
              pdf: params.exportacao_pdf ?? true,
              excel: params.exportacao_excel ?? true
            });
          }
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
  const linhas = reactExports.useMemo(() => {
    const destMap = new Map(destinos.map((d) => [d.id, d.nome]));
    const map = /* @__PURE__ */ new Map();
    vendas.forEach((v) => {
      const key = v.destino_id;
      const nome = destMap.get(key) || "(sem destino)";
      const atual = map.get(key) || {
        destino_id: key,
        destino_nome: nome,
        quantidade: 0,
        total: 0,
        ticketMedio: 0
      };
      const valRecibos = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0) + Number(r.valor_taxas || 0),
        0
      );
      const val = valRecibos > 0 ? valRecibos : v.valor_total ?? 0;
      atual.quantidade += 1;
      atual.total += val;
      map.set(key, atual);
    });
    const arr = Array.from(map.values()).map((l) => ({
      ...l,
      ticketMedio: l.quantidade > 0 ? l.total / l.quantidade : 0
    }));
    arr.sort((a, b) => {
      let comp = 0;
      if (ordenacao === "total") {
        comp = a.total - b.total;
      } else if (ordenacao === "quantidade") {
        comp = a.quantidade - b.quantidade;
      } else {
        comp = a.ticketMedio - b.ticketMedio;
      }
      return ordemDesc ? -comp : comp;
    });
    return arr;
  }, [vendas, destinos, ordenacao, ordemDesc]);
  const totalGeral = linhas.reduce((acc, l) => acc + l.total, 0);
  const totalQtd = linhas.reduce((acc, l) => acc + l.quantidade, 0);
  const ticketGeral = totalQtd > 0 ? totalGeral / totalQtd : 0;
  function aplicarPeriodoPreset(tipo) {
    const hoje = /* @__PURE__ */ new Date();
    if (tipo === "7") {
      const inicio = addDays(hoje, -7);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }
    if (tipo === "30") {
      const inicio = addDays(hoje, -30);
      setDataInicio(formatISO(inicio));
      setDataFim(hojeISO());
      return;
    }
    if (tipo === "mes_atual") {
      const inicio = startOfMonth(hoje);
      const fim = endOfMonth(hoje);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }
    if (tipo === "mes_anterior") {
      const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const inicio = startOfMonth(mesAnterior);
      const fim = endOfMonth(mesAnterior);
      setDataInicio(formatISO(inicio));
      setDataFim(formatISO(fim));
      return;
    }
  }
  async function carregar() {
    if (!userCtx) return;
    try {
      setLoading(true);
      setErro(null);
      let query = supabase.from("vendas").select(
        `
          id,
          vendedor_id,
          cliente_id,
          destino_id,
          produto_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          vendas_recibos (valor_total, valor_taxas)
        `
      ).order("data_lancamento", { ascending: false });
      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }
      if (dataInicio) {
        query = query.gte("data_lancamento", dataInicio);
      }
      if (dataFim) {
        query = query.lte("data_lancamento", dataFim);
      }
      if (statusFiltro !== "todos") {
        query = query.eq("status", statusFiltro);
      }
      const { data, error } = await query;
      if (error) throw error;
      setVendas(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas para relatório por destino.");
    } finally {
      setLoading(false);
    }
  }
  function mudarOrdenacao(campo) {
    if (campo === ordenacao) {
      setOrdemDesc((prev) => !prev);
    } else {
      setOrdenacao(campo);
      setOrdemDesc(true);
    }
  }
  reactExports.useEffect(() => {
    if (userCtx) {
      carregar();
    }
  }, [userCtx]);
  function exportarCSV() {
    if (linhas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const header = ["destino", "quantidade", "total", "ticket_medio"];
    const rows = linhas.map((l) => [
      l.destino_nome,
      l.quantidade.toString(),
      l.total.toFixed(2).replace(".", ","),
      l.ticketMedio.toFixed(2).replace(".", ",")
    ]);
    const all = [header, ...rows].map((cols) => cols.map((c) => csvEscape(c)).join(";")).join("\n");
    const blob = new Blob([all], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = /* @__PURE__ */ new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `relatorio-vendas-por-destino-${ts}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  function exportarExcel() {
    if (!exportFlags.excel) {
      alert("Exportação Excel desabilitada nos parâmetros.");
      return;
    }
    if (linhas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const data = linhas.map((l) => ({
      Destino: l.destino_nome,
      Quantidade: l.quantidade,
      "Faturamento (R$)": l.total,
      "Ticket médio (R$)": l.ticketMedio
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Vendas por Destino");
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 12);
    writeFileSync(wb, `relatorio-destinos-${ts}.xlsx`);
  }
  function exportarPDF() {
    if (!exportFlags.pdf) {
      alert("Exportação PDF desabilitada nos parâmetros.");
      return;
    }
    if (linhas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      alert("Não foi possível abrir a janela de exportação.");
      return;
    }
    const rows = linhas.map(
      (l) => `
        <tr>
          <td>${l.destino_nome}</td>
          <td>${l.quantidade}</td>
          <td>${l.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
          <td>${l.ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
        </tr>`
    ).join("");
    win.document.write(`
      <html>
        <head>
          <title>Vendas por Destino</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h3>Relatório de Vendas por Destino</h3>
          <table>
            <thead>
              <tr>
                <th>Destino</th>
                <th>Qtde</th>
                <th>Faturamento</th>
                <th>Ticket médio</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.print();<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relatorio-vendas-destino-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: dataInicio,
              onChange: (e) => setDataInicio(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: dataFim,
              onChange: (e) => setDataFim(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: statusFiltro,
              onChange: (e) => setStatusFiltro(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "todos", children: "Todos" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "aberto", children: "Aberto" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "confirmado", children: "Confirmado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "cancelado", children: "Cancelado" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("7"),
            children: "Últimos 7 dias"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("30"),
            children: "Últimos 30 dias"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("mes_atual"),
            children: "Este mês"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("mes_anterior"),
            children: "Mês anterior"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: carregar, children: "Aplicar filtros" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-purple", onClick: exportarCSV, children: "Exportar CSV" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              onClick: exportarExcel,
              disabled: !exportFlags.excel,
              title: !exportFlags.excel ? "Exportação Excel desabilitada nos parâmetros" : "",
              children: "Exportar Excel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: exportarPDF,
              disabled: !exportFlags.pdf,
              title: !exportFlags.pdf ? "Exportação PDF desabilitada nos parâmetros" : "",
              children: "Exportar PDF"
            }
          )
        ] })
      ] })
    ] }),
    loadingUser && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Carregando contexto do usuário..." }),
    userCtx && userCtx.papel !== "ADMIN" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config mb-3", style: { color: "#334155" }, children: [
      "Relatório limitado a ",
      userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas",
      "."
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Destinos: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: linhas.length })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Faturamento total:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalGeral.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Ticket médio geral:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: ticketGeral.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        }) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-purple min-w-[620px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "th",
          {
            style: { cursor: "pointer" },
            onClick: () => mudarOrdenacao("quantidade"),
            children: [
              "Qtde ",
              ordenacao === "quantidade" ? ordemDesc ? "↓" : "↑" : ""
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "th",
          {
            style: { cursor: "pointer" },
            onClick: () => mudarOrdenacao("total"),
            children: [
              "Faturamento ",
              ordenacao === "total" ? ordemDesc ? "↓" : "↑" : ""
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "th",
          {
            style: { cursor: "pointer" },
            onClick: () => mudarOrdenacao("ticket"),
            children: [
              "Ticket médio ",
              ordenacao === "ticket" ? ordemDesc ? "↓" : "↑" : ""
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Carregando..." }) }),
        !loading && linhas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum destino encontrado com os filtros atuais." }) }),
        !loading && linhas.map((l) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.destino_nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.quantidade }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: l.ticketMedio.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) })
        ] }, l.destino_id))
      ] })
    ] }) })
  ] });
}

const $$VendasPorDestino = createComponent(($$result, $$props, $$slots) => {
  const activePage = "relatorios-vendas-destino";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Relat\xF3rio de Vendas por Destino", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Relat\xF3rio de Vendas por Destino", "subtitle": "Veja quais destinos mais vendem, com faturamento e ticket m\xE9dio.", "color": "purple" })} ${renderComponent($$result2, "RelatorioAgrupadoDestinoIsland", RelatorioAgrupadoDestinoIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/RelatorioAgrupadoDestinoIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas-por-destino.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas-por-destino.astro";
const $$url = "/relatorios/vendas-por-destino";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$VendasPorDestino,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
