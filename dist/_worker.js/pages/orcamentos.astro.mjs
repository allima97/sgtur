globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                      */
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_B-SnFw9s.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../chunks/usePermissao_ChD594_G.mjs';
import { L as LoadingUsuarioContext } from '../chunks/LoadingUsuarioContext_XbJI-A09.mjs';

function OrcamentosCadastroIsland({
  suppressLoadingMessage = false
}) {
  const { ativo, loading: loadingPerm } = usePermissao("Vendas");
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
      window.dispatchEvent(new CustomEvent("orcamento-criado"));
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
  if (loadingPerm) {
    return suppressLoadingMessage ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, { className: "mb-3" });
  }
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Vendas bloqueado." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title font-semibold text-lg", children: "Novo Orçamento" }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error text-red-600 font-medium mb-2", children: erro }),
    sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success text-slate-900 font-bold mb-2", children: sucesso }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row flex flex-col md:flex-row gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row flex flex-col md:flex-row gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[140px]", children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[140px]", children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[140px]", children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : "Criar orçamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => {
              setClienteId("");
              setDestinoId("");
              setProdutoId("");
              setStatus("novo");
              setValor("");
              setDataViagem("");
              setNotas("");
              setErro(null);
              setSucesso(null);
            },
            children: "Limpar"
          }
        )
      ] })
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
function OrcamentosConsultaIsland({
  suppressLoadingMessage = false
}) {
  const { ativo, loading: loadingPerm } = usePermissao("Vendas");
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
  const [clientes, setClientes] = reactExports.useState([]);
  const [destinos, setDestinos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const statuses = ["novo", "enviado", "negociando", "fechado", "perdido"];
  const LIMITE_INTERACAO_DIAS = 7;
  const statusCores = {
    novo: { bg: "#e0f2fe", border: "#1d4ed8" },
    // azul solicitado (#1d4ed8)
    enviado: { bg: "#fef9c3", border: "#facc15" },
    // amarelo
    negociando: { bg: "#fff7ed", border: "#fdba74" },
    // laranja
    fechado: { bg: "#ecfdf3", border: "#16a34a" },
    // verde mais escuro na borda
    perdido: { bg: "#fee2e2", border: "#fca5a5" }
    // vermelho mais evidente
  };
  const [draggingId, setDraggingId] = reactExports.useState(null);
  const [draggingStatus, setDraggingStatus] = reactExports.useState(null);
  const [periodoIni, setPeriodoIni] = reactExports.useState("");
  const [periodoFim, setPeriodoFim] = reactExports.useState("");
  const [valorMin, setValorMin] = reactExports.useState("");
  const [valorMax, setValorMax] = reactExports.useState("");
  const [historicoAberto, setHistoricoAberto] = reactExports.useState(null);
  const [interacoes, setInteracoes] = reactExports.useState([]);
  const [carregandoInteracoes, setCarregandoInteracoes] = reactExports.useState(false);
  const [salvandoInteracao, setSalvandoInteracao] = reactExports.useState(false);
  const [erroInteracao, setErroInteracao] = reactExports.useState(null);
  const [novaInteracaoTipo, setNovaInteracaoTipo] = reactExports.useState("anotacao");
  const [novaInteracaoMsg, setNovaInteracaoMsg] = reactExports.useState("");
  const [novaInteracaoAnexo, setNovaInteracaoAnexo] = reactExports.useState("");
  const [envioCanal, setEnvioCanal] = reactExports.useState("email");
  const [envioContato, setEnvioContato] = reactExports.useState("");
  const [envioLink, setEnvioLink] = reactExports.useState("");
  const [envioMsg, setEnvioMsg] = reactExports.useState("");
  const [envioStatus, setEnvioStatus] = reactExports.useState(true);
  const [followUpLoadingId, setFollowUpLoadingId] = reactExports.useState(null);
  const [mostrarKanban, setMostrarKanban] = reactExports.useState(false);
  const [somentePendentes, setSomentePendentes] = reactExports.useState(false);
  const [ultimasInteracoes, setUltimasInteracoes] = reactExports.useState({});
  const [toasts, setToasts] = reactExports.useState([]);
  const [toastCounter, setToastCounter] = reactExports.useState(0);
  const tipoInteracaoOptions = [
    { value: "anotacao", label: "Anotação interna" },
    { value: "contato", label: "Contato com cliente" },
    { value: "envio", label: "Envio de proposta" },
    { value: "follow-up", label: "Follow-up" }
  ];
  reactExports.useEffect(() => {
    carregar();
    carregarListas();
  }, []);
  reactExports.useEffect(() => {
    const handler = () => carregar();
    window.addEventListener("orcamento-criado", handler);
    return () => window.removeEventListener("orcamento-criado", handler);
  }, []);
  reactExports.useEffect(() => {
    const handler = () => carregar();
    window.addEventListener("orcamento-interacao-criada", handler);
    return () => window.removeEventListener("orcamento-interacao-criada", handler);
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
            numero_venda,
            venda_criada,
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
      const listaNova = data || [];
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
  const pendentesFollowUp = reactExports.useMemo(() => {
    const relevantes = ["novo", "enviado", "negociando"];
    return lista.filter((o) => {
      const status = o.status || "novo";
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
  const pendentesIds = reactExports.useMemo(() => new Set(pendentesFollowUp.map((o) => o.id)), [pendentesFollowUp]);
  const filtrados = reactExports.useMemo(
    () => somentePendentes ? lista.filter((o) => pendentesIds.has(o.id)) : lista,
    [lista, somentePendentes, pendentesIds]
  );
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
  function diasAte(data) {
    if (!data) return Number.POSITIVE_INFINITY;
    const hoje = /* @__PURE__ */ new Date();
    const alvo = /* @__PURE__ */ new Date(`${data}T00:00:00`);
    const diff = alvo.getTime() - hoje.getTime();
    return Math.floor(diff / (1e3 * 60 * 60 * 24));
  }
  function diasDesde(data) {
    if (!data) return Number.POSITIVE_INFINITY;
    const hoje = /* @__PURE__ */ new Date();
    const alvo = /* @__PURE__ */ new Date(`${data}T00:00:00`);
    const diff = hoje.getTime() - alvo.getTime();
    return Math.floor(diff / (1e3 * 60 * 60 * 24));
  }
  function resumoMensagem(msg, max = 80) {
    if (!msg) return "";
    const clean = msg.replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return `${clean.slice(0, max - 1)}…`;
  }
  function diasDesdeISO(data) {
    if (!data) return Number.POSITIVE_INFINITY;
    const diff = Date.now() - new Date(data).getTime();
    return Math.floor(diff / (1e3 * 60 * 60 * 24));
  }
  function showToast(message, type = "success") {
    setToastCounter((prev) => prev + 1);
    const id = toastCounter + 1;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }
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
  async function carregarUltimasInteracoes(ids) {
    try {
      const { data, error } = await supabase.from("orcamento_interacoes").select("orcamento_id, tipo, created_at, mensagem, anexo_url").in("orcamento_id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      const map = {};
      (data || []).forEach((i) => {
        if (!map[i.orcamento_id]) {
          map[i.orcamento_id] = { tipo: i.tipo, created_at: i.created_at, mensagem: i.mensagem, anexo_url: i.anexo_url };
        }
      });
      setUltimasInteracoes(map);
    } catch (e) {
      console.error("Erro ao carregar últimas interações", e);
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
        produto_id: produtoSelecionado || editando.produto_id || null
      }).eq("id", editando.id);
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
      showToast("Orçamento convertido em venda.", "success");
      await carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao converter para venda.");
      showToast("Erro ao converter para venda.", "error");
    }
  }
  async function registrarFollowUpRapido(o) {
    try {
      setFollowUpLoadingId(o.id);
      setErro(null);
      setSucesso(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");
      const msg = `Follow-up automático: orçamento ${o.id} (${o.status || "novo"}) ${o.data_viagem ? `viagem em ${o.data_viagem}` : "sem data de viagem"}.`;
      const { error } = await supabase.from("orcamento_interacoes").insert({
        orcamento_id: o.id,
        usuario_id: userId,
        tipo: "follow-up",
        mensagem: msg
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
  async function carregarInteracoes(orcamentoId) {
    try {
      setCarregandoInteracoes(true);
      setErroInteracao(null);
      const { data, error } = await supabase.from("orcamento_interacoes").select(
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
      ).eq("orcamento_id", orcamentoId).order("created_at", { ascending: false });
      if (error) throw error;
      setInteracoes(data || []);
    } catch (e) {
      console.error(e);
      const msg = e?.message || "Erro ao carregar interações.";
      setErroInteracao(`${msg} Verifique se a tabela "orcamento_interacoes" existe com colunas esperadas.`);
    } finally {
      setCarregandoInteracoes(false);
    }
  }
  function abrirHistorico(o) {
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
  async function adicionarInteracao(e) {
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
        anexo_url: novaInteracaoAnexo.trim() || null
      });
      if (error) throw error;
      setNovaInteracaoMsg("");
      setNovaInteracaoTipo("anotacao");
      setNovaInteracaoAnexo("");
      await carregarInteracoes(historicoAberto.id);
      window.dispatchEvent(
        new CustomEvent("orcamento-interacao-criada", {
          detail: { orcamentoId: historicoAberto.id }
        })
      );
      showToast("Interação registrada.", "success");
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Erro ao salvar interação.";
      setErroInteracao(msg);
      showToast("Erro ao salvar interação.", "error");
    } finally {
      setSalvandoInteracao(false);
    }
  }
  async function registrarEnvio(e) {
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
      const msgBase = envioMsg.trim() || `Enviado via ${envioCanal}${envioContato ? ` para ${envioContato}` : ""}.`;
      const { error } = await supabase.from("orcamento_interacoes").insert({
        orcamento_id: historicoAberto.id,
        usuario_id: userId,
        tipo: "envio",
        mensagem: msgBase,
        anexo_url: envioLink.trim() || null
      });
      if (error) throw error;
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
          detail: { orcamentoId: historicoAberto.id }
        })
      );
      showToast("Envio registrado.", "success");
      await carregar();
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Erro ao registrar envio/compartilhamento.";
      setErroInteracao(msg);
      showToast("Erro ao registrar envio/compartilhamento.", "error");
    } finally {
      setSalvandoInteracao(false);
    }
  }
  if (loadingPerm) {
    return suppressLoadingMessage ? null : /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Vendas bloqueado." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "page-header mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title font-semibold text-lg", children: "Orçamentos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "page-subtitle text-slate-500", children: "Consulta rápida dos orçamentos cadastrados." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "grid w-full mt-3 gap-2 md:gap-3",
          style: {
            gridTemplateColumns: "repeat(5, minmax(180px, 1fr))",
            alignItems: "end"
          },
          children: [
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
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-secondary min-w-[120px]", onClick: carregar, children: "Atualizar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light min-w-[140px]", onClick: exportarCSV, children: "Exportar CSV" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-light min-w-[140px]",
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
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-light min-w-[160px]",
            onClick: () => setMostrarKanban((prev) => !prev),
            children: mostrarKanban ? "Ocultar Kanban" : "Mostrar Kanban"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-2 cursor-pointer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: somentePendentes,
              onChange: (e) => setSomentePendentes(e.target.checked)
            }
          ),
          "Só pendentes de follow-up"
        ] })
      ] })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erro }),
    sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", style: { color: "#0f172a", fontWeight: 700 }, children: sucesso }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mt-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "card-title font-semibold", children: "Situação do Orçamento" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-2 md:gap-3", style: { gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", alignItems: "stretch" }, children: statuses.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "kpi-card flex flex-col gap-1 items-center justify-center text-center",
          style: {
            background: statusCores[status].bg,
            border: `1px solid ${statusCores[status].border}`
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-label capitalize font-bold", children: [
              status,
              " - ",
              String(totais[status].qtd).padStart(2, "0"),
              " Itens"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value text-xl font-extrabold", children: totais[status].valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ]
        },
        `kpi-${status}`
      )) })
    ] }),
    pendentesFollowUp.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-yellow", style: { marginTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "card-title", children: "Pendentes de follow-up" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "page-subtitle", children: "Viagem próxima (≤ 7 dias) ou orçamento sem data há 7+ dias. Clique para registrar follow-up." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
          },
          children: pendentesFollowUp.map((o) => {
            const ultima = ultimasInteracoes[o.id];
            const diasInteracao = diasDesdeISO(ultima?.created_at || null);
            const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "card-base",
                style: { border: "1px solid #facc15", background: "#fffbeb" },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700 }, children: o.clientes?.nome || "Cliente não informado" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.9rem", color: "#475569" }, children: [
                    "Status: ",
                    (o.status || "novo").toUpperCase(),
                    " | Viagem: ",
                    o.data_viagem || "—"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.9rem", color: "#475569" }, children: [
                    "Valor:",
                    " ",
                    o.valor ? o.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"
                  ] }),
                  semInteracaoRecente && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 4, color: "#b45309", fontSize: "0.85rem", fontWeight: 700 }, children: [
                    "Sem interação há ",
                    Number.isFinite(diasInteracao) ? `${diasInteracao}d` : "—"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn btn-primary",
                      style: { marginTop: 8, width: "100%" },
                      onClick: () => registrarFollowUpRapido(o),
                      disabled: followUpLoadingId === o.id,
                      children: followUpLoadingId === o.id ? "Registrando..." : "Registrar follow-up"
                    }
                  ),
                  ultima?.tipo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8, fontSize: "0.85rem", color: "#475569" }, children: [
                    "Última: ",
                    ultima?.tipo,
                    " ",
                    ultima?.created_at ? new Date(ultima?.created_at || "").toLocaleDateString("pt-BR") : "",
                    resumoMensagem(ultima?.mensagem) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#0f172a" }, children: resumoMensagem(ultima?.mensagem) }),
                    ultima?.anexo_url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: ultima?.anexo_url || "", target: "_blank", rel: "noreferrer", style: { color: "#1d4ed8" }, children: "Abrir anexo" }) })
                  ] })
                ]
              },
              `pend-${o.id}`
            );
          })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base", style: { marginTop: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[1100px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Status" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Valor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Data viagem" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Última interação" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        carregando && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Carregando..." }) }),
        !carregando && filtrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Nenhum orçamento encontrado." }) }),
        !carregando && filtrados.map((o) => {
          const ultima = ultimasInteracoes[o.id];
          const diasInteracao = diasDesdeISO(ultima?.created_at || null);
          const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.data_orcamento?.slice(0, 10) || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.clientes?.nome || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.destinos?.nome || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.produtos?.nome || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textTransform: "capitalize", textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
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
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: o.valor ? o.valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) : "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: o.data_viagem || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { textAlign: "center", fontSize: "0.85rem", color: "#475569" }, children: [
              ultima?.tipo || "—",
              ultima?.created_at ? ` • ${new Date(ultima.created_at).toLocaleDateString("pt-BR")}` : "",
              ultima?.mensagem && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: resumoMensagem(ultima.mensagem) }),
              ultima?.anexo_url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: ultima.anexo_url || "", target: "_blank", rel: "noreferrer", style: { color: "#1d4ed8" }, children: "Abrir anexo" }) }),
              semInteracaoRecente && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { color: "#b45309", fontWeight: 700 }, children: [
                "Sem interação há ",
                Number.isFinite(diasInteracao) ? `${diasInteracao}d` : "—"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { textAlign: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon",
                  onClick: () => iniciarEdicao(o),
                  style: { marginRight: 6 },
                  disabled: o.status === "fechado" || o.status === "perdido",
                  title: o.status === "fechado" || o.status === "perdido" ? "Orçamento encerrado" : "Editar",
                  children: "✏️"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn btn-primary",
                  "aria-label": "Converter em venda",
                  onClick: () => converterParaVenda(o),
                  style: { padding: "4px 8px", fontSize: "0.95rem", marginLeft: 6 },
                  disabled: !o.cliente_id || !o.destino_id || o.status === "fechado" || o.status === "perdido",
                  title: o.status === "fechado" || o.status === "perdido" ? "Orçamento encerrado" : !o.cliente_id || !o.destino_id ? "Selecione cliente e destino para converter" : "Converter em venda",
                  children: "$"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  className: "btn-icon",
                  "aria-label": "Histórico de interações",
                  onClick: () => abrirHistorico(o),
                  style: { marginLeft: 6 },
                  title: "Ver histórico / registrar interação",
                  children: "🕒"
                }
              )
            ] })
          ] }, o.id);
        })
      ] })
    ] }) }) }),
    mostrarKanban && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "page-header", style: { marginBottom: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "card-title", children: "Kanban de Orçamentos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "page-subtitle", children: "Arraste os cards entre colunas para alterar o status." })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            alignItems: "flex-start"
          },
          children: statuses.map((status) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              onDragOver: (e) => e.preventDefault(),
              onDrop: () => handleDrop(status),
              style: {
                border: `2px dashed ${statusCores[status].border}`,
                background: statusCores[status].bg,
                minHeight: 120,
                padding: 8,
                borderRadius: 10
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontWeight: 800, textTransform: "capitalize", marginBottom: 6 }, children: [
                  status,
                  " (",
                  porColuna[status]?.length || 0,
                  ")"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gap: 8 }, children: [
                  (porColuna[status] || []).map((o) => {
                    const ultima = ultimasInteracoes[o.id];
                    const diasInteracao = diasDesdeISO(ultima?.created_at || null);
                    const semInteracaoRecente = !ultima?.created_at || diasInteracao >= LIMITE_INTERACAO_DIAS;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        draggable: true,
                        onDragStart: () => handleDragStart(o.id),
                        onDragEnd: () => {
                          setDraggingId(null);
                          setDraggingStatus(null);
                        },
                        className: "card-base",
                        style: {
                          padding: 10,
                          cursor: "grab",
                          border: "1px solid #e2e8f0",
                          background: "#fff"
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700 }, children: o.clientes?.nome || "Cliente não informado" }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.9rem", color: "#475569" }, children: [
                            "Valor:",
                            " ",
                            o.valor ? o.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.9rem", color: "#475569" }, children: [
                            "Viagem: ",
                            o.data_viagem || "—"
                          ] }),
                          semInteracaoRecente && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.85rem", color: "#b45309", fontWeight: 700 }, children: [
                            "Sem interação há ",
                            Number.isFinite(diasInteracao) ? `${diasInteracao}d` : "—"
                          ] }),
                          ultima?.tipo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.85rem", color: "#475569" }, children: [
                            "Última: ",
                            ultima?.tipo,
                            " ",
                            ultima?.created_at ? new Date(ultima?.created_at || "").toLocaleDateString("pt-BR") : "",
                            resumoMensagem(ultima?.mensagem) && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#0f172a" }, children: resumoMensagem(ultima?.mensagem) }),
                            ultima?.anexo_url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: ultima?.anexo_url || "", target: "_blank", rel: "noreferrer", style: { color: "#1d4ed8" }, children: "Abrir anexo" }) })
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "button",
                              {
                                className: "btn btn-light",
                                style: { padding: "4px 8px" },
                                onClick: () => iniciarEdicao(o),
                                children: "Editar"
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "button",
                              {
                                className: "btn btn-light",
                                style: { padding: "4px 8px" },
                                onClick: () => abrirHistorico(o),
                                children: "Histórico"
                              }
                            )
                          ] })
                        ]
                      },
                      `kan-card-${o.id}`
                    );
                  }),
                  (porColuna[status] || []).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem", color: "#475569" }, children: "Sem itens." })
                ] })
              ]
            },
            `kanban-${status}`
          ))
        }
      )
    ] }),
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
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-footer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => setEditando(null), children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", children: "Salvar" })
        ] })
      ] })
    ] }) }),
    historicoAberto && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: 640, width: "90vw" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", children: "Histórico do orçamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.9rem", color: "#475569" }, children: [
            "Cliente: ",
            historicoAberto.clientes?.nome || "—",
            " | Destino: ",
            historicoAberto.destinos?.nome || "—",
            " | Produto: ",
            historicoAberto.produtos?.nome || "—"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: fecharHistorico, children: "✖" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", style: { display: "grid", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: registrarEnvio, className: "card-base", style: { background: "#eef2ff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", style: { fontSize: "1rem", marginBottom: 8 }, children: "Registrar envio / compartilhamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid", style: { display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Canal" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { className: "form-select", value: envioCanal, onChange: (e) => setEnvioCanal(e.target.value), children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "email", children: "E-mail" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "whatsapp", children: "WhatsApp" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "link", children: "Link" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "outro", children: "Outro" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destinatário" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "text",
                  value: envioContato,
                  onChange: (e) => setEnvioContato(e.target.value),
                  placeholder: "E-mail, telefone, nome..."
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Link" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  type: "url",
                  value: envioLink,
                  onChange: (e) => setEnvioLink(e.target.value),
                  placeholder: "https://... (PDF, drive, WhatsApp, etc.)"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Mensagem" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                className: "form-input",
                rows: 3,
                value: envioMsg,
                onChange: (e) => setEnvioMsg(e.target.value),
                placeholder: "Ex.: Proposta enviada por e-mail. Link do PDF..."
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: envioStatus,
                onChange: (e) => setEnvioStatus(e.target.checked)
              }
            ),
            'Marcar orçamento como "enviado"'
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvandoInteracao, children: salvandoInteracao ? "Salvando..." : "Registrar envio" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: adicionarInteracao, className: "card-base", style: { background: "#f8fafc" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                className: "form-select",
                value: novaInteracaoTipo,
                onChange: (e) => setNovaInteracaoTipo(e.target.value),
                children: tipoInteracaoOptions.map((opt) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opt.value, children: opt.label }, opt.value))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Mensagem" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                className: "form-input",
                rows: 3,
                value: novaInteracaoMsg,
                onChange: (e) => setNovaInteracaoMsg(e.target.value),
                placeholder: "Ex.: Enviada proposta por e-mail. Aguardando retorno."
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Link / Anexo (opcional)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "url",
                value: novaInteracaoAnexo,
                onChange: (e) => setNovaInteracaoAnexo(e.target.value),
                placeholder: "https://... (PDF, drive, WhatsApp, etc.)"
              }
            )
          ] }),
          erroInteracao && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erroInteracao }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: fecharHistorico, children: "Fechar" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvandoInteracao, children: salvandoInteracao ? "Salvando..." : "Registrar" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { maxHeight: "50vh", overflowY: "auto" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", style: { fontSize: "1rem", marginBottom: 8 }, children: "Interações" }),
          carregandoInteracoes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando interações..." }),
          !carregandoInteracoes && interacoes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Nenhuma interação registrada ainda." }),
          !carregandoInteracoes && interacoes.map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                padding: "10px 0",
                borderBottom: "1px solid #e2e8f0",
                display: "grid",
                gap: 4
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      style: {
                        background: "#e2e8f0",
                        color: "#0f172a",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: "0.85rem",
                        textTransform: "capitalize",
                        whiteSpace: "nowrap"
                      },
                      children: i.tipo || "anotacao"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "0.85rem", color: "#475569", textAlign: "right" }, children: i.created_at ? new Date(i.created_at).toLocaleString("pt-BR") : "—" })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { whiteSpace: "pre-wrap", color: "#0f172a" }, children: i.mensagem }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.85rem", color: "#475569" }, children: [
                  "Por: ",
                  i.users?.email || i.usuario_id || "—"
                ] }),
                i.anexo_url && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: i.anexo_url, target: "_blank", rel: "noreferrer", style: { color: "#1d4ed8" }, children: "Abrir anexo/compartilhamento" }) })
              ]
            },
            i.id
          ))
        ] })
      ] })
    ] }) }),
    toasts.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "fixed",
          bottom: 16,
          right: 16,
          display: "grid",
          gap: 8,
          zIndex: 9999,
          maxWidth: "320px"
        },
        children: toasts.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "card-base",
            style: {
              padding: "10px 12px",
              background: t.type === "success" ? "#ecfdf3" : "#fee2e2",
              border: `1px solid ${t.type === "success" ? "#16a34a" : "#ef4444"}`,
              color: "#0f172a",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)"
            },
            children: t.message
          },
          t.id
        ))
      }
    )
  ] });
}

function OrcamentosPermissionLoader({
  children
}) {
  const { ativo, loading } = usePermissao("Vendas");
  if (loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, { className: "mb-3" });
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso ao módulo de Vendas bloqueado." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(jsxRuntimeExports.Fragment, { children });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const activePage = "orcamentos";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Or\xE7amentos", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Orçamentos / CRM</h1> <p class="page-subtitle">
Cadastre e acompanhe orçamentos antes de virarem vendas.
</p> ${renderComponent($$result2, "OrcamentosPermissionLoader", OrcamentosPermissionLoader, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/OrcamentosPermissionLoader.tsx", "client:component-export": "default" }, { "default": ($$result3) => renderTemplate` ${renderComponent($$result3, "OrcamentosCadastroIsland", OrcamentosCadastroIsland, { "client:load": true, "suppressLoadingMessage": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/OrcamentosCadastroIsland.tsx", "client:component-export": "default" })} ${renderComponent($$result3, "OrcamentosConsultaIsland", OrcamentosConsultaIsland, { "client:load": true, "suppressLoadingMessage": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/OrcamentosConsultaIsland.tsx", "client:component-export": "default" })} ` })} ` })}`;
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
