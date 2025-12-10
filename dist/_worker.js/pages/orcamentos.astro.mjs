globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                      */
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout__E2c9QIl.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../chunks/usePermissao_CncspAO2.mjs';

function OrcamentosCadastroIsland() {
  const { ativo } = usePermissao("Vendas");
  const [clientes, setClientes] = reactExports.useState([]);
  const [destinos, setDestinos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [clienteId, setClienteId] = reactExports.useState("");
  const [destinoId, setDestinoId] = reactExports.useState("");
  const [produtoId, setProdutoId] = reactExports.useState("");
  const [status, setStatus] = reactExports.useState("novo");
  const [valor, setValor] = reactExports.useState("");
  const [dataViagem, setDataViagem] = reactExports.useState("");
  const [notas, setNotas] = reactExports.useState("");
  const [salvando, setSalvando] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [sucesso, setSucesso] = reactExports.useState(null);
  reactExports.useEffect(() => {
    carregarListas();
  }, []);
  async function carregarListas() {
    try {
      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome")
      ]);
      if (c.data) setClientes(c.data);
      if (d.data) setDestinos(d.data);
      if (p.data) setProdutos(p.data);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar listas.");
    }
  }
  async function salvar(e) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    if (!clienteId || !destinoId || !status) {
      setErro("Cliente, destino e status são obrigatórios.");
      return;
    }
    try {
      setSalvando(true);
      const payload = {
        cliente_id: clienteId,
        destino_id: destinoId || null,
        produto_id: produtoId || null,
        status,
        valor: valor ? parseFloat(valor) : null,
        data_viagem: dataViagem || null,
        notas: notas || null
      };
      const { error } = await supabase.from("orcamentos").insert(payload);
      if (error) throw error;
      setSucesso("Orçamento criado.");
      setClienteId("");
      setDestinoId("");
      setProdutoId("");
      setStatus("novo");
      setValor("");
      setDataViagem("");
      setNotas("");
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar orçamento.");
    } finally {
      setSalvando(false);
    }
  }
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Vendas bloqueado." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title", children: "Novo Orçamento" }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erro }),
    sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", children: sucesso }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: clienteId,
              onChange: (e) => setClienteId(e.target.value),
              required: true,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                clientes.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.nome }, c.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: destinoId,
              onChange: (e) => setDestinoId(e.target.value),
              required: true,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                destinos.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.nome }, d.id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo de produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: produtoId,
              onChange: (e) => setProdutoId(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "(Opcional)" }),
                produtos.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome || p.tipo }, p.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: status,
              onChange: (e) => setStatus(e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "novo", children: "Novo" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "enviado", children: "Enviado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "negociando", children: "Negociando" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fechado", children: "Fechado" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "perdido", children: "Perdido" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor estimado (R$)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "number",
              value: valor,
              onChange: (e) => setValor(e.target.value),
              min: 0,
              step: "0.01"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data da viagem" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              type: "date",
              value: dataViagem,
              onChange: (e) => setDataViagem(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Notas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: notas,
            onChange: (e) => setNotas(e.target.value),
            placeholder: "Observações, próximos passos..."
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "submit",
          className: "btn btn-primary",
          disabled: salvando,
          style: { marginTop: 12 },
          children: salvando ? "Salvando..." : "Criar orçamento"
        }
      )
    ] })
  ] });
}

