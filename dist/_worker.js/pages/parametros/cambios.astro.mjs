globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C9jQHs-i.mjs';
/* empty css                                         */
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_1RrlcxID.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_p9GcBfMe.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_R_BoJegu.mjs';
import { r as registrarLog } from '../../chunks/logs_CFVP_wVx.mjs';

const MOEDA_SUGESTOES = ["R$", "USD", "EUR"];
const agoraData = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
const buildInitialForm = () => ({ moeda: "USD", data: agoraData(), valor: "" });
function parseDecimal(value) {
  if (!value || typeof value !== "string") return null;
  const cleaned = value.replace(/\./g, "").replace(",", ".").trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
function formatValorNumber(value) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}
function ParametrosCambiosIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Parametros");
  const [form, setForm] = reactExports.useState(buildInitialForm());
  const [editingId, setEditingId] = reactExports.useState(null);
  const [mostrarFormulario, setMostrarFormulario] = reactExports.useState(false);
  const [cambios, setCambios] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [sucesso, setSucesso] = reactExports.useState(null);
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [userId, setUserId] = reactExports.useState(null);
  const nivel = (permissao || "").toLowerCase();
  const podeEscrever = nivel === "admin" || nivel === "edit" || nivel === "create";
  const podeExcluir = nivel === "admin" || nivel === "edit";
  const resetForm = reactExports.useCallback(() => {
    setForm(buildInitialForm());
    setEditingId(null);
  }, []);
  const abrirFormulario = reactExports.useCallback(() => {
    resetForm();
    setErro(null);
    setSucesso(null);
    setMostrarFormulario(true);
  }, [resetForm]);
  const fecharFormulario = reactExports.useCallback(() => {
    resetForm();
    setErro(null);
    setSucesso(null);
    setMostrarFormulario(false);
  }, [resetForm]);
  const carregar = reactExports.useCallback(async () => {
    setLoading(true);
    setErro(null);
    setSucesso(null);
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId2 = session?.user?.id || null;
      setUserId(userId2);
      if (!userId2) {
        setErro("Usuário não autenticado.");
        setCambios([]);
        return;
      }
      const { data: usuario, error: usuarioErr } = await supabase.from("users").select("company_id").eq("id", userId2).maybeSingle();
      if (usuarioErr) throw usuarioErr;
      const companyValue = usuario?.company_id || null;
      setCompanyId(companyValue);
      if (!companyValue) {
        setErro("Usuário não está vinculado a uma empresa.");
        setCambios([]);
        return;
      }
      const { data, error } = await supabase.from("parametros_cambios").select(
        "id, moeda, data, valor, created_at, owner_user_id, owner_user:owner_user_id (nome_completo)"
      ).eq("company_id", companyValue).order("data", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      setCambios(data || []);
    } catch (err) {
      console.error(err);
      setErro("Não foi possível carregar os câmbios.");
    } finally {
      setLoading(false);
    }
  }, []);
  reactExports.useEffect(() => {
    carregar();
  }, [carregar]);
  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!podeEscrever || !companyId) return;
    setErro(null);
    setSucesso(null);
    const valorNumero = parseDecimal(form.valor);
    const moeda = form.moeda.trim();
    if (!moeda) {
      setErro("Informe a moeda.");
      return;
    }
    if (!form.data) {
      setErro("Informe a data.");
      return;
    }
    if (valorNumero == null) {
      setErro("Informe um valor válido para o câmbio.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        company_id: companyId,
        owner_user_id: userId,
        moeda,
        data: form.data,
        valor: valorNumero
      };
      let error = null;
      if (editingId) {
        const res = await supabase.from("parametros_cambios").update(payload).eq("id", editingId);
        error = res.error;
      } else {
        const res = await supabase.from("parametros_cambios").insert(payload);
        error = res.error;
      }
      if (error) throw error;
      setSucesso(editingId ? "Câmbio atualizado com sucesso." : "Câmbio salvo com sucesso.");
      resetForm();
      setMostrarFormulario(false);
      await carregar();
      await registrarLog({
        user_id: userId,
        acao: editingId ? "parametros_cambios_atualizacao" : "parametros_cambios_cadastro",
        modulo: "Parametros",
        detalhes: {
          id: editingId || null,
          moeda,
          data: form.data,
          valor: valorNumero
        }
      });
    } catch (err) {
      console.error(err);
      setErro("Não foi possível salvar o câmbio.");
    } finally {
      setSalvando(false);
    }
  };
  const handleDelete = async (id) => {
    if (!podeExcluir) return;
    if (!window.confirm("Deseja excluir este câmbio?")) return;
    setErro(null);
    setSucesso(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("parametros_cambios").delete().eq("id", id);
      if (error) throw error;
      setSucesso("Câmbio excluído.");
      await carregar();
      await registrarLog({
        user_id: userId,
        acao: "parametros_cambios_exclusao",
        modulo: "Parametros",
        detalhes: { id }
      });
    } catch (err) {
      console.error(err);
      setErro("Não foi possível excluir o câmbio.");
    } finally {
      setLoading(false);
    }
  };
  const handleEdit = (cambio) => {
    setEditingId(cambio.id);
    setForm({
      moeda: cambio.moeda,
      data: cambio.data,
      valor: cambio.valor != null ? cambio.valor.toFixed(2) : ""
    });
    setSucesso(null);
    setErro(null);
    setMostrarFormulario(true);
  };
  const tituloTabela = reactExports.useMemo(() => {
    if (!cambios.length) return "Nenhum câmbio cadastrado.";
    return `${cambios.length} câmbio(s) registrado(s).`;
  }, [cambios]);
  if (loading || loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Acesso ao módulo de Parâmetros bloqueado." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "card-title", children: "Câmbios" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "card-subtitle", children: "Cadastre o valor de câmbio aplicado em cada dia." }),
    !mostrarFormulario && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erro }),
      sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", children: sucesso }),
      podeEscrever && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mb-3", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn-primary w-full sm:w-auto",
          onClick: abrirFormulario,
          disabled: !companyId,
          children: "Adicionar câmbio"
        }
      ) }),
      !companyId && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: "Você precisa estar vinculado a uma empresa para cadastrar câmbios." }),
      !podeEscrever && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 8, color: "#f97316", fontSize: "0.9rem" }, children: "Você não tem permissão para cadastrar ou remover câmbios. Solicite acesso ao administrador." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "table-container overflow-x-auto mt-6",
          style: { maxHeight: "65vh", overflowY: "auto" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: tituloTabela }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "btn btn-light w-full sm:w-auto",
                  onClick: carregar,
                  disabled: loading,
                  children: "Recarregar"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default table-header-blue table-mobile-cards min-w-[600px]", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Moeda" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor (R$)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cadastrado por" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Criado em" }),
                podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "th-actions", children: "Ações" })
              ] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
                cambios.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: podeExcluir ? 6 : 5, children: "Nenhum câmbio cadastrado ainda." }) }),
                cambios.map((cambio) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Data", children: cambio.data }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Moeda", children: cambio.moeda }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Valor (R$)", children: formatValorNumber(cambio.valor) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Cadastrado por", children: cambio.owner_user?.nome_completo || cambio.owner_user_id || "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { "data-label": "Criado em", children: cambio.created_at ? new Date(cambio.created_at).toLocaleString("pt-BR") : "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "th-actions", "data-label": "Ações", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "action-buttons", children: [
                    podeEscrever && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: "btn-icon",
                        title: "Editar câmbio",
                        onClick: () => handleEdit(cambio),
                        children: "✏️"
                      }
                    ),
                    podeExcluir && /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        className: "btn-icon btn-danger",
                        title: "Excluir câmbio",
                        onClick: () => handleDelete(cambio.id),
                        children: "🗑️"
                      }
                    )
                  ] }) })
                ] }, cambio.id))
              ] })
            ] })
          ]
        }
      )
    ] }),
    mostrarFormulario && /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Moeda" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              list: "moeda-sugestoes",
              value: form.moeda,
              onChange: (event) => handleFormChange("moeda", event.target.value),
              disabled: !podeEscrever
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: "moeda-sugestoes", children: MOEDA_SUGESTOES.map((moeda) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: moeda }, moeda)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: form.data,
              onChange: (event) => handleFormChange("data", event.target.value),
              disabled: !podeEscrever
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Valor (R$)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              inputMode: "decimal",
              placeholder: "Ex: 6,50",
              value: form.valor,
              onChange: (event) => handleFormChange("valor", event.target.value),
              disabled: !podeEscrever
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mobile-stack-buttons", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "submit",
            className: "btn btn-primary",
            disabled: !podeEscrever || salvando || !companyId,
            children: salvando ? "Salvando..." : "Salvar câmbio"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "btn btn-light",
            onClick: fecharFormulario,
            disabled: salvando,
            children: "Cancelar"
          }
        )
      ] }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: erro }),
      sucesso && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-success", children: sucesso }),
      !companyId && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-error", children: "Você precisa estar vinculado a uma empresa para cadastrar câmbios." }),
      !podeEscrever && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 8, color: "#f97316", fontSize: "0.9rem" }, children: "Você não tem permissão para cadastrar ou remover câmbios. Solicite acesso ao administrador." })
    ] })
  ] });
}

const $$Cambios = createComponent(($$result, $$props, $$slots) => {
  const activePage = "parametros-cambios";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "C\xE2mbios", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<h1 class="page-title">Câmbios</h1> <p class="page-subtitle">
Insira os valores de câmbio utilizados pela empresa para calcular as equivalências em reais.
</p> ${renderComponent($$result2, "ParametrosCambiosIsland", ParametrosCambiosIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/ParametrosCambiosIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/cambios.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/parametros/cambios.astro";
const $$url = "/parametros/cambios";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Cambios,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
