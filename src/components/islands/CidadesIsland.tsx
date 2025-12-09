import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { registrarLog } from "../../lib/logs";

type Pais = {
  id: string;
  nome: string;
};

type Cidade = {
  id: string;
  nome: string;
  pais_id: string;
  estado_provincia: string | null;
  descricao: string | null;
  created_at: string | null;
};

const initialForm = {
  nome: "",
  pais_id: "",
  estado_provincia: "",
  descricao: "",
};

export default function CidadesIsland() {
  // PERMISSÕES
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
  const podeExcluir =
    isAdmin || permissao === "delete" || permissao === "admin";

  // STATES
  const [paises, setPaises] = useState<Pais[]>([]);
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // CARREGAR DADOS
  async function carregar() {
    if (!podeVer) return;

    try {
      setLoading(true);

      const [{ data: paisesData }, { data: cidadesData }] = await Promise.all([
        supabase.from("paises").select("id, nome").order("nome"),
        supabase.from("cidades").select("*").order("nome"),
      ]);

      setPaises(paisesData || []);
      setCidades(cidadesData || []);
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
    carregar();
  }, [carregando, podeVer]);

  // FILTRO
  const filtradas = useMemo(() => {
    if (!busca.trim()) return cidades;

    const t = busca.toLowerCase();
    return cidades.filter(
      (c) =>
        c.nome.toLowerCase().includes(t) ||
        (paises.find((p) => p.id === c.pais_id)?.nome.toLowerCase() || "").includes(t)
    );
  }, [busca, cidades, paises]);
  // CHANGE
  function handleChange(campo: string, valor: any) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  // EDITAR
  function iniciarEdicao(c: Cidade) {
    if (!podeEditar) return;

    setEditId(c.id);
    setForm({
      nome: c.nome,
      pais_id: c.pais_id,
      estado_provincia: c.estado_provincia || "",
      descricao: c.descricao || "",
    });
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

    try {
      setSalvando(true);
      setErro(null);

      const payload = {
        nome: form.nome,
        pais_id: form.pais_id,
        estado_provincia: form.estado_provincia || null,
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
      carregar();
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

      carregar();
    } catch (e) {
      console.error(e);
      setErro("Erro ao excluir cidade (provavelmente usada em Destinos).");
    } finally {
      setExcluindoId(null);
    }
  }

  if (!podeVer && !isAdmin) {
    if (carregando) {
      return <div className="auth-info">Carregando permissões...</div>;
    }
    return <div className="auth-error">Você não possui permissão para visualizar Cidades.</div>;
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
                <label className="form-label">País *</label>
                <select
                  className="form-select"
                  value={form.pais_id}
                  onChange={(e) => handleChange("pais_id", e.target.value)}
                  required
                >
                  <option value="">Selecione</option>
                  {paises.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estado/Província</label>
                <input
                  className="form-input"
                  value={form.estado_provincia}
                  onChange={(e) => handleChange("estado_provincia", e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="btn btn-primary" disabled={salvando}>
                {salvando
                  ? "Salvando..."
                  : editId
                  ? "Salvar alterações"
                  : "Adicionar cidade"}
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
              placeholder="Nome ou país..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      {carregando && <div className="auth-info mb-3">Carregando permissões...</div>}
      {!carregando && erro && (
        <div className="card-base card-config mb-3">
          <strong>{erro}</strong>
        </div>
      )}

      <div className="table-container overflow-x-auto">
        <table className="table-default table-header-blue min-w-[720px]">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Estado/Prov.</th>
              <th>País</th>
              <th>Criada em</th>
              {(podeEditar || podeExcluir) && <th className="th-actions">Ações</th>}
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
                  <td>{c.estado_provincia || "—"}</td>
                  <td>{paises.find((p) => p.id === c.pais_id)?.nome || "—"}</td>
                  <td>{c.created_at ? c.created_at.slice(0, 10) : "—"}</td>
                  {(podeEditar || podeExcluir) && (
                    <td className="th-actions">
                      {podeEditar && (
                        <button
                          className="btn-icon"
                          onClick={() => iniciarEdicao(c)}
                          title="Editar"
                        >
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
