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
  valor_neto: string;
  margem: string;
  valor_venda: string;
  moeda: string;
  cambio: string;
  valor_em_reais: string;
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
  valor_neto: "",
  margem: "",
  valor_venda: "",
  moeda: "R$",
  cambio: "",
  valor_em_reais: "",
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
  const [cambiosParametros, setCambiosParametros] = useState<CambioParametro[]>([]);
  const [ultimaMoedaAuto, setUltimaMoedaAuto] = useState<string | null>(null);
  const [ultimoValorAuto, setUltimoValorAuto] = useState<string>("");

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
          "id, nome, destino, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, fornecedor_id, created_at, todas_as_cidades, valor_neto, margem, valor_venda, moeda, cambio, valor_em_reais"
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
      setCambiosParametros([]);
      setUltimaMoedaAuto(null);
      setUltimoValorAuto("");
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
      setUltimaMoedaAuto(null);
      setUltimoValorAuto("");
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
  const fornecedoresMap = useMemo(
    () => new Map(fornecedoresLista.map((f) => [f.id, formatFornecedorLabel(f)])),
    [fornecedoresLista]
  );

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
        fornecedor_nome: fornecedoresMap.get(p.fornecedor_id || "") || "",
      };
    });
  }, [produtos, cidades, subdivisoes, paises, tipos, fornecedoresMap]);

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

  const estaEditando = Boolean(editandoId);
  const formLayout = estaEditando
    ? "full"
    : modoGlobal === null
    ? "selection"
    : modoGlobal
    ? "global"
    : "full";
  const isGlobalMode = formLayout === "global";

  const handleChange = useCallback(<K extends keyof FormState>(campo: K, valor: FormState[K]) => {
    setForm((prev) => {
      const atualizado = { ...prev, [campo]: valor };
      if (campo === "valor_neto" || campo === "margem") {
        const valorNeto = campo === "valor_neto" ? (valor as string) : prev.valor_neto;
        const margem = campo === "margem" ? (valor as string) : prev.margem;
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

  useEffect(() => {
    if (!form.moeda) return;
    const entrada = cambioAtualPorMoeda[form.moeda];
    if (!entrada) return;
    const formatted = entrada.valor.toFixed(2);
    const deveAtualizar =
      !form.cambio ||
      ultimaMoedaAuto !== form.moeda ||
      (form.cambio === ultimoValorAuto && ultimoValorAuto !== formatted);
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
    handleChange,
  ]);

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

  function iniciarNovo() {
    setForm(initialForm);
    setUltimaMoedaAuto(null);
    setUltimoValorAuto("");
    setEditandoId(null);
    setErro(null);
    setCidadeBusca("");
    setMostrarSugestoes(false);
    setModoGlobal(null);
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
      valor_neto: produto.valor_neto != null ? produto.valor_neto.toFixed(2) : "",
      margem:
        produto.margem != null ? `${(produto.margem * 100).toFixed(2)}%` : "",
      valor_venda: produto.valor_venda != null ? produto.valor_venda.toFixed(2) : "",
      moeda: produto.moeda || "R$",
      cambio: produto.cambio != null ? produto.cambio.toFixed(2) : "",
      valor_em_reais: formatNumberPtBr(produto.valor_em_reais),
    });
    setUltimaMoedaAuto(null);
    setUltimoValorAuto("");
    setCidadeBusca(
      produto.todas_as_cidades ? "" : formatarCidadeNome(produto.cidade_id) || cidade?.nome || ""
    );
    setMostrarSugestoes(false);
    setMostrarFormulario(true);
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
        valor_em_reais: valorEmReaisNum,
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
            <div className="form-row">
              <div className="form-group">
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
              <div className="form-group">
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
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Destino *</label>
                <input
                  className="form-input"
                  value={form.destino}
                  onChange={(e) => handleChange("destino", e.target.value)}
                  onBlur={(e) => handleChange("destino", titleCaseWithExceptions(e.target.value))}
                  placeholder={isGlobalMode ? "Global" : "Ex: Disney, Porto de Galinhas"}
                  disabled={permissao === "view" || isGlobalMode}
                />
              </div>
              {!isGlobalMode && (
                <>
                  <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
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
                  <div className="form-group" style={{ flex: 1 }}>
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
                </>
              )}
              <div className="form-group" style={{ flex: 1 }}>
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
            </div>
            {!isGlobalMode && (
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
            <div className="form-row" style={{ marginTop: 12 }}>
              {!isGlobalMode && (
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
              )}
              <div className="form-group" style={isGlobalMode ? { flex: 1 } : undefined}>
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
              {!isGlobalMode && (
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
              )}
            </div>
            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Moeda</label>
                <input
                  type="text"
                  className="form-input"
                  list="moeda-sugestoes"
                  value={form.moeda}
                  onChange={(e) => handleChange("moeda", e.target.value)}
                  disabled={permissao === "view"}
                />
                <datalist id="moeda-sugestoes">
                  <option value="R$" />
                  <option value="USD" />
                  <option value="EUR" />
                </datalist>
              </div>
              <div className="form-group">
                <label className="form-label">Valor Neto / Moeda Local</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 1000"
                  value={form.valor_neto}
                  onChange={(e) => handleChange("valor_neto", e.target.value)}
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Margem</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 0.80 (80%)"
                  value={form.margem}
                  onChange={(e) => handleChange("margem", e.target.value)}
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Valor Venda / Moeda Local</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.valor_venda}
                  readOnly
                  placeholder="Calculado automaticamente"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Câmbio</label>
                <input
                  type="text"
                  className="form-input"
                  inputMode="decimal"
                  placeholder="Atualizado automaticamente"
                  value={form.cambio}
                  onChange={(e) => handleChange("cambio", e.target.value)}
                  disabled={permissao === "view"}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Valor em R$</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  placeholder="Calculado automaticamente"
                  value={form.valor_em_reais}
                />
              </div>
            </div>
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
              <th>Fornecedor</th>
              <th>Nivel de preco</th>
              <th>Valor Neto</th>
              <th>Margem</th>
              <th>Valor Venda</th>
              <th>Câmbio</th>
              <th>Valor em R$</th>
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={13}>Carregando produtos...</td>
              </tr>
            )}

            {!loading && produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={13}>Nenhum produto encontrado.</td>
              </tr>
            )}

            {!loading &&
              produtosFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{p.destino || "-"}</td>
                  <td>{(p as any).cidade_nome || "-"}</td>
                  <td>{p.fornecedor_nome || "-"}</td>
                  <td>{nivelPrecoLabel(p.nivel_preco) || "-"}</td>
                  <td>{formatValorComMoeda(p.valor_neto, p.moeda || undefined)}</td>
                  <td>{formatMarginPercent(p.margem)}</td>
                  <td>{formatValorComMoeda(p.valor_venda, p.moeda || undefined)}</td>
                  <td>{formatDecimal(p.cambio)}</td>
                  <td>{formatValorComMoeda(p.valor_em_reais, "R$")}</td>
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
