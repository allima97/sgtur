globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createComponent, f as renderHead, e as renderComponent, d as renderTemplate } from '../../chunks/astro/server_C6IdV9ex.mjs';
/* empty css                                         */
import { j as jsxRuntimeExports, S as SYSTEM_NAME, s as supabase } from '../../chunks/systemName_BQeIdnjR.mjs';
import { r as reactExports } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
export { a as renderers } from '../../chunks/_@astro-renderers_DYCwg6Ew.mjs';
import { r as registrarLog } from '../../chunks/logs_CDnMuknJ.mjs';

function AuthLoginIsland() {
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [erro, setErro] = reactExports.useState("");
  const [mensagem, setMensagem] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(false);
  const [modalSuspenso, setModalSuspenso] = reactExports.useState(false);
  async function getIP() {
    try {
      const resp = await fetch("https://api.ipify.org?format=json");
      const j = await resp.json();
      return j.ip || "";
    } catch {
      return "";
    }
  }
  function mostrarMensagem(msg, tipo = "danger") {
    setMensagem({ texto: msg, tipo });
    setTimeout(() => setMensagem(null), 5e3);
  }
  reactExports.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "signup") {
      mostrarMensagem("E-mail confirmado! Faça login para continuar.", "success");
      ["type", "access_token", "token"].forEach((key) => params.delete(key));
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);
  function abrirModalSuspenso() {
    setModalSuspenso(true);
  }
  function fecharModalSuspenso() {
    setModalSuspenso(false);
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem(null);
    setLoading(true);
    const emailLimpo = email.trim().toLowerCase();
    const senha = password;
    if (!emailLimpo || !senha) {
      mostrarMensagem("Informe e-mail e senha");
      setLoading(false);
      return;
    }
    const ip = await getIP();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    try {
      await registrarLog({ user_id: null, acao: "tentativa_login", modulo: "login", detalhes: { email: emailLimpo } });
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailLimpo, password: senha });
      if (error) {
        await registrarLog({ user_id: null, acao: "login_falhou", modulo: "login", detalhes: { email, motivo: error.message, ip, userAgent } });
        mostrarMensagem("E-mail ou senha incorretos. Verifique seus dados e tente novamente.");
        setLoading(false);
        return;
      }
      const userId = data.user?.id || null;
      await registrarLog({ user_id: userId, acao: "login_sucesso", modulo: "login", detalhes: { email: emailLimpo, userId, ip, userAgent } });
      const { data: userInfo } = await supabase.auth.getUser();
      const emailConfirmado = Boolean(userInfo?.user?.email_confirmed_at || userInfo?.user?.confirmed_at);
      if (!emailConfirmado) {
        await supabase.auth.signOut();
        mostrarMensagem("Confirme seu e-mail antes de acessar o sistema.", "warning");
        setLoading(false);
        return;
      }
      const { data: perfil, error: userError } = await supabase.from("users").select("nome_completo, active, company_id, cpf, telefone, cidade, estado, uso_individual").eq("id", userId).maybeSingle();
      let perfilFinal = perfil;
      const missingActiveColumn = userError && (userError.code === "42703" || userError.message?.toLowerCase().includes("active"));
      if (missingActiveColumn) {
        const { data: fallbackData } = await supabase.from("users").select("nome_completo, company_id, cpf, telefone, cidade, estado, uso_individual").eq("id", userId).maybeSingle();
        perfilFinal = fallbackData;
      }
      if (!perfilFinal) {
        mostrarMensagem("Não foi possível carregar seu perfil. Tente novamente.");
        setLoading(false);
        return;
      }
      if (perfilFinal && perfilFinal.active === false) {
        abrirModalSuspenso();
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      const precisaOnboarding = !perfilFinal.nome_completo || !perfilFinal.telefone || !perfilFinal.cidade || !perfilFinal.estado || perfilFinal.uso_individual === null || perfilFinal.uso_individual === void 0;
      if (precisaOnboarding) {
        window.location.replace("/perfil?onboarding=1");
        return;
      }
      window.location.replace("/dashboard");
    } catch (e2) {
      await registrarLog({ user_id: null, acao: "login_erro_interno", modulo: "login", detalhes: { email, erro: e2.message, ip, userAgent } });
      mostrarMensagem("Erro inesperado ao fazer login.");
    } finally {
      setLoading(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-container", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-card auth-card-lg", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-icon", children: /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-plane-departure", "aria-hidden": true }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: `Bem-vindo ao ${SYSTEM_NAME}` }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "auth-subtitle", children: "Use seu e-mail e senha para acessar ou faça seu cadastro" })
    ] }),
    mensagem && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `alert alert-${mensagem.tipo}`, style: { marginBottom: 12 }, children: mensagem.texto }),
    erro && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "alert alert-danger", style: { marginBottom: 16 }, children: erro }),
    modalSuspenso && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-overlay", onClick: fecharModalSuspenso }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-content", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-header", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-triangle-exclamation text-yellow-600" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Acesso Suspenso" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "modal-body", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-lg font-semibold mb-4", children: "Atenção!" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-700 mb-6", children: "Seu acesso está suspenso, por favor entrar em contato com o Gestor ou Administrador do sistema." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "contact-info", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-600", children: "Se você acredita que isto é um erro, entre em contato:" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { className: "mt-3 space-y-2 text-sm", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Email:" }),
                " suporte@sgtur.com"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Telefone:" }),
                " (11) 1234-5678"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "modal-footer", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: fecharModalSuspenso, className: "btn btn-secondary", children: "Fechar" }) })
      ] })
    ] }),
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
            placeholder: "Digite sua senha",
            required: true,
            autoComplete: "current-password",
            value: password,
            onChange: (e) => setPassword(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "auth-links auth-links-forgot", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("a", { href: "/auth/recover", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-unlock-keyhole" }),
        "Esqueceu a senha? Redefinir"
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "auth-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "submit",
            className: "btn btn-primary btn-block",
            disabled: loading,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-right-to-bracket" }),
              loading ? " Entrando..." : " Entrar"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "a",
          {
            href: "/auth/register",
            className: "btn btn-secondary btn-block",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-user-plus" }),
              "Criar Nova Conta"
            ]
          }
        )
      ] })
    ] })
  ] }) });
}

const $$Login = createComponent(($$result, $$props, $$slots) => {
  const pageTitle = `Login - ${SYSTEM_NAME}`;
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><title>${pageTitle}</title>${renderHead()}</head> <body class="auth-body"> ${renderComponent($$result, "AuthLoginIsland", AuthLoginIsland, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/Users/allima97/Documents/GitHub/sgtur/src/components/islands/AuthLoginIsland.tsx", "client:component-export": "default" })} </body></html>`;
}, "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/login.astro", void 0);

const $$file = "/Users/allima97/Documents/GitHub/sgtur/src/pages/auth/login.astro";
const $$url = "/auth/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
