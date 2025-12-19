globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B-SnFw9s.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_ChD594_G.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_XbJI-A09.mjs';

function calcularBaseMeta(resumo, params) {
  const valorLiquido = resumo.valor_total_bruto - resumo.valor_total_taxas;
  if (params.foco_valor === "liquido") {
    return valorLiquido;
  }
  if (params.usar_taxas_na_meta) {
    return resumo.valor_total_bruto;
  }
  return valorLiquido;
}
function calcularPercentualComissao(template, pctMeta) {
  if (template.modo === "FIXO" || !template.esc_ativado) {
    if (pctMeta < 100) {
      return template.meta_nao_atingida ?? 0;
    }
    if (pctMeta >= 100 && pctMeta < 120) {
      return template.meta_atingida ?? template.meta_nao_atingida ?? 0;
    }
    return template.super_meta ?? template.meta_atingida ?? template.meta_nao_atingida ?? 0;
  }
  let basePct = template.meta_atingida ?? template.meta_nao_atingida ?? 0;
  let result = basePct;
  if (template.esc_ativado) {
    const ini = template.esc_inicial_pct ?? 100;
    const fim = template.esc_final_pct ?? pctMeta;
    const stepMeta = template.esc_incremento_pct_meta ?? 5;
    const stepCom = template.esc_incremento_pct_comissao ?? 0;
    if (pctMeta > ini && stepMeta > 0) {
      const limite = Math.min(pctMeta, fim);
      const steps = Math.floor((limite - ini) / stepMeta);
      result += steps * stepCom;
    }
  }
  if (template.esc2_ativado) {
    const ini2 = template.esc2_inicial_pct ?? 120;
    const fim2 = template.esc2_final_pct ?? pctMeta;
    const stepMeta2 = template.esc2_incremento_pct_meta ?? 5;
    const stepCom2 = template.esc2_incremento_pct_comissao ?? 0;
    if (pctMeta > ini2 && stepMeta2 > 0) {
      const limite2 = Math.min(pctMeta, fim2);
      const steps2 = Math.floor((limite2 - ini2) / stepMeta2);
      result += steps2 * stepCom2;
    }
  }
  return result;
}
function calcularValorComissao(resumo, template, params) {
  const baseMeta = calcularBaseMeta(resumo, params);
  const pctMeta = resumo.percentual_meta_atingido;
  const pctComissao = calcularPercentualComissao(template, pctMeta);
  const valorLiquido = resumo.valor_total_bruto - resumo.valor_total_taxas;
  const valorComissao = valorLiquido * (pctComissao / 100);
  return {
    baseMeta,
    pctMeta,
    pctComissao,
    valorLiquido,
    valorComissao
  };
}

function getPeriodoAtualYYYYMM() {
  const agora = /* @__PURE__ */ new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}
