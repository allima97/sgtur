globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_DgtdOcH4.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_BQeIdnjR.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { r as registrarLog } from '../../chunks/logs_CDnMuknJ.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_Cbgi1VF4.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_C1Z8rvHv.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
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
  const [toasts, setToasts] = reactExports.useState([]);
  const [toastCounter, setToastCounter] = reactExports.useState(0);
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
          destino_cidade_id,
          data_lancamento,
          data_embarque,
          clientes(nome),
          destinos:produtos!destino_id (
            nome,
            cidade_id
          )
        `).order("data_lancamento", { ascending: false });
      if (userCtx.papel !== "ADMIN") {
        query = query.in("vendedor_id", userCtx.vendedorIds);
      }
      const { data: vendasData, error } = await query;
      if (error) throw error;
      const cidadeIds = Array.from(
        new Set(
          (vendasData || []).map((row) => row.destino_cidade_id || row.destinos?.cidade_id).filter((id) => Boolean(id))
        )
      );
      let cidadesMap = {};
      if (cidadeIds.length > 0) {
        const { data: cidadesData, error: cidadesError } = await supabase.from("cidades").select("id, nome").in("id", cidadeIds);
        if (cidadesError) {
          console.error(cidadesError);
        } else {
          cidadesMap = Object.fromEntries(
            (cidadesData || []).map((c) => [c.id, c.nome])
          );
        }
      }
      const v = (vendasData || []).map((row) => {
        const cidadeId = row.destino_cidade_id || row.destinos?.cidade_id || "";
        return {
          id: row.id,
          vendedor_id: row.vendedor_id,
          cliente_id: row.cliente_id,
          destino_id: row.destino_id,
          destino_cidade_id: cidadeId,
          data_lancamento: row.data_lancamento,
          data_embarque: row.data_embarque,
          cliente_nome: row.clientes?.nome || "",
          destino_nome: row.destinos?.nome || "",
          destino_cidade_nome: cidadeId ? cidadesMap[cidadeId] || "" : ""
        };
      });
      setVendas(v);
      const vendaIds = v.map((i) => i.id);
      if (vendaIds.length === 0) {
        setRecibos([]);
      } else {
        const { data: recibosData } = await supabase.from("vendas_recibos").select("*").in("venda_id", vendaIds);
        const produtoIds = Array.from(
          new Set(
            (recibosData || []).map((r) => r.produto_id).filter((id) => Boolean(id))
          )
        );
        const vendaCidadeMap = v.reduce((acc, vendaItem) => {
          if (vendaItem.destino_cidade_id) acc[vendaItem.id] = vendaItem.destino_cidade_id;
          return acc;
        }, {});
        let produtosLista = [];
        let tipoProdMap = {};
        if (produtoIds.length > 0) {
          const { data: produtosData, error: prodErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").in("tipo_produto", produtoIds);
          if (!prodErr && produtosData) produtosLista = produtosData;
          else if (prodErr) console.error(prodErr);
          const { data: tiposData, error: tipoErr } = await supabase.from("tipo_produtos").select("id, nome").in("id", produtoIds);
          if (!tipoErr && tiposData) {
            tipoProdMap = Object.fromEntries(
              tiposData.map((t) => [t.id, t.nome || "Produto"])
            );
          } else if (tipoErr) {
            console.error(tipoErr);
          }
        }
        const recibosEnriquecidos = (recibosData || []).map((r) => {
          const cidadeVenda = vendaCidadeMap[r.venda_id] || "";
          const candidato = produtosLista.find((p) => {
            const ehGlobal = !!p?.todas_as_cidades;
            return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
          });
          const tipoNome = tipoProdMap[r.produto_id];
          return {
            ...r,
            produto_nome: candidato?.nome || tipoNome || ""
          };
        }) || [];
        setRecibos(recibosEnriquecidos);
      }
      if (pendingOpenId) {
        const alvo = v.find((i) => i.id === pendingOpenId);
        if (alvo) setModalVenda(alvo);
        setPendingOpenId(null);
      }
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar vendas.");
      showToast("Erro ao carregar vendas.", "error");
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
    const t = normalizeText(busca);
    return vendas.filter(
      (v) => normalizeText(v.cliente_nome || "").includes(t) || normalizeText(v.destino_nome || "").includes(t) || normalizeText(v.id).includes(t)
    );
  }, [vendas, busca]);
  function recibosDaVenda(id) {
    return recibos.filter((r) => r.venda_id === id);
  }
  function showToast(message, type = "success") {
    setToastCounter((prev) => prev + 1);
    const id = toastCounter + 1;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
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
      showToast("Venda cancelada.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao cancelar venda.");
      showToast("Erro ao cancelar venda.", "error");
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
      showToast("Recibo excluído.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir recibo.");
      showToast("Erro ao excluir recibo.", "error");
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
      showToast("Data de embarque atualizada.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao remarcar venda.");
      showToast("Erro ao remarcar.", "error");
    } finally {
      setSalvando(false);
    }
  }
  if (loadingUser || loadPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Acesso negado ao módulo de Vendas." }) });
  }
  if (!podeVer) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Você não possui permissão para visualizar Vendas." }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "vendas-consulta-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "form-row",
        style: {
          marginTop: 8,
          gridTemplateColumns: "1fr auto",
          alignItems: "center"
        },
        children: [
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
          podeCriar && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "form-group",
              style: {
                display: "flex",
                flexDirection: "row",
                gap: 8,
                marginBottom: 0,
                marginLeft: "auto",
                flexWrap: "nowrap",
                justifyContent: "flex-end",
                alignItems: "center",
                alignSelf: "center"
              },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "a",
                {
                  className: "btn btn-primary",
                  href: "/vendas/cadastro",
                  style: { textDecoration: "none" },
                  children: "Nova venda"
                }
              )
            }
          )
        ]
      }
    ) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", style: { maxHeight: "65vh", overflowY: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-green min-w-[820px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { style: { position: "sticky", top: 0, zIndex: 1 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Embarque" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
        podeVer && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", style: { textAlign: "center" }, children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Carregando..." }) }),
        !loading && vendasFiltradas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, children: "Nenhuma venda encontrada." }) }),
        !loading && vendasFiltradas.map((v) => {
          const totalValor = recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_total || 0), 0);
          const totalTaxas = recibosDaVenda(v.id).reduce((acc, r) => acc + (r.valor_taxas || 0), 0);
          const produtosVenda = recibosDaVenda(v.id).map((r) => r.produto_nome || "").filter(Boolean);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.cliente_nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino_cidade_nome || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: produtosVenda.length === 0 ? "-" : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: produtosVenda.map((p, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: p }, `${v.id}-prod-${idx}`)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: v.data_embarque ? new Date(v.data_embarque).toLocaleDateString("pt-BR") : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              "R$",
              " ",
              totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: totalTaxas === 0 ? "-" : `R$ ${totalTaxas.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", style: { textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: "Ver detalhes",
                onClick: () => setModalVenda(v),
                children: "👁️"
              }
            ) })
          ] }, v.id);
        })
      ] })
    ] }) }),
    modalVenda && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-panel", style: { maxWidth: "820px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "modal-title",
            style: { color: "#16a34a", fontSize: "1.15rem", fontWeight: 800 },
            children: "Detalhes da venda"
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-ghost", onClick: () => setModalVenda(null), children: "✕" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "mb-3",
            style: { display: "grid", gap: 6, lineHeight: 1.4 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cliente:" }),
                " ",
                modalVenda.cliente_nome || "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cidade:" }),
                " ",
                modalVenda.destino_cidade_nome || "Não informada"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Lançada em:" }),
                " ",
                new Date(modalVenda.data_lancamento).toLocaleDateString("pt-BR")
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Embarque:" }),
                " ",
                modalVenda.data_embarque ? new Date(modalVenda.data_embarque).toLocaleDateString("pt-BR") : "-"
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { marginBottom: 8, textAlign: "center" }, children: "Recibos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "table",
          {
            className: "table-default table-header-green",
            style: { minWidth: 520 },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Número" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas" }),
                podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: recibosDaVenda(modalVenda.id).map((r) => {
                const valorFmt = (r.valor_total || 0).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                });
                const taxasNum = r.valor_taxas || 0;
                const taxasFmt = taxasNum === 0 ? "-" : `R$ ${taxasNum.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.numero_recibo || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.produto_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
                    "R$ ",
                    valorFmt
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: taxasFmt }),
                  podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn-icon btn-danger",
                      disabled: excluindoRecibo === r.id,
                      onClick: () => excluirRecibo(r.id, modalVenda.id),
                      children: excluindoRecibo === r.id ? "…" : "🗑️"
                    }
                  ) })
                ] }, r.id);
              }) })
            ]
          }
        ) })
      ] }),
      (podeEditar || podeExcluir) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-footer", children: [
        podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-outline",
              style: { minWidth: 130, backgroundColor: "#f3f4f6", color: "#1f2937" },
              onClick: () => {
                const url = `/vendas/cadastro?id=${modalVenda.id}${modalVenda.destino_cidade_id ? `&cidadeId=${modalVenda.destino_cidade_id}` : ""}${modalVenda.destino_cidade_nome ? `&cidadeNome=${encodeURIComponent(modalVenda.destino_cidade_nome)}` : ""}`;
                window.location.href = url;
              },
              children: "Editar"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn btn-primary",
              style: { minWidth: 130 },
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
            style: { minWidth: 130 },
            onClick: () => cancelarVenda(modalVenda),
            disabled: cancelando,
            children: cancelando ? "Cancelando..." : "Cancelar Venda"
          }
        )
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
