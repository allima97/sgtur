import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserRow = {
  id: string;
  nome_completo: string;
  email: string | null;
  active: boolean;
  user_types?: {
    name: string;
  } | null;
  companies?: {
    nome_fantasia: string;
  } | null;
};

type UserType = {
  id: string;
  name: string;
};

const UsuariosAdminIsland: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarUsuarios();
    carregarTipos();
  }, []);

  async function carregarTipos() {
    const { data, error } = await supabase
      .from("user_types")
      .select("id, name")
      .order("name");
    if (!error && data) setUserTypes(data);
  }

  async function carregarUsuarios() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          nome_completo,
          email,
          active,
          user_types(name),
          companies (nome_fantasia)
        `)
        .order("nome_completo", { ascending: true });

      if (error) throw error;

      setUsuarios(data as UserRow[]);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  async function atualizarTipoUsuario(id: string, user_type_id: string) {
    try {
      const { error } = await supabase
        .from("users")
        .update({ user_type_id })
        .eq("id", id);

      if (error) throw error;
      await carregarUsuarios();
    } catch (e) {
      alert("Erro ao mudar tipo do usuário.");
    }
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    try {
      const { error } = await supabase
        .from("users")
        .update({ active: ativo })
        .eq("id", id);

      if (error) throw error;
      await carregarUsuarios();
    } catch (e) {
      alert("Erro ao atualizar status.");
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h3 style={{ fontSize: "1.4rem", marginBottom: 15 }}>
        👥 Usuários do Sistema
      </h3>

      {erro && (
        <div style={{ background: "#7f1d1d", padding: 10, borderRadius: 8 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <p>Carregando usuários...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#0f172a",
              color: "#e2e8f0",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#1e293b" }}>
                <th className="th">Nome</th>
                <th className="th">E-mail</th>
                <th className="th">Tipo</th>
                <th className="th">Empresa</th>
                <th className="th">Status</th>
                <th className="th">Ações</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="tr">
                  <td className="td">{u.nome_completo}</td>
                  <td className="td">{u.email}</td>
                  <td className="td">{u.user_types?.name || "—"}</td>
                  <td className="td">{u.companies?.nome_fantasia || "—"}</td>

                  <td className="td">
                    <span
                      style={{
                        color: u.active ? "#22c55e" : "#ef4444",
                        fontWeight: "bold",
                      }}
                    >
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="td">
                    <select
                      style={{
                        background: "#1e293b",
                        color: "#e2e8f0",
                        borderRadius: 6,
                        border: "1px solid #334155",
                        padding: "4px 7px",
                        marginRight: "8px",
                      }}
                      value={u.user_types?.name || ""}
                      onChange={(e) => {
                        const tipoNome = e.target.value;
                        const tipoObj = userTypes.find((t) => t.name === tipoNome);
                        if (tipoObj) atualizarTipoUsuario(u.id, tipoObj.id);
                      }}
                    >
                      <option value="">Selecionar cargo</option>
                      {userTypes.map((tipo) => (
                        <option key={tipo.id} value={tipo.name}>
                          {tipo.name}
                        </option>
                      ))}
                    </select>

                    <button
                      className="btn-small"
                      onClick={() => toggleAtivo(u.id, !u.active)}
                    >
                      {u.active ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .th {
          padding: 10px;
          font-size: 0.85rem;
          text-align: left;
          border-bottom: 1px solid #334155;
        }
        .td {
          padding: 10px;
          font-size: 0.85rem;
          border-bottom: 1px solid #1e293b;
        }
        .tr:hover {
          background: #1e293b;
        }
        .btn-small {
          padding: 4px 7px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          background: #334155;
          color: #e2e8f0;
        }
        .btn-small:hover {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
};

export default UsuariosAdminIsland;
