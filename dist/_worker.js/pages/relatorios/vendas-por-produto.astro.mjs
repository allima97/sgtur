globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_Ck_yWTiO.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as utils, w as writeFileSync } from '../../chunks/xlsx_DyslCs8o.mjs';
import { e as exportTableToPDF } from '../../chunks/pdf_C-2SP29-.mjs';
import { f as formatarDataParaExibicao } from '../../chunks/formatDate_DIYZa49I.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
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
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
function RelatorioAgrupadoProdutoIsland() {
  const [produtos, setProdutos] = reactExports.useState([]);
  const [dataInicio, setDataInicio] = reactExports.useState(() => {
    const hoje = /* @__PURE__ */ new Date();
    const inicio = addDays(hoje, -30);
    return formatISO(inicio);
  });
  const [dataFim, setDataFim] = reactExports.useState(hojeISO());
  const [buscaProduto, setBuscaProduto] = reactExports.useState("");
  const [produtosCadastro, setProdutosCadastro] = reactExports.useState([]);
  const [tipoReciboSelecionado, setTipoReciboSelecionado] = reactExports.useState("");
  const [cidadeFiltro, setCidadeFiltro] = reactExports.useState("");
  const [cidadeNomeInput, setCidadeNomeInput] = reactExports.useState("");
  const [mostrarSugestoesCidadeFiltro, setMostrarSugestoesCidadeFiltro] = reactExports.useState(false);
  const [cidadesLista, setCidadesLista] = reactExports.useState([]);
  const [cidadeSugestoes, setCidadeSugestoes] = reactExports.useState([]);
  const [buscandoCidade, setBuscandoCidade] = reactExports.useState(false);
  const [erroCidade, setErroCidade] = reactExports.useState(null);
  const [vendas, setVendas] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [userCtx, setUserCtx] = reactExports.useState(null);
  const [loadingUser, setLoadingUser] = reactExports.useState(true);
  const [cidadesMap, setCidadesMap] = reactExports.useState({});
  const [exportFlags, setExportFlags] = reactExports.useState({ pdf: true, excel: true });
  const [showFilters, setShowFilters] = reactExports.useState(false);
  const [showExport, setShowExport] = reactExports.useState(false);
  const [exportTipo, setExportTipo] = reactExports.useState("csv");
  const [ordenacao, setOrdenacao] = reactExports.useState("total");
  const [ordemDesc, setOrdemDesc] = reactExports.useState(true);
  const [activeTab, setActiveTab] = reactExports.useState("recibos");
  const tabOptions = [
    { id: "recibos", label: "Produtos por recibo" },
    { id: "agrupado", label: "Resumo por tipo" }
  ];
  reactExports.useEffect(() => {
    if (exportTipo === "excel" && !exportFlags.excel) {
      setExportTipo("csv");
      return;
    }
    if (exportTipo === "pdf" && !exportFlags.pdf) {
      setExportTipo("csv");
    }
  }, [exportFlags, exportTipo]);
  reactExports.useEffect(() => {
    async function carregarBase() {
      try {
        const { data, error } = await supabase.from("tipo_produtos").select("id, nome, tipo").order("nome", { ascending: true });
        if (error) throw error;
        setProdutos(data || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar produtos.");
      }
    }
    carregarBase();
  }, []);
  reactExports.useEffect(() => {
    async function carregarProdutosCadastro() {
      try {
        const { data, error } = await supabase.from("produtos").select("tipo_produto, nome").order("nome", { ascending: true });
        if (error) throw error;
        setProdutosCadastro(data || []);
      } catch (e) {
        console.error("Erro ao carregar produtos cadastros:", e);
      }
    }
    carregarProdutosCadastro();
  }, []);
  reactExports.useEffect(() => {
    async function carregarCidades() {
      try {
        const { data, error } = await supabase.from("cidades").select("id, nome").order("nome", { ascending: true });
        if (error) throw error;
        const map = {};
        const lista = [];
        (data || []).forEach((cidade) => {
          if (cidade?.id && cidade?.nome) {
            map[cidade.id] = cidade.nome;
            lista.push({ id: cidade.id, nome: cidade.nome });
          }
        });
        setCidadesMap(map);
        setCidadesLista(lista);
      } catch (e) {
        console.error("Erro ao carregar cidades:", e);
      }
    }
    carregarCidades();
  }, []);
  reactExports.useEffect(() => {
    if (cidadeNomeInput.trim().length < 2) {
      setCidadeSugestoes([]);
      setErroCidade(null);
      setBuscandoCidade(false);
      setMostrarSugestoesCidadeFiltro(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidade(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: cidadeNomeInput.trim(), limite: 8 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            console.error("Erro ao buscar cidades (RPC):", error);
            throw error;
          }
          setCidadeSugestoes(data || []);
          setMostrarSugestoesCidadeFiltro(true);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error("Erro ao buscar cidades:", e);
          setErroCidade("Erro ao buscar cidades. Tente novamente.");
          setCidadeSugestoes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setBuscandoCidade(false);
        }
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [cidadeNomeInput]);
  reactExports.useEffect(() => {
    if (!cidadeFiltro) return;
    const selec = cidadesLista.find((cidade) => cidade.id === cidadeFiltro);
    if (selec) {
      setCidadeNomeInput(selec.nome);
    }
  }, [cidadeFiltro, cidadesLista]);
  const nomeProdutosPorTipo = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    produtosCadastro.forEach(({ tipo_produto, nome }) => {
      if (!tipo_produto || !nome) return;
      const trimmed = nome.trim();
      if (!trimmed) return;
      const atual = map.get(tipo_produto) || [];
      if (!atual.includes(trimmed)) {
        atual.push(trimmed);
        map.set(tipo_produto, atual);
      }
    });
    return map;
  }, [produtosCadastro]);
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
        const { data: usuarioDb } = await supabase.from("users").select("id, user_types(name)").eq("id", userId).maybeSingle();
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
  const tipoProdutosNomeMap = reactExports.useMemo(
    () => new Map(produtos.map((p) => [p.id, p.nome || ""])),
    [produtos]
  );
  const linhas = reactExports.useMemo(() => {
    const prodMap = new Map(produtos.map((p) => [p.id, p]));
    const map = /* @__PURE__ */ new Map();
    const adicionar = (prodId, valor, destinoNome, destinoId) => {
      const key = prodId || "sem-produto";
      const base = prodId ? prodMap.get(prodId) : void 0;
      const nome = base?.nome || base?.tipo || "(sem produto)";
      const atual = map.get(key) || {
        produto_id: prodId,
        produto_nome: nome,
        quantidade: 0,
        total: 0,
        ticketMedio: 0,
        destinoNomes: [],
        destinoIds: []
      };
      atual.quantidade += 1;
      atual.total += valor;
      if (destinoNome) {
        const nomeLimpo = destinoNome.trim();
        if (nomeLimpo && !atual.destinoNomes.includes(nomeLimpo)) {
          atual.destinoNomes.push(nomeLimpo);
        }
      }
      if (destinoId != null && destinoId !== "") {
        if (!atual.destinoIds.includes(destinoId)) {
          atual.destinoIds.push(destinoId);
        }
      }
      map.set(key, atual);
    };
    vendas.forEach((v) => {
      const destinoNome = v.destinos?.nome || "";
      const destinoId = v.destino_cidade_id || v.destinos?.cidade_id || null;
      const recibos = v.vendas_recibos || [];
      if (recibos.length) {
        recibos.forEach((r) => {
          const val = Number(r.valor_total || 0);
          adicionar(r.produto_id, val, destinoNome, destinoId);
        });
      } else {
        const val = v.valor_total ?? 0;
        adicionar(v.produto_id, val, destinoNome, destinoId);
      }
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
  }, [vendas, produtos, ordenacao, ordemDesc]);
  const recibosDetalhados = reactExports.useMemo(() => {
    const rows = [];
    const nomeFallback = (tipoId) => tipoProdutosNomeMap.get(tipoId || "") || "(sem produto)";
    vendas.forEach((v) => {
      const cidadeId = v.destino_cidade_id || v.destinos?.cidade_id || null;
      const cidadeNome = v.destino_cidade?.nome || (cidadeId && cidadesMap[cidadeId] ? cidadesMap[cidadeId] : null);
      const destinoNome = v.destinos?.nome || null;
      const recibos = v.vendas_recibos || [];
      if (recibos.length) {
        recibos.forEach((r, idx) => {
          const produtoNome = r.produtos?.nome || nomeFallback(r.produto_id);
          const rowId = `${v.id}-${r.numero_recibo || "sem"}-${r.produto_id || "sem"}-${idx}`;
          rows.push({
            rowId,
            vendaId: v.id,
            numeroRecibo: r.numero_recibo || null,
            tipoId: r.produto_id || null,
            produtoNome,
            valorTotal: Number(r.valor_total || 0),
            valorTaxas: Number(r.valor_taxas || 0),
            dataLancamento: v.data_lancamento,
            status: v.status,
            destinoNome,
            cidadeNome,
            cidadeId
          });
        });
      } else {
        const rowId = `${v.id}-sem-${v.produto_id || "sem"}-0`;
        rows.push({
          rowId,
          vendaId: v.id,
          numeroRecibo: null,
          tipoId: v.produto_id || null,
          produtoNome: nomeFallback(v.produto_id),
          valorTotal: v.valor_total ?? 0,
          valorTaxas: 0,
          dataLancamento: v.data_lancamento,
          status: v.status,
          destinoNome,
          cidadeNome,
          cidadeId
        });
      }
    });
    return rows;
  }, [vendas, tipoProdutosNomeMap, cidadesMap]);
  const recibosFiltrados = reactExports.useMemo(() => {
    const hasTerm = buscaProduto.trim().length > 0;
    const term = normalizeText(buscaProduto);
    return recibosDetalhados.filter((recibo) => {
      if (cidadeFiltro && recibo.cidadeId !== cidadeFiltro) {
        return false;
      }
      if (tipoReciboSelecionado && recibo.tipoId !== tipoReciboSelecionado) {
        return false;
      }
      if (!hasTerm) return true;
      const destino = normalizeText(recibo.destinoNome || "");
      const produto = normalizeText(recibo.produtoNome || "");
      return destino.includes(term) || produto.includes(term);
    });
  }, [recibosDetalhados, buscaProduto, tipoReciboSelecionado, cidadeFiltro]);
  const linhasFiltradas = reactExports.useMemo(() => {
    const term = normalizeText(buscaProduto);
    const hasTerm = term.length > 0;
    return linhas.filter((l) => {
      if (cidadeFiltro) {
        const temCidade = l.destinoIds.some((id) => id === cidadeFiltro);
        if (!temCidade) {
          return false;
        }
      }
      if (!hasTerm) return true;
      if (normalizeText(l.produto_nome).includes(term)) return true;
      if (l.destinoNomes.some((nome) => normalizeText(nome).includes(term))) return true;
      const tipo = l.produto_id || "";
      const nomesExtra = nomeProdutosPorTipo.get(tipo) || [];
      if (nomesExtra.some((nome) => normalizeText(nome).includes(term))) return true;
      return false;
    });
  }, [linhas, buscaProduto, nomeProdutosPorTipo, cidadeFiltro]);
  const totalGeral = linhasFiltradas.reduce((acc, l) => acc + l.total, 0);
  const totalQtd = linhasFiltradas.reduce((acc, l) => acc + l.quantidade, 0);
  const ticketGeral = totalQtd > 0 ? totalGeral / totalQtd : 0;
  const totalRecibosCount = recibosFiltrados.length;
  const totalRecibosValor = recibosFiltrados.reduce((acc, r) => acc + r.valorTotal, 0);
  const totalRecibosTaxas = recibosFiltrados.reduce((acc, r) => acc + r.valorTaxas, 0);
  function aplicarPeriodoPreset(tipo) {
    const hoje = /* @__PURE__ */ new Date();
    if (tipo === "hoje") {
      setDataInicio(hojeISO());
      setDataFim(hojeISO());
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
    if (tipo === "limpar") {
      setDataInicio("");
      setDataFim("");
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
          destino_cidade_id,
          data_lancamento,
          data_embarque,
          valor_total,
          status,
          destino_cidade:destino_cidade_id (nome),
          destinos:produtos!destino_id (nome, cidade_id),
          vendas_recibos (
            numero_recibo,
            produto_id,
            valor_total,
            valor_taxas,
            produtos:tipo_produtos!produto_id (nome, tipo)
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
      const { data, error } = await query;
      if (error) throw error;
      setVendas(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas para relatório por produto.");
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
    let header = [];
    let rows = [];
    let fileBase = "relatorio-vendas-por-produto";
    if (activeTab === "agrupado") {
      if (linhasFiltradas.length === 0) {
        alert("Não há dados para exportar.");
        return;
      }
      header = ["produto", "quantidade", "total", "ticket_medio"];
      rows = linhasFiltradas.map((l) => [
        l.produto_nome,
        l.quantidade.toString(),
        l.total.toFixed(2).replace(".", ","),
        l.ticketMedio.toFixed(2).replace(".", ",")
      ]);
    } else {
      if (recibosFiltrados.length === 0) {
        alert("Não há dados para exportar.");
        return;
      }
      header = ["recibo", "produto", "cidade", "destino", "data", "valor_total", "taxas"];
      rows = recibosFiltrados.map((recibo) => [
        recibo.numeroRecibo || "",
        recibo.produtoNome,
        recibo.cidadeNome || "",
        recibo.destinoNome || "",
        recibo.dataLancamento ? recibo.dataLancamento.split("T")[0] : "",
        recibo.valorTotal.toFixed(2).replace(".", ","),
        recibo.valorTaxas.toFixed(2).replace(".", ",")
      ]);
      fileBase = "relatorio-produtos-por-recibo";
    }
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
    link.setAttribute("download", `${fileBase}-${ts}.csv`);
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
    if (activeTab === "agrupado") {
      if (linhasFiltradas.length === 0) {
        alert("Não há dados para exportar.");
        return;
      }
      const data2 = linhasFiltradas.map((l) => ({
        "Tipo de Produto": l.produto_nome,
        Quantidade: l.quantidade,
        "Faturamento (R$)": l.total,
        "Ticket médio (R$)": l.ticketMedio
      }));
      const ws2 = utils.json_to_sheet(data2);
      const wb2 = utils.book_new();
      utils.book_append_sheet(wb2, ws2, "Resumo por Produto");
      const ts2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 12);
      writeFileSync(wb2, `relatorio-produtos-${ts2}.xlsx`);
      return;
    }
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const data = recibosFiltrados.map((recibo) => ({
      Recibo: recibo.numeroRecibo || "-",
      Produto: recibo.produtoNome,
      Cidade: recibo.cidadeNome || "-",
      Destino: recibo.destinoNome || "-",
      Data: recibo.dataLancamento ? recibo.dataLancamento.split("T")[0] : "-",
      "Valor total (R$)": recibo.valorTotal,
      "Taxas (R$)": recibo.valorTaxas
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Produtos por Recibo");
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 12);
    writeFileSync(wb, `relatorio-produtos-recibos-${ts}.xlsx`);
  }
  function exportarPDF() {
    if (!exportFlags.pdf) {
      alert("Exportação PDF desabilitada nos parâmetros.");
      return;
    }
    const subtitle = dataInicio && dataFim ? `Período: ${formatarDataParaExibicao(
      dataInicio
    )} até ${formatarDataParaExibicao(dataFim)}` : dataInicio ? `A partir de ${formatarDataParaExibicao(dataInicio)}` : dataFim ? `Até ${formatarDataParaExibicao(dataFim)}` : void 0;
    if (activeTab === "agrupado") {
      if (linhasFiltradas.length === 0) {
        alert("Não há dados para exportar.");
        return;
      }
      const headers2 = ["Tipo de Produto", "Qtde", "Faturamento", "Ticket médio"];
      const rows2 = linhasFiltradas.map((l) => [
        l.produto_nome,
        l.quantidade,
        formatCurrency(l.total),
        formatCurrency(l.ticketMedio)
      ]);
      exportTableToPDF({
        title: "Vendas por Produto",
        subtitle,
        headers: headers2,
        rows: rows2,
        fileName: "relatorio-vendas-por-produto",
        orientation: "landscape"
      });
      return;
    }
    if (recibosFiltrados.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }
    const headers = [
      "Recibo",
      "Produto",
      "Cidade",
      "Destino",
      "Data",
      "Valor total",
      "Taxas"
    ];
    const rows = recibosFiltrados.map((recibo) => [
      recibo.numeroRecibo || "-",
      recibo.produtoNome,
      recibo.cidadeNome || "-",
      recibo.destinoNome || "-",
      recibo.dataLancamento ? recibo.dataLancamento.split("T")[0] : "-",
      formatCurrency(recibo.valorTotal),
      formatCurrency(recibo.valorTaxas)
    ]);
    exportTableToPDF({
      title: "Produtos por Recibo",
      subtitle,
      headers,
      rows,
      fileName: "relatorio-produtos-por-recibo",
      orientation: "landscape"
    });
  }
  function exportarSelecionado() {
    if (exportTipo === "csv") {
      exportarCSV();
      return;
    }
    if (exportTipo === "excel") {
      exportarExcel();
      return;
    }
    exportarPDF();
  }
  const exportDisabled = exportTipo === "excel" && !exportFlags.excel || exportTipo === "pdf" && !exportFlags.pdf;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relatorio-vendas-produto-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple form-card mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:hidden", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => setShowFilters(true), children: "Filtros" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => setShowExport(true), children: "Exportar" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "hidden sm:block", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "date",
                className: "form-input",
                value: dataInicio,
                onChange: (e) => {
                  const nextInicio = e.target.value;
                  setDataInicio(nextInicio);
                  if (dataFim && nextInicio && dataFim < nextInicio) {
                    setDataFim(nextInicio);
                  }
                }
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
                min: dataInicio || void 0,
                onChange: (e) => {
                  const nextFim = e.target.value;
                  const boundedFim = dataInicio && nextFim && nextFim < dataInicio ? dataInicio : nextFim;
                  setDataFim(boundedFim);
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { position: "relative" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                placeholder: "Digite a cidade",
                value: cidadeNomeInput,
                onChange: (e) => {
                  setCidadeNomeInput(e.target.value);
                  setCidadeFiltro("");
                  setMostrarSugestoesCidadeFiltro(true);
                },
                onFocus: () => {
                  if (cidadeNomeInput.trim().length > 0) {
                    setMostrarSugestoesCidadeFiltro(true);
                  }
                },
                onBlur: () => {
                  setTimeout(() => setMostrarSugestoesCidadeFiltro(false), 150);
                  if (!cidadeNomeInput.trim()) {
                    setCidadeFiltro("");
                    return;
                  }
                  const match = cidadesLista.find(
                    (cidade) => normalizeText(cidade.nome) === normalizeText(cidadeNomeInput)
                  );
                  if (match) {
                    setCidadeFiltro(match.id);
                    setCidadeNomeInput(match.nome);
                  }
                }
              }
            ),
            mostrarSugestoesCidadeFiltro && cidadeNomeInput.trim().length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "card-base card-config",
                style: {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: 160,
                  overflowY: "auto",
                  zIndex: 20,
                  padding: "4px 0"
                },
                children: [
                  buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#64748b" }, children: "Buscando cidades..." }),
                  !buscandoCidade && erroCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#dc2626" }, children: erroCidade }),
                  !buscandoCidade && !erroCidade && cidadeSugestoes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#94a3b8" }, children: "Nenhuma cidade encontrada." }),
                  !buscandoCidade && !erroCidade && cidadeSugestoes.map((cidade) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      className: "btn btn-ghost w-full text-left",
                      style: { padding: "6px 12px" },
                      onMouseDown: (e) => {
                        e.preventDefault();
                        setCidadeFiltro(cidade.id);
                        setCidadeNomeInput(cidade.nome);
                        setMostrarSugestoesCidadeFiltro(false);
                      },
                      children: cidade.nome
                    },
                    cidade.id
                  ))
                ]
              }
            )
          ] }),
          activeTab === "recibos" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo de Produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: tipoReciboSelecionado,
                onChange: (e) => setTipoReciboSelecionado(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os tipos" }),
                  produtos.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome || p.tipo || p.id }, p.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                className: "form-input",
                placeholder: "Nome do produto",
                value: buscaProduto,
                onChange: (e) => setBuscaProduto(e.target.value)
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: carregar, children: "Aplicar filtros" }),
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
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 mobile-stack-buttons", children: tabOptions.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: `btn ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`,
          onClick: () => setActiveTab(tab.id),
          children: tab.label
        },
        tab.id
      )) })
    ] }),
    showFilters && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-drawer-backdrop", onClick: () => setShowFilters(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mobile-drawer-panel",
        role: "dialog",
        "aria-modal": "true",
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Filtros" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn-ghost", onClick: () => setShowFilters(false), children: "✕" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "date",
                className: "form-input",
                value: dataInicio,
                onChange: (e) => {
                  const nextInicio = e.target.value;
                  setDataInicio(nextInicio);
                  if (dataFim && nextInicio && dataFim < nextInicio) {
                    setDataFim(nextInicio);
                  }
                }
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
                min: dataInicio || void 0,
                onChange: (e) => {
                  const nextFim = e.target.value;
                  const boundedFim = dataInicio && nextFim && nextFim < dataInicio ? dataInicio : nextFim;
                  setDataFim(boundedFim);
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { position: "relative" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                placeholder: "Digite a cidade",
                value: cidadeNomeInput,
                onChange: (e) => {
                  setCidadeNomeInput(e.target.value);
                  setCidadeFiltro("");
                  setMostrarSugestoesCidadeFiltro(true);
                },
                onFocus: () => {
                  if (cidadeNomeInput.trim().length > 0) {
                    setMostrarSugestoesCidadeFiltro(true);
                  }
                },
                onBlur: () => {
                  setTimeout(() => setMostrarSugestoesCidadeFiltro(false), 150);
                  if (!cidadeNomeInput.trim()) {
                    setCidadeFiltro("");
                    return;
                  }
                  const match = cidadesLista.find(
                    (cidade) => normalizeText(cidade.nome) === normalizeText(cidadeNomeInput)
                  );
                  if (match) {
                    setCidadeFiltro(match.id);
                    setCidadeNomeInput(match.nome);
                  }
                }
              }
            ),
            mostrarSugestoesCidadeFiltro && cidadeNomeInput.trim().length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "card-base card-config",
                style: {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: 160,
                  overflowY: "auto",
                  zIndex: 20,
                  padding: "4px 0"
                },
                children: [
                  buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#64748b" }, children: "Buscando cidades..." }),
                  !buscandoCidade && erroCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#dc2626" }, children: erroCidade }),
                  !buscandoCidade && !erroCidade && cidadeSugestoes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 12px", color: "#94a3b8" }, children: "Nenhuma cidade encontrada." }),
                  !buscandoCidade && !erroCidade && cidadeSugestoes.map((cidade) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      type: "button",
                      className: "btn btn-ghost w-full text-left",
                      style: { padding: "6px 12px" },
                      onMouseDown: (e) => {
                        e.preventDefault();
                        setCidadeFiltro(cidade.id);
                        setCidadeNomeInput(cidade.nome);
                        setMostrarSugestoesCidadeFiltro(false);
                      },
                      children: cidade.nome
                    },
                    cidade.id
                  ))
                ]
              }
            )
          ] }),
          activeTab === "recibos" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo de Produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: tipoReciboSelecionado,
                onChange: (e) => setTipoReciboSelecionado(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos os tipos" }),
                  produtos.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome || p.tipo || p.id }, p.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "text",
                className: "form-input",
                placeholder: "Nome do produto",
                value: buscaProduto,
                onChange: (e) => setBuscaProduto(e.target.value)
              }
            )
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
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              style: { marginTop: 12, width: "100%" },
              onClick: () => {
                carregar();
                setShowFilters(false);
              },
              children: "Aplicar filtros"
            }
          )
        ]
      }
    ) }),
    showExport && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mobile-drawer-backdrop", onClick: () => setShowExport(false), children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mobile-drawer-panel",
        role: "dialog",
        "aria-modal": "true",
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Exportar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn-ghost", onClick: () => setShowExport(false), children: "✕" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Formato" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: `btn ${exportTipo === "csv" ? "btn-primary" : "btn-light"}`,
                  onClick: () => setExportTipo("csv"),
                  children: "CSV"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: `btn ${exportTipo === "excel" ? "btn-primary" : "btn-light"}`,
                  onClick: () => setExportTipo("excel"),
                  disabled: !exportFlags.excel,
                  title: !exportFlags.excel ? "Exportação Excel desabilitada nos parâmetros" : "",
                  children: "Excel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: `btn ${exportTipo === "pdf" ? "btn-primary" : "btn-light"}`,
                  onClick: () => setExportTipo("pdf"),
                  disabled: !exportFlags.pdf,
                  title: !exportFlags.pdf ? "Exportação PDF desabilitada nos parâmetros" : "",
                  children: "PDF"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              style: { marginTop: 12, width: "100%" },
              onClick: () => {
                exportarSelecionado();
                setShowExport(false);
              },
              disabled: exportDisabled,
              children: "Exportar"
            }
          )
        ]
      }
    ) }),
    loadingUser && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Carregando contexto do usuário..." }),
    userCtx && userCtx.papel !== "ADMIN" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-config mb-3", style: { color: "#334155" }, children: [
      "Relatório limitado a ",
      userCtx.papel === "GESTOR" ? "sua equipe" : "suas vendas",
      "."
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    activeTab === "agrupado" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Produtos: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: linhasFiltradas.length })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Faturamento total: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(totalGeral) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Ticket médio geral: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(ticketGeral) })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-purple table-mobile-cards min-w-[620px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo de Produto" }),
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
          !loading && linhasFiltradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, children: "Nenhum produto encontrado com os filtros atuais." }) }),
          !loading && linhasFiltradas.map((l, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Tipo de Produto", children: l.produto_nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Qtde", children: l.quantidade }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Faturamento", children: formatCurrency(l.total) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Ticket médio", children: formatCurrency(l.ticketMedio) })
          ] }, l.produto_id ?? `sem-${idx}`))
        ] })
      ] }) })
    ] }),
    activeTab === "recibos" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Recibos: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: totalRecibosCount })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Total recebido: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(totalRecibosValor) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Taxas: ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: formatCurrency(totalRecibosTaxas) })
        ] }) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-purple table-mobile-cards min-w-[720px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Recibo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "right" }, children: "Valor total" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "right" }, children: "Taxas" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Carregando..." }) }),
          !loading && recibosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Nenhum recibo encontrado com os filtros atuais." }) }),
          !loading && recibosFiltrados.map((recibo) => {
            const dataLabel = recibo.dataLancamento ? recibo.dataLancamento.split("T")[0] : "-";
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Recibo", children: recibo.numeroRecibo || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Produto", children: recibo.produtoNome }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Cidade", children: recibo.cidadeNome || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Destino", children: recibo.destinoNome || "-" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Data", children: dataLabel }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Valor total", style: { textAlign: "right" }, children: formatCurrency(recibo.valorTotal) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Taxas", style: { textAlign: "right" }, children: formatCurrency(recibo.valorTaxas) })
            ] }, recibo.rowId);
          })
        ] })
      ] }) })
    ] })
  ] });
}

const $$VendasPorProduto = createComponent(($$result, $$props, $$slots) => {
  const activePage = "relatorios-vendas-produto";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Relat\xF3rio de Vendas por Produto", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Relat\xF3rio de Vendas por Produto", "subtitle": "Analise o desempenho dos produtos em quantidade, faturamento e ticket m\xE9dio.", "color": "purple" })} ${renderComponent($$result2, "RelatorioAgrupadoProdutoIsland", RelatorioAgrupadoProdutoIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/RelatorioAgrupadoProdutoIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas-por-produto.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/relatorios/vendas-por-produto.astro";
const $$url = "/relatorios/vendas-por-produto";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$VendasPorProduto,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
