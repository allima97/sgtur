globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderHead, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                         */
import { j as jsxRuntimeExports, S as SYSTEM_NAME, s as supabase } from '../../chunks/systemName_BQeIdnjR.mjs';
import { u as useRegisterForm, C as CredentialsForm } from '../../chunks/CredentialsForm_anRxZe32.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';

function AuthRegisterIsland() {
  const registerForm = useRegisterForm({
    onSuccess: async (user) => {
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        nome_completo: null,
        uso_individual: null
      });
    }
  });
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-card auth-card-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-plane-departure" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: `Bem-vindo ao ${SYSTEM_NAME}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Sistema de Gerenciamento de Vendas para Turismo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-subtitle", children: "Cadastre-se, confirme o e-mail e complete seus dados no primeiro acesso." })
    ] }),
    registerForm.message && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", style: { marginBottom: 16 }, children: registerForm.message }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: registerForm.handleSubmit, className: "auth-form", children: [
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
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", className: "btn btn-primary w-full", disabled: registerForm.loading, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-user-plus" }),
          registerForm.loading ? " Criando..." : " Criar Conta"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-divider", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "ou" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "/auth/login", className: "btn btn-secondary w-full", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-right-to-bracket" }),
          "Já tenho conta"
        ] })
      ] })
    ] })
  ] }) });
}

const $$Register = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = `Criar conta - ${SYSTEM_NAME}`;
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><title>${pageTitle}</title>${renderHead()}</head> <body class="auth-body"> ${renderComponent($$result, "AuthRegisterIsland", AuthRegisterIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/AuthRegisterIsland.tsx", "client:component-export": "default" })} </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/register.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/register.astro";
const $$url = "/auth/register";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Register,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
