globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_B-SnFw9s.mjs';
import { $ as $$HeaderPage } from '../../chunks/HeaderPage_DCV0c2xr.mjs';
import { s as supabase, j as jsxRuntimeExports } from '../../chunks/supabase_CtqDhMax.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { u as usePermissao } from '../../chunks/usePermissao_ChD594_G.mjs';
import { L as LoadingUsuarioContext } from '../../chunks/LoadingUsuarioContext_XbJI-A09.mjs';

const LOCALIZACAO_OPCOES = [
  { value: "brasil", label: "Brasil" },
  { value: "exterior", label: "Exterior" }
];
const TIPO_FATURAMENTO_OPCOES = [
  { value: "pre_pago", label: "Pré-Pago" },
  { value: "semanal", label: "Semanal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "mensal", label: "Mensal" }
];
const INITIAL_FORM = {
  nome_completo: "",
  nome_fantasia: "",
  localizacao: "brasil",
  cnpj: "",
  cep: "",
  cidade: "",
  estado: "",
  telefone: "",
  whatsapp: "",
  telefone_emergencia: "",
  responsavel: "",
  tipo_faturamento: "pre_pago",
  principais_servicos: ""
};
function formatFaturamento(value) {
  const option = TIPO_FATURAMENTO_OPCOES.find((opt) => opt.value === value);
  return option ? option.label : value || "-";
}
function formatLocalizacao(value) {
  if (value === "brasil") return "Brasil";
  if (value === "exterior") return "Exterior";
  return value || "-";
}
function FornecedoresIsland() {
  const { permissao, ativo, loading: loadingPerm } = usePermissao("Cadastros");
  const [companyId, setCompanyId] = reactExports.useState(null);
  const [fornecedores, setFornecedores] = reactExports.useState([]);
  const [form, setForm] = reactExports.useState(INITIAL_FORM);
  const [loading, setLoading] = reactExports.useState(true);
  const [salvando, setSalvando] = reactExports.useState(false);
  const [erro, setErro] = reactExports.useState(null);
  const [formError, setFormError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    let isMounted = true;
    async function resolveCompany() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        const user = sessionUser || (await supabase.auth.getUser()).data?.user || null;
        if (!user || !isMounted) return;
        const { data, error } = await supabase.from("users").select("company_id").eq("id", user.id).maybeSingle();
        if (!isMounted) return;
        if (error) {
          console.error("Erro ao buscar company_id dos fornecedores:", error);
          return;
        }
        setCompanyId(data?.company_id || null);
      } catch (error) {
        console.error("Erro ao determinar company_id dos fornecedores:", error);
      }
    }
    resolveCompany();
    return () => {
      isMounted = false;
    };
  }, []);
  reactExports.useEffect(() => {
    if (!companyId) return;
    carregarFornecedores();
  }, [companyId]);
  async function carregarFornecedores() {
    if (!companyId) return;
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase.from("fornecedores").select(
        "id, nome_completo, nome_fantasia, localizacao, cidade, estado, telefone, whatsapp, responsavel, tipo_faturamento, principais_servicos, created_at"
      ).eq("company_id", companyId).order("created_at", { ascending: false });
      if (error) throw error;
      setFornecedores(data || []);
    } catch (error) {
      console.error(error);
      setErro("Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }
  function validarFormulario() {
    if (!form.nome_completo.trim()) return "Informe o nome completo.";
    if (!form.nome_fantasia.trim()) return "Informe o nome fantasia.";
    if (!form.cidade.trim()) return "Informe a cidade.";
    if (!form.estado.trim()) return "Informe o estado.";
    if (!form.telefone.trim()) return "Informe o telefone.";
    if (!form.whatsapp.trim()) return "Informe o WhatsApp.";
    if (!form.telefone_emergencia.trim()) return "Informe o telefone de emergência.";
    if (!form.responsavel.trim()) return "Informe o responsável.";
    if (!form.tipo_faturamento) return "Escolha o tipo de faturamento.";
    if (!form.principais_servicos.trim()) return "Descreva os principais serviços.";
    if (form.localizacao === "brasil" && !form.cnpj.trim()) return "Informe o CNPJ.";
    if (form.localizacao === "brasil" && !form.cep.trim()) return "Informe o CEP.";
    return null;
  }
  const podeSalvar = permissao !== "view" && permissoesNaoVazias(permissao);
  async function salvarFornecedor() {
    if (!companyId) {
      setFormError("Não foi possível determinar sua empresa.");
      return;
    }
    if (!podeSalvar) {
      setFormError("Sua permissão não permite salvar fornecedores.");
      return;
    }
    const erroValidacao = validarFormulario();
    if (erroValidacao) {
      setFormError(erroValidacao);
      return;
    }
    try {
      setSalvando(true);
      setFormError(null);
      const payload = {
        ...form,
        company_id: companyId,
        tipo_faturamento: form.tipo_faturamento,
        principais_servicos: form.principais_servicos.trim()
      };
      const { error } = await supabase.from("fornecedores").insert(payload);
      if (error) throw error;
      setForm(INITIAL_FORM);
      await carregarFornecedores();
    } catch (error) {
      console.error(error);
      setFormError("Erro ao criar fornecedor.");
    } finally {
      setSalvando(false);
    }
  }
  if (loadingPerm) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingUsuarioContext, {});
  }
  if (!ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Cadastros." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: "Fornecedores" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("small", { style: { color: "#94a3b8" }, children: "Cadastre parceiros nacionais e internacionais." })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-blue", style: { marginTop: 12, padding: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, marginBottom: 8 }, children: "Novo fornecedor" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Localização" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 12 }, children: LOCALIZACAO_OPCOES.map((opcao) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "radio",
              name: "localizacao",
              value: opcao.value,
              checked: form.localizacao === opcao.value,
              onChange: (e) => setForm((prev) => ({ ...prev, localizacao: e.target.value })),
              disabled: !podeSalvar
            }
          ),
          opcao.label
        ] }, opcao.value)) })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome completo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome_completo,
              onChange: (e) => setForm((prev) => ({ ...prev, nome_completo: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "Razão social"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Nome fantasia" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.nome_fantasia,
              onChange: (e) => setForm((prev) => ({ ...prev, nome_fantasia: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "Nome comercial"
            }
          )
        ] })
      ] }),
      form.localizacao === "brasil" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "CNPJ" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.cnpj,
              onChange: (e) => setForm((prev) => ({ ...prev, cnpj: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "00.000.000/0000-00"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "CEP" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.cep,
              onChange: (e) => setForm((prev) => ({ ...prev, cep: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "00000-000"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Cidade" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.cidade,
              onChange: (e) => setForm((prev) => ({ ...prev, cidade: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "Cidade principal de atuação"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Estado" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.estado,
              onChange: (e) => setForm((prev) => ({ ...prev, estado: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "UF / região"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Telefone" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.telefone,
              onChange: (e) => setForm((prev) => ({ ...prev, telefone: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "(00) 0000-0000"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "WhatsApp" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.whatsapp,
              onChange: (e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "+55 00 00000-0000"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", style: { gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Telefone emergência" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.telefone_emergencia,
              onChange: (e) => setForm((prev) => ({ ...prev, telefone_emergencia: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "Contato alternativo"
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Responsável" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "form-input",
              value: form.responsavel,
              onChange: (e) => setForm((prev) => ({ ...prev, responsavel: e.target.value })),
              disabled: !podeSalvar,
              placeholder: "Pessoa de contato"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "form-row", style: { gap: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Tipo de faturamento" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            className: "form-select",
            value: form.tipo_faturamento,
            onChange: (e) => setForm((prev) => ({ ...prev, tipo_faturamento: e.target.value })),
            disabled: !podeSalvar,
            children: TIPO_FATURAMENTO_OPCOES.map((opcao) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: opcao.value, children: opcao.label }, opcao.value))
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Principais serviços" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "form-textarea",
            value: form.principais_servicos,
            onChange: (e) => setForm((prev) => ({ ...prev, principais_servicos: e.target.value })),
            disabled: !podeSalvar,
            placeholder: "Descreva BR/EX serviços oferecidos",
            rows: 3
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          type: "button",
          className: "btn btn-primary",
          onClick: salvarFornecedor,
          disabled: salvando || !podeSalvar,
          children: salvando ? "Salvando..." : "Cadastrar fornecedor"
        }
      ) }),
      formError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red", marginTop: 8 }, children: formError })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base", style: { marginTop: 16 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Fornecedores cadastrados" }),
      erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "red", marginBottom: 8 }, children: erro }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[720px]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome fantasia" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Local" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Faturamento" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Contato" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Serviços" })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Carregando fornecedores..." }) }),
          !loading && fornecedores.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhum fornecedor cadastrado." }) }),
          !loading && fornecedores.map((fornecedor) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: fornecedor.nome_fantasia || fornecedor.nome_completo || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              formatLocalizacao(fornecedor.localizacao),
              fornecedor.cidade ? ` • ${fornecedor.cidade}` : "",
              fornecedor.estado ? `/${fornecedor.estado}` : ""
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatFaturamento(fornecedor.tipo_faturamento) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { children: [
              fornecedor.telefone || "-",
              fornecedor.whatsapp && ` • WhatsApp: ${fornecedor.whatsapp}`
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { maxWidth: 240, whiteSpace: "normal" }, children: fornecedor.principais_servicos ? fornecedor.principais_servicos.length > 80 ? `${fornecedor.principais_servicos.slice(0, 80)}...` : fornecedor.principais_servicos : "-" })
          ] }, fornecedor.id))
        ] })
      ] }) })
    ] })
  ] });
}
function permissoesNaoVazias(value) {
  return value && value !== "none";
}

const $$Fornecedores = createComponent(($$result, $$props, $$slots) => {
  const activePage = "fornecedores";
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Fornecedores", "activePage": activePage }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HeaderPage", $$HeaderPage, { "title": "Fornecedores", "subtitle": "Cadastre parceiros nacionais e internacionais.", "color": "teal" })} ${renderComponent($$result2, "FornecedoresIsland", FornecedoresIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/FornecedoresIsland.tsx", "client:component-export": "default" })} ` })}`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/fornecedores.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/cadastros/fornecedores.astro";
const $$url = "/cadastros/fornecedores";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Fornecedores,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
