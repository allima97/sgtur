import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";

export default function AuthRecoverIsland() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  function mostrarMensagem(msg: string) {
    setErro(msg);
    setTimeout(() => setErro(""), 6000);
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
        mostrarMensagem("Não foi possível enviar o link. Tente novamente.");
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
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <i className="fa-solid fa-paper-plane"></i>
              {loading ? " Enviando..." : " Enviar link"}
            </button>
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
