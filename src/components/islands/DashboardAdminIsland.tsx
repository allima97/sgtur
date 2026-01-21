import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePermissao } from "../../lib/usePermissao";
import { useRegisterForm } from "../../lib/useRegisterForm";
import CredentialsForm from "../forms/CredentialsForm";
import LoadingUsuarioContext from "../ui/LoadingUsuarioContext";

type Empresa = {
  id: string;
  nome_empresa: string;
  nome_fantasia: string;
  cnpj: string;
  cidade: string | null;
  estado: string | null;
  active?: boolean | null;
};

type Usuario = {
  id: string;
  nome_completo: string;
  email: string | null;
  user_types?: { name: string } | null;
  active: boolean;
  company_id?: string | null;
  user_type_id?: string | null;
};

type Gestor = {
  id: string;
  nome_completo: string;
  vendedores: number;
};

type UserType = {
  id: string;
  name: string;
};

type CompanyForm = {
  id?: string;
  nome_empresa: string;
  nome_fantasia: string;
  cnpj: string;
  cidade?: string;
  estado?: string;
  active: boolean;
};

type UserForm = {
  id: string;
  nome_completo: string;
  email: string;
  company_id: string;
  user_type_id: string;
  active: boolean;
};

type GestorVendedorRow = {
  id: string;
  gestor_id: string;
  vendedor_id: string;
  ativo: boolean;
};

const defaultCompanyForm: CompanyForm = {
  nome_empresa: "",
  nome_fantasia: "",
  cnpj: "",
  cidade: "",
  estado: "",
  active: true,
};

const defaultUserForm: UserForm = {
  id: "",
  nome_completo: "",
  email: "",
  company_id: "",
  user_type_id: "",
  active: true,
};

type SistemaCount = {
  clientes: number;
  vendas: number;
  produtos: number;
  tipos: number;
};

