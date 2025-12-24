globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, e as renderHead, f as renderComponent, d as renderTemplate } from '../../chunks/astro/server_CVPGTMFc.mjs';
/* empty css                                         */
import { j as jsxRuntimeExports, s as supabase, S as SYSTEM_NAME } from '../../chunks/systemName_EsfuoaVO.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_lNEyfHhP.mjs';
import { r as registrarLog } from '../../chunks/logs_By9JfuIz.mjs';

function AuthRecoverIsland() {
  const [email, setEmail] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState("");
  const [ok, setOk] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  function mostrarMensagem(msg) {
    setErro(msg);
    setTimeout(() => setErro(""), 6e3);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setOk(false);
    setLoading(true);
    const emailLimpo = email.trim().toLowerCase();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/reset` : void 0;
    try {
      await registrarLog({
        user_id: null,
        acao: "solicitou_recuperacao_senha",
        modulo: "login",
        detalhes: { email: emailLimpo }
      });
      const { error } = await supabase.auth.resetPasswordForEmail(
        emailLimpo,
        redirectTo ? { redirectTo } : void 0
      );
      if (error) {
        mostrarMensagem("Não foi possível enviar o link. Tente novamente.");
      } else {
        setOk(true);
      }
    } catch (e2) {
      mostrarMensagem("Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-card auth-card-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-plane-departure" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Recuperar senha" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "auth-subtitle", children: "Enviaremos um link para redefinir sua senha." })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", style: { marginBottom: 16 }, children: erro }),
    ok && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-success", style: { marginBottom: 16 }, children: "Instruções enviadas para seu e-mail!" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "recover-email", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-envelope" }),
          " E-mail"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "email",
            id: "recover-email",
            className: "form-input",
            placeholder: "seu@email.com",
            required: true,
            autoComplete: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", className: "btn btn-primary btn-block", disabled: loading, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-paper-plane" }),
          loading ? " Enviando..." : " Enviar link"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-divider", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "ou" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "/auth/login", className: "btn btn-secondary btn-block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-right-to-bracket" }),
          "Voltar ao login"
        ] })
      ] })
    ] })
  ] }) });
}

const $$Recover = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = `Recuperar senha - ${SYSTEM_NAME}`;
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><title>${pageTitle}</title>${renderHead()}</head> <body class="auth-body"> ${renderComponent($$result, "AuthRecoverIsland", AuthRecoverIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/AuthRecoverIsland.tsx", "client:component-export": "default" })} </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/recover.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/recover.astro";
const $$url = "/auth/recover";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Recover,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
