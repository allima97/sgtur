import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Pais = { id: string; nome: string };
type Estado = { id: string; nome: string; pais_id: string };
type Cidade = { id: string; nome: string; estado_id: string };
type TipoProduto = { id: string; nome: string | null; tipo: string };

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
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [tipos, setTipos] = useState<TipoProduto[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busca, setBusca] = useState("");
  const [cidadeBusca, setCidadeBusca] = useState("");
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarDados() {
    async function carregarTodasCidades() {
      const todas: Cidade[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("cidades")
          .select("id, nome, estado_id")
          .order("nome")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        todas.push(...((data || []) as Cidade[]));
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
        { data: produtoData, error: prodErr },
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("estados").select("id, nome, pais_id").order("nome"),
        carregarTodasCidades(),
        supabase.from("tipo_produtos").select("id, nome, tipo").order("nome"),
        supabase
          .from("produtos")
          .select(
            "id, nome, cidade_id, tipo_produto, informacoes_importantes, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, created_at"
          )
          .order("nome"),
      ]);

      if (paisErr) throw paisErr;
      if (estErr) throw estErr;
      if (tipoErr) throw tipoErr;
      if (prodErr) throw prodErr;

      setPaises((paisData || []) as Pais[]);
      setEstados((estadoData || []) as Estado[]);
      setCidades((cidadeData || []) as Cidade[]);
      setTipos((tipoData || []) as TipoProduto[]);
      setProdutos((produtoData || []) as Produto[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar produtos. Verifique se as tabelas estão corretas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const cidadesFiltradasPesquisa = useMemo(() => {
    const termo = normalizeText(cidadeBusca.trim());
    if (!termo) return cidades;
    return cidades.filter((c) => normalizeText(c.nome).includes(termo));
  }, [cidades, cidadeBusca]);

  const estadoMap = useMemo(() => new Map(estados.map((e) => [e.id, e.nome])), [estados]);

  function formatarCidadeNome(cidadeId: string) {
    const cidade = cidades.find((c) => c.id === cidadeId);
    if (!cidade) return "";
    const estadoNome = estadoMap.get(cidade.estado_id);
    return estadoNome ? `${cidade.nome} (${estadoNome})` : cidade.nome;
  }

  const produtosEnriquecidos = useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const estadoMap = new Map(estados.map((e) => [e.id, e]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));
    const tipoMap = new Map(tipos.map((t) => [t.id, t]));

    return produtos.map((p) => {
      const cidade = cidadeMap.get(p.cidade_id || "");
      const estado = cidade ? estadoMap.get(cidade.estado_id) : undefined;
      const pais = estado ? paisMap.get(estado.pais_id) : undefined;
      const tipo = p.tipo_produto ? tipoMap.get(p.tipo_produto) : undefined;

      return {
        ...p,
        cidade_nome: cidade?.nome || "",
        estado_nome: estado?.nome || "",
        pais_nome: pais?.nome || "",
        tipo_nome: tipo?.nome || tipo?.tipo || "",
      };
    });
  }, [produtos, cidades, estados, paises, tipos]);

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtosEnriquecidos;
    const termo = normalizeText(busca);
    return produtosEnriquecidos.filter(
      (p) =>
        normalizeText(p.nome).includes(termo) ||
        normalizeText(p.cidade_nome).includes(termo) ||
        normalizeText(p.estado_nome).includes(termo) ||
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
    // mantém seleção apenas se cidade atual ainda corresponde ao texto
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

  async function salvar(e: React.FormEvent) {
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
      setErro("Não foi possível excluir o produto. Verifique vínculos com vendas/orçamentos.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!ativo) return <div>Você não possui acesso ao módulo de Cadastros.</div>;

  return (
    <div className="destinos-page">
      {/* Formulário */}
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
                  {cidadesFiltradasPesquisa.length === 0 && (
                    <div style={{ padding: "4px 6px", color: "#6b7280" }}>Nenhuma cidade encontrada.</div>
                  )}
                  {cidadesFiltradasPesquisa.map((c) => {
                    const estadoNome = estadoMap.get(c.estado_id);
                    const label = estadoNome ? `${c.nome} (${estadoNome})` : c.nome;
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
                      }}
                    >
                      {label}
                    </button>
                  );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Atração principal</label>
              <input
                className="form-input"
                value={form.atracao_principal}
                onChange={(e) => handleChange("atracao_principal", e.target.value)}
                placeholder="Ex: Disney, Torre Eiffel..."
                disabled={permissao === "view"}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Melhor época</label>
              <input
                className="form-input"
                value={form.melhor_epoca}
                onChange={(e) => handleChange("melhor_epoca", e.target.value)}
                placeholder="Ex: Dezembro a Março"
                disabled={permissao === "view"}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Duração sugerida</label>
              <input
                className="form-input"
                value={form.duracao_sugerida}
                onChange={(e) => handleChange("duracao_sugerida", e.target.value)}
                placeholder="Ex: 7 dias"
                disabled={permissao === "view"}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nível de preço</label>
              <input
                className="form-input"
                value={form.nivel_preco}
                onChange={(e) => handleChange("nivel_preco", e.target.value)}
                placeholder="Ex: Econômico, Intermediário, Premium"
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
            <label className="form-label">Informações importantes</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.informacoes_importantes}
              onChange={(e) => handleChange("informacoes_importantes", e.target.value)}
              placeholder="Observações gerais, dicas, documentação necessária, etc."
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
              <option value="false">Não</option>
            </select>
          </div>

          <div className="mt-2">
            {permissao !== "view" && (
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar produto"}
              </button>
            )}

            {editandoId && permissao !== "view" && (
              <button type="button" className="btn btn-light" style={{ marginLeft: 8 }} onClick={iniciarNovo}>
                Cancelar edição
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
              placeholder="Busque por nome, tipo, cidade, estado ou país..."
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
              <th>Estado</th>
              <th>País</th>
              <th>Nível de preço</th>
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Ações</th>
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
                  <td>{(p as any).estado_nome || "-"}</td>
                  <td>{(p as any).pais_nome || "-"}</td>
                  <td>{p.nivel_preco || "-"}</td>
                  <td>{p.ativo ? "Sim" : "Não"}</td>
                  <td>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="th-actions">
                    {permissao !== "view" && (
                      <button className="btn-icon" title="Editar" onClick={() => iniciarEdicao(p)}>
                        ✏️
                      </button>
                    )}

                    {permissao === "admin" && (
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
