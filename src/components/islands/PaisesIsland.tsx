import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

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

  async function carregarPaises() {
    try {
      setLoading(true);
      setErro(null);

      const { data, error } = await supabase
        .from("paises")
        .select("id, nome, codigo_iso, continente, created_at")
        .order("nome", { ascending: true });

      if (error) throw error;
      setPaises((data || []) as Pais[]);
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
    carregarPaises();
  }, []);

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

      if (editandoId) {
        const { error } = await supabase
          .from("paises")
          .update({
            nome: form.nome.trim(),
            codigo_iso: form.codigo_iso.trim() || null,
            continente: form.continente.trim() || null
          })
          .eq("id", editandoId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("paises").insert({
          nome: form.nome.trim(),
          codigo_iso: form.codigo_iso.trim() || null,
          continente: form.continente.trim() || null
        });

        if (error) throw error;
      }

      setForm(initialForm);
      setEditandoId(null);
      await carregarPaises();
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

      await carregarPaises();
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
    return <div className="paises-page">Carregando permissões...</div>;
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
      <div className="card-base card-blue mb-3">
        <form onSubmit={salvar}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nome do país *</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => handleChange("nome", e.target.value)}
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
            {editandoId && (
              <button
                type="button"
                className="btn btn-light"
                onClick={iniciarNovo}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card-base mb-3">
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Buscar país</label>
            <input
              className="form-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite parte do nome..."
            />
          </div>
        </div>
      </div>

      {erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[520px]">
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
                  <td>{p.nome}</td>
                  <td>{p.codigo_iso || "-"}</td>
                  <td>{p.continente || "-"}</td>
                  <td>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td className="th-actions">
                    {permissao !== "view" && (
                      <>
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
