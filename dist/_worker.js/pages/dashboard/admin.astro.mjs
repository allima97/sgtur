globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_Cob7n0Cm.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_m0KiXmHP.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_DZ5sCzw7.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_DxUIN8pq.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_DxUIN8pq.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_B808B4Oq.mjs';
import { u as useRegisterForm, C as CredentialsForm } from '../../chunks/CredentialsForm_Ddl_adwj.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_B9z1wb0a.mjs';

const defaultCompanyForm = {
  nome_empresa: "",
  nome_fantasia: "",
  cnpj: "",
  cidade: "",
  estado: "",
  active: true
};
const defaultUserForm = {
  id: "",
  nome_completo: "",
  email: "",
  company_id: "",
  user_type_id: "",
  active: true
};
function DashboardAdminIsland() {
  const { ativo, loading: loadingPerm } = usePermissao("AdminDashboard");
  const [loading, setLoading] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [empresas, setEmpresas] = reactExports.useState([]);
  const [usuarios, setUsuarios] = reactExports.useState([]);
  const [gestores, setGestores] = reactExports.useState([]);
  const [sistema, setSistema] = reactExports.useState({
    clientes: 0,
    vendas: 0,
    produtos: 0,
    tipos: 0
  });
  const [companyForm, setCompanyForm] = reactExports.useState(defaultCompanyForm);
  const [userForm, setUserForm] = reactExports.useState(defaultUserForm);
  const [userTypes, setUserTypes] = reactExports.useState([]);
  const [gestorVendedorRows, setGestorVendedorRows] = reactExports.useState([]);
  const [selectedManagerId, setSelectedManagerId] = reactExports.useState(null);
  const [selectedManagerVendedores, setSelectedManagerVendedores] = reactExports.useState([]);
  const [operationLoading, setOperationLoading] = reactExports.useState(false);
  const [successMessage, setSuccessMessage] = reactExports.useState(null);
  const [companyModalOpen, setCompanyModalOpen] = reactExports.useState(false);
  const [userModalOpen, setUserModalOpen] = reactExports.useState(false);
  const [managerModalOpen, setManagerModalOpen] = reactExports.useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = reactExports.useState(false);
  const [novoNomeCompleto, setNovoNomeCompleto] = reactExports.useState("");
  const [novaEmpresaId, setNovaEmpresaId] = reactExports.useState("");
  const [novoTipoUsuarioId, setNovoTipoUsuarioId] = reactExports.useState("");
  const [novoAtivo, setNovoAtivo] = reactExports.useState(true);
  const companyMap = reactExports.useMemo(
    () => Object.fromEntries(empresas.map((c) => [c.id, c.nome_fantasia])),
    [empresas]
  );
  const vendorUsers = reactExports.useMemo(
    () => usuarios.filter(
      (u) => (u.user_types?.name || "").toUpperCase().includes("VENDEDOR")
    ),
    [usuarios]
  );
  const gestorAssignmentMap = reactExports.useMemo(() => {
    const map = {};
    gestorVendedorRows.forEach((row) => {
      if (!row.ativo) return;
      if (!map[row.gestor_id]) map[row.gestor_id] = [];
      map[row.gestor_id].push(row.vendedor_id);
    });
    return map;
  }, [gestorVendedorRows]);
  const selectedManager = reactExports.useMemo(
    () => gestores.find((g) => g.id === selectedManagerId) || null,
    [gestores, selectedManagerId]
  );
  reactExports.useEffect(() => {
    if (selectedManagerId) {
      setSelectedManagerVendedores(gestorAssignmentMap[selectedManagerId] || []);
    }
  }, [gestorAssignmentMap, selectedManagerId]);
  const fetchAdminData = reactExports.useCallback(async () => {
    try {
      setLoading(true);
      setErro(null);
      const [empRes, usersRes, typesRes, gestorRowsRes] = await Promise.all([
        supabase.from("companies").select("*").order("nome_fantasia"),
        supabase.from("users").select("id, nome_completo, email, active, company_id, user_type_id, user_types(name)").order("nome_completo"),
        supabase.from("user_types").select("id, name").order("name"),
        supabase.from("gestor_vendedor").select("id, gestor_id, vendedor_id, ativo")
      ]);
      if (empRes.error || usersRes.error || typesRes.error || gestorRowsRes.error) {
        throw empRes.error || usersRes.error || typesRes.error || gestorRowsRes.error;
      }
      const companiesData = empRes.data || [];
      const usersData = usersRes.data || [];
      const typesData = typesRes.data || [];
      const gestorRowsData = gestorRowsRes.data || [];
      const managerUsers = usersData.filter(
        (u) => (u.user_types?.name || "").toUpperCase().includes("GESTOR")
      );
      const assignmentMap = {};
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
        vendedores: assignmentMap[g.id]?.length || 0
      }));
      setGestores(gestorList);
      const tabelas = [
        { chave: "clientes", tabela: "clientes" },
        { chave: "vendas", tabela: "vendas" },
        { chave: "produtos", tabela: "produtos" },
        { chave: "tipos", tabela: "tipo_produtos" }
      ];
      const resultado = { clientes: 0, vendas: 0, produtos: 0, tipos: 0 };
      for (const { chave, tabela } of tabelas) {
        const { count } = await supabase.from(tabela).select("*", { count: "exact", head: true });
        resultado[chave] = count || 0;
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
    successMessage: "Usuário cadastrado! Ele receberá instruções por e-mail para validar o endereço e, no primeiro acesso, completar o perfil.",
    onSuccess: async (user) => {
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        nome_completo: novoNomeCompleto || null,
        company_id: novaEmpresaId || null,
        user_type_id: novoTipoUsuarioId || null,
        active: novoAtivo,
        uso_individual: false
      });
      setSuccessMessage("Usuário criado com sucesso.");
      await fetchAdminData();
      setCreateUserModalOpen(false);
      setNovoNomeCompleto("");
      setNovaEmpresaId("");
      setNovoTipoUsuarioId("");
      setNovoAtivo(true);
    }
  });
  const [isAdmin, setIsAdmin] = reactExports.useState(false);
  reactExports.useEffect(() => {
    async function loadAdmin() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data?.user) return;
        const { data: u } = await supabase.from("users").select("id, user_types(name)").eq("id", data.user.id).maybeSingle();
        const tipo = u?.user_types?.name?.toUpperCase() || "";
        setIsAdmin(tipo.includes("ADMIN"));
      } catch (e) {
        console.error(e);
      }
    }
    loadAdmin();
  }, []);
  reactExports.useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);
  const resetCompanyForm = () => {
    setCompanyForm(defaultCompanyForm);
  };
  const resetUserForm = () => {
    setUserForm(defaultUserForm);
  };
  const handleCompanySelect = (company) => {
    setCompanyForm({
      id: company.id,
      nome_empresa: company.nome_empresa,
      nome_fantasia: company.nome_fantasia,
      cnpj: company.cnpj,
      cidade: company.cidade || "",
      estado: company.estado || "",
      active: company.active !== false
    });
  };
  const handleUserSelect = (user) => {
    setUserForm({
      id: user.id,
      nome_completo: user.nome_completo,
      email: user.email || "",
      company_id: user.company_id || "",
      user_type_id: user.user_type_id || "",
      active: user.active
    });
  };
  const openCompanyModal = (company) => {
    if (company) {
      handleCompanySelect(company);
    } else {
      resetCompanyForm();
    }
    setCompanyModalOpen(true);
  };
  const openEditUserModal = (user) => {
    if (user) {
      handleUserSelect(user);
    } else {
      resetUserForm();
    }
    setUserModalOpen(true);
  };
  const openManagerModal = (managerId) => {
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
  const toggleVendorSelection = (vendorId) => {
    setSelectedManagerVendedores(
      (prev) => prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };
  async function handleSaveCompany(e) {
    e.preventDefault();
    setOperationLoading(true);
    setErro(null);
    setSuccessMessage(null);
    try {
      const payload = {
        nome_empresa: companyForm.nome_empresa,
        nome_fantasia: companyForm.nome_fantasia,
        cnpj: companyForm.cnpj,
        cidade: companyForm.cidade || null,
        estado: companyForm.estado || null,
        active: companyForm.active
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
  async function handleSaveUser(e) {
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
        active: userForm.active
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
  async function handleSaveManagerTeam(e) {
    e.preventDefault();
    if (!selectedManagerId) {
      setErro("Selecione um gestor para atualizar a equipe.");
      return;
    }
    setOperationLoading(true);
    setErro(null);
    setSuccessMessage(null);
    try {
      const { data: rows, error } = await supabase.from("gestor_vendedor").select("id, gestor_id, vendedor_id, ativo").eq("gestor_id", selectedManagerId);
      if (error) throw error;
      const existing = rows || [];
      const existingMap = new Map(existing.map((row) => [row.vendedor_id, row]));
      const prevActive = existing.filter((row) => row.ativo).map((row) => row.vendedor_id);
      const desired = selectedManagerVendedores;
      const toActivate = desired.filter((id) => !prevActive.includes(id));
      const toDeactivate = prevActive.filter((id) => !desired.includes(id));
      const ops = [];
      for (const vendorId of toActivate) {
        const row = existingMap.get(vendorId);
        if (row) {
          ops.push(
            supabase.from("gestor_vendedor").update({ ativo: true }).eq("id", row.id)
          );
        } else {
          ops.push(
            supabase.from("gestor_vendedor").insert({
              gestor_id: selectedManagerId,
              vendedor_id: vendorId,
              ativo: true
            })
          );
        }
      }
      for (const vendorId of toDeactivate) {
        const row = existingMap.get(vendorId);
        if (row) {
          ops.push(
            supabase.from("gestor_vendedor").update({ ativo: false }).eq("id", row.id)
          );
        }
      }
      const results = await Promise.all(ops);
      const failure = results.find((r) => r?.error);
      if (failure && failure.error) {
        throw failure.error;
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
  if (loadingPerm) return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  if (!ativo || !isAdmin)
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Apenas administradores podem acessar este dashboard." }) });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-admin-page", children: [
    successMessage && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-green mb-3", children: successMessage }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 p-4 rounded-lg bg-rose-950 border border-rose-700 text-rose-100", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Dashboard Administrativo" }),
      " — Controle Geral do Sistema"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "mb-3 font-semibold text-lg", children: "Visão geral do sistema" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid gap-2 md:gap-3", style: { gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Clientes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.clientes })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.vendas })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Produtos" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.produtos })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Tipos de produto" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: sistema.tipos })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold mb-0", children: "Empresas cadastradas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: () => openCompanyModal(),
            children: "Nova empresa"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[720px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome fantasia" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Razão social" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "CNPJ" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "UF" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativa" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: empresas.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhuma empresa cadastrada." }) }) : empresas.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.nome_fantasia }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.nome_empresa }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.cnpj }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: e.estado || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: e.active ? "text-emerald-500 font-bold" : "text-rose-500 font-bold", children: e.active ? "Sim" : "Não" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: () => openCompanyModal(e),
              children: "Editar"
            }
          ) })
        ] }, e.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold mb-0", children: "Usuários do sistema" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-primary",
            onClick: openCreateUserModal,
            children: "Novo usuário"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[760px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "E-mail" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Tipo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Empresa" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ativo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: usuarios.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhum usuário encontrado." }) }) : usuarios.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.nome_completo }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.email || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.user_types?.name || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: u.company_id ? companyMap[u.company_id] || "-" : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: u.active ? "text-emerald-500 font-bold" : "text-rose-500 font-bold", children: u.active ? "Sim" : "Não" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "btn btn-light",
              onClick: () => openEditUserModal(u),
              children: "Editar"
            }
          ) })
        ] }, u.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-red mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold mb-0", children: "Gestores & equipes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-primary", onClick: () => openManagerModal(), children: "Nova equipe" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto mt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-red min-w-[640px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Gestor" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Qtd. Vendedores" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ações" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: gestores.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, children: "Nenhum gestor encontrado." }) }) : gestores.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            className: selectedManagerId === g.id ? "bg-slate-700/10" : "",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: g.nome_completo }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: g.vendedores }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn-light",
                  onClick: () => openManagerModal(g.id),
                  children: "Gerir equipe"
                }
              ) })
            ]
          },
          g.id
        )) })
      ] }) })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config", children: erro }),
    loading && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando dados..." }),
    companyModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "form",
      {
        className: "card-base card-config w-full max-w-xl",
        onSubmit: handleSaveCompany,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold", children: companyForm.id ? "Editar empresa" : "Nova empresa" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-light",
                onClick: () => setCompanyModalOpen(false),
                children: "Fechar"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome fantasia" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: companyForm.nome_fantasia,
                onChange: (e) => setCompanyForm((prev) => ({ ...prev, nome_fantasia: e.target.value })),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Razão social" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: companyForm.nome_empresa,
                onChange: (e) => setCompanyForm((prev) => ({ ...prev, nome_empresa: e.target.value })),
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "CNPJ" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  value: companyForm.cnpj,
                  onChange: (e) => setCompanyForm((prev) => ({ ...prev, cnpj: e.target.value })),
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  value: companyForm.cidade,
                  onChange: (e) => setCompanyForm((prev) => ({ ...prev, cidade: e.target.value }))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Estado (UF)" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  className: "form-input",
                  value: companyForm.estado,
                  onChange: (e) => setCompanyForm((prev) => ({ ...prev, estado: e.target.value }))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativa?" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: companyForm.active ? "true" : "false",
                  onChange: (e) => setCompanyForm((prev) => ({
                    ...prev,
                    active: e.target.value === "true"
                  })),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 flex-wrap mt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: operationLoading, children: "Salvar empresa" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: resetCompanyForm, children: "Limpar" })
          ] })
        ]
      }
    ) }),
    userModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "card-base card-config w-full max-w-xl", onSubmit: handleSaveUser, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold", children: "Editar usuário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => setUserModalOpen(false),
            children: "Fechar"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Selecione o usuário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: userForm.id,
            onChange: (e) => {
              const selected = usuarios.find((u) => u.id === e.target.value);
              if (selected) handleUserSelect(selected);
              else resetUserForm();
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
              usuarios.map((u) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: u.id, children: u.nome_completo }, u.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome completo" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            value: userForm.nome_completo,
            onChange: (e) => setUserForm((prev) => ({ ...prev, nome_completo: e.target.value })),
            required: true
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "E-mail" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            className: "form-input",
            value: userForm.email,
            onChange: (e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo de usuário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: userForm.user_type_id,
            onChange: (e) => setUserForm((prev) => ({ ...prev, user_type_id: e.target.value })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
              userTypes.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.id, children: t.name }, t.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Empresa" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: userForm.company_id,
            onChange: (e) => setUserForm((prev) => ({ ...prev, company_id: e.target.value })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Sem empresa" }),
              empresas.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.nome_fantasia }, c.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo?" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: userForm.active ? "true" : "false",
            onChange: (e) => setUserForm((prev) => ({ ...prev, active: e.target.value === "true" })),
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 flex-wrap mt-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "submit", className: "btn btn-primary", disabled: operationLoading, children: "Atualizar usuário" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", className: "btn btn-light", onClick: resetUserForm, children: "Limpar" })
      ] })
    ] }) }),
    managerModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "card-base card-config w-full max-w-xl", onSubmit: handleSaveManagerTeam, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold", children: "Gestores & equipes" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: () => setManagerModalOpen(false),
            children: "Fechar"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Selecione o gestor" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            className: "form-select",
            value: selectedManagerId || "",
            onChange: (e) => {
              const managerId = e.target.value || null;
              setSelectedManagerId(managerId);
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
              gestores.map((g) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: g.id, children: g.nome_completo }, g.id))
            ]
          }
        )
      ] }),
      selectedManager ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2 max-h-48 overflow-y-auto mb-2", children: vendorUsers.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "label",
          {
            className: "flex items-center gap-2 border border-slate-500 rounded px-2 py-1",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  type: "checkbox",
                  checked: selectedManagerVendedores.includes(v.id),
                  onChange: () => toggleVendorSelection(v.id),
                  disabled: operationLoading
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                v.nome_completo,
                v.company_id ? ` (${companyMap[v.company_id] || "—"})` : ""
              ] })
            ]
          },
          v.id
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "btn btn-primary",
            disabled: operationLoading,
            children: "Salvar equipe"
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "Escolha um gestor para configurar a equipe." })
    ] }) }),
    createUserModalOpen && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed inset-0 z-40 bg-black/50 flex justify-center items-center p-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "form",
      {
        className: "card-base card-config w-full max-w-xl",
        onSubmit: registerForm.handleSubmit,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between items-center mb-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-semibold", children: "Cadastro administrativo de usuário" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-light",
                onClick: () => setCreateUserModalOpen(false),
                children: "Fechar"
              }
            )
          ] }),
          registerForm.message && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-config mb-3", children: registerForm.message }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome completo" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "form-input",
                value: novoNomeCompleto,
                onChange: (e) => setNovoNomeCompleto(e.target.value),
                required: true,
                placeholder: "Nome do usuário"
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            CredentialsForm,
            {
              email: registerForm.email,
              password: registerForm.password,
              confirmPassword: registerForm.confirmPassword,
              onEmailChange: registerForm.setEmail,
              onPasswordChange: registerForm.setPassword,
              onConfirmPasswordChange: registerForm.setConfirmPassword,
              disabled: registerForm.loading
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row mt-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo de usuário" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: novoTipoUsuarioId,
                  onChange: (e) => setNovoTipoUsuarioId(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Selecione" }),
                    userTypes.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.id, children: t.name }, t.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Empresa" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: novaEmpresaId,
                  onChange: (e) => setNovaEmpresaId(e.target.value),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Sem empresa" }),
                    empresas.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.nome_fantasia }, c.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group flex-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Ativo?" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  className: "form-select",
                  value: novoAtivo ? "true" : "false",
                  onChange: (e) => setNovoAtivo(e.target.value === "true"),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "true", children: "Sim" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "false", children: "Não" })
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 flex-wrap mt-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "submit",
                className: "btn btn-primary",
                disabled: registerForm.loading,
                children: "Criar usuário"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-light",
                onClick: () => setCreateUserModalOpen(false),
                children: "Cancelar"
              }
            )
          ] })
        ]
      }
    ) })
  ] });
}

const $$Admin = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<!-- Apenas ADMIN deve acessar — middleware + island verificam isso -->${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard Administrativo" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="page-content-wrap"> ${renderComponent($$result2, "DashboardAdminIsland", DashboardAdminIsland, { "client:visible": true, "client:component-hydration": "visible", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/DashboardAdminIsland.tsx", "client:component-export": "default" })} </div> ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/admin.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/dashboard/admin.astro";
const $$url = "/dashboard/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
