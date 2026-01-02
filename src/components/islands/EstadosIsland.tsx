import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { titleCaseWithExceptions } from "../../lib/titleCase";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

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
  codigo_admin1: string;
  tipo: string | null;
  created_at: string | null;
};

type FormState = {
  nome: string;
  pais_id: string;
  codigo_admin1: string;
  tipo: string;
};

const initialForm: FormState = {
  nome: "",
  pais_id: "",
  codigo_admin1: "",
  tipo: "",
};

export default function SubdivisoesIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");

  const [paises, setPaises] = useState<Pais[]>([]);
  const [subdivisoes, setSubdivisoes] = useState<Subdivisao[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregouTodos, setCarregouTodos] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  async function carregarDados(todos = false) {
    try {
      setLoading(true);
      setErro(null);

      const [{ data: paisData, error: paisErr }, { data: subdivisaoData, error: subErr }] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase
          .from("subdivisoes")
          .select("id, nome, pais_id, codigo_admin1, tipo, created_at")
          .order(todos ? "nome" : "created_at", { ascending: !todos })
          .limit(todos ? undefined : 10),
      ]);

      if (paisErr) throw paisErr;
      if (subErr) throw subErr;

      setPaises((paisData || []) as Pais[]);
      setSubdivisoes((subdivisaoData || []) as Subdivisao[]);
      setCarregouTodos(todos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar subdivisoes.");
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

  const subdivisoesEnriquecidas = useMemo(() => {
    const paisMap = new Map(paises.map((p) => [p.id, p.nome]));
    return subdivisoes.map((s) => ({
      ...s,
      pais_nome: paisMap.get(s.pais_id) || "",
    }));
  }, [subdivisoes, paises]);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return subdivisoesEnriquecidas;
    const termo = normalizeText(busca);
    return subdivisoesEnriquecidas.filter(
      (s) =>
        normalizeText(s.nome).includes(termo) ||
        normalizeText(s.pais_nome).includes(termo) ||
        normalizeText(s.codigo_admin1).includes(termo)
    );
  }, [busca, subdivisoesEnriquecidas]);

  function handleChange<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }

  function iniciarEdicao(subdivisao: Subdivisao) {
    setEditandoId(subdivisao.id);
    setForm({
      nome: subdivisao.nome,
      pais_id: subdivisao.pais_id,
      codigo_admin1: subdivisao.codigo_admin1,
      tipo: subdivisao.tipo || "",
    });
    setMostrarFormulario(true);
  }

  function abrirFormulario() {
    iniciarNovo();
    setMostrarFormulario(true);
  }

  function fecharFormulario() {
    iniciarNovo();
    setMostrarFormulario(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (permissao === "view") {
      setErro("Voce nao tem permissao para salvar subdivisoes.");
      return;
    }
    if (!form.nome.trim() || !form.pais_id || !form.codigo_admin1.trim()) {
      setErro("Preencha nome, codigo e pais.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        nome: titleCaseWithExceptions(form.nome),
        pais_id: form.pais_id,
        codigo_admin1: form.codigo_admin1.trim(),
        tipo: form.tipo.trim() || null,
      };

      if (editandoId) {
        const { error } = await supabase.from("subdivisoes").update(payload).eq("id", editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subdivisoes").insert(payload);
        if (error) throw error;
      }

    await carregarDados(carregouTodos);
    fecharFormulario();
    } catch (e) {
      console.error(e);
      setErro("Erro ao salvar subdivisao.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (permissao !== "admin") {
      alert("Somente administradores podem excluir subdivisoes.");
      return;
    }
    if (!confirm("Excluir esta subdivisao?")) return;

    try {
      setExcluindoId(id);
      const { error } = await supabase.from("subdivisoes").delete().eq("id", id);
      if (error) throw error;
      await carregarDados(carregouTodos);
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir subdivisao. Verifique se nao existem cidades vinculadas.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (loadingPerm) {
    return (
      <div className="paises-page">
        <LoadingUsuarioContext />
      </div>
    );
  }
  if (!ativo) return <div className="paises-page">Voce nao possui acesso ao modulo de Cadastros.</div>;

  return (
    <div className="paises-page">
      <div className="card-base mb-3">
        <div
          className="form-row"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ flex: "1 1 320px" }}>
            <label className="form-label">Buscar subdivisão</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, país ou código..."
            />
          </div>
          {permissao !== "view" && (
            <div className="form-group" style={{ alignItems: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={abrirFormulario}
                disabled={mostrarFormulario}
              >
                Adicionar Estado/Província
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
                <label className="form-label">Nome da subdivisão *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  placeholder="Ex: Sao Paulo, California..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Código admin1 *</label>
                <input
                  className="form-input"
                  value={form.codigo_admin1}
                  onChange={(e) => handleChange("codigo_admin1", e.target.value)}
                  placeholder="Ex: SP, CA, NY..."
                />
              </div>
            </div>

            <div className="form-row" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <input
                  className="form-input"
                  value={form.tipo}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                  placeholder="Ex: Estado, Provincia, Regiao..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pais *</label>
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
                {salvando ? "Salvando..." : editandoId ? "Salvar alterações" : "Adicionar Estado/Província"}
              </button>
              <button type="button" className="btn btn-light" onClick={fecharFormulario} disabled={salvando}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!carregouTodos && (
        <div className="card-base card-config mb-3">
          Ultimas Subdivisoes Cadastradas (10). Digite na busca para consultar todas.
        </div>
      )}

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[720px]">
          <thead>
            <tr>
              <th>Subdivisao</th>
              <th>Codigo</th>
              <th>Pais</th>
              <th>Tipo</th>
              <th>Criado em</th>
              <th className="th-actions">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Carregando subdivisoes...</td>
              </tr>
            )}

            {!loading && filtrados.length === 0 && (
              <tr>
                <td colSpan={6}>Nenhuma subdivisao encontrada.</td>
              </tr>
            )}

            {!loading &&
              filtrados.map((s) => (
                <tr key={s.id}>
                  <td>{s.nome}</td>
                  <td>{s.codigo_admin1}</td>
                  <td>{(s as any).pais_nome || "-"}</td>
                  <td>{s.tipo || "-"}</td>
                  <td>{s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="th-actions">
                        {permissao !== "view" && (
                          <>
                            <button className="btn-icon" title="Editar" onClick={() => iniciarEdicao(s)}>
                              ✏️
                            </button>
                            {permissao === "admin" && (
                              <button
                                className="btn-icon btn-danger"
                                title="Excluir"
                                onClick={() => excluir(s.id)}
                                disabled={excluindoId === s.id}
                              >
                                {excluindoId === s.id ? "..." : "🗑️"}
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
