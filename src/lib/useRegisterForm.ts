import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type RegisterUserPayload = {
  id: string;
  email: string | null;
};

export type UseRegisterFormOptions = {
  onSuccess?: (user: RegisterUserPayload) => Promise<void> | void;
  successMessage?: string;
  autoHide?: boolean;
  resetOnSuccess?: boolean;
};

export function useRegisterForm(options: UseRegisterFormOptions = {}) {
  const {
    onSuccess,
    successMessage,
    autoHide = true,
    resetOnSuccess = true,
  } = options;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMessage = useCallback(() => {
    setMessage("");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const showMessage = useCallback(
    (text: string) => {
      setMessage(text);
      if (autoHide) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setMessage("");
          timeoutRef.current = null;
        }, 6000);
      }
    },
    [autoHide]
  );

  const resetFields = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    clearMessage();
  }, [clearMessage]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
          password,
        });

        if (error) {
          const msg =
            error.message.includes("already registered") ||
            error.message.includes("already exists") ||
            error.message.includes("User already registered")
              ? "Este e-mail já está cadastrado. Faça login para acessar sua conta."
              : "Não foi possível criar a conta. Verifique o e-mail.";
          showMessage(msg);
          if (msg.startsWith("Este e-mail")) {
            setTimeout(() => {
              window.location.href = "/auth/login";
            }, 2000);
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
          }, 2000);
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

        try {
          await fetch("/api/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: user.id, email: user.email }),
          });
        } catch (err) {
          console.error("Falha ao persistir perfil via API interna", err);
        }

        showMessage(
          successMessage ||
            "Conta criada! Verifique seu e-mail para confirmar. Depois faça login para completar o cadastro."
        );

        if (resetOnSuccess) {
          resetFields();
        }
      } catch (err: any) {
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
      clearMessage,
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
    showMessage,
  };
}
