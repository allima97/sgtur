import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

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
  "Operacao",
  "Viagens",
  "Comissionamento",
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
  "AdminUsers",
  "AdminEmpresas",
  "AdminFinanceiro",
  "AdminPlanos"
];


export default function PermissoesAdminIsland() {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("AdminDashboard");

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState("");
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

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

  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!podeVer || !isAdmin)
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

  useEffect(() => {
    if (!usuarioSelecionadoId && usuarios.length > 0) {
      setUsuarioSelecionadoId(usuarios[0].id);
    }
  }, [usuarioSelecionadoId, usuarios]);

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

  const permissaoList = podeVer ? permissoes : [];
  const usuarioSelecionado = usuarios.find((u) => u.id === usuarioSelecionadoId) || null;

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
      showToast("Erro ao salvar permissão.", "error");
    }
  }

  // -----------------------
  // Renderização
  // -----------------------

  return (
    <div className="permissoes-admin-page">
      <div className="mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100">
        <strong>Editor de Permissões</strong> — controle total dos módulos
      </div>

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading && <div>Carregando...</div>}

      {/* LISTAGEM */}
      <div className="sm:hidden">
        <div className="card-base card-red mb-3">
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <select
              className="form-select"
              value={usuarioSelecionadoId}
              onChange={(e) => setUsuarioSelecionadoId(e.target.value)}
            >
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome_completo}
                </option>
              ))}
            </select>
          </div>
        </div>

        {usuarioSelecionado && (
          <div className="card-base card-red">
            <h3 className="mb-3 font-semibold">Permissões de {usuarioSelecionado.nome_completo}</h3>
            <div className="flex flex-col gap-2">
              {MODULOS.map((m) => {
                const per = getPermissao(usuarioSelecionado.id, m);
                return (
                  <div
                    key={m}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{m}</strong>
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
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <select
                        className="form-select"
                        disabled={!per.ativo}
                        value={per.permissao}
                        onChange={(e) =>
                          salvar({
                            ...per,
                            permissao: e.target.value as any,
                          })
                        }
                      >
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <div className="card-base card-red">
          <h3 className="mb-3 font-semibold">Usuários</h3>
          <div className="table-container overflow-x-auto">
            <table className="table-default table-header-red table-mobile-cards min-w-[900px]">
              <thead>
                <tr>
                  <th className="min-w-[180px]">Usuário</th>
                  {MODULOS.map((m) => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Usuário">
                      <strong>{u.nome_completo}</strong>
                      <br />
                      <small>{u.email}</small>
                      <br />
                      <small>Tipo: {u.tipo}</small>
                    </td>
                    {MODULOS.map((m) => {
                      const per = getPermissao(u.id, m);
                      return (
                        <td key={m} data-label={m}>
                          <div className="flex flex-col gap-1">
                            {/* Toggle ATIVO */}
                            <label className="text-xs">
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
                              className="text-xs bg-indigo-950 text-indigo-100 border border-indigo-900 rounded px-1 py-0.5"
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
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
