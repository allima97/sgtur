globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports, s as supabase } from './supabase_CtqDhMax.mjs';
import { r as reactExports } from './_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from './usePermissao_CncspAO2.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const initialForm = {
  nome: "",
  cidade_id: "",
  tipo_produto: "",
  atracao_principal: "",
  melhor_epoca: "",
  duracao_sugerida: "",
  nivel_preco: "",
  imagem_url: "",
  informacoes_importantes: "",
  ativo: true
};
function ProdutosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [paises, setPaises] = reactExports.useState([]);
  const [estados, setEstados] = reactExports.useState([]);
  const [cidades, setCidades] = reactExports.useState([]);
  const [tipos, setTipos] = reactExports.useState([]);
  const [produtos, setProdutos] = reactExports.useState([]);
  const [form, setForm] = reactExports.useState(initialForm);
  const [busca, setBusca] = reactExports.useState("");
  const [cidadeBusca, setCidadeBusca] = reactExports.useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [editandoId, setEditandoId] = reactExports.useState(null);
  const [excluindoId, setExcluindoId] = reactExports.useState(null);
  const [erro, setErro] = reactExports.useState(null);
  async function carregarDados() {
    async function carregarTodasCidades() {
      const todas = [];
      const pageSize = 1e3;
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from("cidades").select("id, nome, estado_id").order("nome").range(from, from + pageSize - 1);
        if (error) throw error;
        todas.push(...data || []);
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return todas;
    }
    try {
      setLoading(true);
      setErro(null);
      const [
        { data: paisData, error: paisErr },
        { data: estadoData, error: estErr },
        cidadeData,
        { data: tipoData, error: tipoErr },
        { data: produtoData, error: prodErr }
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("estados").select("id, nome, pais_id").order("nome"),
        carregarTodasCidades(),
        supabase.from("tipo_produtos").select("id, nome, tipo").order("nome"),
        supabase.from("produtos").select(
          "id, nome, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, created_at"
        ).order("nome")
      ]);
      if (paisErr) throw paisErr;
      if (estErr) throw estErr;
      if (tipoErr) throw tipoErr;
      if (prodErr) throw prodErr;
      setPaises(paisData || []);
      setEstados(estadoData || []);
      setCidades(cidadeData || []);
      setTipos(tipoData || []);
      setProdutos(produtoData || []);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar produtos. Verifique se as tabelas estão corretas.");
    } finally {
      setLoading(false);
    }
  }
  reactExports.useEffect(() => {
    carregarDados();
  }, []);
  const cidadesFiltradasPesquisa = reactExports.useMemo(() => {
    const termo = normalizeText(cidadeBusca.trim());
    if (!termo) return cidades;
    return cidades.filter((c) => normalizeText(c.nome).includes(termo));
  }, [cidades, cidadeBusca]);
  const estadoMap = reactExports.useMemo(() => new Map(estados.map((e) => [e.id, e.nome])), [estados]);
  function formatarCidadeNome(cidadeId) {
    const cidade = cidades.find((c) => c.id === cidadeId);
    if (!cidade) return "";
    const estadoNome = estadoMap.get(cidade.estado_id);
    return estadoNome ? `${cidade.nome} (${estadoNome})` : cidade.nome;
  }
  const produtosEnriquecidos = reactExports.useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const estadoMap2 = new Map(estados.map((e) => [e.id, e]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    const tipoMap = new Map(tipos.map((t) => [t.id, t]));
    return produtos.map((p) => {
      const cidade = cidadeMap.get(p.cidade_id || "");
      const estado = cidade ? estadoMap2.get(cidade.estado_id) : void 0;
      const pais = estado ? paisMap.get(estado.pais_id) : void 0;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : void 0;
      return {
        ...p,
        cidade_nome: cidade?.nome || "",
        estado_nome: estado?.nome || "",
        pais_nome: pais?.nome || "",
        tipo_nome: tipo?.nome || tipo?.tipo || ""
      };
    });
  }, [produtos, cidades, estados, paises, tipos]);
  const produtosFiltrados = reactExports.useMemo(() => {
    if (!busca.trim()) return produtosEnriquecidos;
    const termo = normalizeText(busca);
    return produtosEnriquecidos.filter(
      (p) => normalizeText(p.nome).includes(termo) || normalizeText(p.cidade_nome).includes(termo) || normalizeText(p.estado_nome).includes(termo) || normalizeText(p.pais_nome).includes(termo) || normalizeText(p.tipo_nome).includes(termo)
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
      ativo: produto.ativo ?? true
    });
    setCidadeBusca(formatarCidadeNome(produto.cidade_id) || cidade?.nome || "");
    setMostrarSugestoes(false);
  }
  async function salvar(e) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Você não tem permissão para salvar produtos.");
      return;
    }
    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }
    if (!form.cidade_id) {
      setErro("Cidade é obrigatória.");
      return;
    }
    if (!form.tipo_produto) {
      setErro("Tipo de produto é obrigatório.");
      return;
    }
    try {
      setSalvando(true);
      setErro(null);
      const payload = {
        nome: form.nome.trim(),
        cidade_id: form.cidade_id,
        tipo_produto: form.tipo_produto,
        atracao_principal: form.atracao_principal.trim() || null,
        melhor_epoca: form.melhor_epoca.trim() || null,
        duracao_sugerida: form.duracao_sugerida.trim() || null,
        nivel_preco: form.nivel_preco.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        informacoes_importantes: form.informacoes_importantes.trim() || null,
        ativo: form.ativo
      };
      if (editandoId) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("produtos").insert(payload);
        if (error) throw error;
      }
      iniciarNovo();
      await carregarDados();
    } catch (e2) {
      console.error(e2);
      setErro("Erro ao salvar produto. Verifique os dados e tente novamente.");
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
      await carregarDados();
    } catch (e) {
      console.error(e);
      setErro("Não foi possível excluir o produto. Verifique vínculos com vendas/orçamentos.");
    } finally {
      setExcluindoId(null);
    }
  }
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando permissões..." });
  if (!ativo) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Cadastros." });
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
                tipos.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.id, children: t.nome || t.tipo }, t.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
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
              cidadesFiltradasPesquisa.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "4px 6px", color: "#6b7280" }, children: "Nenhuma cidade encontrada." }),
              cidadesFiltradasPesquisa.map((c) => {
                const estadoNome = estadoMap.get(c.estado_id);
                const label = estadoNome ? `${c.nome} (${estadoNome})` : c.nome;
                return /* @__PURE__ */ jsxRuntimeExports.jsx(
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
                    },
                    children: label
                  },
                  c.id
                );
              })
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Atração principal" }),
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
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Melhor época" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.melhor_epoca,
              onChange: (e) => handleChange("melhor_epoca", e.target.value),
              placeholder: "Ex: Dezembro a Março",
              disabled: permissao === "view"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Duração sugerida" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.duracao_sugerida,
              onChange: (e) => handleChange("duracao_sugerida", e.target.value),
              placeholder: "Ex: 7 dias",
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nível de preço" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nivel_preco,
              onChange: (e) => handleChange("nivel_preco", e.target.value),
              placeholder: "Ex: Econômico, Intermediário, Premium",
              disabled: permissao === "view"
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Informações importantes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-input",
            rows: 3,
            value: form.informacoes_importantes,
            onChange: (e) => handleChange("informacoes_importantes", e.target.value),
            placeholder: "Observações gerais, dicas, documentação necessária, etc.",
            disabled: permissao === "view"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
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
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2", children: [
        permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar produto" }),
        editandoId && permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", style: { marginLeft: 8 }, onClick: iniciarNovo, children: "Cancelar edição" })
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
          placeholder: "Busque por nome, tipo, cidade, estado ou país..."
        }
      )
    ] }) }) }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[1080px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Estado" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "País" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nível de preço" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Carregando produtos..." }) }),
        !loading && produtosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, children: "Nenhum produto encontrado." }) }),
        !loading && produtosFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.tipo_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.cidade_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.estado_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.pais_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nivel_preco || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.ativo ? "Sim" : "Não" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "th-actions", children: [
            permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn-icon", title: "Editar", onClick: () => iniciarEdicao(p), children: "✏️" }),
            permissao === "admin" && /* @__PURE__ */ jsxRuntimeExports.jsx(
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
