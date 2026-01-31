import React, { useState } from "react";
import { useRegisterForm } from "../../lib/useRegisterForm";
import CredentialsForm from "../forms/CredentialsForm";
import { SYSTEM_NAME } from "../../lib/systemName";

export default function AuthRegisterIsland() {
  const [modalSucesso, setModalSucesso] = useState(false);
  const registerForm = useRegisterForm({
    showSuccessMessage: false,
    resetOnSuccess: true,
    onSuccess: () => setModalSucesso(true),
  });

  function fecharModalSucesso() {
    setModalSucesso(false);
    window.location.href = "/auth/login";
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-lg">
        {modalSucesso && (
          <div className="modal">
            <div className="modal-overlay" onClick={fecharModalSucesso}></div>
            <div className="modal-content">
              <div className="modal-header">
                <i className="fa-solid fa-envelope-open-text text-green-600"></i>
                <h2>Confirme seu e-mail</h2>
              </div>
              <div className="modal-body">
                <p>
                  Conta criada com sucesso! Para continuar, confirme o e-mail de cadastro e depois faça login.
                </p>
              </div>
              <div className="modal-footer">
                <button onClick={fecharModalSucesso} className="btn btn-primary">
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="auth-header">
          <div className="auth-icon">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <h1>{`Bem-vindo ao ${SYSTEM_NAME}`}</h1>
          <h2>Sistema de Gerenciamento de Vendas para Turismo</h2>
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
