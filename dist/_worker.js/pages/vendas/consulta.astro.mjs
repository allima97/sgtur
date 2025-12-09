globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6Zr-jH2.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_CEcCj9vF.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_Bxa24Le5.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_Di0qno_D.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DAXFO6RA.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DAXFO6RA.mjs';
import { r as registrarLog } from '../../chunks/logs_BNJN817W.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_BHj0yuGE.mjs';

function VendasConsultaIsland() {
  const { permissao, ativo, loading: loadPerm, isAdmin } = usePermissao("Vendas");
  const podeVer = permissao !== "none";
  const podeCriar = permissao === "create" || permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeEditar = permissao === "edit" || permissao === "delete" || permissao === "admin";
  const podeExcluir = permissao === "delete" || permissao === "admin";
  const [userCtx, setUserCtx] = reactExports.useState(null);
  const [loadingUser, setLoadingUser] = reactExports.useState(true);
  const [vendas, setVendas] = reactExports.useState([]);
  const [recibos, setRecibos] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [pendingOpenId, setPendingOpenId] = reactExports.useState(null);
  const [modalVenda, setModalVenda] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [cancelando, setCancelando] = reactExports.useState(false);
  const [excluindoRecibo, setExcluindoRecibo] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id");
    if (idParam) setPendingOpenId(idParam);
  }, []);
  reactExports.useEffect(() => {
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
  async function carregar() {
    if (!podeVer || !userCtx) return;
    try {
      setLoading(true);
      let query = supabase.from("vendas").select(`
          id,
          vendedor_id,
          cliente_id,
          destino_id,
          data_lancamento,
          data_embarque,
          clientes(nome),
          destinos(nome)
        `).order("data_lancamento", { ascending: false });
      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }
      const { data: vendasData, error } = await query;
      if (error) throw error;
      const v = (vendasData || []).map((row) => ({
        id: row.id,
        vendedor_id: row.vendedor_id,
        cliente_id: row.cliente_id,
        destino_id: row.destino_id,
        data_lancamento: row.data_lancamento,
        data_embarque: row.data_embarque,
        cliente_nome: row.clientes?.nome || "",
        destino_nome: row.destinos?.nome || ""
      }));
      setVendas(v);
      const vendaIds = v.map((i) => i.id);
      if (vendaIds.length === 0) {
        setRecibos([]);
      } else {
        const { data: recibosData } = await supabase.from("vendas_recibos").select("*").in("venda_id", vendaIds);
        setRecibos(recibosData || []);
      }
      if (pendingOpenId) {
        const alvo = v.find((i) => i.id === pendingOpenId);
        if (alvo) setModalVenda(alvo);
        setPendingOpenId(null);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    if (!loadPerm && podeVer && userCtx) carregar();
  }, [loadPerm, podeVer, userCtx]);
  const filtroLabel = reactExports.useMemo(() => {
    if (!userCtx) return "";
    if (userCtx.papel === "ADMIN") return "Todas as vendas";
    if (userCtx.papel === "GESTOR") return "Vendas da sua equipe";
    return "Suas vendas";
  }, [userCtx]);
  const vendasFiltradas = reactExports.useMemo(() => {
    if (!busca.trim()) return vendas;
    const t = busca.toLowerCase();
    return vendas.filter(
      (v) => v.cliente_nome?.toLowerCase().includes(t) || v.destino_nome?.toLowerCase().includes(t) || v.id.toLowerCase().includes(t)
    );
  }, [vendas, busca]);
  function recibosDaVenda(id) {
    return recibos.filter((r) => r.venda_id === id);
  }
  async function cancelarVenda(venda) {
    if (!podeExcluir && !isAdmin) return;
    if (!confirm("Tem certeza que deseja CANCELAR esta venda?")) return;
    try {
      setCancelando(true);
      await supabase.from("vendas_recibos").delete().eq("venda_id", venda.id);
      await supabase.from("vendas").delete().eq("id", venda.id);
      await registrarLog({
        acao: "venda_cancelada",
        modulo: "Vendas",
        detalhes: { id: venda.id }
      });
      await carregar();
      setModalVenda(null);
    } catch (e) {
      console.error(e);
      alert("Erro ao cancelar venda.");
    } finally {
      setCancelando(false);
    }
  }
  async function excluirRecibo(id, vendaId) {
    if (!podeExcluir) return;
    if (!confirm("Excluir este recibo?")) return;
    try {
      setExcluindoRecibo(id);
      await supabase.from("vendas_recibos").delete().eq("id", id);
      await registrarLog({
        acao: "recibo_excluido",
        modulo: "Vendas",
        detalhes: { recibo_id: id, venda_id: vendaId }
      });
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir recibo.");
    } finally {
      setExcluindoRecibo(null);
    }
  }
  async function remarcarData(venda, novaData) {
    if (!podeEditar) return;
    try {
      setSalvando(true);
      await supabase.from("vendas").update({ data_embarque: novaData }).eq("id", venda.id);
      await registrarLog({
        acao: "venda_remarcada",
        modulo: "Vendas",
        detalhes: { venda_id: venda.id, nova_data: novaData }
      });
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Erro ao remarcar.");
    } finally {
      setSalvando(false);
    }
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso negado ao módulo de Vendas." }) });
  }
  if (loadingUser || loadPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: "Carregando contexto do usuário..." });
  }
  if (!podeVer) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Você não possui permissão para visualizar Vendas." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "vendas-consulta-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar venda" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            placeholder: "Nome, destino ou ID...",
            value: busca,
            onChange: (e) => setBusca(e.target.value)
          }
        ),
        filtroLabel && /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { style: { color: "#64748b" }, children: [
          filtroLabel,
          " ",
          userCtx?.papel !== "ADMIN" ? "(restrição por vendedor)" : ""
        ] })
      ] }),
      podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignItems: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("a", { className: "btn btn-primary", href: "/vendas/cadastro", children: "Nova venda" }) })
    ] }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-green min-w-[820px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Lançamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Embarque" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
        podeVer && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Carregando..." }) }),
        !loading && vendasFiltradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Nenhuma venda encontrada." }) }),
        !loading && vendasFiltradas.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.cliente_nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino_nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: new Date(v.data_lancamento).toLocaleDateString("pt-BR") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_embarque ? new Date(v.data_embarque).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
            "R$",
            recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_total || 0), 0).toLocaleString("pt-BR")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
            "R$",
            recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_taxas || 0), 0).toLocaleString("pt-BR")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn-icon",
              title: "Ver detalhes",
              onClick: () => setModalVenda(v),
              children: "👁️"
            }
          ) })
        ] }, v.id))
      ] })
    ] }) }),
    modalVenda && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: "820px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-title", children: "Detalhes da venda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { style: { color: "#64748b" }, children: [
            modalVenda.cliente_nome,
            " • ",
            modalVenda.destino_nome
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => setModalVenda(null), children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-2", style: { lineHeight: 1.5 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Lançada em:" }),
          " ",
          new Date(modalVenda.data_lancamento).toLocaleDateString("pt-BR"),
          /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Embarque:" }),
          " ",
          modalVenda.data_embarque ? new Date(modalVenda.data_embarque).toLocaleDateString("pt-BR") : "-"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8 }, children: "Recibos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "table",
          {
            className: "table-default table-header-green",
            style: { minWidth: 520 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Número" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
                podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: recibosDaVenda(modalVenda.id).map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.numero_recibo || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                  "R$",
                  (r.valor_total || 0).toLocaleString("pt-BR")
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                  "R$",
                  (r.valor_taxas || 0).toLocaleString("pt-BR")
                ] }),
                podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "btn-icon btn-danger",
                    disabled: excluindoRecibo === r.id,
                    onClick: () => excluirRecibo(r.id, modalVenda.id),
                    children: excluindoRecibo === r.id ? "…" : "🗑️"
                  }
                ) })
              ] }, r.id)) })
            ]
          }
        ) })
      ] }),
      (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-footer", children: [
        podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "a",
            {
              className: "btn btn-outline",
              href: `/vendas/cadastro?id=${modalVenda.id}`,
              children: "Editar"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-primary",
              onClick: () => {
                const nova = prompt(
                  "Nova data de embarque (AAAA-MM-DD):",
                  modalVenda.data_embarque || ""
                );
                if (nova) remarcarData(modalVenda, nova);
              },
              disabled: salvando,
              children: salvando ? "Salvando..." : "Remarcar"
            }
          )
        ] }),
        podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn btn-danger",
            onClick: () => cancelarVenda(modalVenda),
            disabled: cancelando,
            children: cancelando ? "Cancelando..." : "Cancelar Venda"
          }
        )
      ] })
    ] }) })
  ] });
}

const $$Consulta = createComponent(($$result, $$props, $$slots) => {
  const activePage = "vendas";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Consulta de Vendas", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Consulta de Vendas", "subtitle": "Listagem simples integrada ao Supabase (ajuste depois para sua regra completa)", "color": "green" })} ${renderComponent($$result2, "VendasConsultaIsland", VendasConsultaIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/VendasConsultaIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/vendas/consulta.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/vendas/consulta.astro";
const $$url = "/vendas/consulta";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Consulta,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
