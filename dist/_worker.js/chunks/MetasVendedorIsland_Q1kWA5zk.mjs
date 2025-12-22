globalThis.process ??= {}; globalThis.process.env ??= {};
import { s as supabase, j as jsxRuntimeExports } from './systemName_BQeIdnjR.mjs';
import { r as reactExports } from './_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from './usePermissao_Cbgi1VF4.mjs';
import { L as LoadingUsuarioContext } from './LoadingUsuarioContext_C1Z8rvHv.mjs';

function MetasVendedorIsland() {
  const { permissao, ativo, loading } = usePermissao("Metas");
  const [parametros, setParametros] = reactExports.useState(null);
  const [usuario, setUsuario] = reactExports.useState(null);
  const [vendedores, setVendedores] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [vendedorSelecionado, setVendedorSelecionado] = reactExports.useState("");
  const [periodo, setPeriodo] = reactExports.useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 7));
  const [ativoMeta, setAtivoMeta] = reactExports.useState(true);
  const [metaGeral, setMetaGeral] = reactExports.useState("");
  const [metaProdutos, setMetaProdutos] = reactExports.useState([]);
  const [listaMetas, setListaMetas] = reactExports.useState([]);
  const [detalhesMetas, setDetalhesMetas] = reactExports.useState({});
  const [editId, setEditId] = reactExports.useState(null);
  const [loadingMeta, setLoadingMeta] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [mostrarFormularioMeta, setMostrarFormularioMeta] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  reactExports.useEffect(() => {
    carregarDados();
  }, []);
  async function carregarDados() {
    try {
      setLoadingMeta(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }
      const { data: usuarios } = await supabase.from("users").select("id, nome_completo, uso_individual, company_id");
      const logado = usuarios?.find((u) => u.id === userId) || null;
      setUsuario(logado);
      const { data: produtosData } = await supabase.from("tipo_produtos").select("id, nome").eq("ativo", true);
      setProdutos(produtosData || []);
      const isAdminLocal = permissao === "admin";
      const isEditLocal = permissao === "edit";
      if (logado?.company_id && (isAdminLocal || isEditLocal)) {
        setVendedores(usuarios?.filter((u) => u.company_id === logado.company_id) || []);
      } else {
        setVendedores([logado]);
      }
      const { data: params } = await supabase.from("parametros_comissao").select("foco_valor").eq("company_id", logado?.company_id || null).maybeSingle();
      setParametros(params || null);
      await carregarMetas(logado?.id || "");
      setVendedorSelecionado(logado?.id || "");
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados iniciais");
    } finally {
      setLoadingMeta(false);
    }
  }
  async function carregarMetas(vendedor_id) {
    const isAdminLocal = permissao === "admin";
    const isEditLocal = permissao === "edit";
    if (!isAdminLocal && !isEditLocal && vendedor_id !== usuario?.id) {
      setListaMetas([]);
      return;
    }
    const { data } = await supabase.from("metas_vendedor").select("*").eq("vendedor_id", vendedor_id).order("periodo", { ascending: false });
    const metas = data || [];
    setListaMetas(metas);
    if (metas.length > 0) {
      const { data: det } = await supabase.from("metas_vendedor_produto").select("meta_vendedor_id, produto_id, valor").in(
        "meta_vendedor_id",
        metas.map((m) => m.id)
      );
      const map = {};
      (det || []).forEach((d) => {
        if (!map[d.meta_vendedor_id]) map[d.meta_vendedor_id] = [];
        map[d.meta_vendedor_id].push(d);
      });
      setDetalhesMetas(map);
    } else {
      setDetalhesMetas({});
    }
  }
  reactExports.useEffect(() => {
    if (!loading && vendedorSelecionado) {
      carregarMetas(vendedorSelecionado);
    }
  }, [vendedorSelecionado, loading]);
  const isAdmin = permissao === "admin";
  const isEdit = permissao === "edit";
  const usuarioPodeEditar = usuario?.uso_individual || isAdmin || isEdit;
  const mostrarSelectVendedor = usuario?.uso_individual === false && (isAdmin || isEdit);
  function formatarMoeda(valor) {
    const somenteDigitos = valor.replace(/\D/g, "");
    if (!somenteDigitos) return "";
    const numero = Number(somenteDigitos) / 100;
    return numero.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  function normalizarMoeda(valor) {
    if (!valor) return 0;
    if (/^\d+$/.test(valor)) {
      return Number(valor) / 100;
    }
    const limpo = valor.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(limpo);
    return Number.isNaN(num) ? 0 : num;
  }
  function numeroParaRaw(valor) {
    if (valor === null || valor === void 0) return "";
    return Math.round(valor * 100).toString();
  }
  function totalMetaDiferenciada() {
    return metaProdutos.reduce((sum, item) => sum + normalizarMoeda(item.valor), 0);
  }
  async function salvarMeta(e) {
    e.preventDefault();
    setErro(null);
    if (!metaGeral || !vendedorSelecionado) {
      setErro("Meta geral e vendedor são obrigatórios.");
      return;
    }
    const totalDif = totalMetaDiferenciada();
    const metaGeralNum = normalizarMoeda(metaGeral);
    const metaDifNum = totalDif;
    if (Number.isNaN(metaGeralNum)) {
      setErro("Meta geral inválida.");
      return;
    }
    if (parametros?.foco_valor === "liquido" && metaDifNum <= 0) {
      setErro("Quando o foco é valor líquido, informe metas diferenciadas por produto.");
      return;
    }
    const linhasValidas = metaProdutos.filter(
      (p) => p.produto_id && normalizarMoeda(p.valor) > 0
    );
    if (metaDifNum > 0 && linhasValidas.length === 0) {
      setErro("Adicione pelo menos um produto com valor para a meta diferenciada.");
      return;
    }
    try {
      setSalvando(true);
      const periodoFinal = `${periodo}-01`;
      const payloadBase = {
        vendedor_id: vendedorSelecionado,
        periodo: periodoFinal,
        meta_geral: metaGeralNum,
        meta_diferenciada: metaDifNum,
        ativo: ativoMeta,
        scope: "vendedor"
      };
      let metaId = editId;
      if (editId) {
        const { error } = await supabase.from("metas_vendedor").update(payloadBase).eq("id", editId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from("metas_vendedor").insert(payloadBase).select("id").single();
        if (error) throw error;
        metaId = inserted.id;
      }
      const metaIdFinal = metaId;
      await supabase.from("metas_vendedor_produto").delete().eq("meta_vendedor_id", metaIdFinal);
      if (linhasValidas.length > 0) {
        const detalhesInsert = linhasValidas.map((p) => ({
          meta_vendedor_id: metaIdFinal,
          produto_id: p.produto_id,
          valor: normalizarMoeda(p.valor)
        }));
        const { error: detError } = await supabase.from("metas_vendedor_produto").insert(detalhesInsert);
        if (detError) throw detError;
      }
      await carregarMetas(vendedorSelecionado);
      limparFormulario();
    } catch (e2) {
      console.error(e2);
      setErro(e2?.message ? `Erro ao salvar meta: ${e2.message}` : "Erro ao salvar meta.");
    } finally {
      setSalvando(false);
    }
  }
  function limparFormulario() {
    setMetaGeral("");
    setMetaProdutos([]);
    setEditId(null);
    setAtivoMeta(true);
  }
  function abrirFormularioMeta() {
    limparFormulario();
    setMostrarFormularioMeta(true);
    setErro(null);
  }
  function fecharFormularioMeta() {
    limparFormulario();
    setMostrarFormularioMeta(false);
    setErro(null);
  }
  function iniciarEdicao(m) {
    setEditId(m.id);
    setPeriodo(m.periodo.slice(0, 7));
    setMetaGeral(numeroParaRaw(m.meta_geral));
    const detalhes = detalhesMetas[m.id] || [];
    if (detalhes.length > 0) {
      setMetaProdutos(
        detalhes.map((d) => ({
          produto_id: d.produto_id,
          valor: numeroParaRaw(d.valor)
        }))
      );
    } else {
      setMetaProdutos([]);
    }
    setAtivoMeta(m.ativo);
    setMostrarFormularioMeta(true);
    setErro(null);
  }
  async function toggleAtivo(id, ativo2) {
    try {
      const { error } = await supabase.from("metas_vendedor").update({ ativo: !ativo2 }).eq("id", id);
      if (error) throw error;
      await carregarMetas(vendedorSelecionado);
    } catch (e) {
      setErro("Não foi possível alterar status da meta.");
    }
  }
  async function excluirMeta(id) {
    if (!confirm("Excluir esta meta?")) return;
    const { error } = await supabase.from("metas_vendedor").delete().eq("id", id);
    if (error) {
      setErro("Não foi possível excluir meta.");
      return;
    }
    await carregarMetas(vendedorSelecionado);
  }
  if (loading || loadingMeta) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Metas bloqueado." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-slate-50 p-2 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Metas cadastradas" }),
        usuarioPodeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: abrirFormularioMeta,
            disabled: mostrarFormularioMeta,
            children: "Adicionar meta"
          }
        )
      ] }),
      mostrarFormularioMeta && /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvarMeta, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-4", children: [
          mostrarSelectVendedor && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Vendedor *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                className: "form-select",
                value: vendedorSelecionado,
                onChange: (e) => setVendedorSelecionado(e.target.value),
                children: vendedores.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v.id, children: v.nome_completo }, v.id))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Período *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "month",
                className: "form-input",
                value: periodo,
                onChange: (e) => setPeriodo(e.target.value)
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Meta Geral (R$) *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                type: "text",
                value: formatarMoeda(metaGeral),
                onChange: (e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setMetaGeral(raw);
                },
                inputMode: "decimal",
                placeholder: "0,00"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[220px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Metas diferenciadas por produto (opcional)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
              metaProdutos.map((mp, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col md:flex-row gap-2", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[140px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Produto" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "select",
                    {
                      className: "form-select",
                      value: mp.produto_id,
                      onChange: (e) => {
                        const copia = [...metaProdutos];
                        copia[idx] = { ...copia[idx], produto_id: e.target.value };
                        setMetaProdutos(copia);
                      },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                        produtos.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.nome }, p.id))
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[120px]", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Meta (R$)" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      className: "form-input",
                      type: "text",
                      inputMode: "decimal",
                      value: formatarMoeda(mp.valor),
                      onChange: (e) => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const copia = [...metaProdutos];
                        copia[idx] = { ...copia[idx], valor: raw };
                        setMetaProdutos(copia);
                      },
                      placeholder: "0,00"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group flex-none flex items-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-light",
                    onClick: () => {
                      setMetaProdutos(metaProdutos.filter((_, i) => i !== idx));
                    },
                    children: "Remover"
                  }
                ) })
              ] }, idx)),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { alignItems: "center" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-primary",
                    onClick: () => setMetaProdutos([...metaProdutos, { produto_id: "", valor: "" }]),
                    children: "+ Adicionar produto"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", fontWeight: 600 }, children: [
                  "Total diferenciada:",
                  " ",
                  totalMetaDiferenciada().toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  })
                ] })
              ] }),
              parametros?.foco_valor === "liquido" && /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#f97316" }, children: "Foco em valor líquido ativo: informe metas diferenciadas por produto." })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativa?" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                value: ativoMeta ? "true" : "false",
                onChange: (e) => setAtivoMeta(e.target.value === "true"),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
                ]
              }
            )
          ] })
        ] }),
        erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
        usuarioPodeEditar && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "submit",
              className: "btn btn-primary",
              disabled: salvando,
              children: salvando ? "Salvando..." : editId ? "Salvar alterações" : "Salvar meta"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: fecharFormularioMeta,
              disabled: salvando,
              children: "Cancelar"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[880px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Período" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Meta Geral" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Meta Diferenciada" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produtos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        usuarioPodeEditar && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        listaMetas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: usuarioPodeEditar ? 6 : 5, children: "Nenhuma meta cadastrada." }) }),
        listaMetas.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: m.periodo.slice(0, 7) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: m.meta_geral.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: m.meta_diferenciada.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: (detalhesMetas[m.id] || []).length === 0 ? "—" : (detalhesMetas[m.id] || []).map((d) => {
            const nome = produtos.find((p) => p.id === d.produto_id)?.nome || "Produto";
            return `${nome}: ${d.valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            })}`;
          }).join(" | ") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: m.ativo ? "Sim" : "Não" }),
          usuarioPodeEditar && /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: "Editar",
                onClick: () => iniciarEdicao(m),
                children: "✏️"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluirMeta(m.id),
                children: "🗑️"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon",
                title: m.ativo ? "Inativar" : "Ativar",
                onClick: () => toggleAtivo(m.id, m.ativo),
                children: m.ativo ? "⏸️" : "▶️"
              }
            )
          ] })
        ] }, m.id))
      ] })
    ] }) })
  ] });
}

export { MetasVendedorIsland as M };