export default function DashboardAdminIsland() {
  const { permissao, ativo, loading: loadingPerm } =
    usePermissao("AdminDashboard");

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [sistema, setSistema] = useState<SistemaCount>({
    clientes: 0,
    vendas: 0,
    produtos: 0,
    tipos: 0,
  });
  const [companyForm, setCompanyForm] = useState<CompanyForm>(defaultCompanyForm);
  const [userForm, setUserForm] = useState<UserForm>(defaultUserForm);
  const [userTypes, setUserTypes] = useState<UserType[]>([]);
  const [gestorVendedorRows, setGestorVendedorRows] = useState<GestorVendedorRow[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [selectedManagerVendedores, setSelectedManagerVendedores] = useState<string[]>([]);
  const [operationLoading, setOperationLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [managerModalOpen, setManagerModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [novoNomeCompleto, setNovoNomeCompleto] = useState("");
  const [novaEmpresaId, setNovaEmpresaId] = useState("");
  const [novoTipoUsuarioId, setNovoTipoUsuarioId] = useState("");
  const [novoAtivo, setNovoAtivo] = useState(true);

  const companyMap = useMemo(
    () => Object.fromEntries(empresas.map((c) => [c.id, c.nome_fantasia])),
    [empresas]
  );

  const vendorUsers = useMemo(
    () =>
      usuarios.filter((u) =>
        (u.user_types?.name || "").toUpperCase().includes("VENDEDOR")
      ),
    [usuarios]
  );

  const gestorAssignmentMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    gestorVendedorRows.forEach((row) => {
      if (!row.ativo) return;
      if (!map[row.gestor_id]) map[row.gestor_id] = [];
      map[row.gestor_id].push(row.vendedor_id);
    });
    return map;
  }, [gestorVendedorRows]);

  const selectedManager = useMemo(
    () => gestores.find((g) => g.id === selectedManagerId) || null,
    [gestores, selectedManagerId]
  );

  useEffect(() => {
    if (selectedManagerId) {
      setSelectedManagerVendedores(gestorAssignmentMap[selectedManagerId] || []);
    }
  }, [gestorAssignmentMap, selectedManagerId]);

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);

      const [empRes, usersRes, typesRes, gestorRowsRes] = await Promise.all([
        supabase.from("companies").select("*").order("nome_fantasia"),
        supabase
          .from("users")
          .select("id, nome_completo, email, active, company_id, user_type_id, user_types(name)")
          .order("nome_completo"),
        supabase.from("user_types").select("id, name").order("name"),
        supabase.from("gestor_vendedor").select("id, gestor_id, vendedor_id, ativo"),
      ]);

      if (empRes.error || usersRes.error || typesRes.error || gestorRowsRes.error) {
        throw empRes.error || usersRes.error || typesRes.error || gestorRowsRes.error;
      }

      const companiesData = empRes.data || [];
      const usersData = usersRes.data || [];
      const typesData = typesRes.data || [];
      const gestorRowsData = gestorRowsRes.data || [];

      const managerUsers = usersData.filter((u) =>
        (u.user_types?.name || "").toUpperCase().includes("GESTOR")
      );

      const assignmentMap: Record<string, string[]> = {};
      gestorRowsData.forEach((row) => {
        if (!row.ativo) return;
        if (!assignmentMap[row.gestor_id]) assignmentMap[row.gestor_id] = [];
        assignmentMap[row.gestor_id].push(row.vendedor_id);
      });

      setEmpresas(companiesData);
      setUsuarios(usersData);
      setUserTypes(typesData);
      setGestorVendedorRows(gestorRowsData);

      const gestorList = managerUsers.map((g) => ({
        id: g.id,
        nome_completo: g.nome_completo,
        vendedores: assignmentMap[g.id]?.length || 0,
      }));
      setGestores(gestorList);

      const tabelas = [
        { chave: "clientes", tabela: "clientes" },
        { chave: "vendas", tabela: "vendas" },
        { chave: "produtos", tabela: "produtos" },
        { chave: "tipos", tabela: "tipo_produtos" },
      ];
      const resultado: SistemaCount = { clientes: 0, vendas: 0, produtos: 0, tipos: 0 };

      for (const { chave, tabela } of tabelas) {
        const { count } = await supabase
          .from(tabela)
          .select("*", { count: "exact", head: true });

        (resultado as any)[chave] = count || 0;
      }

      setSistema(resultado);
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados administrativos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const registerForm = useRegisterForm({
    successMessage:
      "Usuário cadastrado! Ele receberá instruções por e-mail para validar o endereço e, no primeiro acesso, completar o perfil.",
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

      setSuccessMessage("Usuário criado com sucesso.");
      await fetchAdminData();
      setCreateUserModalOpen(false);
      setNovoNomeCompleto("");
      setNovaEmpresaId("");
      setNovoTipoUsuarioId("");
      setNovoAtivo(true);
    },
  });

  // =========================================================
  // VERIFICAR SE O USUÁRIO É ADMIN
  // =========================================================
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadAdmin() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;

        const { data: u } = await supabase
          .from("users")
          .select("id, user_types(name)")
          .eq("id", data.user.id)
          .maybeSingle();

        const tipo = u?.user_types?.name?.toUpperCase() || "";
        setIsAdmin(tipo.includes("ADMIN"));
      } catch (e) {
        console.error(e);
      }
    }
    loadAdmin();
  }, []);

  // =========================================================
  // CARREGAR DADOS ADMINISTRATIVOS
  // =========================================================
  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const resetCompanyForm = () => {
    setCompanyForm(defaultCompanyForm);
  };

  const resetUserForm = () => {
    setUserForm(defaultUserForm);
  };

  const handleCompanySelect = (company: Empresa) => {
    setCompanyForm({
      id: company.id,
      nome_empresa: company.nome_empresa,
      nome_fantasia: company.nome_fantasia,
      cnpj: company.cnpj,
      cidade: company.cidade || "",
      estado: company.estado || "",
      active: company.active !== false,
    });
  };

  const handleUserSelect = (user: Usuario) => {
    setUserForm({
      id: user.id,
      nome_completo: user.nome_completo,
      email: user.email || "",
      company_id: user.company_id || "",
      user_type_id: user.user_type_id || "",
      active: user.active,
    });
  };

  const openCompanyModal = (company?: Empresa) => {
    if (company) {
      handleCompanySelect(company);
    } else {
      resetCompanyForm();
    }
    setCompanyModalOpen(true);
  };

  const openEditUserModal = (user?: Usuario) => {
    if (user) {
      handleUserSelect(user);
    } else {
      resetUserForm();
    }
    setUserModalOpen(true);
  };

  const openManagerModal = (managerId?: string) => {
    if (managerId) {
      setSelectedManagerId(managerId);
    } else {
      setSelectedManagerId(null);
      setSelectedManagerVendedores([]);
    }
    setManagerModalOpen(true);
  };

  const openCreateUserModal = () => {
    setNovoNomeCompleto("");
    setNovaEmpresaId("");
    setNovoTipoUsuarioId("");
    setNovoAtivo(true);
    registerForm.resetFields();
    setCreateUserModalOpen(true);
  };

  const toggleVendorSelection = (vendorId: string) => {
    setSelectedManagerVendedores((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  async function handleSaveCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOperationLoading(true);
    setErro(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, any> = {
        nome_empresa: companyForm.nome_empresa,
        nome_fantasia: companyForm.nome_fantasia,
        cnpj: companyForm.cnpj,
        cidade: companyForm.cidade || null,
        estado: companyForm.estado || null,
        active: companyForm.active,
      };

      if (companyForm.id) {
        payload.id = companyForm.id;
        const { error } = await supabase.from("companies").update(payload).eq("id", companyForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
      }

      setSuccessMessage("Empresa salva com sucesso.");
      resetCompanyForm();
      setCompanyModalOpen(false);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível salvar a empresa.");
    } finally {
      setOperationLoading(false);
    }
  }

  async function handleSaveUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userForm.id) {
      setErro("Selecione um usuário para editar.");
      return;
    }
    setOperationLoading(true);
    setErro(null);
    setSuccessMessage(null);

    try {
      const payload = {
        nome_completo: userForm.nome_completo,
        email: userForm.email || null,
        company_id: userForm.company_id || null,
        user_type_id: userForm.user_type_id || null,
        active: userForm.active,
      };

      const { error } = await supabase.from("users").update(payload).eq("id", userForm.id);
      if (error) throw error;

      setSuccessMessage("Usuário atualizado com sucesso.");
      resetUserForm();
      setUserModalOpen(false);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setErro("Não foi possível atualizar o usuário.");
    } finally {
      setOperationLoading(false);
    }
  }

  async function handleSaveManagerTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedManagerId) {
      setErro("Selecione um gestor para atualizar a equipe.");
      return;
    }
    setOperationLoading(true);
    setErro(null);
    setSuccessMessage(null);

    try {
      const { data: rows, error } = await supabase
        .from("gestor_vendedor")
        .select("id, gestor_id, vendedor_id, ativo")
        .eq("gestor_id", selectedManagerId);
      if (error) throw error;

      const existing = (rows || []) as GestorVendedorRow[];
      const existingMap = new Map(existing.map((row) => [row.vendedor_id, row]));

      const prevActive = existing.filter((row) => row.ativo).map((row) => row.vendedor_id);
      const desired = selectedManagerVendedores;

      const toActivate = desired.filter((id) => !prevActive.includes(id));
      const toDeactivate = prevActive.filter((id) => !desired.includes(id));

      const ops: Promise<any>[] = [];

      for (const vendorId of toActivate) {
        const row = existingMap.get(vendorId);
        if (row) {
          ops.push(
            supabase
              .from("gestor_vendedor")
              .update({ ativo: true })
              .eq("id", row.id)
          );
        } else {
          ops.push(
            supabase.from("gestor_vendedor").insert({
              gestor_id: selectedManagerId,
              vendedor_id: vendorId,
              ativo: true,
            })
          );
        }
      }

      for (const vendorId of toDeactivate) {
        const row = existingMap.get(vendorId);
        if (row) {
          ops.push(
            supabase
              .from("gestor_vendedor")
              .update({ ativo: false })
              .eq("id", row.id)
          );
        }
      }

      const results = await Promise.all(ops);
      const failure = results.find((r) => (r as any)?.error);
      if (failure && (failure as any).error) {
        throw (failure as any).error;
      }

      setSuccessMessage("Equipe do gestor atualizada.");
      await fetchAdminData();
      setSelectedManagerVendedores(desired);
      setManagerModalOpen(false);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível atualizar a equipe do gestor.");
    } finally {
      setOperationLoading(false);
    }
  }

  // bloquear quem não é admin
  if (loadingPerm) return <LoadingUsuarioContext />;
  if (!ativo || !isAdmin)
    return (
      <div style={{ padding: 20 }}>
        <h3>Apenas administradores podem acessar este dashboard.</h3>
      </div>
    );

  // =========================================================
  // UI PRINCIPAL
  // =========================================================

  return (
    <div className="dashboard-admin-page">
      {successMessage && (
        <div className="card-base card-green mb-3">{successMessage}</div>
      )}

      {/* INDICADOR */}
      <div className="mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100">
        <strong>Dashboard Administrativo</strong> — Controle Geral do Sistema
      </div>

      {/* KPIs do Sistema */}
      <div className="card-base card-red mb-3">
        <h3 className="mb-3 font-semibold text-lg">Visão geral do sistema</h3>
        <div className="grid gap-2 md:gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div className="kpi-card">
            <div className="kpi-label">Clientes</div>
            <div className="kpi-value">{sistema.clientes}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Vendas</div>
            <div className="kpi-value">{sistema.vendas}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Produtos</div>
            <div className="kpi-value">{sistema.produtos}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Tipos de produto</div>
            <div className="kpi-value">{sistema.tipos}</div>
          </div>
        </div>
      </div>

      {/* EMPRESAS */}
      <div className="card-base card-red mb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="font-semibold mb-0">Empresas cadastradas</h3>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openCompanyModal()}
          >
            Nova empresa
          </button>
        </div>
        <div className="table-container overflow-x-auto mt-4">
          <table className="table-default table-header-red min-w-[720px]">
            <thead>
              <tr>
                <th>Nome fantasia</th>
                <th>Razão social</th>
                <th>CNPJ</th>
                <th>UF</th>
                <th>Ativa</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhuma empresa cadastrada.</td>
                </tr>
              ) : (
                empresas.map((e) => (
                  <tr key={e.id}>
                    <td>{e.nome_fantasia}</td>
                    <td>{e.nome_empresa}</td>
                    <td>{e.cnpj}</td>
                    <td>{e.estado || "-"}</td>
                    <td className={e.active ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                      {e.active ? "Sim" : "Não"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => openCompanyModal(e)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USUÁRIOS */}
      <div className="card-base card-red mb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="font-semibold mb-0">Usuários do sistema</h3>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateUserModal}
          >
            Novo usuário
          </button>
        </div>
        <div className="table-container overflow-x-auto mt-4">
          <table className="table-default table-header-red table-mobile-cards min-w-[760px]">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Empresa</th>
                <th>Ativo</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td data-label="Nome">{u.nome_completo}</td>
                    <td data-label="E-mail">{u.email || "-"}</td>
                    <td data-label="Tipo">{u.user_types?.name || "—"}</td>
                    <td data-label="Empresa">{u.company_id ? companyMap[u.company_id] || "-" : "—"}</td>
                    <td
                      data-label="Ativo"
                      className={u.active ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}
                    >
                      {u.active ? "Sim" : "Não"}
                    </td>
                    <td className="th-actions" data-label="Ações">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn btn-light"
                          onClick={() => openEditUserModal(u)}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GESTORES */}
      <div className="card-base card-red mb-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h3 className="font-semibold mb-0">Gestores & equipes</h3>
          <button type="button" className="btn btn-primary" onClick={() => openManagerModal()}>
            Nova equipe
          </button>
        </div>
        <div className="table-container overflow-x-auto mt-4">
          <table className="table-default table-header-red min-w-[640px]">
            <thead>
              <tr>
                <th>Gestor</th>
                <th>Qtd. Vendedores</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {gestores.length === 0 ? (
                <tr>
                  <td colSpan={3}>Nenhum gestor encontrado.</td>
                </tr>
              ) : (
                gestores.map((g) => (
                  <tr
                    key={g.id}
                    className={selectedManagerId === g.id ? "bg-slate-700/10" : ""}
                  >
                    <td>{g.nome_completo}</td>
                    <td>{g.vendedores}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => openManagerModal(g.id)}
                      >
                        Gerir equipe
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {erro && <div className="card-base card-config">{erro}</div>}
      {loading && <div>Carregando dados...</div>}

      {companyModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4">
          <form
            className="card-base card-config w-full max-w-xl"
            onSubmit={handleSaveCompany}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold">
                {companyForm.id ? "Editar empresa" : "Nova empresa"}
              </h4>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setCompanyModalOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Nome fantasia</label>
              <input
                className="form-input"
                value={companyForm.nome_fantasia}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, nome_fantasia: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Razão social</label>
              <input
                className="form-input"
                value={companyForm.nome_empresa}
                onChange={(e) =>
                  setCompanyForm((prev) => ({ ...prev, nome_empresa: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CNPJ</label>
                <input
                  className="form-input"
                  value={companyForm.cnpj}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, cnpj: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input
                  className="form-input"
                  value={companyForm.cidade}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({ ...prev, cidade: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Estado (UF)</label>
                <input
                  className="form-input"
                  value={companyForm.estado}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({ ...prev, estado: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ativa?</label>
                <select
                  className="form-select"
                  value={companyForm.active ? "true" : "false"}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      active: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              <button type="submit" className="btn btn-primary" disabled={operationLoading}>
                Salvar empresa
              </button>
              <button type="button" className="btn btn-light" onClick={resetCompanyForm}>
                Limpar
              </button>
            </div>
          </form>
        </div>
      )}

      {userModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4">
          <form className="card-base card-config w-full max-w-xl" onSubmit={handleSaveUser}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold">Editar usuário</h4>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setUserModalOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Selecione o usuário</label>
              <select
                className="form-select"
                value={userForm.id}
                onChange={(e) => {
                  const selected = usuarios.find((u) => u.id === e.target.value);
                  if (selected) handleUserSelect(selected);
                  else resetUserForm();
                }}
              >
                <option value="">Selecione</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome_completo}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nome completo</label>
              <input
                className="form-input"
                value={userForm.nome_completo}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, nome_completo: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                className="form-input"
                value={userForm.email}
                onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de usuário</label>
              <select
                className="form-select"
                value={userForm.user_type_id}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, user_type_id: e.target.value }))
                }
              >
                <option value="">Selecione</option>
                {userTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Empresa</label>
              <select
                className="form-select"
                value={userForm.company_id}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, company_id: e.target.value }))
                }
              >
                <option value="">Sem empresa</option>
                {empresas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_fantasia}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ativo?</label>
              <select
                className="form-select"
                value={userForm.active ? "true" : "false"}
                onChange={(e) =>
                  setUserForm((prev) => ({ ...prev, active: e.target.value === "true" }))
                }
              >
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              <button type="submit" className="btn btn-primary" disabled={operationLoading}>
                Atualizar usuário
              </button>
              <button type="button" className="btn btn-light" onClick={resetUserForm}>
                Limpar
              </button>
            </div>
          </form>
        </div>
      )}

      {managerModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4">
          <form className="card-base card-config w-full max-w-xl" onSubmit={handleSaveManagerTeam}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold">Gestores & equipes</h4>
              <button
                type="button"
                className="btn btn-light"
                onClick={() => setManagerModalOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Selecione o gestor</label>
              <select
                className="form-select"
                value={selectedManagerId || ""}
                onChange={(e) => {
                  const managerId = e.target.value || null;
                  setSelectedManagerId(managerId);
                }}
              >
                <option value="">Selecione</option>
                {gestores.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome_completo}
                  </option>
                ))}
              </select>
            </div>
            {selectedManager ? (
              <>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto mb-2">
                  {vendorUsers.map((v) => (
                    <label
                      key={v.id}
                      className="flex items-center gap-2 border border-slate-500 rounded px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedManagerVendedores.includes(v.id)}
                        onChange={() => toggleVendorSelection(v.id)}
                        disabled={operationLoading}
                      />
                      <span>
                        {v.nome_completo}
                        {v.company_id ? ` (${companyMap[v.company_id] || "—"})` : ""}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={operationLoading}
                >
                  Salvar equipe
                </button>
              </>
              ) : (
                <p>Escolha um gestor para configurar a equipe.</p>
              )}
            </form>
          </div>
        )}

      {createUserModalOpen && (
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
                onClick={() => setCreateUserModalOpen(false)}
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
                onClick={() => setCreateUserModalOpen(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
