import React from "react";

type CredentialsFormProps = {
  email: string;
  password: string;
  confirmPassword: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  disabled?: boolean;
};

export default function CredentialsForm({
  email,
  password,
  confirmPassword,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled = false,
}: CredentialsFormProps) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="cadastro-email">
          <i className="fa-solid fa-envelope"></i> E-mail
        </label>
        <input
          id="cadastro-email"
          type="email"
          className="form-input"
          placeholder="seu@email.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="form-group">
        <label htmlFor="cadastro-senha">
          <i className="fa-solid fa-lock"></i> Senha
        </label>
        <input
          id="cadastro-senha"
          type="password"
          className="form-input"
          placeholder="Mínimo 6 caracteres"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          disabled={disabled}
        />
      </div>
      <p className="auth-hint">
        <i className="fa-solid fa-info-circle"></i> A senha deve conter no mínimo 6 caracteres
      </p>
      <div className="form-group">
        <label htmlFor="cadastro-confirmar">
          <i className="fa-solid fa-lock"></i> Confirmar senha
        </label>
        <input
          id="cadastro-confirmar"
          type="password"
          className="form-input"
          placeholder="Repita a senha"
          required
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          disabled={disabled}
        />
      </div>
    </>
  );
}
