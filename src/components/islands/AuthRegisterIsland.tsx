import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { registrarLog } from "../../lib/logs";

export default function AuthRegisterIsland() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  function mostrarMensagem(msg: string) {
    setErro(msg);
    setTimeout(() => setErro(""), 6000);
  }

  async function handleSubmit(e: React.FormEvent) {
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
        password,
      });
      if (error) {
        if (
          error.message.includes("already registered") ||
          error.message.includes("already exists") ||
          error.message.includes("User already registered")
        ) {
          mostrarMensagem("Este e-mail já está cadastrado. Faça login para acessar sua conta.");
          setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
          return;
        }
        mostrarMensagem("Não foi possível criar a conta. Verifique o e-mail.");
        setLoading(false);
        return;
      }
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        mostrarMensagem("Este e-mail já está cadastrado. Faça login para acessar sua conta.");
        setTimeout(() => { window.location.href = "/auth/login"; }, 2000);
        return;
      }
      // cria registro básico no perfil para onboarding posterior
      if (data.user?.id) {
        await supabase.from("users").upsert({
          id: data.user.id,
          email: emailLimpo,
          nome_completo: null,
          uso_individual: null,
        });
      }

      mostrarMensagem('Conta criada! Verifique seu e-mail para confirmar. Depois faça login para completar o cadastro.');
    } catch (err: any) {
      mostrarMensagem(err.message || 'Falha ao criar conta');
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
          <h1>Bem-vindo ao SGTUR</h1>
          <h2>Sistema de Gerenciamento de Turismo</h2>
          <p className="auth-subtitle">Cadastre-se, confirme o e-mail e complete seus dados no primeiro acesso.</p>
        </div>
        {erro && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{erro}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email"><i className="fa-solid fa-envelope"></i> E-mail</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="seu@email.com"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="senha"><i className="fa-solid fa-lock"></i> Senha</label>
            <input
              type="password"
              id="senha"
              className="form-input"
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <p className="auth-hint"><i className="fa-solid fa-info-circle"></i> A senha deve conter no mínimo 6 caracteres</p>
          <div className="form-group">
            <label htmlFor="confirmar"><i className="fa-solid fa-lock"></i> Confirmar senha</label>
            <input
              type="password"
              id="confirmar"
              className="form-input"
              placeholder="Repita a senha"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              <i className="fa-solid fa-user-plus"></i>
              {loading ? " Criando..." : " Criar Conta"}
            </button>
            <div className="auth-divider">
              <span>ou</span>
            </div>
            <a href="/auth/login" className="btn btn-secondary btn-block">
              <i className="fa-solid fa-right-to-bracket"></i>
              Já tenho conta
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
