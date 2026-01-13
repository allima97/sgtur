globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B2E7go2h.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_pW02Hlay.mjs';
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { r as registrarLog } from '../../chunks/logs_CFVP_wVx.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_R_BoJegu.mjs';
import { c as construirLinkWhatsApp } from '../../chunks/whatsapp_-onX4vYF.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function formatarDataCorretamente(dataString) {
  if (!dataString) return "-";
  const partes = dataString.split("T")[0].split("-");
  if (partes.length !== 3) return "-";
  const [ano, mes, dia] = partes;
  const date = new Date(parseInt(ano, 10), parseInt(mes, 10) - 1, parseInt(dia, 10));
  return date.toLocaleDateString("pt-BR");
}
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
function isSeguroRecibo(recibo) {
  const tipo = recibo.tipo_produtos?.tipo?.toLowerCase() || "";
  const nome = (recibo.tipo_produtos?.nome || recibo.produto_nome || "").toLowerCase();
  return tipo.includes("seguro") || nome.includes("seguro");
}
function obterResumoReciboComplementar(recibo, venda) {
  const numero = recibo?.numero_recibo ? `Recibo ${recibo.numero_recibo}` : "Recibo";
  const cliente = venda?.cliente_nome || "Cliente";
  const titulo = `${numero} - ${cliente}`.trim();
  const produto = recibo?.produto_nome || "";
  const destino = venda?.destino_cidade_nome || venda?.destino_nome || "";
  const valor = typeof recibo?.valor_total === "number" ? formatCurrency(recibo.valor_total) : "";
  const detalhes = [produto, destino, valor].filter(Boolean).join(" - ");
  return { titulo, detalhes };
}
function criarChaveBuscaReciboComplementar(recibo, venda) {
  const texto = [
    recibo?.numero_recibo,
    recibo?.id,
    recibo?.produto_nome,
    venda?.cliente_nome,
    venda?.destino_nome,
    venda?.destino_cidade_nome,
    venda?.id
  ].filter(Boolean).join(" ");
  return normalizeText(texto);
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
  const [recibosComplementares, setRecibosComplementares] = reactExports.useState([]);
  const [busca, setBusca] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [pendingOpenId, setPendingOpenId] = reactExports.useState(null);
  const [modalVenda, setModalVenda] = reactExports.useState(null);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [cancelando, setCancelando] = reactExports.useState(false);
  const [excluindoRecibo, setExcluindoRecibo] = reactExports.useState(null);
  const [buscaReciboComplementar, setBuscaReciboComplementar] = reactExports.useState("");
  const [mostrarComplementares, setMostrarComplementares] = reactExports.useState(false);
  const [vinculandoComplementar, setVinculandoComplementar] = reactExports.useState(false);
  const [removendoComplementar, setRemovendoComplementar] = reactExports.useState(null);
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
          clientes(nome, whatsapp),
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
          destino_cidade_nome: cidadeId ? cidadesMap[cidadeId] || "" : "",
          clientes: row.clientes
        };
      });
      setVendas(v);
      const vendaIds = v.map((i) => i.id);
      if (vendaIds.length === 0) {
        setRecibos([]);
        setRecibosComplementares([]);
      } else {
        const { data: recibosData } = await supabase.from("vendas_recibos").select("*, tipo_produtos (id, nome, tipo)").in("venda_id", vendaIds);
        const produtoIds = Array.from(
          new Set(
            (recibosData || []).map((r) => r.produto_id).filter((id) => Boolean(id))
          )
        );
        const produtoResolvidoIds = Array.from(
          new Set(
            (recibosData || []).map((r) => r.produto_resolvido_id).filter((id) => Boolean(id))
          )
        );
        const vendaCidadeMap = v.reduce((acc, vendaItem) => {
          if (vendaItem.destino_cidade_id) acc[vendaItem.id] = vendaItem.destino_cidade_id;
          return acc;
        }, {});
        let produtosLista = [];
        let produtosPorIdMap = {};
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
        if (produtoResolvidoIds.length > 0) {
          const { data: produtosResolvidosData, error: prodResolvidoErr } = await supabase.from("produtos").select("id, nome, cidade_id, tipo_produto, todas_as_cidades").in("id", produtoResolvidoIds);
          if (!prodResolvidoErr && produtosResolvidosData) {
            produtosResolvidosData.forEach((p) => {
              if (p?.id) {
                produtosPorIdMap[p.id] = p;
              }
            });
          } else if (prodResolvidoErr) {
            console.error(prodResolvidoErr);
          }
        }
        const recibosEnriquecidos = (recibosData || []).map((r) => {
          const cidadeVenda = vendaCidadeMap[r.venda_id] || "";
          const produtoResolvido = r.produto_resolvido_id && produtosPorIdMap[r.produto_resolvido_id];
          const candidato = produtosLista.find((p) => {
            const ehGlobal = !!p?.todas_as_cidades;
            return p.tipo_produto === r.produto_id && (ehGlobal || !cidadeVenda || p.cidade_id === cidadeVenda);
          });
          const tipoNome = tipoProdMap[r.produto_id];
          const nomeProduto = produtoResolvido?.nome || candidato?.nome || tipoNome || "";
          return {
            ...r,
            produto_nome: nomeProduto,
            produto_resolvido_id: r.produto_resolvido_id ?? null
          };
        }) || [];
        setRecibos(recibosEnriquecidos);
        const { data: complementaresData, error: complementaresError } = await supabase.from("vendas_recibos_complementares").select("id, venda_id, recibo_id").in("venda_id", vendaIds);
        if (complementaresError) {
          console.error(complementaresError);
          setRecibosComplementares([]);
        } else {
          setRecibosComplementares(complementaresData || []);
        }
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
  reactExports.useEffect(() => {
    setBuscaReciboComplementar("");
    setMostrarComplementares(false);
    setRemovendoComplementar(null);
    setVinculandoComplementar(false);
  }, [modalVenda?.id]);
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
  const vendasPorId = reactExports.useMemo(() => {
    return Object.fromEntries(vendas.map((v) => [v.id, v]));
  }, [vendas]);
  const recibosPorId = reactExports.useMemo(() => {
    return Object.fromEntries(recibos.map((r) => [r.id, r]));
  }, [recibos]);
  const complementaresAtuais = reactExports.useMemo(() => {
    if (!modalVenda) return [];
    return complementaresDaVenda(modalVenda.id);
  }, [modalVenda, recibosComplementares]);
  const complementaresAtuaisIds = reactExports.useMemo(() => {
    return new Set(complementaresAtuais.map((item) => item.recibo_id));
  }, [complementaresAtuais]);
  const sugestoesReciboComplementar = reactExports.useMemo(() => {
    if (!modalVenda) return [];
    const termo = normalizeText(buscaReciboComplementar.trim());
    if (termo.length < 2) return [];
    return recibos.filter((r) => r.venda_id !== modalVenda.id).filter((r) => !complementaresAtuaisIds.has(r.id)).map((r) => {
      const vendaRef = vendasPorId[r.venda_id];
      return {
        recibo: r,
        venda: vendaRef,
        resumo: obterResumoReciboComplementar(r, vendaRef),
        chaveBusca: criarChaveBuscaReciboComplementar(r, vendaRef)
      };
    }).filter((item) => item.chaveBusca.includes(termo)).slice(0, 6);
  }, [
    buscaReciboComplementar,
    modalVenda,
    recibos,
    complementaresAtuaisIds,
    vendasPorId
  ]);
  function recibosDaVenda(id) {
    return recibos.filter((r) => r.venda_id === id);
  }
  function complementaresDaVenda(id) {
    return recibosComplementares.filter((r) => r.venda_id === id);
  }
  function obterReciboReferenciaDaVenda(venda) {
    if (!venda) return null;
    const lista = recibosDaVenda(venda.id);
    if (lista.length === 0) return null;
    if (venda.destino_id) {
      const principal = lista.find((r) => r.produto_resolvido_id === venda.destino_id);
      if (principal) return principal;
    }
    return lista[0];
  }
  const kpiResumo = reactExports.useMemo(() => {
    const agora = /* @__PURE__ */ new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const vendasMesAtual = new Set(
      vendas.filter((v) => {
        if (!v.data_lancamento) return false;
        const data = new Date(v.data_lancamento);
        return data.getFullYear() === anoAtual && data.getMonth() === mesAtual;
      }).map((v) => v.id)
    );
    let totalVendas = 0;
    let totalTaxas = 0;
    let totalSeguro = 0;
    recibos.forEach((r) => {
      if (!vendasMesAtual.has(r.venda_id)) return;
      totalVendas += r.valor_total || 0;
      totalTaxas += r.valor_taxas || 0;
      if (isSeguroRecibo(r)) {
        totalSeguro += r.valor_total || 0;
      }
    });
    return {
      totalVendas,
      totalTaxas,
      totalLiquido: totalVendas - totalTaxas,
      totalSeguro
    };
  }, [recibos, vendas]);
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
  async function vincularReciboComplementar(reciboId, vendaId) {
    if (!podeEditar) return;
    const recibo = recibosPorId[reciboId];
    if (!recibo) {
      showToast("Recibo não encontrado.", "error");
      return;
    }
    if (recibo.venda_id === vendaId) {
      showToast("Este recibo já pertence a esta venda.", "error");
      return;
    }
    const jaVinculado = recibosComplementares.some(
      (item) => item.venda_id === vendaId && item.recibo_id === reciboId
    );
    if (jaVinculado) {
      showToast("Recibo já vinculado como complementar.", "error");
      return;
    }
    const vendaAtual = vendasPorId[vendaId];
    if (!vendaAtual) {
      showToast("Venda atual não encontrada.", "error");
      return;
    }
    const vendaRecibo = vendasPorId[recibo.venda_id];
    if (!vendaRecibo) {
      showToast("Venda do recibo complementar não encontrada.", "error");
      return;
    }
    const reciboReferenciaAtual = obterReciboReferenciaDaVenda(vendaAtual);
    if (!reciboReferenciaAtual) {
      showToast("Venda atual sem recibo para vínculo cruzado.", "error");
      return;
    }
    const cruzadoJaVinculado = recibosComplementares.some(
      (item) => item.venda_id === vendaRecibo.id && item.recibo_id === reciboReferenciaAtual.id
    );
    try {
      setVinculandoComplementar(true);
      const vinculoPrimario = { venda_id: vendaId, recibo_id: reciboId };
      const vinculoCruzado = { venda_id: vendaRecibo.id, recibo_id: reciboReferenciaAtual.id };
      const { error: primarioError } = await supabase.from("vendas_recibos_complementares").upsert(vinculoPrimario, { onConflict: "venda_id,recibo_id", ignoreDuplicates: true });
      if (primarioError) throw primarioError;
      if (!cruzadoJaVinculado) {
        const { error: cruzadoError } = await supabase.from("vendas_recibos_complementares").upsert(vinculoCruzado, { onConflict: "venda_id,recibo_id", ignoreDuplicates: true });
        if (cruzadoError) {
          await supabase.from("vendas_recibos_complementares").delete().match(vinculoPrimario);
          throw cruzadoError;
        }
      }
      await registrarLog({
        acao: "recibo_complementar_vinculado",
        modulo: "Vendas",
        detalhes: {
          venda_id: vendaId,
          recibo_id: reciboId,
          venda_cruzada_id: vendaRecibo.id,
          recibo_cruzado_id: reciboReferenciaAtual.id
        }
      });
      await carregar();
      setBuscaReciboComplementar("");
      showToast("Recibo complementar vinculado.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao vincular recibo complementar.");
      showToast("Erro ao vincular recibo complementar.", "error");
    } finally {
      setVinculandoComplementar(false);
    }
  }
  async function removerReciboComplementar(link) {
    if (!podeEditar) return;
    if (!confirm("Remover recibo complementar?")) return;
    try {
      setRemovendoComplementar(link.id);
      const recibo = recibosPorId[link.recibo_id];
      const vendaAtual = vendasPorId[link.venda_id];
      const vendaRecibo = recibo ? vendasPorId[recibo.venda_id] : void 0;
      const idsParaRemover = /* @__PURE__ */ new Set([link.id]);
      if (vendaAtual && vendaRecibo) {
        const recibosVendaAtual = new Set(recibosDaVenda(vendaAtual.id).map((r) => r.id));
        recibosComplementares.forEach((item) => {
          if (item.venda_id === vendaRecibo.id && recibosVendaAtual.has(item.recibo_id)) {
            idsParaRemover.add(item.id);
          }
        });
      }
      const idsLista = Array.from(idsParaRemover);
      const { error } = await supabase.from("vendas_recibos_complementares").delete().in("id", idsLista);
      if (error) throw error;
      await registrarLog({
        acao: "recibo_complementar_removido",
        modulo: "Vendas",
        detalhes: {
          venda_id: link.venda_id,
          recibo_id: link.recibo_id,
          ids_removidos: idsLista
        }
      });
      await carregar();
      showToast("Recibo complementar removido.", "success");
    } catch (e) {
      console.error(e);
      setErro("Erro ao remover recibo complementar.");
      showToast("Erro ao remover recibo complementar.", "error");
    } finally {
      setRemovendoComplementar(null);
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
          display: "flex",
          alignItems: "end",
          gap: 16,
          flexWrap: "wrap"
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1, minWidth: 0 }, children: [
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
                alignSelf: "center",
                marginTop: -4
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
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-grid-kpi mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-card kpi-vendas", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "100%", textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Total de Vendas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(kpiResumo.totalVendas) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-card kpi-diferenciado", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "100%", textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Seguro Viagem" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(kpiResumo.totalSeguro) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-card kpi-meta", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "100%", textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Taxas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(kpiResumo.totalTaxas) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-card kpi-ticket", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "100%", textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Total Líquido" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(kpiResumo.totalLiquido) })
      ] }) })
    ] }),
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
          const whatsappLink = construirLinkWhatsApp(v.clientes?.whatsapp);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.cliente_nome }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.destino_cidade_nome || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: produtosVenda.length === 0 ? "-" : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: produtosVenda.map((p, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: p }, `${v.id}-prod-${idx}`)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: formatarDataCorretamente(v.data_embarque) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              "R$",
              " ",
              totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: totalTaxas === 0 ? "-" : `R$ ${totalTaxas.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}` }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "td",
              {
                className: "th-actions",
                style: {
                  textAlign: "center",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 4
                },
                children: [
                  whatsappLink && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "a",
                    {
                      className: "btn-icon",
                      href: whatsappLink,
                      title: "Enviar WhatsApp",
                      target: "_blank",
                      rel: "noreferrer",
                      children: "💬"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "button",
                    {
                      className: "btn-icon",
                      title: "Ver detalhes",
                      onClick: () => setModalVenda(v),
                      children: "👁️"
                    }
                  )
                ]
              }
            )
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
                formatarDataCorretamente(modalVenda.data_lancamento)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Embarque:" }),
                " ",
                formatarDataCorretamente(modalVenda.data_embarque)
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
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Início" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "center" }, children: "Fim" }),
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
                const formatarData = (value) => formatarDataCorretamente(value);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.numero_recibo || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: r.produto_nome || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: formatarData(r.data_inicio) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { textAlign: "center" }, children: formatarData(r.data_fim) }),
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
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { style: { margin: 0 }, children: "Recibos complementares" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-outline",
                    onClick: () => setMostrarComplementares((prev) => !prev),
                    children: mostrarComplementares ? "Ocultar" : `Mostrar (${complementaresAtuais.length})`
                  }
                )
              ]
            }
          ),
          mostrarComplementares && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              style: {
                marginTop: 8,
                border: "1px dashed #cbd5e1",
                borderRadius: 12,
                padding: 12,
                background: "#f8fafc",
                display: "grid",
                gap: 12
              },
              children: [
                podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { marginBottom: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1, minWidth: 220 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar recibo" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "form-input",
                      placeholder: "Número, cliente ou destino...",
                      value: buscaReciboComplementar,
                      onChange: (e) => setBuscaReciboComplementar(e.target.value)
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Digite ao menos 2 caracteres para localizar recibos." })
                ] }) }),
                podeEditar && buscaReciboComplementar.trim().length >= 2 && sugestoesReciboComplementar.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#64748b" }, children: "Nenhum recibo encontrado com essa busca." }),
                podeEditar && sugestoesReciboComplementar.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gap: 6 }, children: sugestoesReciboComplementar.map((item) => {
                  const detalhes = item.resumo.detalhes;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => vincularReciboComplementar(item.recibo.id, modalVenda.id),
                      disabled: vinculandoComplementar,
                      style: {
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        textAlign: "left",
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        borderRadius: 10,
                        padding: "8px 10px",
                        cursor: vinculandoComplementar ? "not-allowed" : "pointer",
                        opacity: vinculandoComplementar ? 0.6 : 1
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gap: 2 }, children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600 }, children: item.resumo.titulo }),
                          detalhes && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "0.8rem", color: "#64748b" }, children: detalhes })
                        ] }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            style: { color: "#16a34a", fontWeight: 700, fontSize: "0.85rem" },
                            children: vinculandoComplementar ? "Salvando..." : "Adicionar"
                          }
                        )
                      ]
                    },
                    item.recibo.id
                  );
                }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gap: 6 }, children: [
                  complementaresAtuais.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#64748b" }, children: "Nenhum recibo complementar vinculado." }),
                  complementaresAtuais.map((link) => {
                    const recibo = recibosPorId[link.recibo_id];
                    const vendaRef = recibo ? vendasPorId[recibo.venda_id] : void 0;
                    const resumo = recibo ? obterResumoReciboComplementar(recibo, vendaRef) : { titulo: "Recibo complementar", detalhes: `ID: ${link.recibo_id}` };
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          borderRadius: 10,
                          padding: "8px 10px"
                        },
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gap: 2 }, children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600 }, children: resumo.titulo }),
                            resumo.detalhes && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "0.8rem", color: "#64748b" }, children: resumo.detalhes })
                          ] }),
                          podeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              className: "btn-icon",
                              title: "Remover recibo complementar",
                              onClick: () => removerReciboComplementar(link),
                              disabled: removendoComplementar === link.id,
                              children: removendoComplementar === link.id ? "..." : "✕"
                            }
                          )
                        ]
                      },
                      link.id
                    );
                  })
                ] })
              ]
            }
          )
        ] })
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
