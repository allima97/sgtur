import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type TipoProduto = { id: string; nome: string | null; tipo: string };
type FornecedorOption = { id: string; nome_completo: string | null; nome_fantasia: string | null };
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

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function dedupeSugestoes(valores: string[]) {
  const vistos = new Set<string>();
  const lista: string[] = [];
  valores.forEach((valor) => {
    const nome = (valor || "").trim();
    if (!nome) return;
    const chave = normalizeText(nome);
    if (vistos.has(chave)) return;
    vistos.add(chave);
    lista.push(nome);
  });
  return lista;
}

const nivelPrecosOptions = [
  { value: "Economico", label: "Economico" },
  { value: "Intermediario", label: "Intermediario" },
  { value: "Variavel", label: "Variavel" },
  { value: "Premium", label: "Premium" },
  { value: "Super Premium", label: "Super Premium" },
];

const duracaoOptions = [
  "De 1 a 3 dias",
  "De 3 a 5 dias",
  "De 5 a 7 dias",
  "De 7 a 10 dias",
  "10 dias ou mais",
];

function gerarIdTemporario() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function formatFornecedorLabel(fornecedor: FornecedorOption | null | undefined) {
  if (!fornecedor) return "";
  return (fornecedor.nome_fantasia?.trim() || fornecedor.nome_completo?.trim() || "").trim();
}

function tipoLabel(t?: TipoProduto | null) {
  if (!t) return "";
  return (t.nome || "").trim() || t.tipo || "";
}

function formatCidadeLabel(cidade: CidadeBusca) {
  return cidade.subdivisao_nome ? `${cidade.nome} (${cidade.subdivisao_nome})` : cidade.nome;
}

type CommonForm = {
  cidade_id: string;
  fornecedor_id: string;
  fornecedor_label: string;
  atracao_principal: string;
  melhor_epoca: string;
  duracao_sugerida: string;
  ativo: boolean;
};

type ProdutoItem = {
  id: string;
  tipo_produto: string;
  nome: string;
  destino: string;
  nivel_preco: string;
  informacoes_importantes: string;
  imagem_url: string;
};

const initialCommon: CommonForm = {
  cidade_id: "",
  fornecedor_id: "",
  fornecedor_label: "",
  atracao_principal: "",
  melhor_epoca: "",
  duracao_sugerida: "",
  ativo: true,
};

function criarProdutoItem(): ProdutoItem {
  return {
    id: gerarIdTemporario(),
    tipo_produto: "",
    nome: "",
    destino: "",
    nivel_preco: "",
    informacoes_importantes: "",
    imagem_url: "",
  };
}

