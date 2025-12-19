globalThis.process ??= {}; globalThis.process.env ??= {};
import { s as supabase, j as jsxRuntimeExports } from './supabase_CtqDhMax.mjs';
import { r as reactExports } from './_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from './usePermissao_ChD594_G.mjs';
import { t as titleCaseWithExceptions } from './titleCase_DEDuDeMf.mjs';
import { L as LoadingUsuarioContext } from './LoadingUsuarioContext_XbJI-A09.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function formatFornecedorLabel(fornecedor) {
  if (!fornecedor) return "";
  return (fornecedor.nome_fantasia?.trim() || fornecedor.nome_completo?.trim() || "").trim();
}
const initialForm = {
  nome: "",
  destino: "",
  cidade_id: "",
  tipo_produto: "",
  atracao_principal: "",
  melhor_epoca: "",
  duracao_sugerida: "",
  nivel_preco: "",
  imagem_url: "",
  informacoes_importantes: "",
  ativo: true,
  fornecedor_id: "",
  fornecedor_label: ""
};
function ProdutosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [paises, setPaises] = reactExports.useState([]);
  const [subdivisoes, setSubdivisoes] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [tipos, setTipos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [form, setForm] = reactExports.useState(initialForm);
  const [busca, setBusca] = reactExports.useState("");
  const [cidadeBusca, setCidadeBusca] = reactExports.useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = reactExports.useState(false);
  const [resultadosCidade, setResultadosCidade] = reactExports.useState([]);
  const [buscandoCidade, setBuscandoCidade] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [editandoId, setEditandoId] = reactExports.useState(null);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  const [erroCidadeBusca, setErroCidadeBusca] = reactExports.useState(null);
  const [carregouTodos, setCarregouTodos] = reactExports.useState(false);
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [fornecedoresLista, setFornecedoresLista] = reactExports.useState([]);
  async function carregarDados(todos = false) {
    const erros = [];
    const detalhesErro = [];
    setLoading(true);
    setErro(null);
    try {
      const [
        { data: paisData, error: paisErr },
        { data: subdivisaoData, error: subErr },
        tipoResp,
        produtosResp
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("subdivisoes").select("id, nome, pais_id").order("nome"),
        supabase.from("tipo_produtos").select("id, nome, tipo").eq("ativo", true).order("nome").then(async (res) => {
          if (res.error) {
            detalhesErro.push(`tipo_produtos: ${res.error.message}`);
            console.warn("Fallback tipo_produtos por 'tipo':", res.error);
            const fallback = await supabase.from("tipo_produtos").select("id, nome, tipo").order("tipo");
            return fallback;
          }
          return res;
        }),
        supabase.from("produtos").select(
          "id, nome, destino, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, fornecedor_id, created_at"
        ).order(todos ? "nome" : "created_at", { ascending: todos ? true : false }).limit(todos ? void 0 : 10)
      ]);
      if (paisErr) {
        erros.push("paises");
        if (paisErr.message) detalhesErro.push(`paises: ${paisErr.message}`);
      } else {
        setPaises(paisData || []);
      }
      const baseSubdivisoes = subdivisaoData || [];
      if (subErr) {
        erros.push("subdivisoes");
        if (subErr.message) detalhesErro.push(`subdivisoes: ${subErr.message}`);
      } else {
        setSubdivisoes(baseSubdivisoes);
      }
      if (tipoResp.error) {
        erros.push("tipo_produtos");
        if (tipoResp.error.message) detalhesErro.push(`tipo_produtos: ${tipoResp.error.message}`);
      } else {
        const listaTipos = tipoResp.data || [];
        if (listaTipos.length === 0) {
          const { data: tiposAll, error: tiposAllErr } = await supabase.from("tipo_produtos").select("id, nome, tipo").order("nome");
          if (tiposAllErr) {
            erros.push("tipo_produtos");
            detalhesErro.push(`tipo_produtos (fallback): ${tiposAllErr.message}`);
          } else {
            setTipos(tiposAll || []);
          }
        } else {
          setTipos(listaTipos);
        }
      }
      if (produtosResp.error) {
        erros.push("produtos");
        if (produtosResp.error.message) detalhesErro.push(`produtos: ${produtosResp.error.message}`);
      } else {
        const produtoData = produtosResp.data || [];
        setProdutos(produtoData);
        setCarregouTodos(todos);
        const idsCidade = Array.from(new Set(produtoData.map((p) => p.cidade_id).filter(Boolean)));
        if (idsCidade.length) {
          const { data: cidadesData, error: cidadesErr } = await supabase.from("cidades").select("id, nome, subdivisao_id, subdivisoes (id, nome, pais_id)").in("id", idsCidade);
          if (cidadesErr) {
            erros.push("cidades");
            if (cidadesErr.message) detalhesErro.push(`cidades: ${cidadesErr.message}`);
          } else {
            const cidadesLista = cidadesData || [];
            setCidades(cidadesLista);
            const idsSubdiv = Array.from(new Set(cidadesLista.map((c) => c.subdivisao_id).filter(Boolean)));
            if (idsSubdiv.length) {
              const jaCarregadas = new Set(baseSubdivisoes.map((s) => s.id));
              const faltantes = idsSubdiv.filter((id) => !jaCarregadas.has(id));
              if (faltantes.length) {
                const { data: subsExtra, error: subsExtraErr } = await supabase.from("subdivisoes").select("id, nome, pais_id").in("id", faltantes);
                if (subsExtraErr) {
                  erros.push("subdivisoes");
                  if (subsExtraErr.message) detalhesErro.push(`subdivisoes (faltantes): ${subsExtraErr.message}`);
                } else if (subsExtra?.length) {
                  setSubdivisoes((prev) => {
                    const existente = new Map(prev.map((s) => [s.id, s]));
                    subsExtra.forEach((s) => existente.set(s.id, s));
                    return Array.from(existente.values());
                  });
                }
              }
            }
          }
        } else {
          setCidades([]);
        }
      }
    } catch (e) {
      console.error(e);
      erros.push("geral");
      if (e?.message) detalhesErro.push(`geral: ${e.message}`);
    } finally {
      if (erros.length) {
        const detalhes = detalhesErro.length ? ` Detalhes: ${detalhesErro.join(" | ")}` : "";
        setErro(`Erro ao carregar: ${erros.join(", ")}. Verifique permissoes/RLS.${detalhes}`);
      }
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    carregarDados(false);
  }, []);
  reactExports.useEffect(() => {
    let isMounted = true;
    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !isMounted) return;
        const { data, error } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        if (!isMounted) return;
        if (error) {
          console.error("Erro ao buscar company_id dos fornecedores:", error);
          return;
        }
        setCompanyId(data?.company_id || null);
      } catch (error) {
        console.error("Erro ao determinar company_id dos fornecedores:", error);
      }
    }
    resolveCompany();
    return () => {
      isMounted = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!companyId) {
      setFornecedoresLista([]);
      return;
    }
    let isActive = true;
    async function carregarFornecedores() {
      const { data, error } = await supabase.from("fornecedores").select("id, nome_completo, nome_fantasia").eq("company_id", companyId).order("nome_fantasia", { ascending: true });
      if (!isActive) return;
      if (error) {
        console.error("Erro ao carregar fornecedores:", error);
        return;
      }
      setFornecedoresLista(data || []);
    }
    carregarFornecedores();
    return () => {
      isActive = false;
    };
  }, [companyId]);
  reactExports.useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarDados(true);
    }
  }, [busca, carregouTodos]);
  const subdivisaoMap = reactExports.useMemo(() => new Map(subdivisoes.map((s) => [s.id, s])), [subdivisoes]);
  const fornecedoresMap = reactExports.useMemo(
    () => new Map(fornecedoresLista.map((f) => [f.id, formatFornecedorLabel(f)])),
    [fornecedoresLista]
  );
  function formatarCidadeNome(cidadeId) {
    const cidade = cidades.find((c) => c.id === cidadeId);
    if (!cidade) return "";
    const subdivisao = subdivisaoMap.get(cidade.subdivisao_id);
    return subdivisao ? `${cidade.nome} (${subdivisao.nome})` : cidade.nome;
  }
  function tipoLabel(t) {
    if (!t) return "";
    return (t.nome || "").trim() || t.tipo || "";
  }
  const produtosEnriquecidos = reactExports.useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    const tipoMap = new Map(tipos.map((t) => [t.id, t]));
    return produtos.map((p) => {
      const cidade = cidadeMap.get(p.cidade_id || "");
      const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) || cidade.subdivisoes : void 0;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : void 0;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : void 0;
      return {
        ...p,
        cidade_nome: cidade?.nome || "",
        subdivisao_nome: subdivisao?.nome || "",
        pais_nome: pais?.nome || "",
        tipo_nome: tipoLabel(tipo),
        fornecedor_nome: fornecedoresMap.get(p.fornecedor_id || "") || ""
      };
    });
  }, [produtos, cidades, subdivisoes, paises, tipos, fornecedoresMap]);
  const produtosFiltrados = reactExports.useMemo(() => {
    if (!busca.trim()) return produtosEnriquecidos;
    const termo = normalizeText(busca);
    return produtosEnriquecidos.filter(
      (p) => normalizeText(p.nome).includes(termo) || normalizeText(p.cidade_nome).includes(termo) || normalizeText(p.subdivisao_nome).includes(termo) || normalizeText(p.pais_nome).includes(termo) || normalizeText(p.tipo_nome).includes(termo) || normalizeText(p.destino || "").includes(termo)
    );
  }, [busca, produtosEnriquecidos]);
  function handleChange(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor
    }));
  }
  function handleCidadeBusca(valor) {
    setCidadeBusca(valor);
    const cidadeAtual = cidades.find((c) => c.id === form.cidade_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
      setForm((prev) => ({ ...prev, cidade_id: "" }));
    }
    setMostrarSugestoes(true);
  }
  function handleFornecedorInput(valor) {
    handleChange("fornecedor_label", valor);
    const termo = valor.trim().toLowerCase();
    if (!termo) {
      handleChange("fornecedor_id", "");
      return;
    }
    const match = fornecedoresLista.find(
      (f) => formatFornecedorLabel(f).toLowerCase() === termo
    );
    handleChange("fornecedor_id", match ? match.id : "");
  }
  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
    setCidadeBusca("");
    setMostrarSugestoes(false);
  }
  function iniciarEdicao(produto) {
    const cidade = cidades.find((c) => c.id === produto.cidade_id);
    setEditandoId(produto.id);
    setForm({
      nome: produto.nome,
      cidade_id: produto.cidade_id,
      tipo_produto: produto.tipo_produto || "",
      atracao_principal: produto.atracao_principal || "",
      melhor_epoca: produto.melhor_epoca || "",
      duracao_sugerida: produto.duracao_sugerida || "",
      nivel_preco: produto.nivel_preco || "",
      imagem_url: produto.imagem_url || "",
      informacoes_importantes: produto.informacoes_importantes || "",
      ativo: produto.ativo ?? true,
      destino: produto.destino || "",
      fornecedor_id: produto.fornecedor_id || "",
      fornecedor_label: formatFornecedorLabel(
        fornecedoresLista.find((f) => f.id === produto.fornecedor_id)
      )
    });
    setCidadeBusca(formatarCidadeNome(produto.cidade_id) || cidade?.nome || "");
    setMostrarSugestoes(false);
  }
  reactExports.useEffect(() => {
    if (cidadeBusca.trim().length < 2) {
      setResultadosCidade([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setBuscandoCidade(true);
      setErroCidadeBusca(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: cidadeBusca.trim(), limite: 10 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            console.error("Erro ao buscar cidades:", error);
            setErroCidadeBusca("Erro ao buscar cidades (RPC). Tentando fallback...");
            const { data: dataFallback, error: errorFallback } = await supabase.from("cidades").select("id, nome, subdivisao_id").ilike("nome", `%${cidadeBusca.trim()}%`).order("nome");
            if (errorFallback) {
              console.error("Erro no fallback de cidades:", errorFallback);
              setErroCidadeBusca("Erro ao buscar cidades.");
            } else {
              setResultadosCidade(dataFallback || []);
              setErroCidadeBusca(null);
            }
          } else {
            setResultadosCidade(data || []);
          }
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [cidadeBusca]);
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Voce nao tem permissao para salvar produtos.");
      return;
    }
    if (!form.nome.trim()) {
      setErro("Nome e obrigatorio.");
      return;
    }
    if (!form.destino.trim()) {
      setErro("Destino e obrigatorio.");
      return;
    }
    if (!form.cidade_id) {
      setErro("Cidade e obrigatoria.");
      return;
    }
    if (!form.tipo_produto) {
      setErro("Tipo de produto e obrigatorio.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const erroSupabaseMsg = (err) => {
        const msg = err?.message || err?.error?.message || "";
        const det = err?.details || err?.error?.details || "";
        const hint = err?.hint || err?.error?.hint || "";
        return [msg, det, hint].filter(Boolean).join(" | ");
      };
      const nomeNormalizado = titleCaseWithExceptions(form.nome);
      const destinoNormalizado = titleCaseWithExceptions(form.destino);
      const payload = {
        nome: nomeNormalizado,
        destino: destinoNormalizado,
        cidade_id: form.cidade_id,
        tipo_produto: form.tipo_produto,
        atracao_principal: form.atracao_principal.trim() || null,
        melhor_epoca: form.melhor_epoca.trim() || null,
        duracao_sugerida: form.duracao_sugerida.trim() || null,
        nivel_preco: form.nivel_preco.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        informacoes_importantes: form.informacoes_importantes.trim() || null,
        ativo: form.ativo,
        fornecedor_id: form.fornecedor_id || null
      };
      if (editandoId) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", editandoId);
        if (error) {
          const msg = erroSupabaseMsg(error);
          throw new Error(msg || error.message);
        }
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) {
          const msg = erroSupabaseMsg(error);
          throw new Error(msg || error.message);
        }
      }
      iniciarNovo();
      await carregarDados(carregouTodos);
    } catch (e2) {
      console.error(e2);
      const msg = e2?.message || e2?.error?.message || "";
      setErro(`Erro ao salvar produto.${msg ? ` Detalhes: ${msg}` : ""}`);
    } finally {
      setSalvando(false);
    }
  }
  async function excluir(id) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir produtos.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      setExcluindoId(id);
      setErro(null);
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
      await carregarDados(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Nao foi possivel excluir o produto. Verifique vinculos com vendas/orcamentos.");
    } finally {
      setExcluindoId(null);
    }
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Voce nao possui acesso ao modulo de Cadastros." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "destinos-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome do produto *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome,
              onChange: (e) => handleChange("nome", e.target.value),
              onBlur: (e) => handleChange("nome", titleCaseWithExceptions(e.target.value)),
              placeholder: "Ex: Passeio em Gramado, Pacote Paris...",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.tipo_produto,
              onChange: (e) => handleChange("tipo_produto", e.target.value),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione o tipo" }),
                tipos.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.id, children: tipoLabel(t) || "(sem nome)" }, t.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.destino,
              onChange: (e) => handleChange("destino", e.target.value),
              onBlur: (e) => handleChange("destino", titleCaseWithExceptions(e.target.value)),
              placeholder: "Ex: Disney, Porto de Galinhas",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              placeholder: "Digite o nome da cidade",
              value: cidadeBusca,
              onChange: (e) => handleCidadeBusca(e.target.value),
              onFocus: () => setMostrarSugestoes(true),
              onBlur: () => setTimeout(() => setMostrarSugestoes(false), 150),
              disabled: permissao === "view",
              style: { marginBottom: 6 }
            }
          ),
          buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280" }, children: "Buscando..." }),
          erroCidadeBusca && !buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#dc2626" }, children: erroCidadeBusca }),
          mostrarSugestoes && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "card-base",
              style: {
                marginTop: 4,
                maxHeight: 180,
                overflowY: "auto",
                padding: 6,
                border: "1px solid #e5e7eb"
              },
              children: [
                resultadosCidade.length === 0 && !buscandoCidade && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "4px 6px", color: "#6b7280" }, children: "Nenhuma cidade encontrada." }),
                resultadosCidade.map((c) => {
                  const label = c.subdivisao_nome ? `${c.nome} (${c.subdivisao_nome})` : c.nome;
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "button",
                    {
                      type: "button",
                      className: "btn btn-light",
                      style: {
                        width: "100%",
                        justifyContent: "flex-start",
                        marginBottom: 4,
                        background: form.cidade_id === c.id ? "#e0f2fe" : "#fff",
                        borderColor: form.cidade_id === c.id ? "#38bdf8" : "#e5e7eb"
                      },
                      onMouseDown: (e) => {
                        e.preventDefault();
                        handleChange("cidade_id", c.id);
                        setCidadeBusca(label);
                        setMostrarSugestoes(false);
                        setResultadosCidade([]);
                      },
                      children: [
                        label,
                        c.pais_nome ? /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: "#6b7280", marginLeft: 6 }, children: [
                          "• ",
                          c.pais_nome
                        ] }) : null
                      ]
                    },
                    c.id
                  );
                })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Fornecedor (opcional)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              list: "fornecedores-list",
              placeholder: "Escolha um fornecedor",
              value: form.fornecedor_label,
              onChange: (e) => handleFornecedorInput(e.target.value),
              disabled: permissao === "view"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "fornecedores-list", children: fornecedoresLista.map((fornecedor) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: formatFornecedorLabel(fornecedor) }, fornecedor.id)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Atracao principal" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.atracao_principal,
              onChange: (e) => handleChange("atracao_principal", e.target.value),
              placeholder: "Ex: Disney, Torre Eiffel...",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Melhor epoca" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.melhor_epoca,
              onChange: (e) => handleChange("melhor_epoca", e.target.value),
              placeholder: "Ex: Dezembro a Marco",
              disabled: permissao === "view"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Duracao sugerida" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.duracao_sugerida,
              onChange: (e) => handleChange("duracao_sugerida", e.target.value),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "De 1 a 3 dias", children: "De 1 a 3 dias" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "De 3 a 5 dias", children: "De 3 a 5 dias" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "De 5 a 7 dias", children: "De 5 a 7 dias" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "De 7 a 10 dias", children: "De 7 a 10 dias" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "10 dias ou mais", children: "10 dias ou mais" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nivel de preco" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.nivel_preco,
              onChange: (e) => handleChange("nivel_preco", e.target.value),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Economico", children: "Economico" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Intermediario", children: "Intermediario" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Premium", children: "Premium" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Super Premium", children: "Super Premium" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Imagem (URL)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.imagem_url,
              onChange: (e) => handleChange("imagem_url", e.target.value),
              placeholder: "URL de uma imagem do destino",
              disabled: permissao === "view"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Informacoes importantes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: form.informacoes_importantes,
            onChange: (e) => handleChange("informacoes_importantes", e.target.value),
            placeholder: "Observacoes gerais, dicas, documentacao necessaria, etc.",
            disabled: permissao === "view"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: form.ativo ? "true" : "false",
            onChange: (e) => handleChange("ativo", e.target.value === "true"),
            disabled: permissao === "view",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Nao" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
        permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : editandoId ? "Salvar alteracoes" : "Adicionar produto" }),
        editandoId && permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", style: { marginLeft: 8 }, onClick: iniciarNovo, children: "Cancelar edicao" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Buscar produto" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          className: "form-input",
          value: busca,
          onChange: (e) => setBusca(e.target.value),
          placeholder: "Busque por nome, tipo, destino, cidade, estado/província ou país"
        }
      )
    ] }) }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    !carregouTodos && !erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Ultimos Produtos Cadastrados (10). Digite na busca para consultar todos." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[1080px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Fornecedor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Estado/Província" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Pais" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nivel de preco" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Acoes" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Carregando produtos..." }) }),
        !loading && produtosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Nenhum produto encontrado." }) }),
        !loading && produtosFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.tipo_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.destino || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.cidade_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.fornecedor_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.subdivisao_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.pais_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nivel_preco || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.ativo ? "Sim" : "Nao" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", title: "Editar", onClick: () => iniciarEdicao(p), children: "✏️" }),
            (permissao === "admin" || permissao === "delete") && /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn-icon btn-danger",
                title: "Excluir",
                onClick: () => excluir(p.id),
                disabled: excluindoId === p.id,
                children: excluindoId === p.id ? "..." : "🗑️"
              }
            )
          ] })
        ] }, p.id))
      ] })
    ] }) })
  ] });
}

export { ProdutosIsland as P };
