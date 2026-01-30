import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";

export default function AuthRecoverIsland() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const COOLDOWN_STORAGE_KEY = "sgtur:recover-cooldown-end";

  function mostrarMensagem(msg: string) {
    setErro(msg);
    setTimeout(() => setErro(""), 6000);
  }

  function clearCooldownTimer() {
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      clearCooldownTimer();
      if (typeof window !== "undefined") {
        localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      }
      return;
    }

    if (cooldownTimerRef.current) return;

    cooldownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        const next = prev <= 1 ? 0 : prev - 1;
        if (next > 0) {
          setErro(`Muitas solicitações. Aguarde ${next} segundos antes de tentar novamente.`);
        } else {
          setErro("");
        }
        return next;
      });
    }, 1000);

    return () => {
      clearCooldownTimer();
    };
  }, [cooldownSeconds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!stored) return;
    const endTimestamp = Number(stored);
    if (!Number.isFinite(endTimestamp)) {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
      return;
    }
    const diffSeconds = Math.ceil((endTimestamp - Date.now()) / 1000);
    if (diffSeconds > 0) {
      setCooldownSeconds(diffSeconds);
      setErro(`Muitas solicitações. Aguarde ${diffSeconds} segundos antes de tentar novamente.`);
    } else {
      localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    }
  }, []);

  function extractRetrySeconds(details?: string | null, hint?: string | null) {
    const source = `${details ?? ""} ${hint ?? ""}`;
    const secondsMatch = source.match(/(\d+)\s*(seconds?|segundos?)?/i);
    if (secondsMatch) {
      return Number(secondsMatch[1]);
    }
    return null;
  }

  function startCooldown(seconds: number) {
    setCooldownSeconds(seconds);
    if (typeof window !== "undefined") {
      localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + seconds * 1000));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setOk(false);
    setLoading(true);

    const emailLimpo = email.trim().toLowerCase();
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset` : undefined;

    try {
      await registrarLog({
        user_id: null,
        acao: "solicitou_recuperacao_senha",
        modulo: "login",
        detalhes: { email: emailLimpo },
      });
      const { error } = await supabase.auth.resetPasswordForEmail(
        emailLimpo,
        redirectTo ? { redirectTo } : undefined
      );
      if (error) {
        if (error.status === 429) {
          const parsedSeconds = extractRetrySeconds(error.details, error.hint) ?? 60;
          startCooldown(parsedSeconds);
          setErro(`Muitas solicitações. Aguarde ${parsedSeconds} segundos antes de tentar novamente.`);
        } else {
          mostrarMensagem("Não foi possível enviar o link. Tente novamente.");
        }
      } else {
        setOk(true);
      }
    } catch (e: any) {
      mostrarMensagem("Erro ao solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-lg">
        <div className="auth-header">
          <div className="auth-icon">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <h1>Recuperar senha</h1>
          <h2 className="auth-subtitle">Enviaremos um link para redefinir sua senha.</h2>
        </div>
        {erro && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {erro}
          </div>
        )}
        {ok && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            Instruções enviadas para seu e-mail!
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="recover-email">
              <i className="fa-solid fa-envelope"></i> E-mail
            </label>
            <input
              type="email"
              id="recover-email"
              className="form-input"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || cooldownSeconds > 0}
            >
              <i className="fa-solid fa-paper-plane"></i>
              {loading ? " Enviando..." : " Enviar link"}
            </button>
            {cooldownSeconds > 0 && (
              <small className="text-muted" style={{ display: "block", marginTop: 6 }}>
                Aguarde {cooldownSeconds} segundos antes de reenviar.
              </small>
            )}
            <div className="auth-divider">
              <span>ou</span>
            </div>
            <a href="/auth/login" className="btn btn-secondary btn-block">
              <i className="fa-solid fa-right-to-bracket"></i>
              Voltar ao login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