export default function ProdutosLoteIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [fornecedoresLista, setFornecedoresLista] = useState<FornecedorOption[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [common, setCommon] = useState<CommonForm>(initialCommon);
  const [produtos, setProdutos] = useState<ProdutoItem[]>(() => [criarProdutoItem()]);
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [resultadosCidade, setResultadosCidade] = useState<CidadeBusca[]>([]);
  const [buscandoCidade, setBuscandoCidade] = useState(false);
  const [erroCidadeBusca, setErroCidadeBusca] = useState<string | null>(null);
  const [destinosCadastro, setDestinosCadastro] = useState<string[]>([]);
  const [atracoesCadastro, setAtracoesCadastro] = useState<string[]>([]);
  const [melhoresEpocasCadastro, setMelhoresEpocasCadastro] = useState<string[]>([]);
  const [infosAbertos, setInfosAbertos] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function carregarDados() {
      setCarregando(true);
      try {
        const [
          { data: tiposData, error: tiposErr },
          { data: destinosData, error: destinosErr },
          { data: destinosProdutosData, error: destinosProdutosErr },
        ] = await Promise.all([
          supabase.from("tipo_produtos").select("id, nome, tipo").order("tipo", { ascending: true }),
          supabase.from("destinos").select("id, nome, atracao_principal, melhor_epoca").order("nome"),
          supabase
            .from("produtos")
            .select("destino, atracao_principal, melhor_epoca")
            .not("destino", "is", null)
            .order("destino", { ascending: true })
            .limit(500),
        ]);

        if (!isActive) return;
        if (tiposErr) throw tiposErr;

        setTipos((tiposData || []) as TipoProduto[]);

        const destinosNomes: string[] = [];
        const atracoesNomes: string[] = [];
        const melhoresEpocasNomes: string[] = [];

        if (destinosErr) {
          console.error("Erro ao carregar destinos:", destinosErr);
        } else {
          (destinosData || []).forEach((destino: any) => {
            const nome = (destino?.nome || "").trim();
            if (nome) destinosNomes.push(nome);
            const atracao = (destino?.atracao_principal || "").trim();
            if (atracao) atracoesNomes.push(atracao);
            const melhorEpoca = (destino?.melhor_epoca || "").trim();
            if (melhorEpoca) melhoresEpocasNomes.push(melhorEpoca);
          });
        }

        if (destinosProdutosErr) {
          console.error("Erro ao carregar destinos de produtos:", destinosProdutosErr);
        } else {
          (destinosProdutosData || []).forEach((destino: any) => {
            const nome = (destino?.destino || "").trim();
            if (nome) destinosNomes.push(nome);
            const atracao = (destino?.atracao_principal || "").trim();
            if (atracao) atracoesNomes.push(atracao);
            const melhorEpoca = (destino?.melhor_epoca || "").trim();
            if (melhorEpoca) melhoresEpocasNomes.push(melhorEpoca);
          });
        }

        setDestinosCadastro(destinosNomes);
        setAtracoesCadastro(atracoesNomes);
        setMelhoresEpocasCadastro(melhoresEpocasNomes);
      } catch (e) {
        console.error(e);
        if (isActive) setErro("Erro ao carregar dados de apoio.");
      } finally {
        if (isActive) setCarregando(false);
      }
    }

    carregarDados();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
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
    if (!mostrarSugestoes) return;
    if (cidadeBusca.trim().length < 2) {
      setResultadosCidade([]);
      setErroCidadeBusca(null);
      setBuscandoCidade(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        setBuscandoCidade(true);
        const { data, error } = await supabase.rpc("buscar_cidades", {
          q: cidadeBusca.trim(),
          limite: 10,
        });
        if (controller.signal.aborted) return;
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
          setErroCidadeBusca(null);
        }
      } finally {
        if (!controller.signal.aborted) setBuscandoCidade(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [cidadeBusca, mostrarSugestoes]);

  const destinosSugestoes = useMemo(() => dedupeSugestoes(destinosCadastro), [destinosCadastro]);
  const atracoesSugestoes = useMemo(() => dedupeSugestoes(atracoesCadastro), [atracoesCadastro]);
  const melhoresEpocasSugestoes = useMemo(
    () => dedupeSugestoes(melhoresEpocasCadastro),
    [melhoresEpocasCadastro],
  );

  function handleCommonChange<K extends keyof CommonForm>(campo: K, valor: CommonForm[K]) {
    setCommon((prev) => ({ ...prev, [campo]: valor }));
  }

  function handleFornecedorInput(valor: string) {
    handleCommonChange("fornecedor_label", valor);
    const termo = valor.trim().toLowerCase();
    if (!termo) {
      handleCommonChange("fornecedor_id", "");
      return;
    }
    const match = fornecedoresLista.find(
      (f) => formatFornecedorLabel(f).toLowerCase() === termo
    );
    handleCommonChange("fornecedor_id", match ? match.id : "");
  }

  function handleCidadeBusca(valor: string) {
    setCidadeBusca(valor);
    if (common.cidade_id) {
      handleCommonChange("cidade_id", "");
    }
    setMostrarSugestoes(true);
  }

  function handleProdutoChange(id: string, campo: keyof ProdutoItem, valor: string) {
    setProdutos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)),
    );
  }

  function adicionarProduto() {
    setProdutos((prev) => [...prev, criarProdutoItem()]);
  }

  function removerProduto(id: string) {
    setProdutos((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
    setInfosAbertos((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function limparProdutos() {
    setProdutos([criarProdutoItem()]);
    setInfosAbertos({});
  }

  function toggleInfo(id: string) {
    setInfosAbertos((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function salvarProdutos(event: React.FormEvent) {
    event.preventDefault();

    if (permissao === "view") {
      setErro("Voce nao tem permissao para salvar produtos.");
      return;
    }

    if (!common.cidade_id) {
      setErro("Cidade e obrigatoria.");
      return;
    }

    const itensInvalidos: number[] = [];
    const itensValidos: ProdutoItem[] = [];

    produtos.forEach((item, index) => {
      const temAlgo =
        !!item.tipo_produto ||
        !!item.nome.trim() ||
        !!item.destino.trim() ||
        !!item.nivel_preco.trim() ||
        !!item.informacoes_importantes.trim() ||
        !!item.imagem_url.trim();
      if (!temAlgo) return;
      if (!item.tipo_produto || !item.nome.trim() || !item.destino.trim()) {
        itensInvalidos.push(index + 1);
        return;
      }
      itensValidos.push(item);
    });

    if (itensInvalidos.length > 0) {
      setErro(`Preencha Tipo, Nome e Destino nos itens: ${itensInvalidos.join(", ")}.`);
      return;
    }

    if (itensValidos.length === 0) {
      setErro("Adicione ao menos um produto para salvar.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);
      setSucesso(null);

      const payload = itensValidos.map((item) => ({
        nome: titleCaseWithExceptions(item.nome),
        destino: titleCaseWithExceptions(item.destino),
        cidade_id: common.cidade_id,
        tipo_produto: item.tipo_produto,
        atracao_principal: common.atracao_principal.trim() || null,
        melhor_epoca: common.melhor_epoca.trim() || null,
        duracao_sugerida: common.duracao_sugerida.trim() || null,
        nivel_preco: item.nivel_preco.trim() || null,
        informacoes_importantes: item.informacoes_importantes.trim() || null,
        imagem_url: item.imagem_url.trim() || null,
        ativo: common.ativo,
        fornecedor_id: common.fornecedor_id || null,
        todas_as_cidades: false,
      }));

      const { error } = await supabase.from("produtos").insert(payload);
      if (error) throw error;

      setSucesso(`${payload.length} produto(s) salvo(s) com sucesso.`);
      setProdutos([criarProdutoItem()]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar produtos. Verifique os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (loadingPerm) {
    return <LoadingUsuarioContext />;
  }
  if (!ativo) return <div>Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="produtos-lote-page">
      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}
      {sucesso && (
        <div className="card-base card-green mb-3">
          <strong>{sucesso}</strong>
        </div>
      )}

      <div className="card-base card-blue mb-3">
        <form onSubmit={salvarProdutos}>
          <div className="form-row">
            <div className="form-group">
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
                  {resultadosCidade.length === 0 && !buscandoCidade && cidadeBusca.trim().length >= 2 && (
                    <div style={{ padding: "4px 6px", color: "#6b7280" }}>Nenhuma cidade encontrada.</div>
                  )}
                  {resultadosCidade.map((cidade) => {
                    const label = formatCidadeLabel(cidade);
                    return (
                      <button
                        key={cidade.id}
                        type="button"
                        className="btn btn-light"
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          marginBottom: 4,
                          background: common.cidade_id === cidade.id ? "#e0f2fe" : "#fff",
                          borderColor: common.cidade_id === cidade.id ? "#38bdf8" : "#e5e7eb",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCommonChange("cidade_id", cidade.id);
                          setCidadeBusca(label);
                          setMostrarSugestoes(false);
                          setResultadosCidade([]);
                          setErroCidadeBusca(null);
                        }}
                      >
                        {label}
                        {cidade.pais_nome ? (
                          <span style={{ color: "#6b7280", marginLeft: 6 }}>- {cidade.pais_nome}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Fornecedor (opcional)</label>
              <input
                className="form-input"
                list="fornecedores-lote-list"
                placeholder="Escolha um fornecedor"
                value={common.fornecedor_label}
                onChange={(e) => handleFornecedorInput(e.target.value)}
                disabled={permissao === "view"}
              />
              <datalist id="fornecedores-lote-list">
                {fornecedoresLista.map((fornecedor) => (
                  <option key={fornecedor.id} value={formatFornecedorLabel(fornecedor)} />
                ))}
              </datalist>
            </div>

          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Atracao principal</label>
              <input
                className="form-input"
                list="atracoes-lote-list"
                value={common.atracao_principal}
                onChange={(e) => handleCommonChange("atracao_principal", e.target.value)}
                placeholder="Ex: Centro historico, parques, praias"
                disabled={permissao === "view"}
              />
              <datalist id="atracoes-lote-list">
                {atracoesSugestoes.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">Melhor epoca</label>
              <input
                className="form-input"
                list="melhores-epocas-lote-list"
                value={common.melhor_epoca}
                onChange={(e) => handleCommonChange("melhor_epoca", e.target.value)}
                placeholder="Ex: Verão, baixa temporada"
                disabled={permissao === "view"}
              />
              <datalist id="melhores-epocas-lote-list">
                {melhoresEpocasSugestoes.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label className="form-label">Duracao sugerida</label>
              <select
                className="form-select"
                value={common.duracao_sugerida}
                onChange={(e) => handleCommonChange("duracao_sugerida", e.target.value)}
                disabled={permissao === "view"}
              >
                <option value="">Selecione</option>
                {duracaoOptions.map((duracao) => (
                  <option key={duracao} value={duracao}>
                    {duracao}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ maxWidth: 160 }}>
              <label className="form-label">Ativo</label>
              <select
                className="form-select"
                value={common.ativo ? "true" : "false"}
                onChange={(e) => handleCommonChange("ativo", e.target.value === "true")}
                disabled={permissao === "view"}
              >
                <option value="true">Sim</option>
                <option value="false">Nao</option>
              </select>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2" style={{ justifyContent: "space-between" }}>
            <div style={{ color: "#64748b" }}>Produtos do lote</div>
          </div>

          <datalist id="destinos-lote-list">
            {destinosSugestoes.map((nome) => (
              <option key={nome} value={nome} />
            ))}
          </datalist>

          <div className="table-container overflow-x-auto" style={{ marginTop: 12 }}>
            <table className="table-default table-header-blue table-mobile-cards min-w-[1400px]">
              <thead>
                <tr>
                  <th>Tipo *</th>
                  <th>Nome do produto *</th>
                  <th>Destino *</th>
                  <th>Nivel de preco</th>
                  <th>Imagem (URL)</th>
                  <th>Info</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto, index) => (
                  <React.Fragment key={produto.id}>
                    <tr>
                      <td data-label="Tipo">
                        <select
                          className="form-select"
                          value={produto.tipo_produto}
                          onChange={(e) => handleProdutoChange(produto.id, "tipo_produto", e.target.value)}
                          disabled={permissao === "view" || carregando}
                        >
                          <option value="">{carregando ? "Carregando..." : "Selecione o tipo"}</option>
                          {tipos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {tipoLabel(t) || "(sem nome)"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Nome do produto">
                        <input
                          className="form-input"
                          value={produto.nome}
                          onChange={(e) => handleProdutoChange(produto.id, "nome", e.target.value)}
                          onBlur={(e) =>
                            handleProdutoChange(produto.id, "nome", titleCaseWithExceptions(e.target.value))
                          }
                          placeholder={`Produto ${index + 1}`}
                          style={{ minWidth: 320 }}
                          disabled={permissao === "view"}
                        />
                      </td>
                      <td data-label="Destino">
                        <input
                          className="form-input"
                          list="destinos-lote-list"
                          value={produto.destino}
                          onChange={(e) => handleProdutoChange(produto.id, "destino", e.target.value)}
                          onBlur={(e) =>
                            handleProdutoChange(produto.id, "destino", titleCaseWithExceptions(e.target.value))
                          }
                          placeholder="Ex: Disney, Porto de Galinhas"
                          style={{ minWidth: 320 }}
                          disabled={permissao === "view"}
                        />
                      </td>
                      <td data-label="Nivel de preco">
                        <select
                          className="form-select"
                          value={produto.nivel_preco}
                          onChange={(e) => handleProdutoChange(produto.id, "nivel_preco", e.target.value)}
                          disabled={permissao === "view"}
                        >
                          <option value="">Selecione</option>
                          {nivelPrecosOptions.map((nivel) => (
                            <option key={nivel.value} value={nivel.value}>
                              {nivel.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td data-label="Imagem (URL)">
                        <input
                          className="form-input"
                          value={produto.imagem_url}
                          onChange={(e) => handleProdutoChange(produto.id, "imagem_url", e.target.value)}
                          placeholder="URL da imagem"
                          disabled={permissao === "view"}
                        />
                      </td>
                      <td data-label="Info">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => toggleInfo(produto.id)}
                        >
                          {infosAbertos[produto.id] ? "-" : "+"}
                        </button>
                      </td>
                      <td data-label="Ações">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => removerProduto(produto.id)}
                          disabled={permissao === "view" || produtos.length === 1}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                    {infosAbertos[produto.id] && (
                      <tr>
                        <td colSpan={7}>
                          <textarea
                            className="form-input"
                            rows={2}
                            value={produto.informacoes_importantes}
                            onChange={(e) =>
                              handleProdutoChange(produto.id, "informacoes_importantes", e.target.value)
                            }
                            placeholder="Observacoes, regras, detalhes relevantes..."
                            disabled={permissao === "view"}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 flex flex-wrap gap-2" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-light"
              onClick={adicionarProduto}
              disabled={permissao === "view"}
            >
              Adicionar produto
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando || permissao === "view"}>
              {salvando ? "Salvando..." : "Salvar Produtos"}
            </button>
            <button type="button" className="btn btn-light" onClick={limparProdutos} disabled={salvando || permissao === "view"}>
              Limpar itens
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
