globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_Da6suYyQ.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as utils, w as writeFileSync } from '../../chunks/xlsx_DyslCs8o.mjs';

function hojeISO() {
  return (/* @__PURE__ */ new Date()).toISOString().substring(0, 10);
}
function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
function RelatorioVendasIsland() {
  const [clientes, setClientes] = reactExports.useState([]);
  const [destinos, setDestinos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [clienteBusca, setClienteBusca] = reactExports.useState("");
  const [destinoBusca, setDestinoBusca] = reactExports.useState("");
  const [produtoBusca, setProdutoBusca] = reactExports.useState("");
  const [clienteSelecionado, setClienteSelecionado] = reactExports.useState(null);
  const [destinoSelecionado, setDestinoSelecionado] = reactExports.useState(null);
  const [produtoSelecionado, setProdutoSelecionado] = reactExports.useState(null);
  const [dataInicio, setDataInicio] = reactExports.useState(() => {
    const hoje = /* @__PURE__ */ new Date();
    const inicio = addDays(hoje, -7);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = reactExports.useState(hojeISO());
  const [statusFiltro, setStatusFiltro] = reactExports.useState("todos");
  const [valorMin, setValorMin] = reactExports.useState("");
  const [valorMax, setValorMax] = reactExports.useState("");
  const [vendas, setVendas] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [userCtx, setUserCtx] = reactExports.useState(null);
  const [loadingUser, setLoadingUser] = reactExports.useState(true);
  const [exportFlags, setExportFlags] = reactExports.useState({ pdf: true, excel: true });
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
  reactExports.useEffect(() => {
    async function carregarBase() {
      try {
        const [
          { data: clientesData, error: cliErr },
          { data: destinosData, error: destErr },
          { data: produtosData, error: prodErr }
        ] = await Promise.all([
          supabase.from("clientes").select("id, nome, cpf").order("nome", { ascending: true }),
          supabase.from("produtos").select("id, nome").order("nome", { ascending: true }),
          supabase.from("tipo_produtos").select("id, nome, tipo").order("nome", { ascending: true })
        ]);
        if (cliErr) throw cliErr;
        if (destErr) throw destErr;
        if (prodErr) throw prodErr;
        setClientes(clientesData || []);
        setDestinos(destinosData || []);
        setProdutos(produtosData || []);
      } catch (e) {
        console.error(e);
        setErro(
          "Erro ao carregar bases de clientes, destinos e produtos. Verifique o Supabase."
        );
      }
    }
    carregarBase();
  }, []);
  const clientesFiltrados = reactExports.useMemo(() => {
    if (!clienteBusca.trim()) return clientes;
    const termo = normalizeText(clienteBusca);
    return clientes.filter((c) => {
      const doc = c.cpf || "";
      return normalizeText(c.nome).includes(termo) || normalizeText(doc).includes(termo);
    });
  }, [clientes, clienteBusca]);
  const destinosFiltrados = reactExports.useMemo(() => {
    if (!destinoBusca.trim()) return destinos;
    const termo = normalizeText(destinoBusca);
    return destinos.filter((d) => normalizeText(d.nome).includes(termo));
  }, [destinos, destinoBusca]);
  const produtosFiltrados = reactExports.useMemo(() => {
    if (!produtoBusca.trim()) return produtos;
    const termo = normalizeText(produtoBusca);
    return produtos.filter((p) => {
      const nome = normalizeText(p.nome || "");
      const tipo = normalizeText(p.tipo || "");
      return nome.includes(termo) || tipo.includes(termo);
    });
  }, [produtos, produtoBusca]);
  const vendasEnriquecidas = reactExports.useMemo(() => {
    const cliMap = new Map(clientes.map((c) => [c.id, c]));
    const destMap = new Map(destinos.map((d) => [d.id, d]));
    const prodMap = new Map(produtos.map((p) => [p.id, p]));
    return vendas.map((v) => {
      const c = cliMap.get(v.cliente_id);
      const d = destMap.get(v.destino_id);
      const p = v.produto_id ? prodMap.get(v.produto_id) : void 0;
      const recibos = v.vendas_recibos || [];
      const numeroRecibos = recibos.map((r) => r.numero_recibo).filter(Boolean).join(" / ");
      const valorRecibos = recibos.reduce(
        (acc, r) => acc + Number(r.valor_total || 0) + Number(r.valor_taxas || 0),
        0
      );
      const prodRecibo = recibos.find((r) => r.tipo_produtos?.id);
      const valorCalculado = valorRecibos > 0 ? valorRecibos : v.valor_total ?? null;
      return {
        ...v,
        numero_venda: v.numero_venda || numeroRecibos || v.id,
        valor_total: valorCalculado,
        cliente_nome: c?.nome || "(sem cliente)",
        cliente_cpf: c?.cpf || "",
        destino_nome: d?.nome || "(sem destino)",
        produto_nome: p?.nome || p?.tipo || prodRecibo?.tipo_produtos?.nome || prodRecibo?.tipo_produtos?.tipo || "(sem produto)"
      };
    });
  }, [vendas, clientes, destinos, produtos]);
  const totalVendas = vendasEnriquecidas.length;
  const somaValores = vendasEnriquecidas.reduce((acc, v) => {
    const val = v.valor_total ?? 0;
    return acc + val;
  }, 0);
  const ticketMedio = totalVendas > 0 ? somaValores / totalVendas : 0;
  async function carregarVendas() {
    if (!userCtx) return;
    try {
      setLoading(true);
      setErro(null);
      let query = supabase.from("vendas").select(
        `
          id,
          vendedor_id,
          numero_venda,
          cliente_id,
          destino_id,
          produto_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          vendas_recibos (
            numero_recibo,
            valor_total,
            valor_taxas,
            produto_id,
            tipo_produtos (id, nome, tipo)
          )
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
      if (clienteSelecionado) {
        query = query.eq("cliente_id", clienteSelecionado.id);
      }
      if (destinoSelecionado) {
        query = query.eq("destino_id", destinoSelecionado.id);
      }
      if (produtoSelecionado) {
        query = query.eq("produto_id", produtoSelecionado.id);
      }
      const vMin = parseFloat(valorMin.replace(",", "."));
      if (!isNaN(vMin)) {
        query = query.gte("valor_total", vMin);
      }
      const vMax = parseFloat(valorMax.replace(",", "."));
      if (!isNaN(vMax)) {
        query = query.lte("valor_total", vMax);
      }
      const { data, error } = await query;
      if (error) throw error;
      setVendas(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas para o relatório. Confira o schema e filtros.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (userCtx) {
      carregarVendas();
    }
  }, [userCtx]);
  function aplicarPeriodoPreset(tipo) {
    const hoje = /* @__PURE__ */ new Date();
    if (tipo === "limpar") {
      setDataInicio("");
      setDataFim("");
      return;
    }
    if (tipo === "hoje") {
      const iso = hojeISO();
      setDataInicio(iso);
      setDataFim(iso);
      return;
    }
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
  function exportarCSV() {
    if (vendasEnriquecidas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const header = [
      "numero_venda",
      "cliente",
      "cpf",
      "destino",
      "produto",
      "data_lancamento",
      "data_embarque",
      "status",
      "valor_total"
    ];
    const linhas = vendasEnriquecidas.map((v) => [
      v.numero_venda || "",
      v.cliente_nome,
      v.cliente_cpf || "",
      v.destino_nome,
      v.produto_nome,
      v.data_lancamento || "",
      v.data_embarque || "",
      v.status || "",
      (v.valor_total ?? 0).toString().replace(".", ",")
    ]);
    const all = [header, ...linhas].map((cols) => cols.map((c) => csvEscape(c)).join(";")).join("\n");
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
    link.setAttribute("download", `relatorio-vendas-${ts}.csv`);
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
    if (vendasEnriquecidas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const data = vendasEnriquecidas.map((v) => ({
      "Nº Venda": v.numero_venda || v.id,
      Cliente: v.cliente_nome,
      CPF: v.cliente_cpf,
      Destino: v.destino_nome,
      Produto: v.produto_nome,
      "Data lançamento": v.data_lancamento?.slice(0, 10) || "",
      "Data embarque": v.data_embarque?.slice(0, 10) || "",
      Status: v.status || "",
      "Valor total": v.valor_total ?? 0
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Vendas");
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 12);
    writeFileSync(wb, `relatorio-vendas-${ts}.xlsx`);
  }
  function exportarPDF() {
    if (!exportFlags.pdf) {
      alert("Exportação PDF desabilitada nos parâmetros.");
      return;
    }
    if (vendasEnriquecidas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      alert("Não foi possível abrir a janela de exportação.");
      return;
    }
    const rows = vendasEnriquecidas.map(
      (v) => `
        <tr>
          <td>${v.numero_venda || v.id}</td>
          <td>${v.cliente_nome || ""}</td>
          <td>${v.destino_nome || ""}</td>
          <td>${v.produto_nome || ""}</td>
          <td>${v.data_lancamento?.slice(0, 10) || ""}</td>
          <td>${v.status || ""}</td>
          <td>${(v.valor_total ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
        </tr>`
    ).join("");
    win.document.write(`
      <html>
        <head>
          <title>Relatório de Vendas</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h3>Relatório de Vendas</h3>
          <table>
            <thead>
              <tr>
                <th>Nº Venda</th>
                <th>Cliente</th>
                <th>Destino</th>
                <th>Produto</th>
                <th>Lançamento</th>
                <th>Status</th>
                <th>Valor</th>
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
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relatorio-vendas-page", children: [
    loadingUser && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Carregando contexto do usuário..." }),
    userCtx && userCtx.papel !== "ADMIN" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config mb-3", style: { color: "#334155" }, children: [
      "Relatório limitado a ",
      userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas",
      "."
    ] }),
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
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor mínimo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: valorMin,
              onChange: (e) => setValorMin(e.target.value),
              placeholder: "0,00"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor máximo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: valorMax,
              onChange: (e) => setValorMax(e.target.value),
              placeholder: "0,00"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: clienteBusca,
              onChange: (e) => {
                setClienteBusca(e.target.value);
                setClienteSelecionado(null);
              },
              placeholder: "Nome ou CPF..."
            }
          ),
          clienteBusca && !clienteSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 4, maxHeight: 180, overflowY: "auto" }, children: [
            clientesFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.85rem" }, children: "Nenhum cliente encontrado." }),
            clientesFiltrados.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: { padding: "4px 6px", cursor: "pointer" },
                onClick: () => {
                  setClienteSelecionado(c);
                  setClienteBusca(c.nome);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: c.nome }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.7 }, children: c.cpf || "Sem CPF" })
                ]
              },
              c.id
            ))
          ] }),
          clienteSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", marginTop: 4 }, children: [
            "Selecionado: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: clienteSelecionado.nome })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: destinoBusca,
              onChange: (e) => {
                setDestinoBusca(e.target.value);
                setDestinoSelecionado(null);
              },
              placeholder: "Nome do destino..."
            }
          ),
          destinoBusca && !destinoSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 4, maxHeight: 180, overflowY: "auto" }, children: [
            destinosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.85rem" }, children: "Nenhum destino encontrado." }),
            destinosFiltrados.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: { padding: "4px 6px", cursor: "pointer" },
                onClick: () => {
                  setDestinoSelecionado(d);
                  setDestinoBusca(d.nome);
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: d.nome })
              },
              d.id
            ))
          ] }),
          destinoSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", marginTop: 4 }, children: [
            "Selecionado: ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: destinoSelecionado.nome })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: produtoBusca,
              onChange: (e) => {
                setProdutoBusca(e.target.value);
                setProdutoSelecionado(null);
              },
              placeholder: "Nome ou tipo..."
            }
          ),
          produtoBusca && !produtoSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 4, maxHeight: 180, overflowY: "auto" }, children: [
            produtosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.85rem" }, children: "Nenhum produto encontrado." }),
            produtosFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: { padding: "4px 6px", cursor: "pointer" },
                onClick: () => {
                  setProdutoSelecionado(p);
                  setProdutoBusca(p.nome || p.tipo);
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: p.nome || "(sem nome)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.7 }, children: p.tipo })
                ]
              },
              p.id
            ))
          ] }),
          produtoSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", marginTop: 4 }, children: [
            "Selecionado:",
            " ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: produtoSelecionado.nome || produtoSelecionado.tipo })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("hoje"),
            children: "Hoje"
          }
        ),
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
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => aplicarPeriodoPreset("limpar"),
            children: "Limpar datas"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: carregarVendas,
            children: "Aplicar filtros"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-purple",
              onClick: exportarCSV,
              children: "Exportar CSV"
            }
          ),
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
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "0.9rem" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalVendas }),
        " venda(s) encontrada(s)"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "0.9rem" }, children: [
        "Faturamento:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: somaValores.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: "0.9rem" }, children: [
        "Ticket médio:",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: ticketMedio.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        }) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-purple min-w-[1000px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nº Venda" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CPF" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data lançamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data embarque" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor total" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Carregando vendas..." }) }),
        !loading && vendasEnriquecidas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Nenhuma venda encontrada com os filtros atuais." }) }),
        !loading && vendasEnriquecidas.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.numero_venda || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.cliente_nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.cliente_cpf }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino_nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.produto_nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_lancamento ? new Date(v.data_lancamento).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_embarque ? new Date(v.data_embarque).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.status || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.valor_total != null ? v.valor_total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) : "-" })
        ] }, v.id))
      ] })
    ] }) })
  ] });
}

const $$Vendas = createComponent(($$result, $$props, $$slots) => {
  const activePage = "relatorios-vendas";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Relat\xF3rio de Vendas", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Relat\xF3rio de Vendas", "subtitle": "Filtre e analise vendas por per\xEDodo, cliente, destino e produto.", "color": "purple" })} ${renderComponent($$result2, "RelatorioVendasIsland", RelatorioVendasIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/RelatorioVendasIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas.astro";
const $$url = "/relatorios/vendas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Vendas,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
