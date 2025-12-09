globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderHead, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6Zr-jH2.mjs';
/* empty css                                         */
import { j as jsxRuntimeExports, s as supabase } from '../../chunks/supabase_Di0qno_D.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DAXFO6RA.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DAXFO6RA.mjs';

function AuthRegisterIsland() {
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [confirmPassword, setConfirmPassword] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  function mostrarMensagem(msg) {
    setErro(msg);
    setTimeout(() => setErro(""), 6e3);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !password) {
      mostrarMensagem("Informe e-mail e senha");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      mostrarMensagem("A senha deve conter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      mostrarMensagem("As senhas não conferem");
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password
      });
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already exists") || error.message.includes("User already registered")) {
          mostrarMensagem("Este e-mail já está cadastrado. Faça login para acessar sua conta.");
          setTimeout(() => {
            window.location.href = "/auth/login";
          }, 2e3);
          return;
        }
        mostrarMensagem("Não foi possível criar a conta. Verifique o e-mail.");
        setLoading(false);
        return;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        mostrarMensagem("Este e-mail já está cadastrado. Faça login para acessar sua conta.");
        setTimeout(() => {
          window.location.href = "/auth/login";
        }, 2e3);
        return;
      }
      if (data.user?.id) {
        await supabase.from("users").upsert({
          id: data.user.id,
          email: emailLimpo,
          nome_completo: null,
          uso_individual: null
        });
      }
      mostrarMensagem("Conta criada! Verifique seu e-mail para confirmar. Depois faça login para completar o cadastro.");
    } catch (err) {
      mostrarMensagem(err.message || "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-card auth-card-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-plane-departure" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Bem-vindo ao SGTUR" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Sistema de Gerenciamento de Turismo" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-subtitle", children: "Cadastre-se, confirme o e-mail e complete seus dados no primeiro acesso." })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", style: { marginBottom: 16 }, children: erro }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "email", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-envelope" }),
          " E-mail"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "email",
            id: "email",
            className: "form-input",
            placeholder: "seu@email.com",
            required: true,
            autoComplete: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "senha", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-lock" }),
          " Senha"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            id: "senha",
            className: "form-input",
            placeholder: "Mínimo 6 caracteres",
            required: true,
            autoComplete: "new-password",
            value: password,
            onChange: (e) => setPassword(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "auth-hint", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-info-circle" }),
        " A senha deve conter no mínimo 6 caracteres"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "confirmar", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-lock" }),
          " Confirmar senha"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            id: "confirmar",
            className: "form-input",
            placeholder: "Repita a senha",
            required: true,
            value: confirmPassword,
            onChange: (e) => setConfirmPassword(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", className: "btn btn-primary btn-block", disabled: loading, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-user-plus" }),
          loading ? " Criando..." : " Criar Conta"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-divider", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "ou" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "/auth/login", className: "btn btn-secondary btn-block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-right-to-bracket" }),
          "Já tenho conta"
        ] })
      ] })
    ] })
  ] }) });
}

const $$Register = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><title>Criar conta - SGTUR</title>${renderHead()}</head> <body class="auth-body"> ${renderComponent($$result, "AuthRegisterIsland", AuthRegisterIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/AuthRegisterIsland.tsx", "client:component-export": "default" })} </body></html>`;
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
