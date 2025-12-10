import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

function normalizeText(value: string) {
  return (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Pais = {
  id: string;
  nome: string;
};

type Estado = {
  id: string;
  nome: string;
  pais_id: string;
  created_at: string | null;
};

type FormState = {
  nome: string;
  pais_id: string;
};

const initialForm: FormState = {
  nome: "",
  pais_id: "",
};

export default function EstadosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");

  const [paises, setPaises] = useState<Pais[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregouTodos, setCarregouTodos] = useState(false);

  async function carregarDados(todos = false) {
    try {
      setLoading(true);
      setErro(null);

      const [{ data: paisData, error: paisErr }, { data: estadoData, error: estErr }] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase
          .from("estados")
          .select("id, nome, pais_id, created_at")
          .order(todos ? "nome" : "created_at", { ascending: !todos })
          .limit(todos ? undefined : 10),
      ]);

      if (paisErr) throw paisErr;
      if (estErr) throw estErr;

      setPaises((paisData || []) as Pais[]);
      setEstados((estadoData || []) as Estado[]);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar estados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarDados(false);
  }, []);

  useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarDados(true);
    }
  }, [busca, carregouTodos]);

  const estadosEnriquecidos = useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return estados.map((e) => ({
      ...e,
      pais_nome: paisMap.get(e.pais_id) || "",
    }));
  }, [estados, paises]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return estadosEnriquecidos;
    const termo = normalizeText(busca);
    return estadosEnriquecidos.filter(
      (e) => normalizeText(e.nome).includes(termo) || normalizeText(e.pais_nome).includes(termo)
    );
  }, [busca, estadosEnriquecidos]);

  function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }

  function iniciarEdicao(estado: Estado) {
    setEditandoId(estado.id);
    setForm({
      nome: estado.nome,
      pais_id: estado.pais_id,
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Você não tem permissão para salvar estados.");
      return;
    }
    if (!form.nome.trim() || !form.pais_id) {
      setErro("Preencha nome e país.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        nome: form.nome.trim(),
        pais_id: form.pais_id,
      };

      if (editandoId) {
        const { error } = await supabase.from("estados").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
      const { error } = await supabase.from("estados").insert(payload);
      if (error) throw error;
    }

    iniciarNovo();
    await carregarDados(carregouTodos);
  } catch (e) {
      console.error(e);
      setErro("Erro ao salvar estado.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir estados.");
      return;
    }
    if (!confirm("Excluir este estado?")) return;

    try {
      setExcluindoId(id);
      const { error } = await supabase.from("estados").delete().eq("id", id);
      if (error) throw error;
    await carregarDados(carregouTodos);
  } catch (e) {
      console.error(e);
      setErro("Erro ao excluir estado. Verifique se não existem cidades vinculadas.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loadingPerm) return <div className="paises-page">Carregando permissões...</div>;
  if (!ativo) return <div className="paises-page">Você não possui acesso ao módulo de Cadastros.</div>;

  return (
    <div className="paises-page">
      <div className="card-base card-blue mb-3">
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do estado *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
                placeholder="Ex: São Paulo, Califórnia..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">País *</label>
              <select
                className="form-select"
                value={form.pais_id}
                onChange={(e) => handleChange("pais_id", e.target.value)}
              >
                <option value="">Selecione</option>
                {paises.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={salvando || permissao === "view"}>
              {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar estado"}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-light" onClick={iniciarNovo}>
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card-base mb-3">
        <div className="form-group">
          <label className="form-label">Buscar estado</label>
          <input
            className="form-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou país..."
          />
        </div>
      </div>

      {!carregouTodos && (
        <div className="card-base card-config mb-3">
          Últimos Estados Cadastrados (10). Digite na busca para consultar todos.
        </div>
      )}

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[640px]">
          <thead>
            <tr>
              <th>Estado</th>
              <th>País</th>
              <th>Criado em</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4}>Carregando estados...</td>
              </tr>
            )}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum estado encontrado.</td>
              </tr>
            )}

            {!loading &&
              filtrados.map((e) => (
                <tr key={e.id}>
                  <td>{e.nome}</td>
                  <td>{(e as any).pais_nome || "-"}</td>
                  <td>{e.created_at ? new Date(e.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="th-actions">
                    {permissao !== "view" && (
                      <>
                        <button className="btn-icon" title="Editar" onClick={() => iniciarEdicao(e)}>
                          ✏️
                        </button>
                        {permissao === "admin" && (
                          <button
                            className="btn-icon btn-danger"
                            title="Excluir"
                            onClick={() => excluir(e.id)}
                            disabled={excluindoId === e.id}
                          >
                            {excluindoId === e.id ? "..." : "🗑️"}
                          </button>
                        )}
                      </>
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
