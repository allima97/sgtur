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
    <div className="mt-10">
      <h3 className="text-xl font-semibold mb-4">👥 Usuários do Sistema</h3>

      {erro && (
        <div className="bg-red-900 text-red-100 p-3 rounded mb-3">
          {erro}
        </div>
      )}

      {loading ? (
        <p>Carregando usuários...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-slate-900 text-slate-200 rounded-xl overflow-hidden border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Nome</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">E-mail</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Tipo</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Empresa</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Status</th>
                <th className="px-4 py-2 text-sm text-left border-b border-slate-700">Ações</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800">
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{u.nome_completo}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{u.email}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{u.user_types?.name || "—"}</td>
                  <td className="px-4 py-2 text-sm border-b border-slate-800">{u.companies?.nome_fantasia || "—"}</td>

                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    <span className={u.active ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                      {u.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="px-4 py-2 text-sm border-b border-slate-800">
                    <select
                      className="bg-slate-800 text-slate-100 rounded border border-slate-700 px-2 py-1 mr-2"
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
                      className="px-2 py-1 rounded bg-slate-700 text-slate-100 hover:opacity-85 transition"
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
    </div>
  );
};

export default UsuariosAdminIsland;
