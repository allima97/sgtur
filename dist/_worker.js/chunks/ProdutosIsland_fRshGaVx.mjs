globalThis.process ??= {}; globalThis.process.env ??= {};
import { s as supabase, j as jsxRuntimeExports } from './systemName_EsfuoaVO.mjs';
import { r as reactExports } from './_@astro-renderers_lNEyfHhP.mjs';
import { u as usePermissao } from './usePermissao_DDNDrOh3.mjs';
import { t as titleCaseWithExceptions } from './titleCase_DEDuDeMf.mjs';
import { L as LoadingUsuarioContext } from './LoadingUsuarioContext_mmcEZ_Es.mjs';

function normalizeText(value) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const nivelPrecosOptions = [
  { value: "Economico", label: "Econômico" },
  { value: "Intermediario", label: "Intermediário" },
  { value: "Variavel", label: "Variável" },
  { value: "Premium", label: "Premium" },
  { value: "Super Premium", label: "Super Premium" }
];
const HOSPITALITY_KEYWORDS = /* @__PURE__ */ new Set(["hotel", "pousada", "resort"]);
function nivelPrecoLabel(value) {
  if (!value) return "";
  const normalizedValue = normalizeText(value);
  const match = nivelPrecosOptions.find(
    (nivel) => normalizeText(nivel.value) === normalizedValue || normalizeText(nivel.label) === normalizedValue
  );
  return match ? match.label : value;
}
function ehTipoHospedagem(tipo) {
  if (!tipo) return false;
  const identificado = normalizeText(tipo.nome || tipo.tipo || "");
  return HOSPITALITY_KEYWORDS.has(identificado);
}
function gerarIdTemporario() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
function normalizeNumericInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const allowed = trimmed.replace(/[^\d.,-]/g, "");
  if (!allowed) return null;
  const hasComma = allowed.includes(",");
  const hasDot = allowed.includes(".");
  let normalized = allowed;
  if (hasComma && hasDot || hasComma && !hasDot) {
    normalized = allowed.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    const dotCount = (allowed.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = allowed.replace(/\./g, "");
    } else {
      const parts = allowed.split(".");
      if (parts[1]?.length !== 2) {
        normalized = allowed.replace(/\./g, "");
      }
    }
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}
function parseDecimalInput(value) {
  if (!value) return null;
  const num = normalizeNumericInput(value);
  return num;
}
function parsePercentInput(value) {
  if (!value) return null;
  const cleaned = value.replace("%", "").trim();
  const num = parseDecimalInput(cleaned);
  if (num == null) return null;
  if (num > 1) {
    return num / 100;
  }
  return num;
}
function formatMarginPercent(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}
function calcularValorVendaString(valorNeto, margem) {
  const net = parseDecimalInput(valorNeto);
  const margin = parsePercentInput(margem);
  if (net == null || margin == null) return "";
  if (margin >= 1) return "";
  const sale = net / (1 - margin);
  if (!Number.isFinite(sale)) return "";
  return sale.toFixed(2);
}
function formatValorComMoeda(value, moeda) {
  if (value == null || Number.isNaN(value)) return "-";
  const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${moeda || "R$"} ${formatted}`;
}
function formatDecimal(value, digits = 4) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Math.min(2, digits),
    maximumFractionDigits: digits
  });
}
function formatNumberPtBr(value) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  fornecedor_label: "",
  todas_as_cidades: false,
  valor_neto: "",
  margem: "20%",
  valor_venda: "",
  moeda: "USD",
  cambio: "5,00",
  valor_em_reais: ""
};
const initialTarifaForm = {
  acomodacao: "",
  qte_pax: "",
  tipo: "",
  validade_de: "",
  validade_ate: "",
  valor_neto: "",
  padrao: "Padrao",
  margem: ""
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
  const [mostrarFormulario, setMostrarFormulario] = reactExports.useState(false);
  const [modoGlobal, setModoGlobal] = reactExports.useState(null);
  const [tarifas, setTarifas] = reactExports.useState([]);
  const [tarifaModalAberta, setTarifaModalAberta] = reactExports.useState(false);
  const [tarifaModalForm, setTarifaModalForm] = reactExports.useState(initialTarifaForm);
  const [tarifaModalErro, setTarifaModalErro] = reactExports.useState(null);
  const [acomodacoes, setAcomodacoes] = reactExports.useState([]);
  const [cambiosParametros, setCambiosParametros] = reactExports.useState([]);
  const [ultimaMoedaAuto, setUltimaMoedaAuto] = reactExports.useState(null);
  const [ultimoValorAuto, setUltimoValorAuto] = reactExports.useState("");
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
          "id, nome, destino, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, fornecedor_id, created_at, todas_as_cidades, valor_neto, margem, valor_venda, moeda, cambio, valor_em_reais"
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
    if (!companyId) {
      setAcomodacoes([]);
      return;
    }
    let isActive = true;
    async function carregarAcomodacoes() {
      const { data, error } = await supabase.from("acomodacoes").select("nome").order("nome");
      if (!isActive) return;
      if (error) {
        console.error("Erro ao carregar acomodacoes:", error);
        return;
      }
      const lista = (data || []).map((item) => (item?.nome || "").toString().trim()).filter(Boolean);
      setAcomodacoes(lista);
    }
    carregarAcomodacoes();
    return () => {
      isActive = false;
    };
  }, [companyId]);
  reactExports.useEffect(() => {
    if (!companyId) {
      setCambiosParametros([]);
      setUltimaMoedaAuto(null);
      setUltimoValorAuto("");
      return;
    }
    let isActive = true;
    async function carregarCambios() {
      const { data, error } = await supabase.from("parametros_cambios").select("moeda, data, valor").eq("company_id", companyId).order("data", { ascending: false }).order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        console.error("Erro ao carregar câmbios:", error);
        return;
      }
      setCambiosParametros(data || []);
      setUltimaMoedaAuto(null);
      setUltimoValorAuto("");
    }
    carregarCambios();
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
    if (!cidadeId) return "";
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
      const cidade = p.todas_as_cidades ? null : cidadeMap.get(p.cidade_id || "");
      const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) || cidade.subdivisoes : void 0;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : void 0;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : void 0;
      return {
        ...p,
        cidade_nome: p.todas_as_cidades ? "Todas as cidades" : cidade?.nome || "",
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
  const cambioAtualPorMoeda = reactExports.useMemo(() => {
    const mapa = {};
    cambiosParametros.forEach((cambio) => {
      const key = (cambio.moeda || "R$").trim();
      if (!key || cambio.valor == null) return;
      const existente = mapa[key];
      if (!existente || cambio.data > existente.data) {
        mapa[key] = { valor: cambio.valor, data: cambio.data };
      }
    });
    return mapa;
  }, [cambiosParametros]);
  const tipoSelecionado = reactExports.useMemo(
    () => form.tipo_produto ? tipos.find((t) => t.id === form.tipo_produto) || null : null,
    [form.tipo_produto, tipos]
  );
  const isHospedagem = ehTipoHospedagem(tipoSelecionado);
  const tarifaMoeda = form.moeda.trim() || "USD";
  const tarifaMargemPreview = tarifaModalForm.padrao === "Manual" ? tarifaModalForm.margem || "" : form.margem || "20%";
  const tarifaValorVendaPreview = calcularValorVendaString(tarifaModalForm.valor_neto, tarifaMargemPreview);
  const tarifaValorVendaNum = parseDecimalInput(tarifaValorVendaPreview);
  const tarifaCambioAtual = parseDecimalInput(form.cambio) ?? 0;
  const tarifaValorEmReaisPreview = tarifaValorVendaNum != null ? tarifaValorVendaNum * tarifaCambioAtual : 0;
  const estaEditando = Boolean(editandoId);
  const formLayout = estaEditando ? "full" : modoGlobal === null ? "selection" : modoGlobal ? "global" : "full";
  const isGlobalMode = formLayout === "global";
  const handleChange = reactExports.useCallback((campo, valor) => {
    setForm((prev) => {
      const atualizado = { ...prev, [campo]: valor };
      if (campo === "valor_neto" || campo === "margem") {
        const valorNeto = campo === "valor_neto" ? valor : prev.valor_neto;
        const margem = campo === "margem" ? valor : prev.margem;
        atualizado.valor_venda = calcularValorVendaString(valorNeto, margem);
      }
      const valorVendaNum = parseDecimalInput(atualizado.valor_venda);
      const cambioNum = parseDecimalInput(atualizado.cambio);
      if (valorVendaNum != null && cambioNum != null) {
        const valorReais = valorVendaNum * cambioNum;
        atualizado.valor_em_reais = formatNumberPtBr(valorReais);
      } else {
        atualizado.valor_em_reais = "";
      }
      return atualizado;
    });
  }, []);
  reactExports.useEffect(() => {
    if (!form.moeda) return;
    const entrada = cambioAtualPorMoeda[form.moeda];
    if (!entrada) return;
    const formatted = entrada.valor.toFixed(2);
    const deveAtualizar = !form.cambio || ultimaMoedaAuto !== form.moeda || form.cambio === ultimoValorAuto && ultimoValorAuto !== formatted;
    if (!deveAtualizar) return;
    handleChange("cambio", formatted);
    setUltimaMoedaAuto(form.moeda);
    setUltimoValorAuto(formatted);
  }, [
    form.moeda,
    cambioAtualPorMoeda,
    form.cambio,
    ultimaMoedaAuto,
    ultimoValorAuto,
    handleChange
  ]);
  function handleCidadeBusca(valor) {
    if (form.todas_as_cidades) return;
    setCidadeBusca(valor);
    const cidadeAtual = cidades.find((c) => c.id === form.cidade_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
      setForm((prev) => ({ ...prev, cidade_id: "" }));
    }
    setMostrarSugestoes(true);
  }
  function handleToggleTodasAsCidades(valor) {
    handleChange("todas_as_cidades", valor);
    if (valor) {
      handleChange("cidade_id", "");
      setCidadeBusca("");
      setMostrarSugestoes(false);
      setResultadosCidade([]);
    }
  }
  function selecionarAbrangencia(valor) {
    setModoGlobal(valor);
    handleToggleTodasAsCidades(valor);
    if (valor) {
      handleChange("destino", titleCaseWithExceptions("Global"));
    } else {
      handleChange("destino", "");
    }
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
  const handleTarifaModalChange = reactExports.useCallback(
    (campo, valor) => {
      setTarifaModalForm((prev) => {
        const atualizado = { ...prev, [campo]: valor };
        if (campo === "padrao" && valor === "Padrao") {
          atualizado.margem = "";
        }
        return atualizado;
      });
    },
    []
  );
  function abrirModalTarifa() {
    setTarifaModalForm(initialTarifaForm);
    setTarifaModalErro(null);
    setTarifaModalAberta(true);
  }
  function fecharModalTarifa() {
    setTarifaModalAberta(false);
    setTarifaModalForm(initialTarifaForm);
    setTarifaModalErro(null);
  }
  function removerTarifa(id) {
    setTarifas((prev) => prev.filter((tarifa) => tarifa.id !== id));
  }
  async function salvarTarifaModal(e) {
    e.preventDefault();
    if (!tarifaModalForm.acomodacao.trim()) {
      setTarifaModalErro("Informe a acomodação.");
      return;
    }
    if (!tarifaModalForm.tipo.trim()) {
      setTarifaModalErro("Informe o tipo de tarifa.");
      return;
    }
    if (!tarifaModalForm.validade_de || !tarifaModalForm.validade_ate) {
      setTarifaModalErro("Informe o período de validade.");
      return;
    }
    const qtePax = Number.parseInt(tarifaModalForm.qte_pax, 10);
    if (!Number.isFinite(qtePax) || qtePax <= 0) {
      setTarifaModalErro("Informe a quantidade de passageiros.");
      return;
    }
    const valorNetoNum = parseDecimalInput(tarifaModalForm.valor_neto);
    if (valorNetoNum == null) {
      setTarifaModalErro("Informe o valor neto.");
      return;
    }
    const margemPadrao = tarifaModalForm.padrao === "Manual" ? tarifaModalForm.margem || "" : form.margem || "20%";
    const valorVendaStr = calcularValorVendaString(tarifaModalForm.valor_neto, margemPadrao);
    const valorVendaNum = parseDecimalInput(valorVendaStr);
    if (valorVendaNum == null) {
      setTarifaModalErro("Não foi possível calcular o valor de venda.");
      return;
    }
    const margemNum = parsePercentInput(margemPadrao);
    const cambioNum = parseDecimalInput(form.cambio) ?? 0;
    const valorEmReaisNum = valorVendaNum * (cambioNum || 0);
    const novaTarifa = {
      id: gerarIdTemporario(),
      acomodacao: tarifaModalForm.acomodacao.trim(),
      qte_pax: qtePax,
      tipo: tarifaModalForm.tipo.trim(),
      validade_de: tarifaModalForm.validade_de,
      validade_ate: tarifaModalForm.validade_ate,
      valor_neto: valorNetoNum,
      padrao: tarifaModalForm.padrao,
      margem: margemNum,
      valor_venda: valorVendaNum,
      valor_em_reais: valorEmReaisNum,
      moeda: form.moeda.trim() || "USD",
      cambio: cambioNum
    };
    setTarifas((prev) => [...prev, novaTarifa]);
    if (tarifaModalForm.acomodacao && !acomodacoes.some(
      (nome) => normalizeText(nome) === normalizeText(tarifaModalForm.acomodacao.trim())
    )) {
      setAcomodacoes((prev) => [...prev, tarifaModalForm.acomodacao.trim()]);
    }
    setTarifaModalErro(null);
    fecharModalTarifa();
  }
  async function carregarTarifasProduto(produtoId, moedaPadrao, cambioPadrao) {
    if (!produtoId) return;
    try {
      const { data, error } = await supabase.from("produtos_tarifas").select(
        "id, acomodacao, qte_pax, tipo, validade_de, validade_ate, valor_neto, padrao, margem, valor_venda, moeda, cambio, valor_em_reais"
      ).eq("produto_id", produtoId).order("validade_de", { ascending: true });
      if (error) {
        console.error("Erro ao carregar tarifas do produto:", error);
        return;
      }
      const formatos = (data || []).map((tarifa) => ({
        id: tarifa.id,
        acomodacao: tarifa.acomodacao,
        qte_pax: tarifa.qte_pax ?? 0,
        tipo: tarifa.tipo || "",
        validade_de: tarifa.validade_de ? String(tarifa.validade_de).slice(0, 10) : "",
        validade_ate: tarifa.validade_ate ? String(tarifa.validade_ate).slice(0, 10) : "",
        valor_neto: tarifa.valor_neto ?? 0,
        padrao: tarifa.padrao === "Manual" ? "Manual" : "Padrao",
        margem: tarifa.margem ?? null,
        valor_venda: tarifa.valor_venda ?? 0,
        valor_em_reais: tarifa.valor_em_reais ?? 0,
        moeda: tarifa.moeda || moedaPadrao || "USD",
        cambio: tarifa.cambio ?? cambioPadrao
      }));
      setTarifas(formatos);
    } catch (error) {
      console.error("Erro ao carregar tarifas do produto:", error);
    }
  }
  async function sincronizarTarifas(produtoId) {
    if (!produtoId) return;
    const nomesAcomodacoes = Array.from(
      new Set(tarifas.map((tarifa) => tarifa.acomodacao.trim()).filter(Boolean))
    );
    try {
      const { error: deleteError } = await supabase.from("produtos_tarifas").delete().eq("produto_id", produtoId);
      if (deleteError) throw deleteError;
      if (tarifas.length) {
        const payload = tarifas.map(({ id, ...rest }) => ({
          ...rest,
          produto_id: produtoId
        }));
        const { error: insertError } = await supabase.from("produtos_tarifas").insert(payload);
        if (insertError) throw insertError;
      }
      if (nomesAcomodacoes.length) {
        const { error: acomodacoesError } = await supabase.from("acomodacoes").upsert(nomesAcomodacoes.map((nome) => ({ nome })), { onConflict: "nome" });
        if (acomodacoesError) {
          console.error("Erro ao atualizar acomodacoes:", acomodacoesError);
        } else {
          setAcomodacoes((prev) => {
            const existentes = new Set(prev.map((item) => normalizeText(item)));
            const novos = nomesAcomodacoes.filter((nome) => !existentes.has(normalizeText(nome)));
            return novos.length ? [...prev, ...novos] : prev;
          });
        }
      }
    } catch (error) {
      console.error("Erro ao sincronizar tarifas:", error);
      throw error;
    }
  }
  function iniciarNovo() {
    setForm(initialForm);
    setUltimaMoedaAuto(null);
    setUltimoValorAuto("");
    setEditandoId(null);
    setErro(null);
    setCidadeBusca("");
    setMostrarSugestoes(false);
    setModoGlobal(null);
    setTarifas([]);
    setTarifaModalAberta(false);
    setTarifaModalForm(initialTarifaForm);
    setTarifaModalErro(null);
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
      ),
      todas_as_cidades: produto.todas_as_cidades ?? false,
      valor_neto: produto.valor_neto != null ? produto.valor_neto.toFixed(2) : "",
      margem: produto.margem != null ? `${(produto.margem * 100).toFixed(2)}%` : "",
      valor_venda: produto.valor_venda != null ? produto.valor_venda.toFixed(2) : "",
      moeda: produto.moeda || "R$",
      cambio: produto.cambio != null ? produto.cambio.toFixed(2) : "",
      valor_em_reais: formatNumberPtBr(produto.valor_em_reais)
    });
    setTarifas([]);
    setTarifaModalAberta(false);
    setTarifaModalForm(initialTarifaForm);
    setTarifaModalErro(null);
    setUltimaMoedaAuto(null);
    setUltimoValorAuto("");
    setCidadeBusca(
      produto.todas_as_cidades ? "" : formatarCidadeNome(produto.cidade_id) || cidade?.nome || ""
    );
    setMostrarSugestoes(false);
    setMostrarFormulario(true);
    carregarTarifasProduto(produto.id, produto.moeda || "USD", produto.cambio ?? 0);
  }
  function abrirFormularioProduto() {
    iniciarNovo();
    setMostrarFormulario(true);
    setErro(null);
  }
  function fecharFormularioProduto() {
    iniciarNovo();
    setMostrarFormulario(false);
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
    if (!form.todas_as_cidades && !form.cidade_id) {
      setErro("Cidade e obrigatoria quando o produto nao for global.");
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
      const valorNetoNum = parseDecimalInput(form.valor_neto);
      const margemNum = parsePercentInput(form.margem);
      const valorVendaNum = parseDecimalInput(form.valor_venda);
      const cambioNum = parseDecimalInput(form.cambio);
      const valorEmReaisNum = parseDecimalInput(form.valor_em_reais);
      const payload = {
        nome: nomeNormalizado,
        destino: destinoNormalizado,
        cidade_id: form.todas_as_cidades ? null : form.cidade_id,
        tipo_produto: form.tipo_produto,
        atracao_principal: form.atracao_principal.trim() || null,
        melhor_epoca: form.melhor_epoca.trim() || null,
        duracao_sugerida: form.duracao_sugerida.trim() || null,
        nivel_preco: form.nivel_preco.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        informacoes_importantes: form.informacoes_importantes.trim() || null,
        ativo: form.ativo,
        fornecedor_id: form.fornecedor_id || null,
        todas_as_cidades: form.todas_as_cidades,
        valor_neto: valorNetoNum,
        margem: margemNum,
        valor_venda: valorVendaNum,
        moeda: form.moeda.trim() || null,
        cambio: cambioNum,
        valor_em_reais: valorEmReaisNum
      };
      let produtoId = editandoId;
      if (produtoId) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", produtoId);
        if (error) {
          const msg = erroSupabaseMsg(error);
          throw new Error(msg || error.message);
        }
      } else {
        const { data, error } = await supabase.from("produtos").insert(payload).select("id").maybeSingle();
        if (error) {
          const msg = erroSupabaseMsg(error);
          throw new Error(msg || error.message);
        }
        produtoId = data?.id || null;
        if (!produtoId) {
          throw new Error("Não foi possível identificar o produto salvo.");
        }
      }
      await sincronizarTarifas(produtoId);
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
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "form-row",
        style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: "1 1 320px" }, children: [
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
          ] }),
          permissao !== "view" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignItems: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-primary",
              onClick: abrirFormularioProduto,
              disabled: mostrarFormulario,
              children: "Adicionar produto"
            }
          ) })
        ]
      }
    ) }),
    mostrarFormulario && formLayout === "selection" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Todas as cidades" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: () => selecionarAbrangencia(false), children: "Nao" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: () => selecionarAbrangencia(true), children: "Sim" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: 'Escolha "Sim" para cadastrar um produto global; "Nao" abre o formulario completo.' })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 flex flex-wrap gap-2", style: { justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: fecharFormularioProduto, children: "Cancelar" }) })
    ] }),
    mostrarFormulario && formLayout !== "selection" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-blue mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvar, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
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
      ] }) }),
      !isGlobalMode && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12, gap: 12 }, children: [
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
              disabled: permissao === "view" || form.todas_as_cidades,
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
                          "- ",
                          c.pais_nome
                        ] }) : null
                      ]
                    },
                    c.id
                  );
                })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Cidade selecionada pode ajudar a preencher o destino automaticamente." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { width: 220 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Todas as cidades" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "form-select",
              value: form.todas_as_cidades ? "true" : "false",
              onChange: (e) => handleToggleTodasAsCidades(e.target.value === "true"),
              disabled: permissao === "view",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Nao" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Produtos globais ficam disponiveis para qualquer cidade e nao salvam cidade especifica." })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Destino *" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            value: form.destino,
            onChange: (e) => handleChange("destino", e.target.value),
            onBlur: (e) => handleChange("destino", titleCaseWithExceptions(e.target.value)),
            placeholder: isGlobalMode ? "Global" : "Ex: Disney, Porto de Galinhas",
            disabled: permissao === "view" || isGlobalMode
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#64748b" }, children: "Cidade escolhida será aplicada quando o destino estiver vazio." })
      ] }) }),
      isHospedagem && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
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
      isHospedagem && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
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
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
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
                nivelPrecosOptions.map((nivel) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: nivel.value, children: nivel.label }, nivel.value))
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Moeda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              list: "moeda-sugestoes",
              value: form.moeda,
              onChange: (e) => handleChange("moeda", e.target.value),
              disabled: permissao === "view"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("datalist", { id: "moeda-sugestoes", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "R$" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "USD" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "EUR" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor Neto / Moeda Local" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              placeholder: "Ex: 1000",
              value: form.valor_neto,
              onChange: (e) => handleChange("valor_neto", e.target.value),
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Margem" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              placeholder: "Ex: 0.80 (80%)",
              value: form.margem,
              onChange: (e) => handleChange("margem", e.target.value),
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor Venda / Moeda Local" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              value: form.valor_venda,
              readOnly: true,
              placeholder: "Calculado automaticamente"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Câmbio" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              inputMode: "decimal",
              placeholder: "Atualizado automaticamente",
              value: form.cambio,
              onChange: (e) => handleChange("cambio", e.target.value),
              disabled: permissao === "view"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor em R$" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              readOnly: true,
              placeholder: "Calculado automaticamente",
              value: form.valor_em_reais
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 16, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1, gap: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-label", children: "Padrão do Fornecedor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-4 flex-wrap", style: { fontSize: "0.9rem", opacity: 0.85 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Moeda:" }),
            " ",
            form.moeda || "USD",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Margem:" }),
            " ",
            form.margem || "20%",
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Câmbio:" }),
            " ",
            form.cambio || "5,00"
          ] })
        ] }),
        isHospedagem && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-group", style: { alignItems: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: abrirModalTarifa,
            disabled: permissao === "view",
            children: "Adicionar Tarifa"
          }
        ) })
      ] }),
      isHospedagem && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[1080px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Acomodação" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Pax" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "De" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Até" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor Neto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Padrão" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Margem" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor Venda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor em R$" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: tarifas.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 11, children: "Nenhuma tarifa cadastrada." }) }) : tarifas.map((tarifa) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: tarifa.acomodacao }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: tarifa.qte_pax }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: tarifa.validade_de }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: tarifa.validade_ate }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: tarifa.tipo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatValorComMoeda(tarifa.valor_neto, tarifa.moeda) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: tarifa.padrao }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatMarginPercent(tarifa.margem) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatValorComMoeda(tarifa.valor_venda, tarifa.moeda) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatValorComMoeda(tarifa.valor_em_reais, "R$") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: () => removerTarifa(tarifa.id),
              children: "Remover"
            }
          ) })
        ] }, tarifa.id)) })
      ] }) }) }),
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mt-2 flex flex-wrap gap-2", style: { justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: salvando, children: salvando ? "Salvando..." : editandoId ? "Salvar alteracoes" : "Salvar produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: fecharFormularioProduto, disabled: salvando, children: "Cancelar" })
      ] }),
      tarifaModalAberta && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-backdrop", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-panel", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: salvarTarifaModal, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Adicionar tarifa" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: fecharModalTarifa, children: "Fechar" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
          tarifaModalErro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#dc2626", marginBottom: 8 }, children: tarifaModalErro }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Validade De" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "date",
                  className: "form-input",
                  value: tarifaModalForm.validade_de,
                  onChange: (e) => handleTarifaModalChange("validade_de", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Validade Até" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "date",
                  className: "form-input",
                  value: tarifaModalForm.validade_ate,
                  onChange: (e) => handleTarifaModalChange("validade_ate", e.target.value)
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Acomodação" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  list: "acomodacoes-list",
                  value: tarifaModalForm.acomodacao,
                  onChange: (e) => handleTarifaModalChange("acomodacao", e.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "acomodacoes-list", children: acomodacoes.map((nome) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: nome }, nome)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { width: 120 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Qte Pax" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "number",
                  min: 1,
                  className: "form-input",
                  value: tarifaModalForm.qte_pax,
                  onChange: (e) => handleTarifaModalChange("qte_pax", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  list: "tipo-tarifa-list",
                  value: tarifaModalForm.tipo,
                  onChange: (e) => handleTarifaModalChange("tipo", e.target.value)
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "tipo-tarifa-list", children: ["diária", "pacote"].map((tipo) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: tipo }, tipo)) })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "form-label", children: [
                "Valor Neto (",
                tarifaMoeda,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  className: "form-input",
                  placeholder: "Ex: 1000",
                  value: tarifaModalForm.valor_neto,
                  onChange: (e) => handleTarifaModalChange("valor_neto", e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { width: 180 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Padrão" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: tarifaModalForm.padrao,
                  onChange: (e) => handleTarifaModalChange("padrao", e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Padrao", children: "Padrão" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "Manual", children: "Manual" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Margem" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  className: "form-input",
                  placeholder: "Ex: 25%",
                  value: tarifaModalForm.margem,
                  onChange: (e) => handleTarifaModalChange("margem", e.target.value),
                  disabled: tarifaModalForm.padrao !== "Manual"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { marginTop: 12, gap: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "form-label", children: [
                "Valor Venda (",
                tarifaMoeda,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  className: "form-input",
                  value: tarifaValorVendaNum != null ? formatValorComMoeda(tarifaValorVendaNum, tarifaMoeda) : "",
                  readOnly: true
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor em R$" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "text",
                  className: "form-input",
                  value: formatValorComMoeda(tarifaValorEmReaisPreview, "R$"),
                  readOnly: true
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-footer", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: fecharModalTarifa, children: "Cancelar" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: permissao === "view", children: "Salvar tarifa" })
        ] })
      ] }) }) })
    ] }) }),
    "      ",
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: erro }) }),
    !carregouTodos && !erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: "Ultimos Produtos Cadastrados (10). Digite na busca para consultar todos." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue min-w-[1080px]", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Produto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cidade" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Fornecedor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nivel de preco" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor Neto" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Margem" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor Venda" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Câmbio" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor em R$" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Acoes" })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 13, children: "Carregando produtos..." }) }),
        !loading && produtosFiltrados.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 13, children: "Nenhum produto encontrado." }) }),
        !loading && produtosFiltrados.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.nome }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.destino || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.cidade_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.fornecedor_nome || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: nivelPrecoLabel(p.nivel_preco) || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatValorComMoeda(p.valor_neto, p.moeda || void 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatMarginPercent(p.margem) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatValorComMoeda(p.valor_venda, p.moeda || void 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatDecimal(p.cambio) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatValorComMoeda(p.valor_em_reais, "R$") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.ativo ? "Sim" : "Nao" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "action-buttons", children: [
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
          ] }) })
        ] }, p.id))
      ] })
    ] }) })
  ] });
}

export { ProdutosIsland as P };