function gerarNumeroVenda(data) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  const h = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `VND-${y}${m}${d}-${h}${min}-${rand}`;
}
function OrcamentosConsultaIsland() {
  const { ativo } = usePermissao("Vendas");
  const [lista, setLista] = reactExports.useState([]);
  const [statusFiltro, setStatusFiltro] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState(null);
  const [carregando, setCarregando] = reactExports.useState(true);
  const [salvandoStatus, setSalvandoStatus] = reactExports.useState(null);
  const [sucesso, setSucesso] = reactExports.useState(null);
  const [editando, setEditando] = reactExports.useState(null);
  const [valorEdit, setValorEdit] = reactExports.useState("");
  const [dataViagemEdit, setDataViagemEdit] = reactExports.useState("");
  const [notasEdit, setNotasEdit] = reactExports.useState("");
  const [clienteSelecionado, setClienteSelecionado] = reactExports.useState("");
  const [destinoSelecionado, setDestinoSelecionado] = reactExports.useState("");
  const [produtoSelecionado, setProdutoSelecionado] = reactExports.useState("");
  const [novaInteracao, setNovaInteracao] = reactExports.useState("");
  const [clientes, setClientes] = reactExports.useState([]);
  const [destinos, setDestinos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const statuses = ["novo", "enviado", "negociando", "fechado", "perdido"];
  const statusCores = {
    novo: { bg: "#f8fafc", border: "#e2e8f0" },
    enviado: { bg: "#f1f5f9", border: "#cbd5e1" },
    negociando: { bg: "#eff6ff", border: "#bfdbfe" },
    fechado: { bg: "#ecfdf3", border: "#bbf7d0" },
    perdido: { bg: "#fef2f2", border: "#fecaca" }
  };
  const [draggingId, setDraggingId] = reactExports.useState(null);
  const [draggingStatus, setDraggingStatus] = reactExports.useState(null);
  const [periodoIni, setPeriodoIni] = reactExports.useState("");
  const [periodoFim, setPeriodoFim] = reactExports.useState("");
  const [valorMin, setValorMin] = reactExports.useState("");
  const [valorMax, setValorMax] = reactExports.useState("");
  reactExports.useEffect(() => {
    carregar();
    carregarListas();
  }, []);
  async function carregar() {
    try {
      setCarregando(true);
      setErro(null);
      setSucesso(null);
      let query = supabase.from("orcamentos").select(
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
            venda_id,
            numero_venda,
            venda_criada,
            numero_venda_url,
            interacoes,
            clientes:cliente_id (nome),
            destinos:produtos!destino_id (nome),
            produtos:tipo_produtos!produto_id (nome, tipo)
          `
      ).order("data_orcamento", { ascending: false });
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
      setLista(data || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }
  const filtrados = reactExports.useMemo(() => lista, [lista]);
  const porColuna = reactExports.useMemo(() => {
    const mapa = {
      novo: [],
      enviado: [],
      negociando: [],
      fechado: [],
      perdido: []
    };
    filtrados.forEach((o) => {
      const s = o.status || "novo";
      if (!mapa[s]) mapa[s] = [];
      mapa[s].push(o);
    });
    return mapa;
  }, [filtrados]);
  const totais = reactExports.useMemo(() => {
    const acc = {
      novo: { qtd: 0, valor: 0 },
      enviado: { qtd: 0, valor: 0 },
      negociando: { qtd: 0, valor: 0 },
      fechado: { qtd: 0, valor: 0 },
      perdido: { qtd: 0, valor: 0 }
    };
    filtrados.forEach((o) => {
      const s = o.status || "novo";
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
      "numero_venda"
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
      o.numero_venda || ""
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
  function handleDragStart(id) {
    setDraggingId(id);
    const item = lista.find((o) => o.id === id);
    if (item?.status) setDraggingStatus(item.status);
  }
  async function handleDrop(status) {
    if (!draggingId) return;
    if (status === "fechado" || status === "perdido") {
      setDraggingId(null);
      setDraggingStatus(null);
      return;
    }
    await alterarStatus(draggingId, status);
    setDraggingId(null);
    setDraggingStatus(null);
  }
  async function carregarListas() {
    try {
      const [c, d, p] = await Promise.all([
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("produtos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome")
      ]);
      if (c.data) setClientes(c.data);
      if (d.data) setDestinos(d.data);
      if (p.data) setProdutos(p.data);
    } catch (e) {
      console.error(e);
    }
  }
  async function alterarStatus(id, status) {
    try {
      setSalvandoStatus(id);
      setErro(null);
      setSucesso(null);
      const { error } = await supabase.from("orcamentos").update({ status }).eq("id", id);
      if (error) throw error;
      setSucesso("Status atualizado.");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao alterar status.");
    } finally {
      setSalvandoStatus(null);
    }
  }
  function iniciarEdicao(o) {
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
  async function salvarEdicao(e) {
    e.preventDefault();
    if (!editando) return;
    try {
      setSucesso(null);
      setErro(null);
      const { error } = await supabase.from("orcamentos").update({
        valor: valorEdit ? parseFloat(valorEdit) : null,
        data_viagem: dataViagemEdit || null,
        notas: notasEdit || null,
        cliente_id: clienteSelecionado || editando.cliente_id || null,
        destino_id: destinoSelecionado || editando.destino_id || null,
        produto_id: produtoSelecionado || editando.produto_id || null,
        interacoes: novaInteracao.trim() ? [
          ...editando.interacoes || [],
          { criado_em: (/* @__PURE__ */ new Date()).toISOString(), texto: novaInteracao.trim() }
        ] : editando.interacoes || []
      }).eq("id", editando.id);
      if (error) throw error;
      setSucesso("Orçamento atualizado.");
      setEditando(null);
      await carregar();
    } catch (err) {
      console.error(err);
      setErro("Erro ao salvar edição.");
    }
  }
  async function converterParaVenda(o) {
    const confirmar = window.confirm("Converter este orçamento em venda?");
    if (!confirmar) return;
    try {
      setSucesso(null);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");
      const hoje = /* @__PURE__ */ new Date();
      const numero = gerarNumeroVenda(hoje);
      const dataLanc = hoje.toISOString().slice(0, 10);
      const { data: vendaData, error: vendaErr } = await supabase.from("vendas").insert({
        vendedor_id: userId,
        cliente_id: o.cliente_id,
        destino_id: o.destino_id,
        produto_id: o.produto_id,
        data_lancamento: dataLanc,
        data_embarque: o.data_viagem || null,
        valor_total: o.valor || 0,
        status: "aberto",
        numero_venda: numero,
        notas: o.notas
      }).select("id, numero_venda").maybeSingle();
      if (vendaErr) throw vendaErr;
      if (vendaData?.id && o.produto_id) {
        await supabase.from("vendas_recibos").insert({
          venda_id: vendaData.id,
          produto_id: o.produto_id,
          numero_recibo: numero,
          valor_total: o.valor || 0,
          valor_taxas: 0
        });
      }
      await supabase.from("orcamentos").update({
        status: "fechado",
        notas: `${o.notas ? `${o.notas}
` : ""}Convertido para venda ${numero}`
      }).eq("id", o.id);
      setSucesso("Orçamento convertido em venda.");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao converter para venda.");
    }
  }
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Vendas bloqueado." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "page-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title", children: "Orçamentos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "page-subtitle", children: "Consulta rápida dos orçamentos cadastrados." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-3 w-full sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: statusFiltro,
                onChange: (e) => setStatusFiltro(e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Todos" }),
                  statuses.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s }, s))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "date",
                value: periodoIni,
                onChange: (e) => setPeriodoIni(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "date",
                value: periodoFim,
                onChange: (e) => setPeriodoFim(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor min" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: valorMin,
                onChange: (e) => setValorMin(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor max" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "number",
                value: valorMax,
                onChange: (e) => setValorMax(e.target.value)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-secondary", onClick: carregar, children: "Atualizar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", onClick: exportarCSV, children: "Exportar CSV" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-light",
              onClick: () => {
                setStatusFiltro("");
                setPeriodoIni("");
                setPeriodoFim("");
                setValorMin("");
                setValorMax("");
                carregar();
              },
              children: "Limpar filtros"
            }
          )
        ] })
      ] }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erro }),
      sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", children: sucesso }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[1100px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Venda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data viagem" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Notas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          carregando && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Carregando..." }) }),
          !carregando && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Nenhum orçamento encontrado." }) }),
          !carregando && filtrados.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.data_orcamento?.slice(0, 10) || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.clientes?.nome || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.destinos?.nome || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.produtos?.nome || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textTransform: "capitalize" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: o.status || "",
                onChange: (e) => alterarStatus(o.id, e.target.value),
                disabled: salvandoStatus === o.id,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "novo", children: "Novo" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "enviado", children: "Enviado" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "negociando", children: "Negociando" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fechado", children: "Fechado" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "perdido", children: "Perdido" })
                ]
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.venda_id ? /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: o.numero_venda_url || "/vendas/consulta", title: "Ver venda", children: o.numero_venda || `${o.venda_id.slice(0, 6)}...` }) : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.valor ? o.valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.data_viagem || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.notas || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-light",
                  onClick: () => iniciarEdicao(o),
                  style: { padding: "4px 8px", fontSize: "0.85rem" },
                  disabled: o.status === "fechado" || o.status === "perdido",
                  title: o.status === "fechado" || o.status === "perdido" ? "Orçamento encerrado" : "Editar",
                  children: "Editar"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-primary",
                  onClick: () => converterParaVenda(o),
                  style: { padding: "4px 8px", fontSize: "0.85rem", marginLeft: 6 },
                  disabled: !o.cliente_id || !o.destino_id || o.status === "fechado" || o.status === "perdido",
                  title: o.status === "fechado" || o.status === "perdido" ? "Orçamento encerrado" : !o.cliente_id || !o.destino_id ? "Selecione cliente e destino para converter" : "Converter em venda",
                  children: "Converter"
                }
              )
            ] })
          ] }, o.id))
        ] })
      ] }) }),
      editando && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: 500 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", children: "Editar orçamento" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.85rem", color: "#475569" }, children: [
              "Cliente: ",
              editando.clientes?.nome || "—",
              " | Destino: ",
              editando.destinos?.nome || "—"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => setEditando(null), children: "✖" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvarEdicao, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor (R$)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "number",
                  value: valorEdit,
                  onChange: (e) => setValorEdit(e.target.value),
                  min: 0,
                  step: "0.01"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data da viagem" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "date",
                  value: dataViagemEdit,
                  onChange: (e) => setDataViagemEdit(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cliente" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: clienteSelecionado,
                  onChange: (e) => setClienteSelecionado(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                    clientes.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.nome }, c.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: destinoSelecionado,
                  onChange: (e) => setDestinoSelecionado(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                    destinos.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.nome }, d.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Produto" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: produtoSelecionado,
                  onChange: (e) => setProdutoSelecionado(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "(Opcional)" }),
                    produtos.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome }, p.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Notas" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  className: "form-input",
                  rows: 3,
                  value: notasEdit,
                  onChange: (e) => setNotasEdit(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Adicionar interação" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  className: "form-input",
                  rows: 2,
                  value: novaInteracao,
                  onChange: (e) => setNovaInteracao(e.target.value),
                  placeholder: "Ex: Ligação com cliente, próxima ação..."
                }
              )
            ] }),
            editando.interacoes && editando.interacoes.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Histórico" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  style: {
                    maxHeight: 120,
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 8,
                    background: "#f8fafc"
                  },
                  children: editando.interacoes.slice().reverse().map((i, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 6, fontSize: "0.9rem" }, children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#64748b", fontSize: "0.8rem" }, children: i.criado_em?.slice(0, 16).replace("T", " ") }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: i.texto })
                  ] }, idx))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-footer", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => setEditando(null), children: "Cancelar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", children: "Salvar" })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue", style: { marginTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "card-title", children: "Situação do Orçamento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            alignItems: "stretch",
            marginBottom: 10
          },
          children: statuses.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "kpi-card",
              style: {
                background: statusCores[status].bg,
                border: `1px solid ${statusCores[status].border}`
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", style: { textTransform: "capitalize" }, children: status }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-value", style: { fontSize: "1.1rem" }, children: [
                  totais[status].qtd,
                  " itens"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem", color: "#0f172a" }, children: totais[status].valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) })
              ]
            },
            `kpi-${status}`
          ))
        }
      ),
      statuses.some((s) => porColuna[s].length > 0) ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: statuses.filter((s) => porColuna[s].length > 0).map((status) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          style: {
            background: statusCores[status].bg,
            border: `1px solid ${statusCores[status].border}`,
            borderRadius: 10,
            padding: 10,
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
            boxShadow: draggingStatus && draggingStatus === status ? "0 0 0 2px rgba(59,130,246,0.4)" : "none",
            transform: draggingStatus && draggingStatus === status ? "scale(1.01)" : "none"
          },
          onDragOver: (e) => e.preventDefault(),
          onDrop: () => handleDrop(status),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8
                },
                children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, textTransform: "capitalize" }, children: status })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: porColuna[status].map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                style: {
                  background: "white",
                  borderRadius: 8,
                  border: draggingId === o.id ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                  padding: "8px 10px",
                  boxShadow: draggingId === o.id ? "0 8px 16px rgba(59,130,246,0.15)" : "0 1px 2px rgba(0,0,0,0.05)",
                  position: "relative"
                },
                draggable: o.status !== "fechado" && o.status !== "perdido",
                onDragStart: () => {
                  if (o.status === "fechado" || o.status === "perdido") return;
                  handleDragStart(o.id);
                },
                onDragEnd: () => setDraggingId(null),
                title: `Cliente: ${o.clientes?.nome || "—"}
Destino: ${o.destinos?.nome || "—"}
Valor: ${o.valor ? o.valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }) : "—"}
Data orçamento: ${o.data_orcamento?.slice(0, 10) || "—"}
Data viagem: ${o.data_viagem || "—"}
Venda: ${o.numero_venda || "—"}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: o.clientes?.nome || "Cliente" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.85rem", color: "#64748b" }, children: o.destinos?.nome || "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.85rem", color: "#475569" }, children: [
                    "Valor:",
                    " ",
                    o.valor ? o.valor.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }) : "—"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", color: "#94a3b8" }, children: [
                    "Orcamento: ",
                    o.data_orcamento?.slice(0, 10) || "—",
                    " | Viagem:",
                    " ",
                    o.data_viagem || "—"
                  ] }),
                  o.venda_id && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", color: "#22c55e" }, children: [
                    "Venda: ",
                    o.numero_venda || o.venda_id.slice(0, 6)
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }, children: [
                    status !== "negociando" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn btn-light",
                        style: { padding: "4px 8px", fontSize: "0.8rem" },
                        onClick: () => alterarStatus(o.id, "negociando"),
                        disabled: salvandoStatus === o.id,
                        children: "Mover p/ negociando"
                      }
                    ),
                    status !== "enviado" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn btn-light",
                        style: { padding: "4px 8px", fontSize: "0.8rem" },
                        onClick: () => alterarStatus(o.id, "enviado"),
                        disabled: salvandoStatus === o.id,
                        children: "Enviar"
                      }
                    ),
                    status !== "perdido" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn btn-light",
                        style: { padding: "4px 8px", fontSize: "0.8rem" },
                        onClick: () => alterarStatus(o.id, "perdido"),
                        disabled: salvandoStatus === o.id,
                        children: "Marcar perdido"
                      }
                    ),
                    status !== "fechado" && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn btn-primary",
                        style: { padding: "4px 8px", fontSize: "0.8rem" },
                        onClick: () => converterParaVenda(o),
                        disabled: !o.cliente_id || !o.destino_id,
                        children: "Fechar (Venda)"
                      }
                    )
                  ] })
                ]
              },
              o.id
            )) })
          ]
        },
        status
      )) }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", style: { marginTop: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Nenhum orçamento para exibir no Kanban." }) })
    ] })
  ] });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "orcamentos";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Or\xE7amentos", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Orçamentos / CRM</h1> <p class="page-subtitle">
Cadastre e acompanhe orçamentos antes de virarem vendas.
</p> ${renderComponent($$result2, "OrcamentosCadastroIsland", OrcamentosCadastroIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/OrcamentosCadastroIsland.tsx", "client:component-export": "default" })} ${renderComponent($$result2, "OrcamentosConsultaIsland", OrcamentosConsultaIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/OrcamentosConsultaIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/orcamentos/index.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/orcamentos/index.astro";
const $$url = "/orcamentos";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
