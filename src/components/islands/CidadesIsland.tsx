import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

function normalizeText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [loadingBusca, setLoadingBusca] = useState(false);
  const [subdivisaoBusca, setSubdivisaoBusca] = useState("");
  const [mostrarSugestoesSubdivisao, setMostrarSugestoesSubdivisao] = useState(false);

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

    async function carregarSubdivisoes() {
      const todas: Subdivisao[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("subdivisoes")
          .select("id, nome, pais_id, codigo_admin1, tipo")
          .order("nome")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        todas.push(...((data || []) as Subdivisao[]));
        if (!data || data.length < pageSize) break;
        from += pageSize;
      }
      return todas;
    }

    try {
      setLoading(true);

      const [
        { data: paisesData, error: paisesErro },
        subdivisoesData,
        cidadesData,
      ] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        carregarSubdivisoes(),
        carregarCidades(),
      ]);

      if (paisesErro) {
        setErro("Erro ao carregar paises.");
      } else {
        setPaises(paisesData || []);
      }

      setSubdivisoes((subdivisoesData || []) as Subdivisao[]);

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
      setLoadingBusca(true);
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
        console.warn("[Cidades] RPC falhou, tentando fallback direto.", e);
        try {
          const { data, error } = await supabase
            .from("cidades")
            .select("id, nome, subdivisao_id, descricao, created_at")
            .ilike("nome", `%${termo}%`)
            .order("nome");
          if (error) throw error;
          setCidades((data as Cidade[]) || []);
          setCarregouTodos(true);
        } catch (errFinal) {
          console.error(errFinal);
          const msg = errFinal instanceof Error ? errFinal.message : "";
          setErro(`Erro ao buscar cidades.${msg ? ` Detalhe: ${msg}` : ""}`);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingBusca(false);
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

  const subdivisoesEnriquecidas = useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return subdivisoes.map((s) => {
      const paisNome = paisMap.get(s.pais_id) || "";
      const codigo = s.codigo_admin1 ? ` (${s.codigo_admin1})` : "";
      return {
        ...s,
        pais_nome: paisNome,
        label: `${s.nome}${codigo}${paisNome ? ` - ${paisNome}` : ""}`,
      };
    });
  }, [subdivisoes, paises]);

  const subdivisoesFiltradas = useMemo(() => {
    if (!subdivisaoBusca.trim()) return subdivisoesEnriquecidas;
    const termo = normalizeText(subdivisaoBusca);
    return subdivisoesEnriquecidas.filter(
      (s) =>
        normalizeText(s.nome).includes(termo) ||
        normalizeText(s.codigo_admin1 || "").includes(termo) ||
        normalizeText(s.tipo || "").includes(termo) ||
        normalizeText((s as any).pais_nome || "").includes(termo) ||
        normalizeText((s as any).label || "").includes(termo)
    );
  }, [subdivisaoBusca, subdivisoesEnriquecidas]);

  useEffect(() => {
    if (!mostrarFormulario) return;
    if (!form.subdivisao_id) return;
    const atual = subdivisoesEnriquecidas.find((s) => s.id === form.subdivisao_id);
    if (!atual) return;
    const label = (atual as any).label || atual.nome;
    if (normalizeText(subdivisaoBusca) !== normalizeText(label)) {
      setSubdivisaoBusca(label);
    }
  }, [form.subdivisao_id, subdivisoesEnriquecidas, mostrarFormulario]);

  // CHANGE
  function handleChange(campo: string, valor: any) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function handleSubdivisaoBusca(valor: string) {
    setSubdivisaoBusca(valor);
    if (!valor.trim()) {
      handleChange("subdivisao_id", "");
      return;
    }
    const termo = normalizeText(valor);
    const match = subdivisoesEnriquecidas.find(
      (s) =>
        normalizeText((s as any).label || s.nome) === termo ||
        normalizeText(s.nome) === termo ||
        normalizeText(s.codigo_admin1 || "") === termo
    );
    if (match) {
      handleChange("subdivisao_id", match.id);
      return;
    }
    if (form.subdivisao_id) {
      handleChange("subdivisao_id", "");
    }
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
        if (alvo.subdivisao_id) {
          const subdiv = subdivisoes.find((s) => s.id === alvo.subdivisao_id);
          const paisNome = subdiv ? paises.find((p) => p.id === subdiv.pais_id)?.nome || "" : "";
          const label = subdiv ? `${subdiv.nome}${paisNome ? ` - ${paisNome}` : ""}` : "";
          setSubdivisaoBusca(label);
        } else {
          setSubdivisaoBusca("");
        }
      } catch (err) {
        console.error(err);
        setErro("Nao foi possivel carregar dados da cidade para edicao.");
      }
    }

    prepararEdicao();
    setMostrarFormulario(true);
  }

  function iniciarNovo() {
    setEditId(null);
    setForm(initialForm);
    setSubdivisaoBusca("");
  }

  function abrirFormulario() {
    if (!podeCriar) return;
    iniciarNovo();
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    iniciarNovo();
    setMostrarFormulario(false);
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

      const nomeNormalizado = titleCaseWithExceptions(form.nome);

      const payload = {
        nome: nomeNormalizado,
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

      carregar(carregouTodos);
      fecharFormulario();
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
      return <LoadingUsuarioContext className="mb-3" />;
    }
    return <div className="auth-error">Voce nao possui permissao para visualizar Cidades.</div>;
  }

  return (
    <div className="cidades-page">
      <div className="card-base mb-3">
        <div
          className="form-row"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ flex: "1 1 320px" }}>
            <label className="form-label">Buscar cidade</label>
            <input
              className="form-input"
              placeholder="Nome, subdivisao ou pais..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {podeCriar && (
            <div className="form-group" style={{ alignItems: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={abrirFormulario}
                disabled={mostrarFormulario}
              >
                Adicionar cidade
              </button>
            </div>
          )}
        </div>
      </div>

      {(podeCriar || podeEditar) && mostrarFormulario && (
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
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  required
                />
              </div>

              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">Subdivisao *</label>
                <input
                  className="form-input"
                  placeholder="Digite a subdivisao"
                  value={subdivisaoBusca}
                  onChange={(e) => handleSubdivisaoBusca(e.target.value)}
                  onFocus={() => setMostrarSugestoesSubdivisao(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoesSubdivisao(false), 150)}
                  required
                />
                {mostrarSugestoesSubdivisao && (
                  <div
                    className="card-base"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      maxHeight: 200,
                      overflowY: "auto",
                      padding: 6,
                      marginTop: 4,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                    }}
                  >
                    {subdivisoesFiltradas.length === 0 && (
                      <div style={{ padding: "4px 6px", color: "#6b7280" }}>
                        Nenhuma subdivisao encontrada.
                      </div>
                    )}
                    {subdivisoesFiltradas.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="btn btn-light"
                        style={{
                          width: "100%",
                          justifyContent: "flex-start",
                          marginBottom: 4,
                          background: form.subdivisao_id === s.id ? "#e0f2fe" : "#fff",
                          borderColor: form.subdivisao_id === s.id ? "#38bdf8" : "#e5e7eb",
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleChange("subdivisao_id", s.id);
                          setSubdivisaoBusca((s as any).label || s.nome);
                          setMostrarSugestoesSubdivisao(false);
                        }}
                      >
                        {(s as any).label || s.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
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

              <button type="button" className="btn btn-light" onClick={fecharFormulario} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {carregando && <LoadingUsuarioContext className="mb-3" />}
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
                          ✏️
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => excluir(c.id)}
                          disabled={excluindoId === c.id}
                          title="Excluir"
                        >
                          {excluindoId === c.id ? "..." : "🗑️"}
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
