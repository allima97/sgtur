import React, { useEffect, useMemo, useState } from "react";
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

type Produto = {
  id: string;
  nome: string;
  destino: string | null;
  cidade_id: string;
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
          "id, nome, destino, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, fornecedor_id, created_at"
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
    if (busca.trim() && !carregouTodos) {
      carregarDados(true);
    }
  }, [busca, carregouTodos]);

  const subdivisaoMap = useMemo(() => new Map(subdivisoes.map((s) => [s.id, s])), [subdivisoes]);
  const fornecedoresMap = useMemo(
    () => new Map(fornecedoresLista.map((f) => [f.id, formatFornecedorLabel(f)])),
    [fornecedoresLista]
  );

  function formatarCidadeNome(cidadeId: string) {
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
      const cidade = cidadeMap.get(p.cidade_id || "");
      const subdivisao =
        cidade ? subdivisaoMap.get(cidade.subdivisao_id) || (cidade as any).subdivisoes : undefined;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : undefined;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : undefined;

      return {
        ...p,
        cidade_nome: cidade?.nome || "",
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

  function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function handleCidadeBusca(valor: string) {
    setCidadeBusca(valor);
    const cidadeAtual = cidades.find((c) => c.id === form.cidade_id);
    if (!cidadeAtual || !normalizeText(cidadeAtual.nome).includes(normalizeText(valor))) {
      setForm((prev) => ({ ...prev, cidade_id: "" }));
    }
    setMostrarSugestoes(true);
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
    setEditandoId(null);
    setErro(null);
    setCidadeBusca("");
    setMostrarSugestoes(false);
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
    });
    setCidadeBusca(formatarCidadeNome(produto.cidade_id) || cidade?.nome || "");
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
        cidade_id: form.cidade_id,
        tipo_produto: form.tipo_produto,
        atracao_principal: form.atracao_principal.trim() || null,
        melhor_epoca: form.melhor_epoca.trim() || null,
        duracao_sugerida: form.duracao_sugerida.trim() || null,
        nivel_preco: form.nivel_preco.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        informacoes_importantes: form.informacoes_importantes.trim() || null,
        ativo: form.ativo,
        fornecedor_id: form.fornecedor_id || null,
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

      {mostrarFormulario && (
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
                  placeholder="Ex: Disney, Porto de Galinhas"
                  disabled={permissao === "view"}
                />
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
                  disabled={permissao === "view"}
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
                          {c.pais_nome ? <span style={{ color: "#6b7280", marginLeft: 6 }}>• {c.pais_nome}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
              <div className="form-group">
                <label className="form-label">Nivel de preco</label>
                <select
                  className="form-select"
                  value={form.nivel_preco}
                  onChange={(e) => handleChange("nivel_preco", e.target.value)}
                  disabled={permissao === "view"}
                >
                  <option value="">Selecione</option>
                  <option value="Economico">Economico</option>
                  <option value="Intermediario">Intermediario</option>
                  <option value="Premium">Premium</option>
                  <option value="Super Premium">Super Premium</option>
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
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Salvar produto"}
              </button>
              <button type="button" className="btn btn-light" onClick={fecharFormularioProduto} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {erro && (
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
              <th>Tipo</th>
              <th>Destino</th>
              <th>Cidade</th>
              <th>Fornecedor</th>
              <th>Estado/Província</th>
              <th>Pais</th>
              <th>Nivel de preco</th>
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9}>Carregando produtos...</td>
              </tr>
            )}

            {!loading && produtosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9}>Nenhum produto encontrado.</td>
              </tr>
            )}

            {!loading &&
              produtosFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>{p.nome}</td>
                  <td>{(p as any).tipo_nome || "-"}</td>
                  <td>{p.destino || "-"}</td>
                  <td>{(p as any).cidade_nome || "-"}</td>
                  <td>{p.fornecedor_nome || "-"}</td>
                  <td>{(p as any).subdivisao_nome || "-"}</td>
                  <td>{(p as any).pais_nome || "-"}</td>
                  <td>{p.nivel_preco || "-"}</td>
                  <td>{p.ativo ? "Sim" : "Nao"}</td>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="th-actions">
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
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
