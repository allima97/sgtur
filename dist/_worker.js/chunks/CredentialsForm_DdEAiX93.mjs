globalThis.process ??= {}; globalThis.process.env ??= {};
import { r as reactExports } from './_@astro-renderers_DYCwg6Ew.mjs';
import { s as supabase, j as jsxRuntimeExports } from './systemName_Co0aCFY_.mjs';

function useRegisterForm(options = {}) {
  const {
    onSuccess,
    successMessage,
    autoHide = true,
    resetOnSuccess = true
  } = options;
  const [email, setEmail] = reactExports.useState("");
  const [password, setPassword] = reactExports.useState("");
  const [confirmPassword, setConfirmPassword] = reactExports.useState("");
  const [loading, setLoading] = reactExports.useState(false);
  const [message, setMessage] = reactExports.useState("");
  const timeoutRef = reactExports.useRef(null);
  const clearMessage = reactExports.useCallback(() => {
    setMessage("");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  const showMessage = reactExports.useCallback(
    (text) => {
      setMessage(text);
      if (autoHide) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setMessage("");
          timeoutRef.current = null;
        }, 6e3);
      }
    },
    [autoHide]
  );
  const resetFields = reactExports.useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    clearMessage();
  }, [clearMessage]);
  reactExports.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);
  const handleSubmit = reactExports.useCallback(
    async (event) => {
      event.preventDefault();
      clearMessage();
      setLoading(true);
      const emailClean = email.trim().toLowerCase();
      if (!emailClean || !password) {
        showMessage("Informe e-mail e senha");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        showMessage("A senha deve conter no mínimo 6 caracteres");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        showMessage("As senhas não conferem");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailClean,
          password
        });
        if (error) {
          const msg = error.message.includes("already registered") || error.message.includes("already exists") || error.message.includes("User already registered") ? "Este e-mail já está cadastrado. Faça login para acessar sua conta." : "Não foi possível criar a conta. Verifique o e-mail.";
          showMessage(msg);
          if (msg.startsWith("Este e-mail")) {
            setTimeout(() => {
              window.location.href = "/auth/login";
            }, 2e3);
          }
          setLoading(false);
          return;
        }
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          showMessage(
            "Este e-mail já está cadastrado. Faça login para acessar sua conta."
          );
          setTimeout(() => {
            window.location.href = "/auth/login";
          }, 2e3);
          setLoading(false);
          return;
        }
        const user = data.user;
        if (!user) {
          showMessage("Não foi possível criar a conta.");
          setLoading(false);
          return;
        }
        if (onSuccess) {
          await onSuccess({ id: user.id, email: user.email });
        }
        showMessage(
          successMessage || "Conta criada! Verifique seu e-mail para confirmar. Depois faça login para completar o cadastro."
        );
        if (resetOnSuccess) {
          resetFields();
        }
      } catch (err) {
        showMessage(err?.message || "Falha ao criar conta");
      } finally {
        setLoading(false);
      }
    },
    [
      email,
      password,
      confirmPassword,
      onSuccess,
      successMessage,
      resetFields,
      resetOnSuccess,
      showMessage,
      clearMessage
    ]
  );
  return {
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    message,
    handleSubmit,
    resetFields,
    showMessage
  };
}

function CredentialsForm({
  email,
  password,
  confirmPassword,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "cadastro-email", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-envelope" }),
        " E-mail"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "cadastro-email",
          type: "email",
          className: "form-input",
          placeholder: "seu@email.com",
          required: true,
          autoComplete: "email",
          value: email,
          onChange: (e) => onEmailChange(e.target.value),
          disabled
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "cadastro-senha", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-lock" }),
        " Senha"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "cadastro-senha",
          type: "password",
          className: "form-input",
          placeholder: "Mínimo 6 caracteres",
          required: true,
          autoComplete: "new-password",
          value: password,
          onChange: (e) => onPasswordChange(e.target.value),
          disabled
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "auth-hint", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-info-circle" }),
      " A senha deve conter no mínimo 6 caracteres"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { htmlFor: "cadastro-confirmar", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("i", { className: "fa-solid fa-lock" }),
        " Confirmar senha"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          id: "cadastro-confirmar",
          type: "password",
          className: "form-input",
          placeholder: "Repita a senha",
          required: true,
          value: confirmPassword,
          onChange: (e) => onConfirmPasswordChange(e.target.value),
          disabled
        }
      )
    ] })
  ] });
}

export { CredentialsForm as C, useRegisterForm as u };
