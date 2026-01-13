globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createComponent, l as renderHead, k as renderComponent, r as renderTemplate } from '../../chunks/astro/server_C9jQHs-i.mjs';
/* empty css                                         */
import { j as jsxRuntimeExports, S as SYSTEM_NAME, s as supabase } from '../../chunks/systemName_CRmQfwE6.mjs';
import { a as reactExports } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_MjSq-9QN.mjs';
import { r as registrarLog } from '../../chunks/logs_CFVP_wVx.mjs';

function AuthResetIsland() {
  const [password, setPassword] = reactExports.useState("");
  const [confirmPassword, setConfirmPassword] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState("");
  const [ok, setOk] = reactExports.useState(false);
  const [loading, setLoading] = reactExports.useState(false);
  const [validLink, setValidLink] = reactExports.useState(false);
  reactExports.useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    async function exchangeCode() {
      if (!code) {
        setErro("Link de recuperação inválido ou expirado.");
        return;
      }
      setLoading(true);
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error(error);
        setErro("Link de recuperação inválido ou expirado.");
        await registrarLog({
          user_id: null,
          acao: "reset_link_invalido",
          modulo: "login",
          detalhes: { motivo: error.message }
        });
      } else {
        setValidLink(true);
      }
      setLoading(false);
    }
    exchangeCode();
  }, []);
  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setOk(false);
    if (!validLink) {
      setErro("Link de recuperação inválido ou expirado.");
      return;
    }
    if (password.length < 6) {
      setErro("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErro("As senhas não conferem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      const { data: usuario } = await supabase.auth.getUser();
      const userId = usuario?.user?.id ?? null;
      if (error) {
        setErro("Não foi possível alterar a senha.");
        await registrarLog({
          user_id: userId,
          acao: "reset_senha_falhou",
          modulo: "login",
          detalhes: { motivo: error.message }
        });
        return;
      }
      await registrarLog({
        user_id: userId,
        acao: "reset_senha_sucesso",
        modulo: "login",
        detalhes: {}
      });
      setOk(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 1200);
    } catch (err) {
      console.error(err);
      setErro("Erro inesperado ao alterar senha.");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-card auth-card-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-plane-departure" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Definir nova senha" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "auth-subtitle", children: [
        "Crie uma nova senha para voltar a usar o ",
        SYSTEM_NAME,
        "."
      ] })
    ] }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", style: { marginBottom: 16 }, children: erro }),
    ok && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-success", style: { marginBottom: 16 }, children: "Senha alterada com sucesso! Redirecionando..." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { onSubmit: handleSubmit, className: "auth-form", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "senha", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-lock" }),
          " Nova senha"
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
            onChange: (e) => setPassword(e.target.value),
            disabled: loading
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "confirmar", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-lock" }),
          " Confirmar nova senha"
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
            onChange: (e) => setConfirmPassword(e.target.value),
            disabled: loading
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { type: "submit", className: "btn btn-primary btn-block", disabled: loading, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-key" }),
          loading ? " Salvando..." : " Salvar nova senha"
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

const $$Reset = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = `Nova senha - ${SYSTEM_NAME}`;
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><title>${pageTitle}</title>${renderHead()}</head> <body class="auth-body"> ${renderComponent($$result, "AuthResetIsland", AuthResetIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/AuthResetIsland.tsx", "client:component-export": "default" })} </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/reset.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/reset.astro";
const $$url = "/auth/reset";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Reset,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
