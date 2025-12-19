import React from "react";
import { supabase } from "../../lib/supabase";
import { useRegisterForm } from "../../lib/useRegisterForm";
import CredentialsForm from "../forms/CredentialsForm";

export default function AuthRegisterIsland() {
  const registerForm = useRegisterForm({
    onSuccess: async (user) => {
      await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        nome_completo: null,
        uso_individual: null,
      });
    },
  });

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-lg">
        <div className="auth-header">
          <div className="auth-icon">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <h1>Bem-vindo ao SGTUR</h1>
          <h2>Sistema de Gerenciamento de Turismo</h2>
          <p className="auth-subtitle">
            Cadastre-se, confirme o e-mail e complete seus dados no primeiro acesso.
          </p>
        </div>
        {registerForm.message && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {registerForm.message}
          </div>
        )}
        <form onSubmit={registerForm.handleSubmit} className="auth-form">
          <CredentialsForm
            email={registerForm.email}
            password={registerForm.password}
            confirmPassword={registerForm.confirmPassword}
            onEmailChange={registerForm.setEmail}
            onPasswordChange={registerForm.setPassword}
            onConfirmPasswordChange={registerForm.setConfirmPassword}
            disabled={registerForm.loading}
          />
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary w-full" disabled={registerForm.loading}>
              <i className="fa-solid fa-user-plus"></i>
              {registerForm.loading ? " Criando..." : " Criar Conta"}
            </button>
            <div className="auth-divider">
              <span>ou</span>
            </div>
            <a href="/auth/login" className="btn btn-secondary w-full">
              <i className="fa-solid fa-right-to-bracket"></i>
              Já tenho conta
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
