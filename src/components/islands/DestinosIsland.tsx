import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { titleCaseWithExceptions } from "../../lib/titleCase";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Pais = {
  id: string;
  nome: string;
};

type Subdivisao = {
  id: string;
  nome: string;
  pais_id: string;
};

type Cidade = {
  id: string;
  nome: string;
  subdivisao_id: string;
};

type Destino = {
  id: string;
  nome: string;
  cidade_id: string;
  informacoes_importantes: string | null;
  tipo: string | null;
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
  pais_id: string;
  cidade_id: string;
  tipo: string;
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
  pais_id: "",
  cidade_id: "",
  tipo: "",
  atracao_principal: "",
  melhor_epoca: "",
  duracao_sugerida: "",
  nivel_preco: "",
  imagem_url: "",
  informacoes_importantes: "",
  ativo: true,
};

export default function DestinosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");

  const [paises, setPaises] = useState<Pais[]>([]);
  const [subdivisoes, setSubdivisoes] = useState<Subdivisao[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [destinos, setDestinos] = useState<Destino[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function carregarDadosIniciais() {
    try {
      setLoading(true);
      setErro(null);

      const [
        { data: paisesData, error: paisesErr },
        { data: subdivisoesData, error: subErr },
        { data: cidadesData, error: cidadesErr },
        { data: destinosData, error: destinosErr },
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome", { ascending: true }),
        supabase.from("subdivisoes").select("id, nome, pais_id").order("nome", { ascending: true }),
        supabase.from("cidades").select("id, nome, subdivisao_id").order("nome", { ascending: true }),
        supabase
          .from("destinos")
          .select(
            "id, nome, cidade_id, informacoes_importantes, tipo, atracao_principal, melhor_epoca, duracao_sugerida, nivel_preco, imagem_url, ativo, created_at"
          )
          .order("nome", { ascending: true }),
      ]);

      if (paisesErr) throw paisesErr;
      if (subErr) throw subErr;
      if (cidadesErr) throw cidadesErr;
      if (destinosErr) throw destinosErr;

      setPaises((paisesData || []) as Pais[]);
      setSubdivisoes((subdivisoesData || []) as Subdivisao[]);
      setCidades((cidadesData || []) as Cidade[]);
      setDestinos((destinosData || []) as Destino[]);
    } catch (e: any) {
      console.error(e);
      setErro(
        "Erro ao carregar destinos. Verifique se as tabelas 'paises', 'subdivisoes' e 'cidades' existem e se as colunas estao corretas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const subdivisaoMap = useMemo(() => new Map(subdivisoes.map((s) => [s.id, s])), [subdivisoes]);

  const cidadesFiltradas = useMemo(() => {
    if (!form.pais_id) return cidades;
    return cidades.filter((c) => {
      const subdivisao = subdivisaoMap.get(c.subdivisao_id);
      return subdivisao?.pais_id === form.pais_id;
    });
  }, [cidades, form.pais_id, subdivisaoMap]);

  const destinosEnriquecidos = useMemo(() => {
    const cidadeMap = new Map(cidades.map((c) => [c.id, c]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));

    return destinos.map((d) => {
      const cidade = cidadeMap.get(d.cidade_id || "");
      const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) : undefined;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : undefined;
      return {
        ...d,
        cidade_nome: cidade?.nome || "",
        pais_nome: pais?.nome || "",
      };
    });
  }, [destinos, cidades, paises, subdivisaoMap]);

  const destinosFiltrados = useMemo(() => {
    if (!busca.trim()) return destinosEnriquecidos;
    const termo = normalizeText(busca);
    return destinosEnriquecidos.filter((d) => {
      return (
        normalizeText(d.nome).includes(termo) ||
        normalizeText(d.cidade_nome).includes(termo) ||
        normalizeText(d.pais_nome).includes(termo)
      );
    });
  }, [destinosEnriquecidos, busca]);

  function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === "pais_id" ? { cidade_id: "" } : {}),
    }));
  }

  function iniciarNovo() {
    setEditandoId(null);
    setForm(initialForm);
  }

  function iniciarEdicao(destino: Destino & { cidade_nome?: string; pais_nome?: string }) {
    const cidade = cidades.find((c) => c.id === destino.cidade_id);
    const subdivisao = cidade ? subdivisaoMap.get(cidade.subdivisao_id) : undefined;
    const paisId = subdivisao?.pais_id || "";

    setEditandoId(destino.id);
    setForm({
      nome: destino.nome,
      pais_id: paisId,
      cidade_id: destino.cidade_id,
      tipo: destino.tipo || "",
      atracao_principal: destino.atracao_principal || "",
      melhor_epoca: destino.melhor_epoca || "",
      duracao_sugerida: destino.duracao_sugerida || "",
      nivel_preco: destino.nivel_preco || "",
      imagem_url: destino.imagem_url || "",
      informacoes_importantes: destino.informacoes_importantes || "",
      ativo: destino.ativo ?? true,
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (permissao === "view") {
      setErro("Voce nao tem permissao para salvar destinos.");
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

    try {
      setSalvando(true);
      setErro(null);

      const nomeNormalizado = titleCaseWithExceptions(form.nome);

      const payload = {
        nome: nomeNormalizado,
        cidade_id: form.cidade_id,
        tipo: form.tipo.trim() || null,
        atracao_principal: form.atracao_principal.trim() || null,
        melhor_epoca: form.melhor_epoca.trim() || null,
        duracao_sugerida: form.duracao_sugerida.trim() || null,
        nivel_preco: form.nivel_preco.trim() || null,
        imagem_url: form.imagem_url.trim() || null,
        informacoes_importantes: form.informacoes_importantes.trim() || null,
        ativo: form.ativo,
      };

      if (editandoId) {
        const { error } = await supabase.from("destinos").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("destinos").insert(payload);
        if (error) throw error;
      }

      setForm(initialForm);
      setEditandoId(null);
      await carregarDadosIniciais();
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao salvar destino. Verifique os dados e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir destinos.");
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir este destino?")) return;

    try {
      setExcluindoId(id);
      setErro(null);

      const { error } = await supabase.from("destinos").delete().eq("id", id);
      if (error) throw error;

      await carregarDadosIniciais();
    } catch (e: any) {
      console.error(e);
      setErro("Nao foi possivel excluir o destino. Verifique se nao existem vendas vinculadas.");
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
              <label className="form-label">Nome do destino *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                placeholder="Ex: Orlando, Paris, Gramado..."
                disabled={permissao === "view"}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pais *</label>
              <select
                className="form-select"
                value={form.pais_id}
                onChange={(e) => handleChange("pais_id", e.target.value)}
                disabled={permissao === "view"}
              >
                <option value="">Selecione um pais</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cidade *</label>
              <select
                className="form-select"
                value={form.cidade_id}
                onChange={(e) => handleChange("cidade_id", e.target.value)}
                disabled={permissao === "view"}
              >
                <option value="">Selecione uma cidade</option>
                {cidadesFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <input
                className="form-input"
                value={form.tipo}
                onChange={(e) => handleChange("tipo", e.target.value)}
                placeholder="Ex: Cidade, Praia, Parque, Serra..."
                disabled={permissao === "view"}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Atracao principal</label>
              <input
                className="form-input"
                value={form.atracao_principal}
                onChange={(e) => handleChange("atracao_principal", e.target.value)}
                placeholder="Ex: Disney, Torre Eiffel, Centro Historico..."
                disabled={permissao === "view"}
              />
            </div>
          </div>

          <div className="form-row">
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
          </div>

          <div className="form-row">
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

          <div className="mt-2">
            {permissao !== "view" && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar alteracoes"
                  : "Adicionar destino"}
              </button>
            )}

            {editandoId && permissao !== "view" && (
              <button
                type="button"
                className="btn btn-light"
                style={{ marginLeft: 8 }}
                onClick={iniciarNovo}
              >
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
            <label className="form-label">Buscar destino</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Busque por nome, cidade ou pais..."
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
        <table className="table-default table-header-blue min-w-[960px]">
          <thead>
            <tr>
              <th>Destino</th>
              <th>Cidade</th>
              <th>Pais</th>
              <th>Tipo</th>
              <th>Nivel de preco</th>
              <th>Ativo</th>
              <th>Criado em</th>
              <th className="th-actions">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8}>Carregando destinos...</td>
              </tr>
            )}

            {!loading && destinosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8}>Nenhum destino encontrado.</td>
              </tr>
            )}

            {!loading &&
              destinosFiltrados.map((d) => (
                <tr key={d.id}>
                  <td>{d.nome}</td>
                  <td>{(d as any).cidade_nome || "-"}</td>
                  <td>{(d as any).pais_nome || "-"}</td>
                  <td>{d.tipo || "-"}</td>
                  <td>{d.nivel_preco || "-"}</td>
                  <td>{d.ativo ? "Sim" : "Nao"}</td>
                  <td>
                    {d.created_at
                      ? new Date(d.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="th-actions flex gap-2">
                    {permissao !== "view" && (
                      <button
                        className="btn-icon"
                        title="Editar"
                        onClick={() => iniciarEdicao(d)}
                      >
                        ✏️
                      </button>
                    )}
                    {permissao === "admin" && (
                      <button
                        className="btn-icon btn-danger"
                        title="Excluir"
                        onClick={() => excluir(d.id)}
                        disabled={excluindoId === d.id}
                      >
                        {excluindoId === d.id ? "..." : "🗑️"}
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
