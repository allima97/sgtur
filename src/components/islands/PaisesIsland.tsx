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
  codigo_iso: string | null;
  continente: string | null;
  created_at: string | null;
};

type FormState = {
  nome: string;
  codigo_iso: string;
  continente: string;
};

const initialForm: FormState = {
  nome: "",
  codigo_iso: "",
  continente: ""
};

export default function PaisesIsland() {
  const [paises, setPaises] = useState<Pais[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [carregouTodos, setCarregouTodos] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  async function carregarPaises(todos = false) {
    try {
      setLoading(true);
      setErro(null);

      const query = supabase
        .from("paises")
        .select("id, nome, codigo_iso, continente, created_at")
        .order(todos ? "nome" : "created_at", { ascending: !todos })
        .limit(todos ? undefined : 10);

      const { data, error } = await query;

      if (error) throw error;
      setPaises((data || []) as Pais[]);
      setCarregouTodos(todos || false);
    } catch (e: any) {
      console.error(e);
      setErro(
        "Erro ao carregar países. Verifique se a tabela 'paises' existe e se as colunas estão corretas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPaises(false);
  }, []);

  useEffect(() => {
    if (busca.trim() && !carregouTodos) {
      carregarPaises(true);
    }
  }, [busca, carregouTodos]);

  const paisesFiltrados = useMemo(() => {
    if (!busca.trim()) return paises;
    const termo = normalizeText(busca);
    return paises.filter((p) => normalizeText(p.nome).includes(termo));
  }, [busca, paises]);

  function handleChange(campo: keyof FormState, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function iniciarNovo() {
    setForm(initialForm);
    setEditandoId(null);
    setErro(null);
  }

  function iniciarEdicao(pais: Pais) {
    setEditandoId(pais.id);
    setForm({
      nome: pais.nome,
      codigo_iso: pais.codigo_iso || "",
      continente: pais.continente || ""
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
      setErro("Você não tem permissão para salvar países.");
      return;
    }

    if (!form.nome.trim()) {
      setErro("Nome é obrigatório.");
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const nomeNormalizado = titleCaseWithExceptions(form.nome);

      if (editandoId) {
        const { error } = await supabase
          .from("paises")
          .update({
            nome: nomeNormalizado,
            codigo_iso: form.codigo_iso.trim() || null,
            continente: form.continente.trim() || null
          })
          .eq("id", editandoId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("paises").insert({
          nome: nomeNormalizado,
          codigo_iso: form.codigo_iso.trim() || null,
          continente: form.continente.trim() || null
        });

        if (error) throw error;
      }

      await carregarPaises(carregouTodos);
      fecharFormulario();
    } catch (e: any) {
      console.error(e);
      setErro("Erro ao salvar país. Verifique se o nome é único.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (permissao !== "admin") {
      window.alert("Somente administradores podem excluir países.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este país?")) return;

    try {
      setExcluindoId(id);
      setErro(null);

      const { error } = await supabase.from("paises").delete().eq("id", id);
      if (error) throw error;

      await carregarPaises(carregouTodos);
    } catch (e: any) {
      console.error(e);
      setErro(
        "Não foi possível excluir o país. Verifique se não existem destinos vinculados."
      );
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

  if (!ativo) {
    return (
      <div className="paises-page">
        Você não possui acesso ao módulo de Cadastros.
      </div>
    );
  }

  return (
    <div className="paises-page">
      <div className="card-base mb-3">
        <div
          className="form-row"
          style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="form-group" style={{ flex: "1 1 320px" }}>
            <label className="form-label">Buscar país</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite parte do nome..."
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
                Adicionar país
              </button>
            </div>
          )}
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card-base card-blue form-card mb-3">
          <form onSubmit={salvar}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nome do país *</label>
                <input
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  onBlur={(e) => handleChange("nome", titleCaseWithExceptions(e.target.value))}
                  placeholder="Ex: Brasil, Estados Unidos, França..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Código ISO</label>
                <input
                  className="form-input"
                  value={form.codigo_iso}
                  onChange={(e) => handleChange("codigo_iso", e.target.value)}
                  placeholder="Ex: BR, US, FR..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Continente</label>
                <input
                  className="form-input"
                  value={form.continente}
                  onChange={(e) => handleChange("continente", e.target.value)}
                  placeholder="Ex: América do Sul, Europa..."
                />
              </div>
            </div>

            <div className="mt-2" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando || permissao === "view"}
              >
                {salvando
                  ? "Salvando..."
                  : editandoId
                  ? "Salvar alterações"
                  : "Adicionar país"}
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={fecharFormulario}
                disabled={salvando}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!carregouTodos && (
        <div className="card-base card-config mb-3">
          Últimos Países Cadastrados (10). Digite na busca para consultar todos.
        </div>
      )}

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue table-mobile-cards min-w-[520px]">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código ISO</th>
              <th>Continente</th>
              <th>Criado em</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5}>Carregando países...</td>
              </tr>
            )}

            {!loading && paisesFiltrados.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhum país encontrado.</td>
              </tr>
            )}

            {!loading &&
              paisesFiltrados.map((p) => (
                <tr key={p.id}>
                  <td data-label="Nome">{p.nome}</td>
                  <td data-label="Codigo ISO">{p.codigo_iso || "-"}</td>
                  <td data-label="Continente">{p.continente || "-"}</td>
                  <td data-label="Criado em">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="th-actions" data-label="Acoes">
                    {permissao !== "view" && (
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          title="Editar"
                          onClick={() => iniciarEdicao(p)}
                        >
                          ✏️
                        </button>
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
                      </div>
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
