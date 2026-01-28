import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissoesStore } from "../../lib/permissoesStore";
import { useRegisterForm } from "../../lib/useRegisterForm";
import CredentialsForm from "../forms/CredentialsForm";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";
import AlertMessage from "../ui/AlertMessage";
import { ToastStack, useToastQueue } from "../ui/Toast";

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

type CompanyRow = {
  id: string;
  nome_fantasia: string;
};

const UsuariosAdminIsland: React.FC = () => {
  const { can, loading: loadingPerms, ready } = usePermissoesStore();
  const loadingPerm = loadingPerms || !ready;
  const podeVer = can("AdminUsers") || can("AdminDashboard") || can("Admin");

  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [empresas, setEmpresas] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [novoNomeCompleto, setNovoNomeCompleto] = useState("");
  const [novaEmpresaId, setNovaEmpresaId] = useState("");
  const [novoTipoUsuarioId, setNovoTipoUsuarioId] = useState("");
  const [novoAtivo, setNovoAtivo] = useState(true);
  const { toasts, showToast, dismissToast } = useToastQueue({ durationMs: 3500 });

  useEffect(() => {
    carregarUsuarios();
    carregarTipos();
    carregarEmpresas();
  }, []);

  async function carregarTipos() {
    const { data, error } = await supabase
      .from("user_types")
      .select("id, name")
      .order("name");
    if (!error && data) setUserTypes(data);
  }

  async function carregarEmpresas() {
    const { data, error } = await supabase
      .from("companies")
      .select("id, nome_fantasia")
      .order("nome_fantasia");
    if (!error && data) setEmpresas(data as CompanyRow[]);
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
      showToast("Erro ao mudar tipo do usuário.", "error");
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
      showToast("Erro ao atualizar status.", "error");
    }
  }

  const registerForm = useRegisterForm({
    successMessage:
      "Usuário cadastrado! Ele receberá instruções por e-mail para validar o endereço.",
    onSuccess: async (user) => {
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        nome_completo: novoNomeCompleto || null,
        company_id: novaEmpresaId || null,
        user_type_id: novoTipoUsuarioId || null,
        active: novoAtivo,
        uso_individual: false,
      });
      await carregarUsuarios();
      setCreateModalOpen(false);
      setNovoNomeCompleto("");
      setNovaEmpresaId("");
      setNovoTipoUsuarioId("");
      setNovoAtivo(true);
    },
  });

  const openCreateUserModal = () => {
    setNovoNomeCompleto("");
    setNovaEmpresaId("");
    setNovoTipoUsuarioId("");
    setNovoAtivo(true);
    registerForm.resetFields();
    setCreateModalOpen(true);
  };

  if (loadingPerm) return <LoadingUsuarioContext />;

  if (!podeVer) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar este módulo.</h3>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-semibold">👥 Usuários do Sistema</h3>
        <button className="btn btn-primary" onClick={openCreateUserModal}>
          Novo usuário
        </button>
      </div>

      {erro && (
        <div className="mb-3">
          <AlertMessage variant="error">{erro}</AlertMessage>
        </div>
      )}

      {loading ? (
        <p className="mt-3">Carregando usuários...</p>
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
      {createModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4">
          <form
            className="card-base card-config w-full max-w-xl"
            onSubmit={registerForm.handleSubmit}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold">Cadastro administrativo de usuário</h4>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setCreateModalOpen(false)}
                disabled={registerForm.loading}
              >
                Fechar
              </button>
            </div>

            {registerForm.message && (
              <div className="card-base card-config mb-3">{registerForm.message}</div>
            )}

            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input
                className="form-input"
                value={novoNomeCompleto}
                onChange={(e) => setNovoNomeCompleto(e.target.value)}
                required
                placeholder="Nome do usuário"
              />
            </div>

            <CredentialsForm
              email={registerForm.email}
              password={registerForm.password}
              confirmPassword={registerForm.confirmPassword}
              onEmailChange={registerForm.setEmail}
              onPasswordChange={registerForm.setPassword}
              onConfirmPasswordChange={registerForm.setConfirmPassword}
              disabled={registerForm.loading}
            />

            <div className="form-row mt-2">
              <div className="form-group flex-1">
                <label className="form-label">Tipo de usuário</label>
                <select
                  className="form-select"
                  value={novoTipoUsuarioId}
                  onChange={(e) => setNovoTipoUsuarioId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {userTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Empresa</label>
                <select
                  className="form-select"
                  value={novaEmpresaId}
                  onChange={(e) => setNovaEmpresaId(e.target.value)}
                >
                  <option value="">Sem empresa</option>
                  {empresas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome_fantasia}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Ativo?</label>
                <select
                  className="form-select"
                  value={novoAtivo ? "true" : "false"}
                  onChange={(e) => setNovoAtivo(e.target.value === "true")}
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mt-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={registerForm.loading}
              >
                Criar usuário
              </button>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setCreateModalOpen(false)}
                disabled={registerForm.loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default UsuariosAdminIsland;
