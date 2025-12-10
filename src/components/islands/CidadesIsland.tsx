import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

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
  codigo_admin1?: string | null;
  tipo?: string | null;
};

type Cidade = {
  id: string;
  nome: string;
  subdivisao_id?: string;
  descricao?: string | null;
  created_at?: string | null;
  subdivisao_nome?: string | null;
  pais_nome?: string | null;
};

const initialForm = {
  nome: "",
  subdivisao_id: "",
  descricao: "",
};

export default function CidadesIsland() {
  // PERMISSOES
  const permCidade = usePermissao("Cidades");
  const permCadastros = usePermissao("Cadastros");

  const isAdmin = permCidade.isAdmin || permCadastros.isAdmin;
  const carregando = permCidade.loading || permCadastros.loading;
  const permissao = isAdmin
    ? "admin"
    : permCidade.permissao !== "none"
    ? permCidade.permissao
    : permCadastros.permissao;
  const podeVer = isAdmin || permissao !== "none";
  const podeCriar =
    isAdmin ||
    permissao === "create" ||
    permissao === "edit" ||
    permissao === "delete" ||
    permissao === "admin";
  const podeEditar =
    isAdmin ||
    permissao === "edit" ||
    permissao === "delete" ||
    permissao === "admin";
  const podeExcluir = isAdmin || permissao === "delete" || permissao === "admin";

  // STATES
  const [paises, setPaises] = useState<Pais[]>([]);
  const [subdivisoes, setSubdivisoes] = useState<Subdivisao[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [carregouTodos, setCarregouTodos] = useState(false);

  // CARREGAR DADOS
  async function carregar(todos = false) {
    if (!podeVer) return;

    async function carregarCidades() {
      const selectPadrao = "id, nome, subdivisao_id, descricao, created_at";
      const selectFallback = "id, nome, subdivisao_id, descricao";
      if (todos) {
        const todas: Cidade[] = [];
        const pageSize = 1000;
        let from = 0;
        while (true) {
          try {
            const { data, error } = await supabase
              .from("cidades")
              .select(selectPadrao)
              .order("nome")
              .range(from, from + pageSize - 1);
            if (error) throw error;
            todas.push(...((data || []) as Cidade[]));
            if (!data || data.length < pageSize) break;
            from += pageSize;
          } catch (err) {
            console.warn("[Cidades] Falha na query principal, aplicando fallback.", err);
            try {
              const { data, error } = await supabase
                .from("cidades")
                .select(selectFallback)
                .order("nome")
                .range(from, from + pageSize - 1);
              if (error) throw error;
              todas.push(...((data || []) as Cidade[]));
              if (!data || data.length < pageSize) break;
              from += pageSize;
            } catch (fallbackErr) {
              console.warn("[Cidades] Fallback sem campo descricao.", fallbackErr);
              const { data, error } = await supabase
                .from("cidades")
                .select("id, nome, subdivisao_id")
                .order("nome")
                .range(from, from + pageSize - 1);
              if (error) throw error;
              todas.push(...((data || []) as Cidade[]));
              if (!data || data.length < pageSize) break;
              from += pageSize;
            }
          }
        }
        return todas;
      } else {
        try {
          const { data, error } = await supabase
            .from("cidades")
            .select(selectPadrao)
            .order("created_at", { ascending: false })
            .limit(10);
          if (error) throw error;
          return (data || []) as Cidade[];
        } catch (err) {
          console.warn("[Cidades] created_at indisponivel, ordenando por nome.", err);
          try {
            const { data, error } = await supabase
              .from("cidades")
              .select(selectFallback)
              .order("nome")
              .limit(10);
            if (error) throw error;
            return (data || []) as Cidade[];
          } catch (fallbackErr) {
            console.warn("[Cidades] Fallback sem descricao/nome.", fallbackErr);
            const { data, error } = await supabase
              .from("cidades")
              .select("id, nome, subdivisao_id")
              .order("nome")
              .limit(10);
            if (error) throw error;
            return (data || []) as Cidade[];
          }
        }
      }
    }

    try {
      setLoading(true);

      const [
        { data: paisesData, error: paisesErro },
        { data: subdivisoesData, error: subdivisoesErro },
        cidadesData,
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("subdivisoes").select("id, nome, pais_id, codigo_admin1, tipo").order("nome"),
        carregarCidades(),
      ]);

      if (paisesErro) {
        setErro("Erro ao carregar paises.");
      } else {
        setPaises(paisesData || []);
      }

      if (subdivisoesErro) {
        setErro("Erro ao carregar subdivisoes.");
      } else {
        setSubdivisoes((subdivisoesData || []) as Subdivisao[]);
      }

      setCidades((cidadesData as Cidade[]) || []);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar cidades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (carregando) return;
    if (!podeVer) {
      setLoading(false);
      return;
    }
    carregar(false);
  }, [carregando, podeVer]);

  // Limpa para listagem inicial quando apaga a busca
  useEffect(() => {
    if (!busca.trim() && !carregando && podeVer) {
      carregar(false);
    }
  }, [busca, carregando, podeVer]);

  // Busca via RPC (mais leve) quando houver texto
  useEffect(() => {
    const termo = busca.trim();
    if (!termo || carregando || !podeVer) return;

    const controller = new AbortController();
    async function buscar() {
      setLoading(true);
      setErro(null);
      try {
        const { data, error } = await supabase.rpc(
          "buscar_cidades",
          { q: termo, limite: 200 },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        if (error) throw error;
        const lista = (data as any[]) || [];
        setCidades(
          lista.map((c) => ({
            id: c.id,
            nome: c.nome,
            subdivisao_id: c.subdivisao_id || "",
            descricao: c.descricao || null,
            created_at: c.created_at || null,
            subdivisao_nome: c.subdivisao_nome || "",
            pais_nome: c.pais_nome || "",
          }))
        );
        setCarregouTodos(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
        setErro("Erro ao buscar cidades.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    buscar();
    return () => controller.abort();
  }, [busca, carregando, podeVer]);

  // FILTRO
  const cidadesEnriquecidas = useMemo(() => {
    const subdivisaoMap = new Map(subdivisoes.map((s) => [s.id, s]));
    const paisMap = new Map(paises.map((p) => [p.id, p]));

    return cidades.map((c) => {
      const subdivisao = c.subdivisao_id ? subdivisaoMap.get(c.subdivisao_id) : undefined;
      const pais = subdivisao ? paisMap.get(subdivisao.pais_id) : undefined;
      return {
        ...c,
        subdivisao_nome: subdivisao?.nome || c.subdivisao_nome || "",
        pais_nome: pais?.nome || c.pais_nome || "",
      };
    });
  }, [cidades, subdivisoes, paises]);

  const filtradas = useMemo(() => {
    if (!busca.trim()) return cidadesEnriquecidas;

    const t = normalizeText(busca);
    // Primeiro, cidades cujo nome bate exatamente ou contém o termo
    const cidadesNome = cidadesEnriquecidas.filter(
      (c) => normalizeText(c.nome).includes(t)
    );
    // Depois, cidades que batem pela subdivisão ou país, mas não já incluídas
    const cidadesOutros = cidadesEnriquecidas.filter(
      (c) =>
        !normalizeText(c.nome).includes(t) &&
        (normalizeText((c as any).subdivisao_nome || "").includes(t) ||
         normalizeText((c as any).pais_nome || "").includes(t))
    );
    return [...cidadesNome, ...cidadesOutros];
  }, [busca, cidadesEnriquecidas]);

  // CHANGE
  function handleChange(campo: string, valor: any) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  // EDITAR
  function iniciarEdicao(c: Cidade) {
    if (!podeEditar) return;

    async function prepararEdicao() {
      try {
        let alvo = c;
        if (!c.subdivisao_id) {
          const { data, error } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_id, descricao")
            .eq("id", c.id)
            .maybeSingle();
          if (error) throw error;
          if (data) {
            alvo = {
              ...c,
              subdivisao_id: (data as any).subdivisao_id || "",
              descricao: (data as any).descricao || "",
            };
          }
        }

        setEditId(alvo.id);
        setForm({
          nome: alvo.nome,
          subdivisao_id: alvo.subdivisao_id || "",
          descricao: alvo.descricao || "",
        });
      } catch (err) {
        console.error(err);
        setErro("Nao foi possivel carregar dados da cidade para edicao.");
      }
    }

    prepararEdicao();
  }

  function iniciarNovo() {
    if (!podeCriar) return;
    setEditId(null);
    setForm(initialForm);
  }

  // SALVAR
  async function salvar(e: React.FormEvent) {
    e.preventDefault();

    if (!podeCriar && !podeEditar) return;

    if (!form.subdivisao_id) {
      setErro("Subdivisao e obrigatoria.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        nome: form.nome,
        subdivisao_id: form.subdivisao_id,
        descricao: form.descricao || null,
      };

      if (editId) {
        const { error } = await supabase
          .from("cidades")
          .update(payload)
          .eq("id", editId);

        if (error) throw error;

        await registrarLog({
          user_id: null,
          acao: "cidade_editada",
          modulo: "Cadastros",
          detalhes: { id: editId, payload },
        });
      } else {
        const { error } = await supabase.from("cidades").insert(payload);
        if (error) throw error;

        await registrarLog({
          user_id: null,
          acao: "cidade_criada",
          modulo: "Cadastros",
          detalhes: payload,
        });
      }

      iniciarNovo();
      carregar(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar cidade.");
    } finally {
      setSalvando(false);
    }
  }

  // EXCLUIR
  async function excluir(id: string) {
    if (!podeExcluir) return;
    if (!confirm("Excluir cidade?")) return;

    try {
      setExcluindoId(id);

      const { error } = await supabase.from("cidades").delete().eq("id", id);
      if (error) throw error;

      await registrarLog({
        user_id: null,
        acao: "cidade_excluida",
        modulo: "Cadastros",
        detalhes: { id },
      });

      carregar(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir cidade (provavelmente usada em produtos/destinos).");
    } finally {
      setExcluindoId(null);
    }
  }

  if (!podeVer && !isAdmin) {
    if (carregando) {
      return <div className="auth-info">Carregando permissoes...</div>;
    }
    return <div className="auth-error">Voce nao possui permissao para visualizar Cidades.</div>;
  }

  return (
    <div className="cidades-page">
      {(podeCriar || podeEditar) && (
        <div className="card-base card-blue mb-3">
          <form onSubmit={salvar}>
            <h3>{editId ? "Editar cidade" : "Nova cidade"}</h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subdivisao *</label>
                <select
                  className="form-select"
                  value={form.subdivisao_id}
                  onChange={(e) => handleChange("subdivisao_id", e.target.value)}
                  required
                >
                  <option value="">Selecione a subdivisao</option>
                  {subdivisoes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome} - {paises.find((p) => p.id === s.pais_id)?.nome || "Sem pais"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descricao</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : editId ? "Salvar alteracoes" : "Adicionar cidade"}
              </button>

              {editId && (
                <button type="button" className="btn btn-light" onClick={iniciarNovo}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar cidade</label>
            <input
              className="form-input"
              placeholder="Nome, subdivisao ou pais..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {carregando && <div className="auth-info mb-3">Carregando permissoes...</div>}
      {!carregando && erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}
      {!carregouTodos && !erro && (
        <div className="card-base card-config mb-3">
          Ultimas Cidades Cadastradas (10). Digite na busca para consultar todas.
        </div>
      )}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[720px]">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Subdivisao</th>
              <th>Pais</th>
              <th>Criada em</th>
              {(podeEditar || podeExcluir) && <th className="th-actions">Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5}>Carregando...</td>
              </tr>
            )}
            {!loading && filtradas.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma cidade encontrada.</td>
              </tr>
            )}
            {!loading &&
              filtradas.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{(c as any).subdivisao_nome || "-"}</td>
                  <td>{(c as any).pais_nome || "-"}</td>
                  <td>{c.created_at ? c.created_at.slice(0, 10) : "-"}</td>
                  {(podeEditar || podeExcluir) && (
                    <td className="th-actions">
                      {podeEditar && (
                        <button className="btn-icon" onClick={() => iniciarEdicao(c)} title="Editar">
                          Editar
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => excluir(c.id)}
                          disabled={excluindoId === c.id}
                          title="Excluir"
                        >
                          {excluindoId === c.id ? "..." : "Excluir"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
