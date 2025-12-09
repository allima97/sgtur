import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";

type Usuario = {
  id: string;
  nome_completo: string;
  email: string | null;
  tipo: string;
};

type Permissao = {
  id: string;
  usuario_id: string;
  modulo: string;
  permissao: "view" | "edit" | "admin";
  ativo: boolean;
};

const MODULOS = [
  "Dashboard",
  "Clientes",
  "Vendas",
  "Orcamentos",
  "Cadastros",
  "Paises",
  "Cidades",
  "Destinos",
  "Produtos",
  "Relatorios",
  "Parametros",
  "Metas",
  "RegrasComissao",
  "Admin",
  "AdminDashboard",
  "AdminLogs",
  "AdminUsers"
];


export default function PermissoesAdminIsland() {
  const { permissao, ativo, loading: loadingPerm } =
    usePermissao("AdminDashboard");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);

  // -----------------------
  // Validar se é ADMIN
  // -----------------------
  useEffect(() => {
    async function loadType() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { data: u } = await supabase
        .from("users")
        .select("id, user_types(name)")
        .eq("id", auth.user.id)
        .maybeSingle();

      const tipo = Array.isArray(u?.user_types) && u.user_types.length > 0
        ? u.user_types[0].name?.toUpperCase() || ""
        : "";
      setIsAdmin(tipo.includes("ADMIN"));
    }
    loadType();
  }, []);

  if (loadingPerm) return <div>Carregando permissões...</div>;
  if (!ativo || !isAdmin)
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar este módulo.</h3>
      </div>
    );

  // -----------------------
  // Carregar usuários + permissões
  // -----------------------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro(null);

        const { data: us } = await supabase
          .from("users")
          .select("id, nome_completo, email, user_types(name)")
          .order("nome_completo");

        const listaUsers =
          us?.map((u) => ({
            id: u.id,
            nome_completo: u.nome_completo,
            email: u.email,
            tipo: Array.isArray(u.user_types) && u.user_types.length > 0
              ? u.user_types[0].name || "OUTRO"
              : "OUTRO",
          })) || [];

        setUsuarios(listaUsers);

        const { data: perm } = await supabase
          .from("modulo_acesso")
          .select("*");

        setPermissoes(perm || []);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // -----------------------
  // Helpers
  // -----------------------

  function getPermissao(usuarioId: string, modulo: string): Permissao {
    const item = permissaoEncontrada(usuarioId, modulo);
    if (item) return item;

    // se não existir → criar temporário
    return {
      id: "",
      usuario_id: usuarioId,
      modulo,
      permissao: "view",
      ativo: false,
    };
  }

  function permissaoEncontrada(usuarioId: string, modulo: string) {
    return permissaoList.find(
      (p) => p.usuario_id === usuarioId && p.modulo === modulo
    );
  }

  const permissaoList = permissao ? permissoes : [];

  // -----------------------
  // Salvar alterações
  // -----------------------

  async function salvar(per: Permissao) {
    try {
      if (!per.id) {
        // criar
        const { error } = await supabase.from("modulo_acesso").insert({
          usuario_id: per.usuario_id,
          modulo: per.modulo,
          permissao: per.permissao,
          ativo: per.ativo,
        });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("modulo_acesso")
          .update({
            permissao: per.permissao,
            ativo: per.ativo,
          })
          .eq("id", per.id);

        if (error) throw error;
      }

      // recarregar
      const { data } = await supabase.from("modulo_acesso").select("*");
      setPermissoes(data || []);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar permissão.");
    }
  }

  // -----------------------
  // Renderização
  // -----------------------

  return (
    <div className="permissoes-admin-page">
      <div
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          background: "#4c0519",
          border: "1px solid #be123c",
          borderRadius: 8,
          color: "#fecdd3",
        }}
      >
        <strong>Editor de Permissões</strong> — controle total dos módulos
      </div>

      {erro && (
        <div className="card-base card-config mb-3">{erro}</div>
      )}

      {loading && <div>Carregando...</div>}

      {/* LISTAGEM */}
      <div className="card-base card-red">
        <h3 style={{ marginBottom: 12 }}>Usuários</h3>

        <div className="table-container overflow-x-auto">
          <table className="table-default table-header-red min-w-[900px]">
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Usuário</th>
                {MODULOS.map((m) => (
                  <th key={m}>{m}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <strong>{u.nome_completo}</strong>
                    <br />
                    <small>{u.email}</small>
                    <br />
                    <small>Tipo: {u.tipo}</small>
                  </td>

                  {MODULOS.map((m) => {
                    const per = getPermissao(u.id, m);

                    return (
                      <td key={m}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {/* Toggle ATIVO */}
                          <label style={{ fontSize: 12 }}>
                            <input
                              type="checkbox"
                              checked={per.ativo}
                              onChange={(e) =>
                                salvar({
                                  ...per,
                                  ativo: e.target.checked,
                                })
                              }
                            />{" "}
                            ativo
                          </label>

                          {/* SELECT PERMISSÃO */}
                          <select
                            disabled={!per.ativo}
                            value={per.permissao}
                            onChange={(e) =>
                              salvar({
                                ...per,
                                permissao: e.target.value as any,
                              })
                            }
                            style={{
                              fontSize: 12,
                              background: "#1e1b4b",
                              color: "#e0e7ff",
                              border: "1px solid #312e81",
                              borderRadius: 4,
                              padding: "2px 4px",
                            }}
                          >
                            <option value="view">View</option>
                            <option value="edit">Edit</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