function getPrimeiroDiaMes(periodoYYYYMM) {
  return `${periodoYYYYMM}-01`;
}
function getPrimeiroDiaMesSeguinte(periodoYYYYMM) {
  const [anoStr, mesStr] = periodoYYYYMM.split("-");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const anoFinal = mes === 12 ? ano + 1 : ano;
  const mesFinal = String(proximoMes).padStart(2, "0");
  return `${anoFinal}-${mesFinal}-01`;
}
function FechamentoComissaoIsland() {
  const { permissao, ativo, loading: loadingPermissao } = usePermissao("Metas");
  const [usuario, setUsuario] = reactExports.useState(null);
  const [vendedores, setVendedores] = reactExports.useState([]);
  const [templates, setTemplates] = reactExports.useState([]);
  const [parametros, setParametros] = reactExports.useState(null);
  const [regrasProduto, setRegrasProduto] = reactExports.useState({});
  const [vendedorSelecionado, setVendedorSelecionado] = reactExports.useState("");
  const [templateIdSelecionado, setTemplateIdSelecionado] = reactExports.useState("");
  const [periodo, setPeriodo] = reactExports.useState(getPeriodoAtualYYYYMM());
  const [metaAtual, setMetaAtual] = reactExports.useState(null);
  const [vendasPeriodo, setVendasPeriodo] = reactExports.useState([]);
  const [idsEquipe, setIdsEquipe] = reactExports.useState([]);
  const [carregandoDados, setCarregandoDados] = reactExports.useState(true);
  const [calculando, setCalculando] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [valorBruto, setValorBruto] = reactExports.useState(0);
  const [valorTaxas, setValorTaxas] = reactExports.useState(0);
  const [valorLiquido, setValorLiquido] = reactExports.useState(0);
  const [baseMetaUsada, setBaseMetaUsada] = reactExports.useState(0);
  const [pctMeta, setPctMeta] = reactExports.useState(0);
  const [pctComissao, setPctComissao] = reactExports.useState(0);
  const [valorComissao, setValorComissao] = reactExports.useState(0);
  function calcularPctPorRegra(regra, pctMeta2) {
    if (regra.tipo === "GERAL") {
      if (pctMeta2 < 100) return regra.meta_nao_atingida ?? 0;
      if (pctMeta2 >= 100 && pctMeta2 < 120) {
        return regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
      }
      return regra.super_meta ?? regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
    }
    const faixa = pctMeta2 >= 0 ? pctMeta2 < 100 ? "PRE" : "POS" : "PRE";
    const tiers = (regra.commission_tier || []).filter((t) => t.faixa === faixa);
    const tier = tiers.find((t) => pctMeta2 >= t.de_pct && pctMeta2 <= t.ate_pct);
    if (tier) {
      return tier.inc_pct_comissao ?? 0;
    }
    return regra.meta_atingida ?? regra.meta_nao_atingida ?? 0;
  }
  const isAdmin = permissao === "admin";
  const isEdit = permissao === "edit";
  const usuarioPodeVerTodos = usuario?.uso_individual === false && (isAdmin || isEdit) || isAdmin;
  const mostrarSelectVendedor = usuario?.uso_individual === false && usuarioPodeVerTodos;
  reactExports.useEffect(() => {
    carregarDadosIniciais();
  }, []);
  async function carregarDadosIniciais() {
    try {
      setCarregandoDados(true);
      setErro(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        setErro("Usuário não autenticado.");
        return;
      }
      const { data: usersData, error: usersErr } = await supabase.from("users").select("id, nome_completo, uso_individual, company_id");
      if (usersErr) throw usersErr;
      const logado = (usersData || []).find((u) => u.id === userId);
      setUsuario(logado || null);
      let vendedoresFiltrados = [];
      if (logado?.company_id) {
        vendedoresFiltrados = (usersData || []).filter(
          (u) => u.company_id === logado.company_id
        );
      } else {
        vendedoresFiltrados = logado ? [logado] : [];
      }
      setVendedores(vendedoresFiltrados);
      const vendedorDefault = logado?.id ?? "";
      setVendedorSelecionado(vendedorDefault);
      const { data: templatesData, error: tempErr } = await supabase.from("commission_templates").select("*").eq("ativo", true).order("nome", { ascending: true });
      if (tempErr) throw tempErr;
      setTemplates(templatesData || []);
      if (templatesData && templatesData.length > 0) {
        setTemplateIdSelecionado(templatesData[0].id);
      }
      const parametros2 = await carregarParametrosComissao(logado);
      setParametros(parametros2);
      if (vendedorDefault) {
        await carregarMetaDoPeriodo(vendedorDefault, periodo);
        await carregarVendasPeriodo(vendedorDefault, periodo);
      }
      const { data: regrasData } = await supabase.from("product_commission_rule").select(
        `
            produto_id,
            commission_rule:rule_id (
              id,
              nome,
              tipo,
              meta_nao_atingida,
              meta_atingida,
              super_meta,
              commission_tier (*)
            )
          `
      );
      const map = {};
      (regrasData || []).forEach((r) => {
        if (r.produto_id && r.commission_rule) {
          map[r.produto_id] = r.commission_rule;
        }
      });
      setRegrasProduto(map);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados iniciais do fechamento.");
    } finally {
      setCarregandoDados(false);
    }
  }
  async function carregarParametrosComissao(user) {
    if (!user) {
      return { usar_taxas_na_meta: true };
    }
    if (user.uso_individual) {
      const { data } = await supabase.from("parametros_comissao").select("*").eq("owner_user_id", user.id).maybeSingle();
      if (data) {
        return {
          usar_taxas_na_meta: data.usar_taxas_na_meta ?? true
        };
      }
    }
    if (user.company_id) {
      const { data } = await supabase.from("parametros_comissao").select("*").eq("company_id", user.company_id).maybeSingle();
      if (data) {
        return {
          usar_taxas_na_meta: data.usar_taxas_na_meta ?? true
        };
      }
    }
    return { usar_taxas_na_meta: true };
  }
  async function carregarMetaDoPeriodo(vendedorId, periodoYYYYMM) {
    const periodoIni = getPrimeiroDiaMes(periodoYYYYMM);
    const { data } = await supabase.from("metas_vendedor").select("*").eq("vendedor_id", vendedorId).eq("periodo", periodoIni).maybeSingle();
    const meta = data || null;
    setMetaAtual(meta);
    if (meta?.template_id) {
      setTemplateIdSelecionado(meta.template_id);
    }
    return meta;
  }
  async function carregarEquipeIds(gestorId) {
    const ids = [gestorId];
    try {
      const { data, error } = await supabase.from("gestor_vendedor").select("vendedor_id").eq("gestor_id", gestorId);
      if (!error && data) {
        data.forEach((r) => {
          if (r.vendedor_id && !ids.includes(r.vendedor_id)) ids.push(r.vendedor_id);
        });
      }
    } catch (e) {
      console.error("Erro ao carregar equipe:", e);
    }
    setIdsEquipe(ids);
    return ids;
  }
  async function carregarVendasPeriodo(vendedorIds, periodoYYYYMM) {
    if (!vendedorIds || vendedorIds.length === 0) {
      setVendasPeriodo([]);
      return;
    }
    const inicio = getPrimeiroDiaMes(periodoYYYYMM);
    const proxMes = getPrimeiroDiaMesSeguinte(periodoYYYYMM);
    const { data, error } = await supabase.from("vendas").select(
      `
          id,
          data_lancamento,
          cancelada,
          vendas_recibos (
            produto_id,
            valor_total,
            valor_taxas
          )
        `
    ).in("vendedor_id", vendedorIds).eq("cancelada", false).gte("data_lancamento", inicio).lt("data_lancamento", proxMes);
    if (error) {
      console.error(error);
      setErro("Erro ao carregar vendas do período.");
      setVendasPeriodo([]);
      return;
    }
    setVendasPeriodo(data || []);
  }
  reactExports.useEffect(() => {
    if (!vendedorSelecionado) return;
    if (!usuario) return;
    (async () => {
      setErro(null);
      const meta = await carregarMetaDoPeriodo(vendedorSelecionado, periodo);
      let vendedoresParaConsulta = [vendedorSelecionado];
      if (meta?.scope === "equipe") {
        vendedoresParaConsulta = await carregarEquipeIds(vendedorSelecionado);
      } else {
        setIdsEquipe([vendedorSelecionado]);
      }
      await carregarVendasPeriodo(vendedoresParaConsulta, periodo);
    })();
  }, [vendedorSelecionado, periodo]);
  const valoresCalculados = reactExports.useMemo(() => {
    let totalBruto = 0;
    let totalTaxas = 0;
    for (const v of vendasPeriodo) {
      for (const r of v.vendas_recibos || []) {
        const vt = r.valor_total ?? 0;
        const tx = r.valor_taxas ?? 0;
        totalBruto += vt + tx;
        totalTaxas += tx;
      }
    }
    const liquido = totalBruto - totalTaxas;
    return { totalBruto, totalTaxas, liquido };
  }, [vendasPeriodo]);
  async function calcularFechamento() {
    if (!templateIdSelecionado) {
      setErro("Selecione um template de comissão.");
      return;
    }
    if (!metaAtual) {
      setErro("Defina uma meta para este período antes de calcular a comissão.");
      return;
    }
    if (!parametros) {
      setErro("Parâmetros de comissão não encontrados.");
      return;
    }
    try {
      setCalculando(true);
      setErro(null);
      const template = templates.find((t) => t.id === templateIdSelecionado);
      if (!template) {
        setErro("Template de comissão não encontrado.");
        return;
      }
      const { totalBruto, totalTaxas, liquido } = valoresCalculados;
      setValorBruto(totalBruto);
      setValorTaxas(totalTaxas);
      setValorLiquido(liquido);
      const baseMeta = parametros.foco_valor === "liquido" ? liquido : parametros.usar_taxas_na_meta ? totalBruto : liquido;
      setBaseMetaUsada(baseMeta);
      const metaPlanejada = metaAtual.meta_geral || 0;
      let porcentagemMeta = 0;
      if (metaPlanejada > 0) {
        porcentagemMeta = baseMeta / metaPlanejada * 100;
      }
      const resumoPeriodo = {
        valor_total_bruto: totalBruto,
        valor_total_taxas: totalTaxas,
        percentual_meta_atingido: porcentagemMeta
      };
      const resultado = calcularValorComissao(
        resumoPeriodo,
        template,
        parametros
      );
      const pctBase = resultado.pctComissao;
      let pctComissaoFinal = pctBase;
      if (regrasProduto && vendasPeriodo.length > 0) {
        let somaPeso = 0;
        let somaPct = 0;
        vendasPeriodo.forEach((v) => {
          (v.vendas_recibos || []).forEach((r) => {
            const prodId = r.produto_id;
            const regra = prodId ? regrasProduto[prodId] : null;
            const liquidoRecibo = (r.valor_total ?? 0) - (r.valor_taxas ?? 0);
            if (regra && liquidoRecibo > 0) {
              const pct = calcularPctPorRegra(regra, porcentagemMeta);
              somaPct += pct * liquidoRecibo;
              somaPeso += liquidoRecibo;
            }
          });
        });
        if (somaPeso > 0) {
          pctComissaoFinal = somaPct / somaPeso || pctBase;
        }
      }
      const valorComissao2 = liquido * (pctComissaoFinal / 100);
      setPctMeta(resultado.pctMeta);
      setPctComissao(pctComissaoFinal);
      setValorComissao(valorComissao2);
    } catch (e) {
      console.error(e);
      setErro("Erro ao calcular comissão do período.");
    } finally {
      setCalculando(false);
    }
  }
  if (loadingPermissao) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Metas & Comissões bloqueado." });
  }
  if (carregandoDados) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados do fechamento..." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-h-screen bg-slate-50 p-2 md:p-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-100 text-sm flex flex-wrap gap-3 items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Módulo:" }),
        " Fechamento de Comissão"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Perfil:" }),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { textTransform: "uppercase" }, children: usuario?.uso_individual ? "Uso Individual" : "Corporativo" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Permissão:" }),
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            style: {
              textTransform: "uppercase",
              fontWeight: "bold",
              color: permissao === "admin" ? "#22c55e" : permissao === "edit" ? "#eab308" : "#ef4444"
            },
            children: permissao
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full mt-2 flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Período:" }),
          " ",
          periodo
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Vendedor:" }),
          " ",
          vendedores.find((v) => v.id === vendedorSelecionado)?.nome_completo || "N/A"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Template:" }),
          " ",
          templates.find((t) => t.id === templateIdSelecionado)?.nome || "Selecione"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Meta:" }),
          " ",
          metaAtual?.meta_geral?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) || "N/A"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Base da meta:" }),
          " ",
          baseMetaUsada.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Foco:" }),
          " ",
          parametros?.foco_valor === "liquido" ? "Valor líquido" : "Valor bruto"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full mt-2 grid gap-2", style: { gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Período:" }),
          " ",
          periodo
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Vendedor:" }),
          " ",
          vendedores.find((v) => v.id === vendedorSelecionado)?.nome_completo || "N/A"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Template:" }),
          " ",
          templates.find((t) => t.id === templateIdSelecionado)?.nome || "Selecione"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Meta:" }),
          " ",
          metaAtual?.meta_geral?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) || "N/A"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Base da meta:" }),
          " ",
          baseMetaUsada.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Foco:" }),
          " ",
          parametros?.foco_valor === "liquido" ? "Valor líquido" : "Valor bruto"
        ] })
      ] }),
      metaAtual?.scope === "equipe" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full mt-2 text-slate-300", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Escopo:" }),
        " Equipe (",
        idsEquipe.length,
        " membros)"
      ] }),
      metaAtual?.scope === "equipe" && idsEquipe.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "w-full mt-1 text-slate-300 text-sm", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Membros:" }),
        " ",
        idsEquipe.map((id) => vendedores.find((v) => v.id === id)?.nome_completo || id).join(", ")
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row flex flex-col md:flex-row gap-4", children: [
        mostrarSelectVendedor && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1 min-w-[180px]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Vendedor" }),
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Período" }),
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Template de Comissão" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: templateIdSelecionado,
              onChange: (e) => setTemplateIdSelecionado(e.target.value),
              children: [
                templates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: t.id, children: [
                  t.nome,
                  " (",
                  t.modo,
                  ")"
                ] }, t.id)),
                templates.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Nenhum template disponível" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: calcularFechamento,
            disabled: calculando || !metaAtual,
            children: calculando ? "Calculando..." : "Calcular comissão do mês"
          }
        ),
        !metaAtual && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: 10, fontSize: "0.85rem" }, children: [
          "Defina uma meta para este período em",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Metas do Vendedor" }),
          "."
        ] })
      ] }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mt-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mb-3 grid gap-3 md:gap-4",
        style: { gridTemplateColumns: "repeat(4, minmax(0, 1fr))" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "Meta do mês" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: metaAtual ? metaAtual.meta_geral.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) : "–" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: [
              "Base da meta (usando",
              " ",
              parametros?.usar_taxas_na_meta ? "valor bruto (com taxas)" : "valor líquido (sem taxas)",
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: (() => {
              const base = parametros?.usar_taxas_na_meta ? valorBruto : valorLiquido;
              return base.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              });
            })() })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "% Meta Atingida" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: [
              pctMeta.toFixed(1),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "% Comissão Aplicada" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: [
              pctComissao.toFixed(2),
              "%"
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "mb-3",
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12
        },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "Valor bruto no período (venda + taxas)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: valorBruto.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "Total de taxas no período" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: valorTaxas.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "Valor líquido (base da comissão)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "1.2rem", fontWeight: 600 }, children: valorLiquido.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem", marginBottom: 4 }, children: "Comissão estimada para o período" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          style: {
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#22c55e"
          },
          children: valorComissao.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.75, marginTop: 4 }, children: "Cálculo considerando sempre o valor líquido (venda - taxas), conforme sua regra de negócio." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-green mb-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Vendas do período" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.8rem", opacity: 0.8 }, children: "Somente vendas não canceladas com recibos vinculados." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-green min-w-[720px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qtd. Recibos" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Bruto (R$)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Taxas (R$)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Líquido (R$)" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        vendasPeriodo.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhuma venda encontrada no período." }) }),
        vendasPeriodo.map((v) => {
          let bruto = 0;
          let taxas = 0;
          for (const r of v.vendas_recibos || []) {
            const vt = r.valor_total ?? 0;
            const tx = r.valor_taxas ?? 0;
            bruto += vt + tx;
            taxas += tx;
          }
          const liquido = bruto - taxas;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.data_lancamento ? new Date(v.data_lancamento).toLocaleDateString(
              "pt-BR"
            ) : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: v.vendas_recibos?.length || 0 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: bruto.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: taxas.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: liquido.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) })
          ] }, v.id);
        })
      ] })
    ] }) })
  ] });
}

const $$Fechamento = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = "Fechamento de Comiss\xE3o";
  return renderTemplate`${renderComponent($$result, "Layout", $$DashboardLayout, { "title": pageTitle, "module": "Metas" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">${pageTitle}</h1> ${renderComponent($$result2, "FechamentoComissaoIsland", FechamentoComissaoIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/FechamentoComissaoIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/comissoes/fechamento.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/comissoes/fechamento.astro";
const $$url = "/comissoes/fechamento";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Fechamento,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
