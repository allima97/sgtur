import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Pais = { id: string; nome: string };
type Subdivisao = { id: string; nome: string; pais_id: string };
type Cidade = { id: string; nome: string; subdivisao_id: string };
type TipoProduto = { id: string; nome: string | null; tipo: string };

type CidadeBusca = {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  populacao: number | null;
  subdivisao_nome: string | null;
  pais_nome: string | null;
  subdivisao_id?: string | null;
};

const nivelPrecosOptions = [
  { value: "Economico", label: "Econômico" },
  { value: "Intermediario", label: "Intermediário" },
  { value: "Variavel", label: "Variável" },
  { value: "Premium", label: "Premium" },
  { value: "Super Premium", label: "Super Premium" },
];

const HOSPITALITY_KEYWORDS = new Set(["hotel", "pousada", "resort"]);

function nivelPrecoLabel(value?: string | null) {
  if (!value) return "";
  const normalizedValue = normalizeText(value);
  const match = nivelPrecosOptions.find(
    (nivel) =>
      normalizeText(nivel.value) === normalizedValue ||
      normalizeText(nivel.label) === normalizedValue
  );
  return match ? match.label : value;
}

function ehTipoHospedagem(tipo?: TipoProduto | null) {
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

function normalizeNumericInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const allowed = trimmed.replace(/[^\d.,-]/g, "");
  if (!allowed) return null;

  const hasComma = allowed.includes(",");
  const hasDot = allowed.includes(".");

  let normalized = allowed;

  if ((hasComma && hasDot) || (hasComma && !hasDot)) {
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

function parseDecimalInput(value?: string | null) {
  if (!value) return null;
  const num = normalizeNumericInput(value);
  return num;
}

function parsePercentInput(value?: string | null) {
  if (!value) return null;
  const cleaned = value.replace("%", "").trim();
  const num = parseDecimalInput(cleaned);
  if (num == null) return null;
  if (num > 1) {
    return num / 100;
  }
  return num;
}

function formatMarginPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function calcularValorVendaString(valorNeto?: string, margem?: string) {
  const net = parseDecimalInput(valorNeto);
  const margin = parsePercentInput(margem);
  if (net == null || margin == null) return "";
  if (margin >= 1) return "";
  const sale = net / (1 - margin);
  if (!Number.isFinite(sale)) return "";
  return sale.toFixed(2);
}

function formatValorComMoeda(value?: number | null, moeda?: string) {
  if (value == null || Number.isNaN(value)) return "-";
  const formatted = value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${moeda || "R$"} ${formatted}`;
}

function formatDecimal(value?: number | null, digits = 4) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Math.min(2, digits),
    maximumFractionDigits: digits,
  });
}

function formatNumberPtBr(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Produto = {
  id: string;
  nome: string;
  destino: string | null;
  cidade_id: string | null;
  tipo_produto: string | null;
  informacoes_importantes: string | null;
  atracao_principal: string | null;
  melhor_epoca: string | null;
  duracao_sugerida: string | null;
  nivel_preco: string | null;
  imagem_url: string | null;
  ativo: boolean | null;
  fornecedor_id?: string | null;
  created_at: string | null;
  todas_as_cidades: boolean;
  valor_neto?: number | null;
  margem?: number | null;
  valor_venda?: number | null;
  moeda?: string | null;
  cambio?: number | null;
  valor_em_reais?: number | null;
};

type FornecedorOption = { id: string; nome_completo: string | null; nome_fantasia: string | null };

function formatFornecedorLabel(fornecedor: FornecedorOption | null | undefined) {
  if (!fornecedor) return "";
  return (fornecedor.nome_fantasia?.trim() || fornecedor.nome_completo?.trim() || "").trim();
}

type FormState = {
  nome: string;
  destino: string;
  cidade_id: string;
  tipo_produto: string;
  atracao_principal: string;
  melhor_epoca: string;
  duracao_sugerida: string;
  nivel_preco: string;
  imagem_url: string;
  informacoes_importantes: string;
  ativo: boolean;
  fornecedor_id: string;
  fornecedor_label: string;
  todas_as_cidades: boolean;
};


type TarifaEntry = {
  id: string;
  acomodacao: string;
  qte_pax: number;
  tipo: string;
  validade_de: string;
  validade_ate: string;
  valor_neto: number;
  padrao: "Manual" | "Padrao";
  margem: number | null;
  valor_venda: number;
  valor_em_reais: number;
  moeda: string;
  cambio: number;
};

type TarifaFormState = {
  acomodacao: string;
  qte_pax: string;
  tipo: string;
  validade_de: string;
  validade_ate: string;
  valor_neto: string;
  padrao: "Manual" | "Padrao";
  margem: string;
};

type CambioParametro = {
  moeda: string;
  data: string;
  valor: number | null;
};

const initialForm: FormState = {
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
};

const DEFAULT_TARIFA_MOEDA = "USD";
const DEFAULT_TARIFA_MARGEM = "20%";

const initialTarifaForm: TarifaFormState = {
  acomodacao: "",
  qte_pax: "",
  tipo: "",
  validade_de: "",
  validade_ate: "",
  valor_neto: "",
  padrao: "Padrao",
  margem: "",
};

export default function ProdutosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");

  const [paises, setPaises] = useState<Pais[]>([]);
  const [subdivisoes, setSubdivisoes] = useState<Subdivisao[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busca, setBusca] = useState("");
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [resultadosCidade, setResultadosCidade] = useState<CidadeBusca[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroCidadeBusca, setErroCidadeBusca] = useState<string | null>(null);
  const [carregouTodos, setCarregouTodos] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [fornecedoresLista, setFornecedoresLista] = useState<FornecedorOption[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [modoGlobal, setModoGlobal] = useState<boolean | null>(null);
  const [tarifas, setTarifas] = useState<TarifaEntry[]>([]);
  const [tarifaModalAberta, setTarifaModalAberta] = useState(false);
  const [tarifaModalForm, setTarifaModalForm] = useState<TarifaFormState>(initialTarifaForm);
  const [tarifaModalErro, setTarifaModalErro] = useState<string | null>(null);
  const [acomodacoes, setAcomodacoes] = useState<string[]>([]);
  const [cambiosParametros, setCambiosParametros] = useState<CambioParametro[]>([]);

  async function carregarDados(todos = false) {
    const erros: string[] = [];
    const detalhesErro: string[] = [];
    setLoading(true);
    setErro(null);

    try {
      const [
        { data: paisData, error: paisErr },
        { data: subdivisaoData, error: subErr },
        tipoResp,
        produtosResp,
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("subdivisoes").select("id, nome, pais_id").order("nome"),
        supabase
          .from("tipo_produtos")
          .select("id, nome, tipo")
          .eq("ativo", true)
          .order("nome")
          .then(async (res) => {
            if (res.error) {
              detalhesErro.push(`tipo_produtos: ${res.error.message}`);
              console.warn("Fallback tipo_produtos por 'tipo':", res.error);
              const fallback = await supabase.from("tipo_produtos").select("id, nome, tipo").order("tipo");
              return fallback;
            }
            return res;
          }),
        supabase
          .from("produtos")
          .select(
            "id, nome, destino, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, fornecedor_id, created_at, todas_as_cidades"
          )
          .order(todos ? "nome" : "created_at", { ascending: todos ? true : false })
          .limit(todos ? undefined : 10),
      ]);

      if (paisErr) {
        erros.push("paises");
        if (paisErr.message) detalhesErro.push(`paises: ${paisErr.message}`);
      } else {
        setPaises((paisData || []) as Pais[]);
      }

      const baseSubdivisoes = (subdivisaoData || []) as Subdivisao[];

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
        const listaTipos = (tipoResp.data || []) as TipoProduto[];
        if (listaTipos.length === 0) {
          // fallback sem filtro de ativo para evitar lista vazia
          const { data: tiposAll, error: tiposAllErr } = await supabase
            .from("tipo_produtos")
            .select("id, nome, tipo")
            .order("nome");
          if (tiposAllErr) {
            erros.push("tipo_produtos");
            detalhesErro.push(`tipo_produtos (fallback): ${tiposAllErr.message}`);
          } else {
            setTipos((tiposAll || []) as TipoProduto[]);
          }
        } else {
          setTipos(listaTipos);
        }
      }

      if (produtosResp.error) {
        erros.push("produtos");
        if (produtosResp.error.message) detalhesErro.push(`produtos: ${produtosResp.error.message}`);
      } else {
        const produtoData = (produtosResp.data || []) as Produto[];
        setProdutos(produtoData);
        setCarregouTodos(todos);

        // Busca apenas as cidades referenciadas nos produtos (economiza e evita falhas maiores)
        const idsCidade = Array.from(new Set(produtoData.map((p) => p.cidade_id).filter(Boolean)));
        if (idsCidade.length) {
          const { data: cidadesData, error: cidadesErr } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_id, subdivisoes (id, nome, pais_id)")
            .in("id", idsCidade);
          if (cidadesErr) {
            erros.push("cidades");
            if (cidadesErr.message) detalhesErro.push(`cidades: ${cidadesErr.message}`);
          } else {
            const cidadesLista = (cidadesData || []) as Cidade[];
            setCidades(cidadesLista);

            // Garante que as subdivisoes usadas pelas cidades estejam carregadas
            const idsSubdiv = Array.from(new Set(cidadesLista.map((c) => c.subdivisao_id).filter(Boolean)));
            if (idsSubdiv.length) {
              const jaCarregadas = new Set(baseSubdivisoes.map((s) => s.id));
              const faltantes = idsSubdiv.filter((id) => !jaCarregadas.has(id));
              if (faltantes.length) {
                const { data: subsExtra, error: subsExtraErr } = await supabase
                  .from("subdivisoes")
                  .select("id, nome, pais_id")
                  .in("id", faltantes);
                if (subsExtraErr) {
                  erros.push("subdivisoes");
                  if (subsExtraErr.message) detalhesErro.push(`subdivisoes (faltantes): ${subsExtraErr.message}`);
                } else if (subsExtra?.length) {
                  setSubdivisoes((prev) => {
                    const existente = new Map(prev.map((s) => [s.id, s]));
                    subsExtra.forEach((s) => existente.set(s.id, s as any));
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
    } catch (e: any) {
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

  useEffect(() => {
    carregarDados(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user =
          sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !isMounted) return;

        const { data, error } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();
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

  useEffect(() => {
    if (!companyId) {
      setFornecedoresLista([]);
      return;
    }

    let isActive = true;

    async function carregarFornecedores() {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome_completo, nome_fantasia")
        .eq("company_id", companyId)
        .order("nome_fantasia", { ascending: true });
      if (!isActive) return;
      if (error) {
        console.error("Erro ao carregar fornecedores:", error);
        return;
      }
      setFornecedoresLista((data || []) as FornecedorOption[]);
    }

    carregarFornecedores();

    return () => {
      isActive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setAcomodacoes([]);
      return;
    }

    let isActive = true;

    async function carregarAcomodacoes() {
      const { data, error } = await supabase
        .from("acomodacoes")
        .select("nome")
        .order("nome");
      if (!isActive) return;
      if (error) {
        console.error("Erro ao carregar acomodacoes:", error);
        return;
      }
      const lista = (data || [])
        .map((item: any) => (item?.nome || "").toString().trim())
        .filter(Boolean);
      setAcomodacoes(lista);
    }

    carregarAcomodacoes();

    return () => {
      isActive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      setCambiosParametros([]);
      return;
    }

    let isActive = true;

    async function carregarCambios() {
      const { data, error } = await supabase
        .from("parametros_cambios")
        .select("moeda, data, valor")
        .eq("company_id", companyId)
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (!isActive) return;
      if (error) {
        console.error("Erro ao carregar câmbios:", error);
        return;
      }
      setCambiosParametros((data || []) as CambioParametro[]);
    }

    carregarCambios();

    return () => {
      isActive = false;
    };
  }, [companyId]);

  useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarDados(true);
    }
  }, [busca, carregouTodos]);

  const subdivisaoMap = useMemo(() => new Map(subdivisoes.map((s) => [s.id, s])), [subdivisoes]);

  function formatarCidadeNome(cidadeId?: string | null) {
    if (!cidadeId) return "";
    const cidade = cidades.find((c) => c.id === cidadeId);
    if (!cidade) return "";
    const subdivisao = subdivisaoMap.get(cidade.subdivisao_id);
    return subdivisao ? `${cidade.nome} (${subdivisao.nome})` : cidade.nome;
  }

  function tipoLabel(t?: TipoProduto | null) {
    if (!t) return "";
    return (t.nome || "").trim() || t.tipo || "";
  }

  const produtosEnriquecidos = useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    const tipoMap = new Map(tipos.map((t) => [t.id, t]));

    return produtos.map((p) => {
      const cidade = p.todas_as_cidades ? null : cidadeMap.get(p.cidade_id || "");
      const subdivisao =
        cidade ? subdivisaoMap.get(cidade.subdivisao_id) || (cidade as any).subdivisoes : undefined;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : undefined;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : undefined;

      return {
        ...p,
        cidade_nome: p.todas_as_cidades ? "Todas as cidades" : cidade?.nome || "",
        subdivisao_nome: subdivisao?.nome || "",
        pais_nome: pais?.nome || "",
        tipo_nome: tipoLabel(tipo),
      };
    });
  }, [produtos, cidades, subdivisoes, paises, tipos]);

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtosEnriquecidos;
    const termo = normalizeText(busca);
    return produtosEnriquecidos.filter(
      (p) =>
        normalizeText(p.nome).includes(termo) ||
        normalizeText(p.cidade_nome).includes(termo) ||
        normalizeText(p.subdivisao_nome).includes(termo) ||
        normalizeText(p.pais_nome).includes(termo) ||
        normalizeText(p.tipo_nome).includes(termo) ||
        normalizeText(p.destino || "").includes(termo)
    );
  }, [busca, produtosEnriquecidos]);

  const cambioAtualPorMoeda = useMemo(() => {
    const mapa: Record<string, { valor: number; data: string }> = {};
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

  const tipoSelecionado = useMemo(
    () => (form.tipo_produto ? tipos.find((t) => t.id === form.tipo_produto) || null : null),
    [form.tipo_produto, tipos]
  );
  const isHospedagem = ehTipoHospedagem(tipoSelecionado);
  const tarifaMoeda = DEFAULT_TARIFA_MOEDA;
  const tarifaMargemPreview =
    tarifaModalForm.padrao === "Manual" ? tarifaModalForm.margem || "" : DEFAULT_TARIFA_MARGEM;
  const tarifaValorVendaPreview = calcularValorVendaString(tarifaModalForm.valor_neto, tarifaMargemPreview);
  const tarifaValorVendaNum = parseDecimalInput(tarifaValorVendaPreview);
  const tarifaCambioAtual = cambioAtualPorMoeda[tarifaMoeda]?.valor ?? 0;
  const tarifaValorEmReaisPreview =
    tarifaValorVendaNum != null ? tarifaValorVendaNum * tarifaCambioAtual : 0;
  const tarifaCambioLabel = tarifaCambioAtual ? formatDecimal(tarifaCambioAtual) : "-";

  const estaEditando = Boolean(editandoId);
  const formLayout = estaEditando
    ? "full"
    : modoGlobal === null
    ? "selection"
    : modoGlobal
    ? "global"
    : "full";
  const isGlobalMode = formLayout === "global";

  const handleChange = useCallback(
    <K extends keyof FormState>(campo: K, valor: FormState[K]) => {
      setForm((prev) => ({ ...prev, [campo]: valor }));
    },
    []
  );

  function handleCidadeBusca(valor: string) {
    if (form.todas_as_cidades) return;
    setCidadeBusca(valor);
    const cidadeAtual = cidades.find((c) => c.id === form.cidade_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
      setForm((prev) => ({ ...prev, cidade_id: "" }));
    }
    setMostrarSugestoes(true);
  }

  function handleToggleTodasAsCidades(valor: boolean) {
    handleChange("todas_as_cidades", valor);
    if (valor) {
      handleChange("cidade_id", "");
      setCidadeBusca("");
      setMostrarSugestoes(false);
      setResultadosCidade([]);
    }
  }

  function selecionarAbrangencia(valor: boolean) {
    setModoGlobal(valor);
    handleToggleTodasAsCidades(valor);
    if (valor) {
      handleChange("destino", titleCaseWithExceptions("Global"));
    } else {
      handleChange("destino", "");
    }
  }

  function handleFornecedorInput(valor: string) {
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

  const handleTarifaModalChange = useCallback(
    (campo: keyof TarifaFormState, valor: string) => {
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

  function removerTarifa(id: string) {
    setTarifas((prev) => prev.filter((tarifa) => tarifa.id !== id));
  }

  async function salvarTarifaModal(e: React.FormEvent) {
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

    const margemPadrao =
      tarifaModalForm.padrao === "Manual" ? tarifaModalForm.margem || "" : DEFAULT_TARIFA_MARGEM;
    const valorVendaStr = calcularValorVendaString(tarifaModalForm.valor_neto, margemPadrao);
    const valorVendaNum = parseDecimalInput(valorVendaStr);
    if (valorVendaNum == null) {
      setTarifaModalErro("Não foi possível calcular o valor de venda.");
      return;
    }

    const margemNum = parsePercentInput(margemPadrao);
    const cambioNum = tarifaCambioAtual;
    const valorEmReaisNum = valorVendaNum * (cambioNum || 0);

    const novaTarifa: TarifaEntry = {
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
      moeda: tarifaMoeda,
      cambio: cambioNum,
    };
    setTarifas((prev) => [...prev, novaTarifa]);
    if (
      tarifaModalForm.acomodacao &&
      !acomodacoes.some(
        (nome) => normalizeText(nome) === normalizeText(tarifaModalForm.acomodacao.trim())
      )
    ) {
      setAcomodacoes((prev) => [...prev, tarifaModalForm.acomodacao.trim()]);
    }
    setTarifaModalErro(null);
    fecharModalTarifa();
  }

  async function carregarTarifasProduto(produtoId: string, moedaPadrao: string, cambioPadrao: number) {
    if (!produtoId) return;
    try {
      const { data, error } = await supabase
        .from("produtos_tarifas")
        .select(
          "id, acomodacao, qte_pax, tipo, validade_de, validade_ate, valor_neto, padrao, margem, valor_venda, moeda, cambio, valor_em_reais"
        )
        .eq("produto_id", produtoId)
        .order("validade_de", { ascending: true });
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
        cambio: tarifa.cambio ?? cambioPadrao,
      }));
      setTarifas(formatos);
    } catch (error) {
      console.error("Erro ao carregar tarifas do produto:", error);
    }
  }

  async function sincronizarTarifas(produtoId: string) {
    if (!produtoId) return;
    const nomesAcomodacoes = Array.from(
      new Set(tarifas.map((tarifa) => tarifa.acomodacao.trim()).filter(Boolean))
    );
    try {
      const { error: deleteError } = await supabase
        .from("produtos_tarifas")
        .delete()
        .eq("produto_id", produtoId);
      if (deleteError) throw deleteError;

      if (tarifas.length) {
        const payload = tarifas.map(({ id, ...rest }) => ({
          ...rest,
          produto_id: produtoId,
        }));
        const { error: insertError } = await supabase.from("produtos_tarifas").insert(payload);
        if (insertError) throw insertError;
      }

      if (nomesAcomodacoes.length) {
        const { error: acomodacoesError } = await supabase
          .from("acomodacoes")
          .upsert(nomesAcomodacoes.map((nome) => ({ nome })), { onConflict: "nome" });
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

  function iniciarEdicao(produto: Produto & { cidade_nome?: string }) {
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
    });
    setTarifas([]);
    setTarifaModalAberta(false);
    setTarifaModalForm(initialTarifaForm);
    setTarifaModalErro(null);
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

  useEffect(() => {
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
            const { data: dataFallback, error: errorFallback } = await supabase
              .from("cidades")
              .select("id, nome, subdivisao_id")
              .ilike("nome", `%${cidadeBusca.trim()}%`)
              .order("nome");
            if (errorFallback) {
              console.error("Erro no fallback de cidades:", errorFallback);
              setErroCidadeBusca("Erro ao buscar cidades.");
            } else {
              setResultadosCidade((dataFallback as CidadeBusca[]) || []);
              setErroCidadeBusca(null);
            }
          } else {
            setResultadosCidade((data as CidadeBusca[]) || []);
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

  async function salvar(e: React.FormEvent) {
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

      const erroSupabaseMsg = (err: any) => {
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
      };

      let produtoId = editandoId;
      if (produtoId) {
        const { error } = await supabase.from("produtos").update(payload).eq("id", produtoId);
        if (error) {
          const msg = erroSupabaseMsg(error);
          throw new Error(msg || error.message);
        }
      } else {
        const { data, error } = await supabase
          .from("produtos")
          .insert(payload)
          .select("id")
          .maybeSingle();
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
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || e?.error?.message || "";
      setErro(`Erro ao salvar produto.${msg ? ` Detalhes: ${msg}` : ""}`);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
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

  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!ativo) return <div>Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="destinos-page">
      <div className="card-base mb-3">
        <div
          className="form-row"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ flex: "1 1 320px" }}>
            <label className="form-label">Buscar produto</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque por nome, tipo, destino, cidade, estado/província ou país"
            />
          </div>
          {permissao !== "view" && (
            <div className="form-group" style={{ alignItems: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={abrirFormularioProduto}
                disabled={mostrarFormulario}
              >
                Adicionar produto
              </button>
            </div>
          )}
        </div>
      </div>

      {mostrarFormulario && formLayout === "selection" && (
        <div className="card-base card-blue mb-3">
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Todas as cidades</label>
              <div className="flex gap-2">
                <button type="button" className="btn btn-light" onClick={() => selecionarAbrangencia(false)}>
                  Nao
                </button>
                <button type="button" className="btn btn-primary" onClick={() => selecionarAbrangencia(true)}>
                  Sim
                </button>
              </div>
              <small style={{ color: "#64748b" }}>
                Escolha "Sim" para cadastrar um produto global; "Nao" abre o formulario completo.
              </small>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-light" onClick={fecharFormularioProduto}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mostrarFormulario && formLayout !== "selection" && (

        <div className="card-base card-blue mb-3">

          <form onSubmit={salvar}>

            <div className="form-row" style={{ marginTop: 12, gap: 12, flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: "0 1 220px", minWidth: 180 }}>
                <label className="form-label">Tipo *</label>
                <select
                  className="form-select"
                  value={form.tipo_produto}
                  onChange={(e) => handleChange("tipo_produto", e.target.value)}
                  disabled={permissao === "view"}
                >
                  <option value="">Selecione o tipo</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {tipoLabel(t) || "(sem nome)"}
                    </option>
                  ))}
                </select>
              </div>
              {!isGlobalMode && (
                <div className="form-group" style={{ flex: "1 1 260px", minWidth: 220 }}>
                  <label className="form-label">Cidade *</label>
                  <input
                    className="form-input"
                    placeholder="Digite o nome da cidade"
                    value={cidadeBusca}
                    onChange={(e) => handleCidadeBusca(e.target.value)}
                    onFocus={() => setMostrarSugestoes(true)}
                    onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                    disabled={permissao === "view" || form.todas_as_cidades}
                    style={{ marginBottom: 6 }}
                    title="Cidade selecionada pode ajudar a preencher o destino automaticamente."
                  />
                  {buscandoCidade && <div style={{ fontSize: 12, color: "#6b7280" }}>Buscando...</div>}
                  {erroCidadeBusca && !buscandoCidade && (
                    <div style={{ fontSize: 12, color: "#dc2626" }}>{erroCidadeBusca}</div>
                  )}
                  {mostrarSugestoes && (
                    <div
                      className="card-base"
                      style={{
                        marginTop: 4,
                        maxHeight: 180,
                        overflowY: "auto",
                        padding: 6,
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {resultadosCidade.length === 0 && !buscandoCidade && (
                        <div style={{ padding: "4px 6px", color: "#6b7280" }}>Nenhuma cidade encontrada.</div>
                      )}
                      {resultadosCidade.map((c) => {
                        const label = c.subdivisao_nome ? `${c.nome} (${c.subdivisao_nome})` : c.nome;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className="btn btn-light"
                            style={{
                              width: "100%",
                              justifyContent: "flex-start",
                              marginBottom: 4,
                              background: form.cidade_id === c.id ? "#e0f2fe" : "#fff",
                              borderColor: form.cidade_id === c.id ? "#38bdf8" : "#e5e7eb",
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleChange("cidade_id", c.id);
                              setCidadeBusca(label);
                              setMostrarSugestoes(false);
                              setResultadosCidade([]);
                            }}
                          >
                            {label}
                            {c.pais_nome ? <span style={{ color: "#6b7280", marginLeft: 6 }}>- {c.pais_nome}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
              )}
              <div className="form-group" style={{ flex: "1 1 240px", minWidth: 220 }}>
                <label className="form-label">Nome do produto *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  placeholder="Ex: Passeio em Gramado, Pacote Paris..."
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group" style={{ flex: "1 1 240px", minWidth: 220 }}>
                <label className="form-label">Fornecedor (opcional)</label>
                <input
                  className="form-input"
                  list="fornecedores-list"
                  placeholder="Escolha um fornecedor"
                  value={form.fornecedor_label}
                  onChange={(e) => handleFornecedorInput(e.target.value)}
                  disabled={permissao === "view"}
                />
                <datalist id="fornecedores-list">
                  {fornecedoresLista.map((fornecedor) => (
                    <option key={fornecedor.id} value={formatFornecedorLabel(fornecedor)} />
                  ))}
                </datalist>
              </div>
              <div className="form-group" style={{ flex: "1 1 260px", minWidth: 220 }}>
                <label className="form-label">Destino *</label>
                <input
                  className="form-input"
                  value={form.destino}
                  onChange={(e) => handleChange("destino", e.target.value)}
                  onBlur={(e) => handleChange("destino", titleCaseWithExceptions(e.target.value))}
                  placeholder={isGlobalMode ? "Global" : "Ex: Disney, Porto de Galinhas"}
                  disabled={permissao === "view" || isGlobalMode}
                  title="Cidade escolhida será aplicada quando o destino estiver vazio."
                />
              </div>
            </div>
            {!isGlobalMode && form.todas_as_cidades && (
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group" style={{ width: 220 }}>
                  <label className="form-label">Todas as cidades</label>
                  <select
                    className="form-select"
                    value={form.todas_as_cidades ? "true" : "false"}
                    onChange={(e) => handleToggleTodasAsCidades(e.target.value === "true")}
                    disabled={permissao === "view"}
                  >
                    <option value="false">Nao</option>
                    <option value="true">Sim</option>
                  </select>
                  <small style={{ color: "#64748b" }}>
                    Produtos globais ficam disponiveis para qualquer cidade e nao salvam cidade especifica.
                  </small>
                </div>
              </div>
            )}
            {isHospedagem && (
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Atracao principal</label>
                  <input

                    className="form-input"

                    value={form.atracao_principal}

                    onChange={(e) => handleChange("atracao_principal", e.target.value)}

                    placeholder="Ex: Disney, Torre Eiffel..."

                    disabled={permissao === "view"}

                  />

                </div>

                <div className="form-group">

                  <label className="form-label">Melhor epoca</label>

                  <input

                    className="form-input"

                    value={form.melhor_epoca}

                    onChange={(e) => handleChange("melhor_epoca", e.target.value)}

                    placeholder="Ex: Dezembro a Marco"

                    disabled={permissao === "view"}

                  />

                </div>

              </div>

            )}

            {isHospedagem && (
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label">Duracao sugerida</label>
                  <select
                    className="form-select"
                    value={form.duracao_sugerida}
                    onChange={(e) => handleChange("duracao_sugerida", e.target.value)}
                    disabled={permissao === "view"}
                  >
                    <option value="">Selecione</option>
                    <option value="De 1 a 3 dias">De 1 a 3 dias</option>
                    <option value="De 3 a 5 dias">De 3 a 5 dias</option>
                    <option value="De 5 a 7 dias">De 5 a 7 dias</option>
                    <option value="De 7 a 10 dias">De 7 a 10 dias</option>
                    <option value="10 dias ou mais">10 dias ou mais</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Nivel de preco</label>
                  <select
                    className="form-select"
                    value={form.nivel_preco}
                    onChange={(e) => handleChange("nivel_preco", e.target.value)}
                    disabled={permissao === "view"}
                  >
                    <option value="">Selecione</option>
                    {nivelPrecosOptions.map((nivel) => (
                      <option key={nivel.value} value={nivel.value}>
                        {nivel.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Imagem (URL)</label>
                  <input
                    className="form-input"
                    value={form.imagem_url}
                    onChange={(e) => handleChange("imagem_url", e.target.value)}
                    placeholder="URL de uma imagem do destino"
                    disabled={permissao === "view"}
                  />
                </div>
              </div>
            )}
            <div className="form-row" style={{ marginTop: 16, alignItems: "center" }}>
              <div className="form-group" style={{ flex: 1, gap: 4 }}>
                <div className="form-label">Padrão do Fornecedor</div>
                <div className="flex gap-4 flex-wrap" style={{ fontSize: "0.9rem", opacity: 0.85 }}>
                  <strong>Moeda:</strong> {tarifaMoeda}
                  <strong>Margem:</strong> {DEFAULT_TARIFA_MARGEM}
                  <strong>Câmbio:</strong> {tarifaCambioLabel}
                </div>
              </div>
              {isHospedagem && (
                <div className="form-group" style={{ alignItems: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={abrirModalTarifa}
                    disabled={permissao === "view"}
                  >
                    Adicionar Tarifa
                  </button>
                </div>
              )}
            </div>
            {isHospedagem && (
              <div className="form-row" style={{ marginTop: 12 }}>
                <div className="table-container overflow-x-auto">
                  <table className="table-default table-header-blue min-w-[1080px]">
                    <thead>
                      <tr>
                        <th>Acomodação</th>
                        <th>Pax</th>
                        <th>De</th>
                        <th>Até</th>
                        <th>Tipo</th>
                        <th>Valor Neto</th>
                        <th>Padrão</th>
                        <th>Margem</th>
                        <th>Valor Venda</th>
                        <th>Valor em R$</th>
                        <th className="th-actions">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tarifas.length === 0 ? (
                        <tr>
                          <td colSpan={11}>Nenhuma tarifa cadastrada.</td>
                        </tr>
                      ) : (
                        tarifas.map((tarifa) => (
                          <tr key={tarifa.id}>
                            <td>{tarifa.acomodacao}</td>
                            <td>{tarifa.qte_pax}</td>
                            <td>{tarifa.validade_de}</td>
                            <td>{tarifa.validade_ate}</td>
                            <td>{tarifa.tipo}</td>
                            <td>{formatValorComMoeda(tarifa.valor_neto, tarifa.moeda)}</td>
                            <td>{tarifa.padrao}</td>
                            <td>{formatMarginPercent(tarifa.margem)}</td>
                            <td>{formatValorComMoeda(tarifa.valor_venda, tarifa.moeda)}</td>
                            <td>{formatValorComMoeda(tarifa.valor_em_reais, "R$")}</td>
                            <td className="th-actions">
                              <button
                                type="button"
                                className="btn btn-light"
                                onClick={() => removerTarifa(tarifa.id)}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Informacoes importantes</label>
              <textarea

                className="form-input"

                rows={3}

                value={form.informacoes_importantes}

                onChange={(e) => handleChange("informacoes_importantes", e.target.value)}

                placeholder="Observacoes gerais, dicas, documentacao necessaria, etc."

                disabled={permissao === "view"}

              />

            </div>

            <div className="form-group" style={{ marginTop: 12 }}>

              <label className="form-label">Ativo</label>

              <select

                className="form-select"

                value={form.ativo ? "true" : "false"}

                onChange={(e) => handleChange("ativo", e.target.value === "true")}

                disabled={permissao === "view"}

              >

                <option value="true">Sim</option>

                <option value="false">Nao</option>

              </select>

            </div>

            <div className="mt-2 flex flex-wrap gap-2" style={{ justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alteracoes" : "Salvar produto"}
              </button>
              <button type="button" className="btn btn-light" onClick={fecharFormularioProduto} disabled={salvando}>
                Cancelar
              </button>
            </div>
            {tarifaModalAberta && (
              <div className="modal-backdrop">
                <div className="modal-panel">
                  <form onSubmit={salvarTarifaModal}>
                    <div className="modal-header">
                      <h3>Adicionar tarifa</h3>
                      <button type="button" className="btn btn-light" onClick={fecharModalTarifa}>
                        Fechar
                      </button>
                    </div>
                    <div className="modal-body">
                      {tarifaModalErro && (
                        <div style={{ color: "#dc2626", marginBottom: 8 }}>{tarifaModalErro}</div>
                      )}
                      <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Validade De</label>
                          <input
                            type="date"
                            className="form-input"
                            value={tarifaModalForm.validade_de}
                            onChange={(e) => handleTarifaModalChange("validade_de", e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Validade Até</label>
                          <input
                            type="date"
                            className="form-input"
                            value={tarifaModalForm.validade_ate}
                            onChange={(e) => handleTarifaModalChange("validade_ate", e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-row" style={{ marginTop: 12 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Acomodação</label>
                          <input
                            className="form-input"
                            list="acomodacoes-list"
                            value={tarifaModalForm.acomodacao}
                            onChange={(e) => handleTarifaModalChange("acomodacao", e.target.value)}
                          />
                          <datalist id="acomodacoes-list">
                            {acomodacoes.map((nome) => (
                              <option key={nome} value={nome} />
                            ))}
                          </datalist>
                        </div>
                        <div className="form-group" style={{ width: 120 }}>
                          <label className="form-label">Qte Pax</label>
                          <input
                            type="number"
                            min={1}
                            className="form-input"
                            value={tarifaModalForm.qte_pax}
                            onChange={(e) => handleTarifaModalChange("qte_pax", e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Tipo</label>
                          <input
                            className="form-input"
                            list="tipo-tarifa-list"
                            value={tarifaModalForm.tipo}
                            onChange={(e) => handleTarifaModalChange("tipo", e.target.value)}
                          />
                          <datalist id="tipo-tarifa-list">
                            {["diária", "pacote"].map((tipo) => (
                              <option key={tipo} value={tipo} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div className="form-row" style={{ marginTop: 12 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Valor Neto ({tarifaMoeda})</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: 1000"
                            value={tarifaModalForm.valor_neto}
                            onChange={(e) => handleTarifaModalChange("valor_neto", e.target.value)}
                          />
                        </div>
                        <div className="form-group" style={{ width: 180 }}>
                          <label className="form-label">Padrão</label>
                          <select
                            className="form-select"
                            value={tarifaModalForm.padrao}
                            onChange={(e) => handleTarifaModalChange("padrao", e.target.value as "Manual" | "Padrao")}
                          >
                            <option value="Padrao">Padrão</option>
                            <option value="Manual">Manual</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Margem</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: 25%"
                            value={tarifaModalForm.margem}
                            onChange={(e) => handleTarifaModalChange("margem", e.target.value)}
                            disabled={tarifaModalForm.padrao !== "Manual"}
                          />
                        </div>
                      </div>
                      <div className="form-row" style={{ marginTop: 12, gap: 12 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Valor Venda ({tarifaMoeda})</label>
                          <input
                            type="text"
                            className="form-input"
                            value={tarifaValorVendaNum != null ? formatValorComMoeda(tarifaValorVendaNum, tarifaMoeda) : ""}
                            readOnly
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Valor em R$</label>
                          <input
                            type="text"
                            className="form-input"
                            value={formatValorComMoeda(tarifaValorEmReaisPreview, "R$")}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-light" onClick={fecharModalTarifa}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={permissao === "view"}>
                        Salvar tarifa
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </form>
        </div>

      )}      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}
      {!carregouTodos && !erro && (
        <div className="card-base card-config mb-3">
          Ultimos Produtos Cadastrados (10). Digite na busca para consultar todos.
        </div>
      )}

      {/* Tabela */}
      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[1080px]">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Destino</th>
              <th>Cidade</th>
              <th>Nivel de preco</th>
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>Carregando produtos...</td>
              </tr>
            )}

            {!loading && produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7}>Nenhum produto encontrado.</td>
              </tr>
            )}

            {!loading &&
              produtosFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.destino || "-"}</td>
                  <td>{(p as any).cidade_nome || "-"}</td>
                  <td>{nivelPrecoLabel(p.nivel_preco) || "-"}</td>
                  <td>{p.ativo ? "Sim" : "Nao"}</td>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="th-actions">
                    <div className="action-buttons">
                      {permissao !== "view" && (
                        <button className="btn-icon" title="Editar" onClick={() => iniciarEdicao(p)}>
                          ✏️
                        </button>
                      )}

                      {(permissao === "admin" || permissao === "delete") && (
                        <button
                          className="btn-icon btn-danger"
                          title="Excluir"
                          onClick={() => excluir(p.id)}
                          disabled={excluindoId === p.id}
                        >
                          {excluindoId === p.id ? "..." : "🗑️"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
