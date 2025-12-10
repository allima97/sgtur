import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

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
  cidade_id: string;
  tipo_produto: string | null;
  informacoes_importantes: string | null;
  atracao_principal: string | null;
  melhor_epoca: string | null;
  duracao_sugerida: string | null;
  nivel_preco: string | null;
  imagem_url: string | null;
  ativo: boolean | null;
  created_at: string | null;
};

type FormState = {
  nome: string;
  cidade_id: string;
  tipo_produto: string;
  atracao_principal: string;
  melhor_epoca: string;
  duracao_sugerida: string;
  nivel_preco: string;
  imagem_url: string;
  informacoes_importantes: string;
  ativo: boolean;
};

const initialForm: FormState = {
  nome: "",
  cidade_id: "",
  tipo_produto: "",
  atracao_principal: "",
  melhor_epoca: "",
  duracao_sugerida: "",
  nivel_preco: "",
  imagem_url: "",
  informacoes_importantes: "",
  ativo: true,
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

  async function carregarDados() {
    const erros: string[] = [];
    const detalhesErro: string[] = [];
    setLoading(true);
    setErro(null);

    try {
      const [
        { data: paisData, error: paisErr },
        { data: subdivisaoData, error: subErr },
        produtosResp,
        tipoResp,
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
            "id, nome, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, created_at"
          )
          .order("nome"),
      ]);

      if (paisErr) {
        erros.push("paises");
        if (paisErr.message) detalhesErro.push(`paises: ${paisErr.message}`);
      } else {
        setPaises((paisData || []) as Pais[]);
      }

      if (subErr) {
        erros.push("subdivisoes");
        if (subErr.message) detalhesErro.push(`subdivisoes: ${subErr.message}`);
      } else {
        setSubdivisoes((subdivisaoData || []) as Subdivisao[]);
      }

      if (tipoResp.error) {
        erros.push("tipo_produtos");
        if (tipoResp.error.message) detalhesErro.push(`tipo_produtos: ${tipoResp.error.message}`);
      } else {
        setTipos((tipoResp.data || []) as TipoProduto[]);
      }

      if (produtosResp.error) {
        erros.push("produtos");
        if (produtosResp.error.message) detalhesErro.push(`produtos: ${produtosResp.error.message}`);
      } else {
        const produtoData = (produtosResp.data || []) as Produto[];
        setProdutos(produtoData);

        // Busca apenas as cidades referenciadas nos produtos (economiza e evita falhas maiores)
        const idsCidade = Array.from(new Set(produtoData.map((p) => p.cidade_id).filter(Boolean)));
        if (idsCidade.length) {
          const { data: cidadesData, error: cidadesErr } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_id")
            .in("id", idsCidade);
          if (cidadesErr) {
            erros.push("cidades");
            if (cidadesErr.message) detalhesErro.push(`cidades: ${cidadesErr.message}`);
          } else {
            setCidades((cidadesData || []) as Cidade[]);
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
    carregarDados();
  }, []);

  const subdivisaoMap = useMemo(() => new Map(subdivisoes.map((s) => [s.id, s])), [subdivisoes]);

  function formatarCidadeNome(cidadeId: string) {
    const cidade = cidades.find((c) => c.id === cidadeId);
    if (!cidade) return "";
    const subdivisao = subdivisaoMap.get(cidade.subdivisao_id);
    return subdivisao ? `${cidade.nome} (${subdivisao.nome})` : cidade.nome;
  }

  const produtosEnriquecidos = useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    const tipoMap = new Map(tipos.map((t) => [t.id, t]));

    return produtos.map((p) => {
      const cidade = cidadeMap.get(p.cidade_id || "");
      const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) : undefined;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : undefined;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : undefined;

      return {
        ...p,
        cidade_nome: cidade?.nome || "",
        subdivisao_nome: subdivisao?.nome || "",
        pais_nome: pais?.nome || "",
        tipo_nome: tipo?.nome || tipo?.tipo || "",
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
        normalizeText(p.tipo_nome).includes(termo)
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
    });
    setCidadeBusca(formatarCidadeNome(produto.cidade_id) || cidade?.nome || "");
    setMostrarSugestoes(false);
  }

  useEffect(() => {
    if (cidadeBusca.trim().length < 2) {
      setResultadosCidade([]);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      setBuscandoCidade(true);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: cidadeBusca.trim(), limite: 10 },
          { signal: controller.signal }
        );
        if (!controller.signal.aborted) {
          if (error) {
            console.error("Erro ao buscar cidades:", error);
            setErro("Erro ao buscar cidades (RPC).");
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
        ativo: form.ativo,
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
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar produto. Verifique os dados e tente novamente.");
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

      await carregarDados();
    } catch (e) {
      console.error(e);
      setErro("Nao foi possivel excluir o produto. Verifique vinculos com vendas/orcamentos.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loadingPerm) return <div>Carregando permissoes...</div>;
  if (!ativo) return <div>Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="destinos-page">
      {/* Formulario */}
      <div className="card-base card-blue mb-3">
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do produto *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
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
                    {t.nome || t.tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
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
          </div>

          <div className="form-row">
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Duracao sugerida</label>
              <input
                className="form-input"
                value={form.duracao_sugerida}
                onChange={(e) => handleChange("duracao_sugerida", e.target.value)}
                placeholder="Ex: 7 dias"
                disabled={permissao === "view"}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nivel de preco</label>
              <input
                className="form-input"
                value={form.nivel_preco}
                onChange={(e) => handleChange("nivel_preco", e.target.value)}
                placeholder="Ex: Economico, Intermediario, Premium"
                disabled={permissao === "view"}
              />
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

          <div className="form-group">
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

          <div className="form-group">
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

          <div className="mt-2">
            {permissao !== "view" && (
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alteracoes" : "Adicionar produto"}
              </button>
            )}

            {editandoId && permissao !== "view" && (
              <button type="button" className="btn btn-light" style={{ marginLeft: 8 }} onClick={iniciarNovo}>
                Cancelar edicao
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Filtro */}
      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar produto</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque por nome, tipo, cidade, subdivisao ou pais..."
            />
          </div>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      {/* Tabela */}
      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[1080px]">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Cidade</th>
              <th>Subdivisao</th>
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
                  <td>{(p as any).cidade_nome || "-"}</td>
                  <td>{(p as any).subdivisao_nome || "-"}</td>
                  <td>{(p as any).pais_nome || "-"}</td>
                  <td>{p.nivel_preco || "-"}</td>
                  <td>{p.ativo ? "Sim" : "Nao"}</td>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="th-actions">
                    {permissao !== "view" && (
                      <button className="btn-icon" title="Editar" onClick={() => iniciarEdicao(p)}>
                        Editar
                      </button>
                    )}

                    {permissao === "admin" && (
                      <button
                        className="btn-icon btn-danger"
                        title="Excluir"
                        onClick={() => excluir(p.id)}
                        disabled={excluindoId === p.id}
                      >
                        {excluindoId === p.id ? "..." : "Excluir"}
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
